<?php
/**
 * Test Database Query - Original logic but without JWT
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Validate required fields
if (!isset($input['query'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: query']);
    exit();
}

$query = $input['query'];
$params = $input['params'] ?? [];

// Basic security check: prevent highly destructive queries
$disallowed_keywords = ['DROP', 'TRUNCATE'];
foreach ($disallowed_keywords as $keyword) {
    if (stripos($query, $keyword) !== false) {
        http_response_code(400);
        echo json_encode(['error' => "Disallowed query type: {$keyword} statements are not permitted."]);
        exit();
    }
}

try {
    // Use existing database configuration
    require_once __DIR__ . '/config/database.php';
    
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
    $queryType = strtoupper(substr(ltrim($query), 0, 6));
    
    $response = [
        'success' => true,
        'data' => null,
        'insertId' => null,
        'affectedRows' => null
    ];
    
    switch ($queryType) {
        case 'INSERT':
            $response['insertId'] = $pdo->lastInsertId();
            $response['affectedRows'] = $stmt->rowCount();
            break;
            
        case 'UPDATE':
        case 'DELETE':
            $response['affectedRows'] = $stmt->rowCount();
            break;
            
        case 'SELECT':
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        default:
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['affectedRows'] = $stmt->rowCount();
    }
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database operation failed: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Operation failed: ' . $e->getMessage()
    ]);
}
?>
