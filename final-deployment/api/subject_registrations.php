<?php
// Subject registrations endpoint
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once 'config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get all subject registrations
    $sql = "SELECT sr.*, s.name as subject_name, c.name as class_name 
            FROM subject_registrations sr 
            LEFT JOIN subjects s ON sr.subject_id = s.id 
            LEFT JOIN classes c ON sr.class_id = c.id 
            WHERE sr.status = 'Active' 
            ORDER BY sr.created_at DESC";

    // Use PDO to execute the query (Database::getConnection returns a PDO instance)
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $registrations,
        'count' => count($registrations)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
