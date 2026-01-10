<?php
/**
 * Restore First Term class teacher assignments from backup
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // First, let's restore First Term assignments from the classes table backup
    $query = "SELECT c.class_teacher_id, c.class_teacher, c.id as class_id, c.name as class_name
             FROM classes c 
             WHERE c.class_teacher_id IS NOT NULL AND c.class_teacher_id > 0";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $restored = 0;
    foreach ($assignments as $assignment) {
        // Check if assignment already exists for First Term
        $checkQuery = "SELECT id FROM class_teacher_assignments 
                       WHERE class_id = ? AND term = 'First Term' AND academic_year = '2025/2026'";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->execute([$assignment['class_id']]);
        
        if ($checkStmt->rowCount() === 0) {
            // Insert the First Term assignment
            $insertQuery = "INSERT INTO class_teacher_assignments 
                           (teacher_id, class_id, academic_year, term, status, assigned_at, updated_at)
                           VALUES (?, ?, '2025/2026', 'First Term', 'Active', NOW(), NOW())";
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->execute([$assignment['class_teacher_id'], $assignment['class_id']]);
            $restored++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Restored {$restored} First Term assignments",
        'restored_count' => $restored,
        'total_found' => count($assignments),
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
