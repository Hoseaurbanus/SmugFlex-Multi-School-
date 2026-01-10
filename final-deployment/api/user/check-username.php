<?php
/**
 * Check Username Availability API Endpoint
 * Graceland Royal Academy School Management System
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$username = trim($_GET['username'] ?? '');

if (empty($username)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username parameter is required']);
    exit();
}

try {
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $isTaken = $stmt->fetch() !== false;
    
    echo json_encode([
        'success' => true,
        'isAvailable' => !$isTaken
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
