<?php
/**
 * Test what frontend actually sends - simulate the exact request
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

echo json_encode([
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'post_data' => file_get_contents('php://input'),
    'headers' => getallheaders(),
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
