<?php
/**
 * Health Check Endpoint (standardized responses)
 */
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

try {
    $database = new Database();
    $conn = $database->getConnection();

    if ($conn) {
        $result = $conn->query("SELECT 1");

        if ($result) {
            Response::success(['database' => 'connected'], 'System healthy');
        } else {
            Response::serverError('Database query failed');
        }
    } else {
        Response::serverError('Database connection failed');
    }
} catch (Exception $e) {
    Response::serverError('System unhealthy');
}
?>
