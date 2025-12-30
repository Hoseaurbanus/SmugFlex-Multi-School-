<?php
/**
 * User Delete API Endpoint
 * Graceland Royal Academy School Management System
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
    
    // Start transaction
    $conn->beginTransaction();
    
    // Get user details before deletion
    $stmt = $conn->prepare("SELECT role, linked_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Delete linked record if it exists
    if ($user['linked_id'] && $user['linked_id'] > 0) {
        switch ($user['role']) {
            case 'teacher':
                $stmt = $conn->prepare("DELETE FROM teachers WHERE id = ?");
                $stmt->execute([$user['linked_id']]);
                break;
            case 'parent':
                $stmt = $conn->prepare("DELETE FROM parents WHERE id = ?");
                $stmt->execute([$user['linked_id']]);
                break;
            case 'accountant':
                $stmt = $conn->prepare("DELETE FROM accountants WHERE id = ?");
                $stmt->execute([$user['linked_id']]);
                break;
        }
    }
    
    // Delete user record
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
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
