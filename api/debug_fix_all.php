<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    echo "=== DB Connection: OK ===\n\n";

    $school_id = 4;

    // Test 1: Subject assignments query
    echo "--- Test 1: Subject Assignments ---\n";
    try {
        $q = "SELECT sa.* FROM subject_assignments sa WHERE sa.status = 'Active' AND sa.school_id = :sid LIMIT 1";
        $s = $conn->prepare($q);
        $s->bindValue(':sid', $school_id);
        $s->execute();
        $r = $s->fetchAll();
        echo "OK - " . count($r) . " rows\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 2: Notifications query
    echo "--- Test 2: Notifications ---\n";
    try {
        $q = "SELECT n.* FROM notifications n WHERE n.school_id = :sid LIMIT 1";
        $s = $conn->prepare($q);
        $s->bindValue(':sid', $school_id);
        $s->execute();
        $r = $s->fetchAll();
        echo "OK - " . count($r) . " rows\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 3: Parent-student-links query
    echo "--- Test 3: Parent-Student Links ---\n";
    try {
        $q = "SELECT psl.* FROM parent_student_links psl WHERE psl.school_id = :sid LIMIT 1";
        $s = $conn->prepare($q);
        $s->bindValue(':sid', $school_id);
        $s->execute();
        $r = $s->fetchAll();
        echo "OK - " . count($r) . " rows\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 4: Full assignments query
    echo "--- Test 4: Full Subject Assignments JOIN ---\n";
    try {
        $q = "SELECT sa.*, sub.name as subject_name
              FROM subject_assignments sa
              JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :sid
              WHERE sa.status = 'Active' AND sa.school_id = :sid
              LIMIT 1";
        $s = $conn->prepare($q);
        $s->bindValue(':sid', $school_id);
        $s->execute();
        $r = $s->fetchAll();
        echo "OK - " . count($r) . " rows\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 5: Full parent-student-links JOIN
    echo "--- Test 5: Full Parent Links JOIN ---\n";
    try {
        $q = "SELECT psl.* 
              FROM parent_student_links psl
              LEFT JOIN students s ON psl.student_id = s.id AND s.school_id = :sid
              WHERE psl.school_id = :sid
              LIMIT 1";
        $s = $conn->prepare($q);
        $s->bindValue(':sid', $school_id);
        $s->execute();
        $r = $s->fetchAll();
        echo "OK - " . count($r) . " rows\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 6: Check schema of subject_assignments
    echo "--- Test 6: subject_assignments columns ---\n";
    try {
        $s = $conn->prepare("SHOW COLUMNS FROM subject_assignments");
        $s->execute();
        $cols = $s->fetchAll(PDO::FETCH_ASSOC);
        echo "Columns: " . implode(', ', array_column($cols, 'Field')) . "\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 7: Check schema of notifications
    echo "--- Test 7: notifications columns ---\n";
    try {
        $s = $conn->prepare("SHOW COLUMNS FROM notifications");
        $s->execute();
        $cols = $s->fetchAll(PDO::FETCH_ASSOC);
        echo "Columns: " . implode(', ', array_column($cols, 'Field')) . "\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

    // Test 8: Check schema of parent_student_links
    echo "--- Test 8: parent_student_links columns ---\n";
    try {
        $s = $conn->prepare("SHOW COLUMNS FROM parent_student_links");
        $s->execute();
        $cols = $s->fetchAll(PDO::FETCH_ASSOC);
        echo "Columns: " . implode(', ', array_column($cols, 'Field')) . "\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";

} catch (Exception $e) {
    echo "FATAL: " . $e->getMessage() . "\n";
}
