<?php
// Test if student_promotions table exists and has data
require_once '../config/database.php';

try {
    // Check if table exists
    $table_check = $conn->query("SHOW TABLES LIKE 'student_promotions'");
    $table_exists = $table_check->num_rows > 0;
    
    if ($table_exists) {
        // Get count of records
        $count_query = "SELECT COUNT(*) as total FROM student_promotions";
        $count_result = $conn->query($count_query);
        $count_row = $count_result->fetch_assoc();
        
        // Get table structure
        $structure_query = "DESCRIBE student_promotions";
        $structure_result = $conn->query($structure_query);
        $columns = [];
        while ($row = $structure_result->fetch_assoc()) {
            $columns[] = $row['Field'];
        }
        
        echo json_encode([
            'success' => true,
            'table_exists' => $table_exists,
            'total_records' => $count_row['total'],
            'columns' => $columns,
            'message' => 'Table check completed'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'table_exists' => false,
            'message' => 'Table student_promotions does not exist'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
