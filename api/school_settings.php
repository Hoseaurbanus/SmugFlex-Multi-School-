<?php
// School Settings endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config/database.php';
require_once 'helpers/JWT.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get all school settings
            try {
                // Align with actual database schema: columns are setting_key, setting_value, description, updated_by, updated_at
                $sql = "SELECT setting_key, setting_value, description FROM school_settings ORDER BY setting_key";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $result = $stmt;
                
                $settings = [];
                if ($result && $result->rowCount() > 0) {
                    while($row = $result->fetch(PDO::FETCH_ASSOC)) {
                        $settings[] = $row;
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => 'School settings loaded successfully',
                    'data' => $settings,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } catch (PDOException $e) {
                // Log the actual error for debugging
                error_log("School Settings Error: " . $e->getMessage());
                
                // If table doesn't exist, return default settings
                if (strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), "Table") !== false) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Using default school settings',
                        'data' => [
                            ['setting_key' => 'school_name', 'setting_value' => 'Graceland Royal Academy Gombe', 'setting_type' => 'string', 'description' => 'Official school name'],
                            ['setting_key' => 'school_motto', 'setting_value' => 'Wisdom & Illumination', 'setting_type' => 'string', 'description' => 'School motto'],
                            ['setting_key' => 'current_term', 'setting_value' => 'First Term', 'setting_type' => 'string', 'description' => 'Current academic term'],
                            ['setting_key' => 'current_academic_year', 'setting_value' => '2025/2026', 'setting_type' => 'string', 'description' => 'Current academic year']
                        ],
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                } else {
                    throw $e;
                }
            }
            break;
            
        case 'POST':
            // Create or update school setting
            $data = json_decode(file_get_contents('php://input'), true);

            // Atomic update: update both current_academic_year and current_term in a single transaction
            if ($data && isset($data['atomic']) && $data['atomic'] === true && isset($data['current_academic_year']) && isset($data['current_term'])) {
                try {
                    $conn->beginTransaction();

                    // Upsert academic year
                    $sql1 = "INSERT INTO school_settings (setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES ('current_academic_year', ?, 'string', '', NOW(), NOW()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()";
                    $stmt1 = $conn->prepare($sql1);
                    $stmt1->execute([$data['current_academic_year']]);

                    // Upsert term
                    $sql2 = "INSERT INTO school_settings (setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES ('current_term', ?, 'string', '', NOW(), NOW()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()";
                    $stmt2 = $conn->prepare($sql2);
                    $stmt2->execute([$data['current_term']]);

                    $conn->commit();

                    echo json_encode([
                        'success' => true,
                        'message' => 'Academic year and term updated atomically',
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                } catch (PDOException $e) {
                    $conn->rollBack();
                    error_log('Atomic update failed: ' . $e->getMessage());
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to update both settings atomically',
                        'error' => $e->getMessage(),
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                }

                break;
            }

            if (!$data || !isset($data['setting_key']) || !isset($data['setting_value'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Setting key and value are required',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                break;
            }

            // Check if setting already exists
            $check_sql = "SELECT id FROM school_settings WHERE setting_key = ?";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->execute([$data['setting_key']]);

            if ($check_stmt->fetch()) {
                // Update existing setting
                $sql = "UPDATE school_settings SET setting_value = ?, setting_type = ?, description = ?, updated_at = NOW() WHERE setting_key = ?";
                $stmt = $conn->prepare($sql);
                $success = $stmt->execute([
                    $data['setting_value'],
                    $data['setting_type'] ?? 'string',
                    $data['description'] ?? '',
                    $data['setting_key']
                ]);
                $message = 'Setting updated successfully';
            } else {
                // Create new setting
                $sql = "INSERT INTO school_settings (setting_key, setting_value, setting_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())";
                $stmt = $conn->prepare($sql);
                $success = $stmt->execute([
                    $data['setting_key'],
                    $data['setting_value'],
                    $data['setting_type'] ?? 'string',
                    $data['description'] ?? ''
                ]);
                $message = 'Setting created successfully';
            }

            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => $message,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to save setting',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            }
            break;
            
        case 'PUT':
            // Update school setting
            $path_parts = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
            if (empty($path_parts[0])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Setting key is required',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                break;
            }
            
            $setting_key = $path_parts[0];
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['setting_value'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Setting value is required',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                break;
            }
            
            $sql = "UPDATE school_settings SET setting_value = ?, setting_type = ?, description = ?, updated_at = NOW() WHERE setting_key = ?";
            $stmt = $conn->prepare($sql);
            $success = $stmt->execute([
                $data['setting_value'],
                $data['setting_type'] ?? 'string',
                $data['description'] ?? '',
                $setting_key
            ]);
            
            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Setting updated successfully',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update setting',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
