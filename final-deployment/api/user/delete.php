<?php
/**
 * User Delete API Endpoint
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../helpers/Cors.php';
Cors::handle();
header('Content-Type: application/json');

require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

// Require authentication
$token_data = Middleware::requireAuth();

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get user ID from URL
$userId = $_GET['id'] ?? null;

if (!$userId || !is_numeric($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid user ID required']);
    exit();
}

try {
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    $school_id = TenantMiddleware::resolveSchoolId($conn);
    
    // Start transaction
    $conn->beginTransaction();
    
    // Get user details before deletion — scoped to school
    $stmt = $conn->prepare("SELECT role, linked_id FROM users WHERE id = ? AND school_id = ?");
    $stmt->execute([$userId, $school_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Delete linked record if it exists — scoped to school
    if ($user['linked_id'] && $user['linked_id'] > 0) {
        switch ($user['role']) {
            case 'teacher':
                $stmt = $conn->prepare("DELETE FROM teachers WHERE id = ? AND school_id = ?");
                $stmt->execute([$user['linked_id'], $school_id]);
                break;
            case 'parent':
                $stmt = $conn->prepare("DELETE FROM parents WHERE id = ? AND school_id = ?");
                $stmt->execute([$user['linked_id'], $school_id]);
                break;
            case 'accountant':
                $stmt = $conn->prepare("DELETE FROM accountants WHERE id = ? AND school_id = ?");
                $stmt->execute([$user['linked_id'], $school_id]);
                break;
        }
    }
    
    // Delete user record — scoped to school
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND school_id = ?");
    $stmt->execute([$userId, $school_id]);
    $userDeleted = $stmt->rowCount();

    if ($userDeleted < 1) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete user record']);
        exit();
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'User deleted successfully',
        'data' => [
            'id' => $userId,
            'role' => $user['role'],
            'linked_id' => $user['linked_id']
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    if (isset($conn)) {
        $conn->rollBack();
    }
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
