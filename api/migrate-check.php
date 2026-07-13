<?php
require_once __DIR__ . '/helpers/Cors.php';
require_once __DIR__ . '/config/database.php';
Cors::handle();

header('Content-Type: application/json');

try {
    $database = new Database();
    $conn = $database->getConnection();
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = ['tables' => [], 'queries' => [], 'errors' => [], 'db_user' => '', 'php_version' => PHP_VERSION];
    
    $row = $conn->query("SELECT CURRENT_USER() as u, DATABASE() as db")->fetch();
    $results['db_user'] = $row['u'] ?? 'unknown';
    $results['database'] = $row['db'] ?? 'unknown';
    
    $tables = ['payments','subjects','subject_assignments','parents','parent_student_links','notifications','attendance','assignments','results','teachers','classes','students','users','school_settings','schools'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table`");
            $stmt->execute();
            $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $hasSchoolId = in_array('school_id', $cols);
            $results['tables'][$table] = [
                'exists' => true,
                'has_school_id' => $hasSchoolId,
                'column_count' => count($cols),
            ];
        } catch (PDOException $e) {
            $results['tables'][$table] = [
                'exists' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    $fakeToken = base64_encode(json_encode(['typ'=>'JWT','alg'=>'HS256'])) . '.' . base64_encode(json_encode([
        'sub' => 1, 'school_id' => 1, 'role' => 'admin', 'username' => 'test',
        'iat' => time(), 'exp' => time() + 3600
    ])) . '.fakesig';
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $fakeToken;
    
    $testQueries = [
        'parents_all' => "SELECT p.*, 
            (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id AND school_id = 1) as children_count,
            (SELECT GROUP_CONCAT(s.first_name, ' ', s.last_name) 
              FROM parent_student_links psl 
              JOIN students s ON psl.student_id = s.id 
              WHERE psl.parent_id = p.id AND s.status = 'Active' AND psl.school_id = 1) as children_names
          FROM parents p
          WHERE p.school_id = 1
          ORDER BY p.first_name, p.last_name",
        
        'payments_all' => "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                 c.name as class_name, c.level,
                 u.username as recorded_by_name
          FROM payments p
          JOIN students s ON p.student_id = s.id AND s.school_id = 1
          JOIN classes c ON s.class_id = c.id AND c.school_id = 1
          LEFT JOIN users u ON p.recorded_by = u.id AND u.school_id = 1
          WHERE p.school_id = 1 AND p.academic_year = '2024/2025' AND p.term = 'First Term'
          ORDER BY p.id DESC LIMIT 5",
        
        'subjects_assignments' => "SELECT sa.*, sub.name as subject_name, sub.code as subject_code, sub.category,
                 c.name as class_name, c.level,
                 CONCAT(t.first_name, ' ', t.last_name) as teacher_name, t.employee_id
          FROM subject_assignments sa
          JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = 1
          JOIN classes c ON sa.class_id = c.id AND c.school_id = 1
          JOIN teachers t ON sa.teacher_id = t.id AND t.school_id = 1
          WHERE sa.status = 'Active' AND sa.school_id = 1
          ORDER BY sa.id LIMIT 5",
        
        'notifications_all' => "SELECT n.*, COALESCE(u.username, 'System') as created_by_name
          FROM notifications n
          LEFT JOIN users u ON n.sent_by = u.id
          WHERE n.school_id = 1
          ORDER BY n.id DESC LIMIT 5",
    ];
    
    foreach ($testQueries as $name => $sql) {
        try {
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results['queries'][$name] = [
                'status' => 'OK',
                'row_count' => count($rows),
                'sample' => count($rows) > 0 ? $rows[0] : null,
            ];
        } catch (PDOException $e) {
            $results['queries'][$name] = [
                'status' => 'FAILED',
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
            ];
            $results['errors'][] = "$name: " . $e->getMessage();
        }
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()], JSON_PRETTY_PRINT);
}
