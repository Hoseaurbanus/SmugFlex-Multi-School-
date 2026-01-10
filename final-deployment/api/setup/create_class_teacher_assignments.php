<?php
/**
 * Create class teacher assignments table
 * Term-specific class teacher assignments like subject assignments
 */

require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Create class_teacher_assignments table
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
    
    // Migrate existing class teachers from classes table
    $migrate_sql = "INSERT INTO class_teacher_assignments (teacher_id, class_id, academic_year, term, status)
                    SELECT c.classTeacherId as teacher_id, c.id as class_id, '2025/2026' as academic_year, 'First Term' as term, 'Active' as status
                    FROM classes c 
                    WHERE c.classTeacherId IS NOT NULL AND c.classTeacherId != 0
                    ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP";
    
    $conn->exec($migrate_sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Class teacher assignments table created and existing data migrated',
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
