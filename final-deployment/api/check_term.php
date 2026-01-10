<?php
/**
 * Check current term in database
 */

// Database connection
$host = 'localhost';
$db_name = 'mdpjhtua_graceland_academy';
$username = 'mdpjhtua_graceland_academy';
$password = '159075321@Au';

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get current term and year
    $term_sql = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term'";
    $year_sql = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_academic_year'";
    
    $term_stmt = $conn->prepare($term_sql);
    $term_stmt->execute();
    $term_result = $term_stmt->fetch(PDO::FETCH_ASSOC);
    
    $year_stmt = $conn->prepare($year_sql);
    $year_stmt->execute();
    $year_result = $year_stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Current school settings',
        'current_term' => $term_result ? $term_result['setting_value'] : 'Not set',
        'current_academic_year' => $year_result ? $year_result['setting_value'] : 'Not set',
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
