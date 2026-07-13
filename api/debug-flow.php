<?php
/**
 * Debug endpoint: runs the EXACT same code path as the failing controllers
 * with full error details exposed. Delete after debugging.
 */
require_once __DIR__ . '/helpers/Cors.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';
Cors::handle();
header('Content-Type: application/json');

// Allow token from query param for browser testing
if (isset($_GET['token']) && !isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $_GET['token'];
}

$debug = ['steps' => [], 'errors' => [], 'env' => []];

try {
    // Step 1: DB connection
    $database = new Database();
    $conn = $database->getConnection();
    $debug['steps'][] = 'DB connection OK';

    // Step 2: JWT/auth
    $token_data = null;
    try {
        $token_data = Middleware::requireAuth();
        $debug['steps'][] = 'Auth OK - role=' . ($token_data['role'] ?? 'none') . ' school_id=' . ($token_data['school_id'] ?? 'none');
    } catch (Exception $e) {
        $debug['errors'][] = 'Auth failed: ' . $e->getMessage();
        $debug['steps'][] = 'Auth FAILED';
    }

    if ($token_data) {
        // Step 3: School resolution
        try {
            $school_id = TenantMiddleware::resolveSchoolId($conn);
            $debug['steps'][] = 'School resolved: ' . $school_id;
        } catch (Exception $e) {
            $debug['errors'][] = 'School resolution failed: ' . $e->getMessage();
        }

        if (isset($school_id)) {
            // Step 4: Test each failing query
            $queries = [
                'parents' => [
                    'sql' => "SELECT p.*, 
                        (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id AND school_id = :sid1) as children_count
                      FROM parents p
                      WHERE p.school_id = :sid2
                      ORDER BY p.first_name, p.last_name LIMIT 5",
                    'params' => [':sid1' => $school_id, ':sid2' => $school_id]
                ],
                'payments' => [
                    'sql' => "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                         c.name as class_name, c.level, u.username as recorded_by_name
                      FROM payments p
                      JOIN students s ON p.student_id = s.id AND s.school_id = :sid1
                      JOIN classes c ON s.class_id = c.id AND c.school_id = :sid2
                      LEFT JOIN users u ON p.recorded_by = u.id AND u.school_id = :sid3
                      WHERE p.school_id = :sid4
                      ORDER BY p.id DESC LIMIT 5",
                    'params' => [':sid1' => $school_id, ':sid2' => $school_id, ':sid3' => $school_id, ':sid4' => $school_id]
                ],
                'subjects_assignments' => [
                    'sql' => "SELECT sa.*, sub.name as subject_name, c.name as class_name
                      FROM subject_assignments sa
                      JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :sid1
                      JOIN classes c ON sa.class_id = c.id AND c.school_id = :sid2
                      WHERE sa.status = 'Active' AND sa.school_id = :sid3
                      ORDER BY sa.id LIMIT 5",
                    'params' => [':sid1' => $school_id, ':sid2' => $school_id, ':sid3' => $school_id]
                ],
                'notifications' => [
                    'sql' => "SELECT n.* FROM notifications n WHERE n.school_id = :sid1 ORDER BY n.id DESC LIMIT 5",
                    'params' => [':sid1' => $school_id]
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
                    $debug['steps'][] = "$name: OK (" . count($rows) . " rows)";
                } catch (PDOException $e) {
                    $debug['errors'][] = "$name FAILED: " . $e->getMessage() . " [SQLSTATE: " . $e->getCode() . "]";
                }
            }

            // Step 5: Test with the EXACT same parameter names as the real controllers
            try {
                $testQuery = "SELECT sa.*, sub.name as subject_name, sub.code as subject_code, sub.category,
                         c.name as class_name, c.level,
                         CONCAT(t.first_name, ' ', t.last_name) as teacher_name, t.employee_id
                  FROM subject_assignments sa
                  JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :school_id
                  JOIN classes c ON sa.class_id = c.id AND c.school_id = :school_id
                  JOIN teachers t ON sa.teacher_id = t.id AND t.school_id = :school_id
                  WHERE sa.status = 'Active' AND sa.school_id = :school_id
                  ORDER BY sa.id LIMIT 5";
                $stmt = $conn->prepare($testQuery);
                $stmt->bindValue(':school_id', $school_id);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $debug['steps'][] = "EXACT subject_assignments query: OK (" . count($rows) . " rows)";
            } catch (PDOException $e) {
                $debug['errors'][] = "EXACT subject_assignments FAILED: " . $e->getMessage();
            }
        }
    }

    // Step 6: Check for missing tables/columns that controllers need
    $checkTables = ['token_blacklist', 'activity_logs', 'user_notifications'];
    foreach ($checkTables as $table) {
        try {
            $conn->query("SELECT 1 FROM `$table` LIMIT 1");
            $debug['steps'][] = "$table: EXISTS";
        } catch (PDOException $e) {
            $debug['errors'][] = "$table: MISSING or INACCESSIBLE - " . $e->getMessage();
        }
    }

} catch (Exception $e) {
    $debug['errors'][] = 'FATAL: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine();
}

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
