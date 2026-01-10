<?php
/**
 * Check current class teacher assignments
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get all Second Term assignments with details
    $query = "SELECT cta.*, 
                     CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                     c.name as class_name
              FROM class_teacher_assignments cta
              JOIN teachers t ON cta.teacher_id = t.id
              JOIN classes c ON cta.class_id = c.id
              WHERE cta.term = 'Second Term' AND cta.academic_year = '2025/2026' AND cta.status = 'Active'
              ORDER BY c.name";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Current Second Term assignments',
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
