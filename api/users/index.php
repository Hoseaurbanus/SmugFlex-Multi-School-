<?php
/**
 * Users List API Endpoint
 * Graceland Royal Academy School Management System
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Get query parameters
    $role = $_GET['role'] ?? null;
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = max(1, intval($_GET['limit'] ?? 50));
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
    $whereConditions = [];
    $params = [];
    
    if ($role && in_array($role, ['admin', 'teacher', 'parent', 'accountant'])) {
        $whereConditions[] = "u.role = ?";
        $params[] = $role;
    }
    
    if ($status && in_array($status, ['Active', 'Inactive'])) {
        $whereConditions[] = "u.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $whereConditions[] = "(u.username LIKE ? OR u.email LIKE ? OR CONCAT(t.first_name, ' ', t.last_name) LIKE ? OR CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR CONCAT(a.first_name, ' ', a.last_name) LIKE ?)";
        $searchParam = "%$search%";
        $params = array_merge($params, [$searchParam, $searchParam, $searchParam, $searchParam, $searchParam]);
    }
    
    $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
    
    // Get total count
    $countSql = "
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'
        LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent'
        LEFT JOIN accountants a ON u.linked_id = a.id AND u.role = 'accountant'
        $whereClause
    ";
    $stmt = $conn->prepare($countSql);
    $stmt->execute($params);
    $total = $stmt->fetch()['total'];
    
    // Get users with linked data
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
            CASE 
                WHEN u.role = 'teacher' THEN CONCAT(t.first_name, ' ', t.last_name)
                WHEN u.role = 'parent' THEN CONCAT(p.first_name, ' ', p.last_name)
                WHEN u.role = 'accountant' THEN CONCAT(a.first_name, ' ', a.last_name)
                ELSE u.username
            END as display_name,
            CASE 
                WHEN u.role = 'teacher' THEN t.phone
                WHEN u.role = 'parent' THEN p.phone
                WHEN u.role = 'accountant' THEN a.phone
                ELSE NULL
            END as phone,
            CASE 
                WHEN u.role = 'teacher' THEN t.employee_id
                WHEN u.role = 'accountant' THEN a.employee_id
                ELSE NULL
            END as employee_id
        FROM users u
        LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'
        LEFT JOIN parents p ON u.linked_id = p.id AND u.role = 'parent'
        LEFT JOIN accountants a ON u.linked_id = a.id AND u.role = 'accountant'
        $whereClause
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format dates and add additional fields
    foreach ($users as &$user) {
        $user['created_at'] = date('Y-m-d H:i:s', strtotime($user['created_at']));
        $user['updated_at'] = date('Y-m-d H:i:s', strtotime($user['updated_at']));
        $user['last_login'] = $user['last_login'] ? date('Y-m-d H:i:s', strtotime($user['last_login'])) : null;
        
        // Add first_name and last_name for frontend compatibility
        if ($user['role'] === 'teacher') {
            $stmt = $conn->prepare("SELECT first_name, last_name FROM teachers WHERE id = ?");
            $stmt->execute([$user['linked_id']]);
            $teacher = $stmt->fetch(PDO::FETCH_ASSOC);
            $user['first_name'] = $teacher['first_name'] ?? '';
            $user['last_name'] = $teacher['last_name'] ?? '';
        } elseif ($user['role'] === 'parent') {
            $stmt = $conn->prepare("SELECT first_name, last_name FROM parents WHERE id = ?");
            $stmt->execute([$user['linked_id']]);
            $parent = $stmt->fetch(PDO::FETCH_ASSOC);
            $user['first_name'] = $parent['first_name'] ?? '';
            $user['last_name'] = $parent['last_name'] ?? '';
        } elseif ($user['role'] === 'accountant') {
            $stmt = $conn->prepare("SELECT first_name, last_name FROM accountants WHERE id = ?");
            $stmt->execute([$user['linked_id']]);
            $accountant = $stmt->fetch(PDO::FETCH_ASSOC);
            $user['first_name'] = $accountant['first_name'] ?? '';
            $user['last_name'] = $accountant['last_name'] ?? '';
        } else {
            $user['first_name'] = '';
            $user['last_name'] = '';
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'items' => $users,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
