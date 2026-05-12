<?php
// School Settings endpoint (standardized responses)
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/config/database.php';

// Handle preflight OPTIONS requests consistently
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get all school settings
            // NOTE: Public endpoint - no authentication required for basic school info
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
                
                Response::success($settings, 'School settings loaded successfully');
            } catch (PDOException $e) {
                // Log the actual error for debugging
                error_log("School Settings Error: " . $e->getMessage());
                
                // If table doesn't exist, return default settings
                if (strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), "Table") !== false) {
                    Response::success([
                        ['setting_key' => 'school_name', 'setting_value' => 'Graceland Royal Academy Gombe', 'setting_type' => 'string', 'description' => 'Official school name'],
                        ['setting_key' => 'school_motto', 'setting_value' => 'Wisdom & Illumination', 'setting_type' => 'string', 'description' => 'School motto'],
                        ['setting_key' => 'current_term', 'setting_value' => 'First Term', 'setting_type' => 'string', 'description' => 'Current academic term'],
                        ['setting_key' => 'current_academic_year', 'setting_value' => '2025/2026', 'setting_type' => 'string', 'description' => 'Current academic year']
                    ], 'Using default school settings');
                } else {
                    throw $e;
                }
            }
            break;
            
        case 'POST':
            // Create or update school setting
            // Only admins should be allowed to mutate system settings
            Middleware::requireRole('admin');
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

                    Response::success(null, 'Academic year and term updated atomically');
                } catch (PDOException $e) {
                    $conn->rollBack();
                    error_log('Atomic update failed: ' . $e->getMessage());
                    Response::serverError('Failed to update both settings atomically');
                }

                break;
            }

            if (!$data || !isset($data['setting_key']) || !isset($data['setting_value'])) {
                Response::badRequest('Setting key and value are required');
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
                Response::success(null, $message);
            } else {
                Response::serverError('Failed to save setting');
            }
            break;
            
        case 'PUT':
            // Update school setting
            // Only admins should be allowed to mutate system settings
            Middleware::requireRole('admin');
            $path_parts = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
            if (empty($path_parts[0])) {
                Response::badRequest('Setting key is required');
                break;
            }
            
            $setting_key = $path_parts[0];
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['setting_value'])) {
                Response::badRequest('Setting value is required');
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
                Response::success(null, 'Setting updated successfully');
            } else {
                Response::serverError('Failed to update setting');
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
            break;
    }
    
} catch (Exception $e) {
    Response::serverError('Database error');
}
?>
