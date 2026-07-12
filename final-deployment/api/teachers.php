<?php
// Teachers endpoint
require_once 'helpers/Cors.php';
Cors::handle();
header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    require_once 'helpers/Middleware.php';
    require_once 'helpers/TenantMiddleware.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    $token_data = Middleware::requireAuth();
    $school_id = TenantMiddleware::resolveSchoolId($conn);
    
    $sql = "SELECT id, first_name, last_name, email, phone, employee_id, status FROM teachers WHERE school_id = :school_id ORDER BY first_name, last_name";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
    $stmt->execute();
    $result = $stmt;
    
    $teachers = [];
    $rawCount = 0;
    if ($result) {
        $rawCount = $result->rowCount();
        while($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $teachers[] = $row;
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Teachers loaded successfully',
        'data' => $teachers,
        'count' => count($teachers),
        'raw_count' => $rawCount,
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
