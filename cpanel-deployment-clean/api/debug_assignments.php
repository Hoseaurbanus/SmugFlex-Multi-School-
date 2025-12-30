<?php
/**
 * Debug Class Teacher Assignments
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get all assignments for debugging
    $query = "SELECT cta.*, 
                     CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                     c.name as class_name
              FROM class_teacher_assignments cta
              JOIN teachers t ON cta.teacher_id = t.id
              JOIN classes c ON cta.class_id = c.id
              ORDER BY cta.id DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'All class teacher assignments',
        'data' => $assignments,
        'count' => count($assignments),
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
