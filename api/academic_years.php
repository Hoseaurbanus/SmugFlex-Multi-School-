<?php
// Academic Years endpoint
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
            // Get all academic years
            try {
                $sql = "SELECT DISTINCT academic_year FROM compiled_results ORDER BY academic_year DESC";
                $stmt = $conn->prepare($sql);
                $stmt->execute();
                $result = $stmt;
                
                $years = [];
                if ($result && $result->rowCount() > 0) {
                    while($row = $result->fetch(PDO::FETCH_ASSOC)) {
                        $years[] = $row['academic_year'];
                    }
                }
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Academic years loaded successfully',
                    'data' => $years,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } catch (PDOException $e) {
                error_log("Academic Years Error: " . $e->getMessage());
                
                // If table doesn't exist, return current year as fallback
                echo json_encode([
                    'success' => true,
                    'message' => 'Using fallback academic year',
                    'data' => ['2025/2026'],
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
