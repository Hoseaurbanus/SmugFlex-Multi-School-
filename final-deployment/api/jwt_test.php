<?php
/**
 * JWT Test Endpoint
 * POST /api/jwt_test.php with Authorization header to test token validation
 */

require_once 'config/database.php';
require_once 'helpers/JWT.php';
require_once 'helpers/Response.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
    exit;
}

try {
    // Get auth headers
    $headers = getallheaders();

    // Test token validation
    $token_data = JWT::validateToken($headers);

    if ($token_data) {
        Response::success([
            'message' => 'Token validation successful',
            'user' => [
                'user_id' => $token_data['user_id'] ?? null,
                'username' => $token_data['username'] ?? null,
                'role' => $token_data['role'] ?? null,
                'linked_id' => $token_data['linked_id'] ?? null
            ],
            'token_expires' => isset($token_data['exp']) ? date('Y-m-d H:i:s', $token_data['exp']) : null,
            'current_time' => date('Y-m-d H:i:s')
        ], 'Token is valid');
    } else {
        Response::unauthorized('Invalid or expired token');
    }
} catch (Exception $e) {
    error_log("JWT Test Error: " . $e->getMessage());
    Response::serverError('Test failed: ' . $e->getMessage());
}
?>
