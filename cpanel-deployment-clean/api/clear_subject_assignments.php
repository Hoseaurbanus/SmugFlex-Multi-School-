<?php
require_once 'config/database.php';

$database = new Database();
$conn = $database->getConnection();

echo "Clearing all subject assignments (keeping class teacher assignments)...\n\n";

// First, show current assignments
echo "Current subject assignments:\n";
$stmt = $conn->query("SELECT COUNT(*) as count FROM subject_assignments");
$count = $stmt->fetch();
echo "Total subject assignments: " . $count['count'] . "\n\n";

// Show some sample assignments before deletion
$stmt = $conn->query("SELECT sa.*, s.name as subject_name, c.name as class_name, CONCAT(t.first_name, ' ', t.last_name) as teacher_name 
                     FROM subject_assignments sa 
                     JOIN subjects s ON sa.subject_id = s.id 
                     JOIN classes c ON sa.class_id = c.id 
                     JOIN teachers t ON sa.teacher_id = t.id 
                     LIMIT 5");

echo "Sample assignments before deletion:\n";
while ($row = $stmt->fetch()) {
    echo "- {$row['subject_name']} in {$row['class_name']} - {$row['teacher_name']} ({$row['academic_year']} {$row['term']})\n";
}
echo "\n";

// Delete all subject assignments
try {
    $stmt = $conn->query("DELETE FROM subject_assignments");
    $deleted_count = $stmt->rowCount();
    
    echo "Deleted $deleted_count subject assignments.\n\n";
    
    // Verify deletion
    $stmt = $conn->query("SELECT COUNT(*) as count FROM subject_assignments");
    $count = $stmt->fetch();
    echo "Remaining subject assignments: " . $count['count'] . "\n\n";
    
    // Verify class teacher assignments are still intact (they're in a different table)
    $stmt = $conn->query("SELECT COUNT(*) as count FROM classes WHERE class_teacher_id IS NOT NULL");
    $class_teacher_count = $stmt->fetch();
    echo "Class teacher assignments (unchanged): " . $class_teacher_count['count'] . "\n\n";
    
    echo "SUCCESS: All subject assignments cleared. Ready for frontend testing.\n";
    
} catch (PDOException $e) {
    echo "Error deleting subject assignments: " . $e->getMessage() . "\n";
}
?>
