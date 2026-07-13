<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';

// Test stats query directly
try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $result = [];
    
    // Test 1: schools query
    try {
        $row = $conn->query("
            SELECT COUNT(*) as total, SUM(status='active') as active
            FROM schools
        ")->fetch(PDO::FETCH_ASSOC);
        $result['schools'] = $row;
    } catch (Throwable $e) {
        $result['schools_error'] = $e->getMessage();
    }
    
    // Test 2: students count
    try {
        $result['students'] = (int)$conn->query("SELECT COUNT(*) FROM students")->fetchColumn();
    } catch (Throwable $e) {
        $result['students_error'] = $e->getMessage();
    }
    
    // Test 3: teachers count
    try {
        $result['teachers'] = (int)$conn->query("SELECT COUNT(*) FROM teachers")->fetchColumn();
    } catch (Throwable $e) {
        $result['teachers_error'] = $e->getMessage();
    }
    
    // Test 4: auth check
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $token = JWT::validateToken($headers, true);
    $result['auth'] = $token ? 'VALID (super_admin_id=' . ($token['super_admin_id'] ?? '?') . ')' : 'INVALID';
    
    echo json_encode(['success' => true, 'data' => $result], JSON_PRETTY_PRINT);
    
} catch (Throwable $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}
