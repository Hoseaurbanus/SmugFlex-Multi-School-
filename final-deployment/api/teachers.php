<?php
// Teachers endpoint
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
    
    $sql = "SELECT id, first_name, last_name, email, phone, employee_id, status FROM teachers ORDER BY first_name, last_name";
    $result = $conn->query($sql);
    
    $teachers = [];
    if ($result && $result->rowCount() > 0) {
        while($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $teachers[] = $row;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Teachers loaded successfully',
        'data' => $teachers,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
