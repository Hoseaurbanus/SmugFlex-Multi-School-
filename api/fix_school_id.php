<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    $school_id = isset($_GET['school_id']) ? (int)$_GET['school_id'] : 0;
    if ($school_id === 0) {
        $detect = $conn->query("SELECT school_id FROM subject_registrations WHERE school_id > 0 LIMIT 1");
        if ($detect) $school_id = (int)$detect->fetchColumn();
    }
    if ($school_id === 0) {
        $detect = $conn->query("SELECT school_id FROM users WHERE role = 'admin' LIMIT 1");
        if ($detect) $school_id = (int)$detect->fetchColumn();
    }
    if ($school_id === 0) die("Could not detect school_id. Pass it as ?school_id=YOUR_SCHOOL_ID\n");

    echo "Using school_id = $school_id\n\n";

    // Find ALL records for this class/year/term that have wrong school_id
    $sub = "2026/2027";
    $term = "First Term";
    $class_id = isset($_GET['class_id']) ? (int)$_GET['class_id'] : 1;
    $stmt = $conn->prepare("SELECT sr.id, sr.school_id, sr.subject_id, s.name as subject_name, sr.class_id, sr.status FROM subject_registrations sr LEFT JOIN subjects s ON sr.subject_id = s.id WHERE sr.class_id = :cid AND sr.academic_year = :ay AND sr.term = :t ORDER BY sr.subject_id");
    $stmt->execute([':cid' => $class_id, ':ay' => $sub, ':t' => $term]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "All subject registrations for class_id=$class_id, $sub, $term:\n";
    $wrong_ids = [];
    foreach ($records as $r) {
        $dup = ($r['school_id'] != $school_id) ? " <- WRONG school_id!" : " <- OK";
        if ($r['school_id'] != $school_id) $wrong_ids[] = $r['id'];
        echo "  ID={$r['id']} subj={$r['subject_id']} ({$r['subject_name']}) school_id={$r['school_id']} status={$r['status']}$dup\n";
    }

    // Bulk delete all wrong-school_id records
    echo "\n";
    if (count($wrong_ids) > 0) {
        $delete_all = isset($_GET['delete_all']) && $_GET['delete_all'] === '1';
        if ($delete_all) {
            $placeholders = implode(',', array_fill(0, count($wrong_ids), '?'));
            $del = $conn->prepare("DELETE FROM subject_registrations WHERE id IN ($placeholders)");
            $del->execute($wrong_ids);
            echo "Deleted " . count($wrong_ids) . " records with wrong school_id.\n";
        } else {
            echo "To delete all " . count($wrong_ids) . " wrong-school_id records, add: ?school_id=$school_id&class_id=$class_id&delete_all=1\n";
        }
    } else {
        echo "All records have correct school_id.\n";
    }

    // Also count any records with school_id=0 across all subject_registrations
    $stmt2 = $conn->prepare("SELECT COUNT(*) FROM subject_registrations WHERE school_id IS NULL OR school_id = 0");
    $stmt2->execute();
    $zero = (int)$stmt2->fetchColumn();
    echo "\nRecords with school_id=0 or NULL: $zero\n";

    // If there are still school_id=0 records, fix them
    if ($zero > 0) {
        $upd = $conn->prepare("UPDATE subject_registrations SET school_id = :sid WHERE school_id IS NULL OR school_id = 0");
        $upd->execute([':sid' => $school_id]);
        echo "Fixed $zero records to school_id = $school_id\n";
    }

    echo "\nDone.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
