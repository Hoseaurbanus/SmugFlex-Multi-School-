<?php
/**
 * Create class teacher assignments table - Simple version
 */

// Database connection
$host = 'localhost';
$db_name = 'mdpjhtua_graceland_academy';
$username = 'mdpjhtua_graceland_academy';
$password = '159075321@Au';

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check classes table structure first
    $check_sql = "DESCRIBE classes";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->execute();
    $columns = $check_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Find the class teacher column name
    $teacher_column = null;
    foreach ($columns as $column) {
        if (stripos($column['Field'], 'teacher') !== false) {
            $teacher_column = $column['Field'];
            break;
        }
    }
    
    if (!$teacher_column) {
        echo json_encode([
            'success' => false,
            'message' => 'No teacher column found in classes table',
            'columns' => $columns,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Create table
    $sql = "CREATE TABLE IF NOT EXISTS class_teacher_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        teacher_id INT NOT NULL,
        class_id INT NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        term ENUM('First Term', 'Second Term', 'Third Term') NOT NULL,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE KEY unique_assignment (teacher_id, class_id, academic_year, term),
        INDEX idx_teacher_class (teacher_id, class_id),
        INDEX idx_term_year (academic_year, term),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->exec($sql);
    
    // Migrate existing class teachers
    $migrate_sql = "INSERT IGNORE INTO class_teacher_assignments (teacher_id, class_id, academic_year, term, status)
                    SELECT c.$teacher_column as teacher_id, c.id as class_id, '2025/2026' as academic_year, 'Second Term' as term, 'Active' as status
                    FROM classes c 
                    WHERE c.$teacher_column IS NOT NULL AND c.$teacher_column != 0";
    
    $conn->exec($migrate_sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Class teacher assignments table created successfully',
        'teacher_column' => $teacher_column,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
