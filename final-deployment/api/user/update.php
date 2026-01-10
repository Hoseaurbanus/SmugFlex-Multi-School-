<?php
/**
 * User Update API Endpoint
 * Graceland Royal Academy School Management System
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow PUT/PATCH requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'])) {
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

// Get user ID from URL or request body
$userId = $_GET['id'] ?? $input['id'] ?? null;

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
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Build update query dynamically
    $allowedFields = ['username', 'email', 'status', 'password_hash'];
    $updateFields = [];
    $updateValues = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field]) && !empty(trim($input[$field]))) {
            // Special handling for username and email uniqueness
            if ($field === 'username') {
                $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                $stmt->execute([$input[$field], $userId]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Username already exists']);
                    exit();
                }
            }
            
            if ($field === 'email') {
                $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                $stmt->execute([$input[$field], $userId]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Email already exists']);
                    exit();
                }
            }
            
            $updateFields[] = "$field = ?";
            $updateValues[] = trim($input[$field]);
        }
    }
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit();
    }
    
    // Add updated_at timestamp
    $updateFields[] = "updated_at = NOW()";
    $updateValues[] = $userId;
    
    $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($updateValues);
    
    echo json_encode([
        'success' => true,
        'message' => 'User updated successfully',
        'data' => [
            'id' => $userId,
            'updated_fields' => array_keys($input)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
