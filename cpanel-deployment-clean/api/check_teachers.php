<?php
/**
 * Check teachers table structure
 */

// Database connection
$host = 'localhost';
$db_name = 'mdpjhtua_graceland_academy';
$username = 'mdpjhtua_graceland_academy';
$password = '159075321@Au';

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get table structure
    $sql = "DESCRIBE teachers";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Teachers table structure',
        'columns' => $columns,
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
