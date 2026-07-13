<?php
/**
 * Diagnostic endpoint: checks DB schema, tests failing queries, reports errors.
 * Upload to cPanel and visit in browser to diagnose 500 errors.
 */
require_once __DIR__ . '/helpers/Cors.php';
require_once __DIR__ . '/config/database.php';
Cors::handle();

header('Content-Type: application/json');

try {
    $database = new Database();
    $conn = $database->getConnection();
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $results = [
        'php_version' => PHP_VERSION,
        'db_info' => [],
        'tables' => [],
        'query_tests' => [],
        'migration_log' => [],
    ];
    
    $row = $conn->query("SELECT CURRENT_USER() as u, DATABASE() as db, VERSION() as ver")->fetch();
    $results['db_info'] = ['user' => $row['u'], 'database' => $row['db'], 'version' => $row['ver']];
    
    // Test ALTER privilege
    try {
        $conn->exec("CREATE TABLE IF NOT EXISTS _migration_test (id INT)");
        $conn->exec("DROP TABLE IF EXISTS _migration_test");
        $results['db_info']['can_create_tables'] = true;
    } catch (PDOException $e) {
        $results['db_info']['can_create_tables'] = false;
        $results['db_info']['table_create_error'] = $e->getMessage();
    }
    
    $tables = ['payments','subjects','subject_assignments','parents','parent_student_links',
               'notifications','attendance','assignments','results','teachers','classes',
               'students','users','school_settings','schools'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table`");
            $stmt->execute();
            $cols = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $cols[] = $row['Field'];
            }
            $results['tables'][$table] = [
                'exists' => true,
                'columns' => $cols,
                'has_school_id' => in_array('school_id', $cols),
            ];
        } catch (PDOException $e) {
            $results['tables'][$table] = [
                'exists' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    // Run SchemaMigration and log results
    require_once __DIR__ . '/helpers/SchemaMigration.php';
    ob_start();
    SchemaMigration::run($conn);
    $migrationOutput = ob_get_clean();
    $results['migration_log'] = error_get_last() ? [error_get_last()['message']] : [];
    
    // Re-check tables after migration
    foreach ($tables as $table) {
        if (!isset($results['tables'][$table]['has_school_id'])) continue;
        if ($results['tables'][$table]['has_school_id']) continue;
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE 'school_id'");
            $stmt->execute();
            $results['tables'][$table]['has_school_id'] = $stmt->fetch() !== false;
            $results['tables'][$table]['post_migration'] = true;
        } catch (PDOException $e) {}
    }
    
    // Test the EXACT queries that are failing in production
    $queries = [
        'payments_getAll' => [
            'sql' => "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                 c.name as class_name, c.level, u.username as recorded_by_name
              FROM payments p
              JOIN students s ON p.student_id = s.id AND s.school_id = :school_id2
              JOIN classes c ON s.class_id = c.id AND c.school_id = :school_id3
              LEFT JOIN users u ON p.recorded_by = u.id AND u.school_id = :school_id4
              WHERE p.school_id = :school_id AND p.academic_year = :academic_year AND p.term = :term
              ORDER BY p.id DESC LIMIT 5",
            'params' => [':school_id' => 1, ':school_id2' => 1, ':school_id3' => 1, ':school_id4' => 1, ':academic_year' => '2024/2025', ':term' => 'First Term'],
        ],
        'parents_getAll' => [
            'sql' => "SELECT p.*, 
                (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id AND school_id = :school_id) as children_count
              FROM parents p
              WHERE p.school_id = :school_id2
              ORDER BY p.first_name, p.last_name LIMIT 5",
            'params' => [':school_id' => 1, ':school_id2' => 1],
        ],
        'subjects_assignments' => [
            'sql' => "SELECT sa.*, sub.name as subject_name, c.name as class_name,
                 CONCAT(t.first_name, ' ', t.last_name) as teacher_name
              FROM subject_assignments sa
              JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :school_id
              JOIN classes c ON sa.class_id = c.id AND c.school_id = :school_id2
              JOIN teachers t ON sa.teacher_id = t.id AND t.school_id = :school_id3
              WHERE sa.status = 'Active' AND sa.school_id = :school_id4
              ORDER BY sa.id LIMIT 5",
            'params' => [':school_id' => 1, ':school_id2' => 1, ':school_id3' => 1, ':school_id4' => 1],
        ],
        'notifications_getAll' => [
            'sql' => "SELECT n.*, COALESCE(u.username, 'System') as created_by_name
              FROM notifications n
              LEFT JOIN users u ON n.sent_by = u.id
              WHERE n.school_id = :school_id
              ORDER BY n.id DESC LIMIT 5",
            'params' => [':school_id' => 1],
        ],
        'school_settings_check' => [
            'sql' => "SELECT setting_key, setting_value FROM school_settings 
                      WHERE setting_key IN ('current_academic_year', 'current_term') AND school_id = :school_id",
            'params' => [':school_id' => 1],
        ],
    ];
    
    foreach ($queries as $name => $q) {
        try {
            $stmt = $conn->prepare($q['sql']);
            foreach ($q['params'] as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $results['query_tests'][$name] = [
                'status' => 'OK',
                'row_count' => count($rows),
                'columns' => count($rows) > 0 ? array_keys($rows[0]) : [],
            ];
        } catch (PDOException $e) {
            $results['query_tests'][$name] = [
                'status' => 'FAILED',
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
            ];
        }
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode([
        'fatal_error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
    ], JSON_PRETTY_PRINT);
}
