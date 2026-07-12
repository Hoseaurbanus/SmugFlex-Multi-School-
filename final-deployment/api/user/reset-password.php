<?php
/**
 * Reset Password API Endpoint
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../helpers/Cors.php';
Cors::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

// Only allow POST/PATCH requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PATCH'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

$userId = $input['id'] ?? null;
$newPassword = $input['password'] ?? null;

if (!$userId || !is_numeric($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid user ID required']);
    exit();
}

try {
    // Only admins can reset passwords
    Middleware::requireRole('admin');

    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    $school_id = TenantMiddleware::resolveSchoolId($conn);
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ? AND school_id = ?");
    $stmt->execute([$userId, $school_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Generate password if not provided
    if (!$newPassword) {
        $chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
        $newPassword = "";
        for ($i = 0; $i < 12; $i++) {
            $newPassword .= $chars[rand(0, strlen($chars) - 1)];
        }
    }
    
    // Hash the password
    $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT);
    
    // Update password and set reset token expiry
    $stmt = $conn->prepare("
        UPDATE users 
        SET password_hash = ?, 
            password_reset_token = NULL, 
            password_reset_expires = NULL,
            updated_at = NOW() 
        WHERE id = ? AND school_id = ?
    ");
    $stmt->execute([$passwordHash, $userId, $school_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successfully',
        'data' => [
            'id' => $userId,
            'username' => $user['username'],
            'email' => $user['email'],
            'temp_password' => $newPassword
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>

