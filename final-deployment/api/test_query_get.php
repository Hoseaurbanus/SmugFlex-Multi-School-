<?php
/**
 * Test Database Query - GET version for browser testing
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    // Use existing database configuration
    require_once __DIR__ . '/config/database.php';
    
    // Create database connection using existing config
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    // Simple test query
    $query = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term'";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database query successful',
        'data' => $result,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
