<?php
/**
 * SQL Database Query API Endpoint - Working Version
 * Graceland Royal Academy School Management System
 * Handles direct MySQL database operations for CSV imports
 * Integrates with existing database configuration
 */

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Require authentication and basic RBAC
try {
    $token_data = Middleware::requireAuth();
    $allowed_roles = ['admin', 'teacher', 'accountant'];
    if (!in_array($token_data['role'] ?? '', $allowed_roles, true)) {
        error_log("Access denied: User " . ($token_data['username'] ?? 'unknown') . " with role " . ($token_data['role'] ?? 'none') . " attempted to access database query endpoint.");
        Response::forbidden('Access denied for this operation');
    }
} catch (Exception $e) {
    error_log("Authentication failed for database query: " . $e->getMessage());
    Response::unauthorized('Authentication required');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    Response::badRequest('Invalid JSON input');
}

// Validate required fields
if (!isset($input['query'])) {
    Response::badRequest('Missing required field: query');
}

$query = $input['query'];
$params = $input['params'] ?? [];

// Normalize query (trim leading/trailing spaces)
$normalized = ltrim($query);
$queryType = strtoupper(strtok($normalized, " \t\r\n"));

// Allow only a safe subset of SQL verbs
$allowed_verbs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
if (!in_array($queryType, $allowed_verbs, true)) {
    Response::badRequest("Disallowed query type: only SELECT, INSERT, UPDATE, DELETE are permitted.");
}

// Basic security check: prevent highly destructive queries
$disallowed_keywords = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE'];
foreach ($disallowed_keywords as $keyword) {
    if (stripos($query, $keyword) !== false) {
        Response::badRequest("Disallowed query type: {$keyword} statements are not permitted.");
    }
}

try {
    // Use existing database configuration
    require_once __DIR__ . '/../config/database.php';
    
    // Create database connection using existing config
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception('Database connection failed');
    }
    
    // Prepare and execute query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    // Determine query type and return appropriate response
    // $queryType determined above from normalized query
    
    $payload = [
        'data' => null,
        'insertId' => null,
        'affectedRows' => null
    ];
    
    switch ($queryType) {
        case 'INSERT':
            $payload['insertId'] = $pdo->lastInsertId();
            $payload['affectedRows'] = $stmt->rowCount();
            break;
            
        case 'UPDATE':
        case 'DELETE':
            $payload['affectedRows'] = $stmt->rowCount();
            break;
            
        case 'SELECT':
            $payload['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        default:
            $payload['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $payload['affectedRows'] = $stmt->rowCount();
    }
    
    Response::success($payload, 'Query executed successfully');
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    Response::serverError('Database operation failed');
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    Response::serverError('Operation failed');
}
?>
