<?php
/**
 * Clear Second Term class teacher assignments
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Delete all Second Term assignments
    $query = "DELETE FROM class_teacher_assignments WHERE term = 'Second Term' AND academic_year = '2025/2026'";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $deleted = $stmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "Cleared {$deleted} Second Term assignments",
        'deleted_count' => $deleted,
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
