<?php
/**
 * Health Check Endpoint
 * Simple endpoint for connection monitoring
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Check database connection
    require_once 'config/database.php';
    
    $conn = Database::getConnection();
    
    if ($conn) {
        // Test simple query
        $result = $conn->query("SELECT 1");
        
        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'System healthy',
                'timestamp' => date('Y-m-d H:i:s'),
                'database' => 'connected'
            ]);
        } else {
            throw new Exception('Database query failed');
        }
    } else {
        throw new Exception('Database connection failed');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'System unhealthy',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
