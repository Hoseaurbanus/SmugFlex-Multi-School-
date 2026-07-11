<?php
header('Content-Type: text/plain');

try {
    require_once __DIR__ . '/config/database.php';
    $database = new Database();
    $pdo = $database->getConnection();
    echo "Connection OK\n\n";
    
    // Test the exact query from SubjectController.getAllSubjects
    $school_id = 4;
    $query = "SELECT s.*, 
                     (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub) as assignment_count
               FROM subjects s
               WHERE s.school_id = :school_id
               ORDER BY s.name ASC
               LIMIT 100 OFFSET 0";
    
    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
    $stmt->bindValue(':school_id_sub', $school_id, PDO::PARAM_INT);
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Query OK - " . count($results) . " rows returned\n\n";
    print_r($results);
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";
    if ($e instanceof PDOException) {
        echo "SQL State: " . $e->errorInfo[0] . "\n";
        echo "Driver Code: " . $e->errorInfo[1] . "\n";
        echo "Driver Message: " . $e->errorInfo[2] . "\n";
    }
}
