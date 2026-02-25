<?php
// Simple test file to check API endpoints
require_once 'config/database.php';

try {
    // Test database connection
    $query = "SELECT COUNT(*) as total FROM classes";
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    
    // Test progression rules
    $rules_query = "SELECT COUNT(*) as total FROM class_progression_rules WHERE is_active = 1";
    $rules_result = $conn->query($rules_query);
    $rules_row = $rules_result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'database_connection' => 'OK',
        'classes_count' => $row['total'],
        'progression_rules_count' => $rules_row['total'],
        'message' => 'API test successful'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
