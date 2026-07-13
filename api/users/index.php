<?php
/**
 * Users List API Endpoint
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

// Require authentication
$token_data = Middleware::requireAuth();

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

try {
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Re-resolve school_id now that connection exists
    $school_id = TenantMiddleware::resolveSchoolId($conn);
    
    // Get query parameters
    $role = $_GET['role'] ?? null;
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = max(1, intval($_GET['limit'] ?? 50));
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause — always scope by school_id
    $whereConditions = ["u.school_id = ?"];
    $params = [$school_id];
    
    if ($role && in_array($role, ['admin', 'teacher', 'parent', 'accountant'])) {
        $whereConditions[] = "u.role = ?";
        $params[] = $role;
    }
    
    if ($status && in_array($status, ['Active', 'Inactive'])) {
        $whereConditions[] = "u.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereConditions[] = "(u.username LIKE ? OR u.email LIKE ? OR CONCAT_WS(' ', t.first_name, t.other_name, t.last_name) LIKE ? OR CONCAT_WS(' ', p.first_name, p.last_name) LIKE ?)";
        $searchParam = "%$search%";
        $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam]);
    }
    
    $whereClause = "WHERE " . implode(" AND ", $whereConditions);
    
    // Check if accountants table exists (may not on all schools)
    $hasAccountants = false;
    try {
        $checkStmt = $conn->prepare("SELECT 1 FROM accountants LIMIT 1");
        $checkStmt->execute();
        $hasAccountants = true;
    } catch (Exception $e) {
        $hasAccountants = false;
    }
    
    // Get total count
    $countSql = "SELECT COUNT(DISTINCT u.id) as total FROM users u $whereClause";
    $stmt = $conn->prepare($countSql);
    foreach ($params as $i => $val) {
        $stmt->bindValue($i + 1, $val);
    }
    $stmt->execute();
    $total = $stmt->fetch()['total'];
    
    // Build main query with conditional accountants JOIN
    $joinClauses = [
        "LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher' AND t.school_id = ?",
        "LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent' AND p.school_id = ?"
    ];
    $joinParams = [$school_id, $school_id];
    
    if ($hasAccountants) {
        $joinClauses[] = "LEFT JOIN accountants a ON u.linked_id = a.id AND u.role = 'accountant' AND a.school_id = ?";
        $joinParams[] = $school_id;
    }
    
    $joinSQL = implode("\n        ", $joinClauses);
    
    $sql = "
        SELECT 
            u.id,
            u.username,
            u.email,
            u.role,
            u.linked_id,
            u.status,
            u.last_login,
            u.created_at,
            u.updated_at,
            COALESCE(t.first_name, p.first_name, " . ($hasAccountants ? "a.first_name" : "''") . ", '') as first_name,
            COALESCE(t.last_name, p.last_name, " . ($hasAccountants ? "a.last_name" : "''") . ", '') as last_name,
            t.other_name as other_name,
            CASE 
                WHEN u.role = 'teacher' THEN CONCAT_WS(' ', t.first_name, t.other_name, t.last_name)
                WHEN u.role = 'parent' THEN CONCAT_WS(' ', p.first_name, p.last_name)
                WHEN u.role = 'accountant' AND " . ($hasAccountants ? "1=1" : "1=0") . " THEN CONCAT_WS(' ', a.first_name, a.last_name)
                ELSE u.username
            END as display_name,
            CASE 
                WHEN u.role = 'teacher' THEN t.phone
                WHEN u.role = 'parent' THEN p.phone
                WHEN u.role = 'accountant' AND " . ($hasAccountants ? "1=1" : "1=0") . " THEN a.phone
                ELSE NULL
            END as phone,
            CASE 
                WHEN u.role = 'teacher' THEN t.employee_id
                WHEN u.role = 'accountant' AND " . ($hasAccountants ? "1=1" : "1=0") . " THEN a.employee_id
                ELSE NULL
            END as employee_id
        FROM users u
        $joinSQL
        $whereClause
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $mainParams = array_merge($params, $joinParams);
    
    $stmt = $conn->prepare($sql);
    foreach ($mainParams as $i => $val) {
        $stmt->bindValue($i + 1, $val);
    }
    $stmt->bindValue(count($mainParams) + 1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(count($mainParams) + 2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates
    foreach ($users as &$user) {
        $user['created_at'] = date('Y-m-d H:i:s', strtotime($user['created_at']));
        $user['updated_at'] = date('Y-m-d H:i:s', strtotime($user['updated_at']));
        $user['last_login'] = $user['last_login'] ? date('Y-m-d H:i:s', strtotime($user['last_login'])) : null;
    }
    
    Response::paginated($users, $page, $limit, $total, 'Users retrieved successfully');
    
} catch (Exception $e) {
    error_log('users/index.php error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    Response::serverError('Error: ' . $e->getMessage());
}
?>
