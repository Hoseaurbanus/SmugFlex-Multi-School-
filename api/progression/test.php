<?php
// Simple test to debug progression rules API
require_once '../config/database.php';

try {
    // Test basic database connection
    $result = $conn->query("SELECT 1");
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Database connection OK'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
