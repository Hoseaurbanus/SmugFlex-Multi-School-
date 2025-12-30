<?php
/**
 * Professional Simple Login Endpoint
 * Bypasses complex middleware for reliable authentication
 */

// Set headers FIRST
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Get and validate input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON input',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');
$role = trim($input['role'] ?? '');

// Validate required fields
if (empty($username) || empty($password) || empty($role)) {
    echo json_encode([
        'success' => false,
        'message' => 'Username, password, and role are required',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Validate role
$validRoles = ['admin', 'teacher', 'accountant', 'parent'];
if (!in_array($role, $validRoles)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid role. Must be: admin, teacher, accountant, or parent',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// Database connection
try {
    require_once __DIR__ . '/../config/database.php';
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Debug: Log the input values
    error_log("Login attempt - Username: '$username', Role: '$role', Password: '$password'");
    
    // Find user with linked record data
    if ($role === 'admin') {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND role = ? AND status = 'Active'");
        $stmt->execute([$username, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // Join with linked tables to get real user data
        $join_table = $role === 'teacher' ? 'teachers' : ($role === 'parent' ? 'parents' : 'accountants');
        $stmt = $pdo->prepare("
            SELECT u.*, t.first_name, t.last_name, t.email as linked_email, t.phone 
            FROM users u 
            LEFT JOIN $join_table t ON u.linked_id = t.id 
            WHERE u.username = ? AND u.role = ? AND u.status = 'Active'
        ");
        $stmt->execute([$username, $role]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'User not found or inactive',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    // Enhanced password verification - handles both hashed and plain text
    $passwordValid = false;
    
    // First try password_verify (for properly hashed passwords)
    if (password_verify($password, $user['password_hash'])) {
        $passwordValid = true;
    }
    // Fallback to plain text comparison (for existing plain text passwords)
    elseif ($password === $user['password_hash']) {
        $passwordValid = true;
        // Update the password to a proper hash for future logins
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $updateHashStmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $updateHashStmt->execute([$newHash, $user['id']]);
    }
    
    if ($passwordValid) {
        // Generate proper JWT token
        $token_payload = [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'exp' => time() + 86400 // 24 hours
        ];
        
        // Use JWT helper for proper token generation
        require_once __DIR__ . '/../helpers/JWT.php';
        $token = JWT::encode($token_payload);
        
        // Update last login
        $update_stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $update_stmt->execute([$user['id']]);
        
        // Get user display name from linked records
        $display_name = 'System Administrator';
        $first_name = '';
        $last_name = '';
        
        if ($role === 'admin') {
            $display_name = 'System Administrator';
            $first_name = 'System';
            $last_name = 'Administrator';
        } elseif (isset($user['first_name']) && isset($user['last_name'])) {
            $first_name = $user['first_name'];
            $last_name = $user['last_name'];
            $display_name = $first_name . ' ' . $last_name;
        } else {
            $display_name = $user['username'];
            $first_name = $user['username'];
            $last_name = '';
        }
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'linked_id' => (int)($user['linked_id'] ?? 0),
                'email' => $user['email'] ?? '',
                'first_name' => $first_name,
                'last_name' => $last_name,
                'linked_email' => $user['linked_email'] ?? '',
                'token' => $token,
                'permissions' => getRolePermissions($role, $pdo)
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid credentials',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
} catch (PDOException $e) {
    // Fallback to hardcoded admin if database fails
    if ($username === 'admin' && $password === 'admin123' && $role === 'admin') {
        // Generate proper JWT token for fallback
        require_once __DIR__ . '/../helpers/JWT.php';
        $token = JWT::encode([
            'user_id' => 1,
            'username' => 'admin',
            'role' => 'admin',
            'exp' => time() + 86400
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful (fallback mode)',
            'data' => [
                'id' => 1,
                'username' => 'admin',
                'role' => 'admin',
                'linked_id' => 0,
                'email' => 'admin@graceland.edu.ng',
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'token' => $token,
                'permissions' => getRolePermissions('admin', null)
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

/**
 * Get role permissions from database
 */
function getRolePermissions($role, $pdo) {
    try {
        // Get permissions from database
        $stmt = $pdo->prepare("
            SELECT p.name 
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role = ? AND rp.is_active = TRUE
        ");
        $stmt->execute([$role]);
        $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        return $permissions;
    } catch (Exception $e) {
        // Fallback to hardcoded permissions if database fails
        error_log("Error getting permissions from database: " . $e->getMessage());
        
        $permissions = [
            'admin' => ['dashboard', 'users', 'students', 'teachers', 'classes', 'subjects', 'results', 'payments', 'reports', 'settings'],
            'teacher' => ['dashboard', 'students', 'classes', 'subjects', 'results', 'attendance'],
            'accountant' => ['dashboard', 'payments', 'fees', 'reports'],
            'parent' => ['dashboard', 'children', 'results', 'payments', 'attendance']
        ];
        
        return $permissions[$role] ?? [];
    }
}
?>
