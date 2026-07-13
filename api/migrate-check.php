<?php
require_once __DIR__ . '/helpers/Cors.php';
require_once __DIR__ . '/config/database.php';
Cors::handle();

header('Content-Type: application/json');

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $results = ['tables' => [], 'errors' => [], 'db_user' => '', 'privileges' => ''];
    
    // Check current DB user
    $row = $conn->query("SELECT CURRENT_USER() as u")->fetch();
    $results['db_user'] = $row['u'] ?? 'unknown';
    
    // Check ALTER privilege
    $priv = $conn->query("SHOW GRANTS FOR CURRENT_USER()")->fetchAll(PDO::FETCH_COLUMN);
    $results['privileges'] = $priv;
    $hasAlter = false;
    foreach ($priv as $grant) {
        if (stripos($grant, 'ALTER') !== false) $hasAlter = true;
    }
    $results['has_alter_privilege'] = $hasAlter;
    
    // Check each table for school_id
    $tables = ['payments','subjects','subject_assignments','parents','parent_student_links','notifications','attendance','assignments','results','teachers','classes','students','users'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE 'school_id'");
            $stmt->execute();
            $has = $stmt->fetch() !== false;
            $results['tables'][$table] = $has ? 'EXISTS' : 'MISSING';
            
            if (!$has && $hasAlter) {
                try {
                    $conn->exec("ALTER TABLE `$table` ADD COLUMN school_id INT NOT NULL AFTER id");
                    $results['tables'][$table] = 'ADDED_OK';
                } catch (PDOException $e) {
                    $results['tables'][$table] = 'ADD_FAILED: ' . $e->getMessage();
                    $results['errors'][] = "$table: " . $e->getMessage();
                }
            } elseif (!$has && !$hasAlter) {
                $results['tables'][$table] = 'MISSING_NO_PRIVILEGE';
            }
        } catch (PDOException $e) {
            $results['tables'][$table] = 'TABLE_MISSING: ' . $e->getMessage();
        }
    }
    
    echo json_encode($results, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
