<?php
/**
 * Test Database Connection
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($conn) {
        echo json_encode([
            'success' => true,
            'message' => 'Database connection successful',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
