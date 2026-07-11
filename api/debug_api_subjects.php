<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Accept token from query param
$token = isset($_GET['token']) ? trim($_GET['token']) : '';
if ($token) {
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
    // Also support getallheaders()
    $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
}

// Override getallheaders if needed
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headerName = str_replace(' ', '-', ucwords(str_replace('_', ' ', substr($name, 5))));
                $headers[$headerName] = $value;
            }
        }
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
        }
        return $headers;
    }
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/helpers/RealtimeEvents.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';

// First show what headers we have
echo "=== Request Headers ===\n";
if (function_exists('getallheaders')) {
    $h = getallheaders();
    foreach ($h as $k => $v) {
        if (strtolower($k) === 'authorization') {
            echo "$k: " . substr($v, 0, 30) . "...\n";
        } else {
            echo "$k: $v\n";
        }
    }
}
echo "\n";

echo "=== _SERVER Auth vars ===\n";
echo 'HTTP_AUTHORIZATION: ' . (isset($_SERVER['HTTP_AUTHORIZATION']) ? substr($_SERVER['HTTP_AUTHORIZATION'], 0, 30) . '...' : 'NOT SET') . "\n";
echo 'REDIRECT_HTTP_AUTHORIZATION: ' . (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? substr($_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 0, 30) . '...' : 'NOT SET') . "\n";

echo "\n=== Testing SubjectController::getAllSubjects() ===\n\n";

try {
    // Capture output from Response calls
    ob_start();

    $database = new Database();
    $conn = $database->getConnection();
    echo "Database connection: OK\n";

    // Simulate the exact flow of getAllSubjects
    echo "Calling Middleware::requireAnyRole...\n";
    $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
    echo "Auth OK. User ID: {$token_data['user_id']}, Role: {$token_data['role']}, School ID from token: {$token_data['school_id']}\n";

    echo "Calling TenantMiddleware::resolveSchoolId...\n";
    $school_id = TenantMiddleware::resolveSchoolId($conn);
    echo "School ID: $school_id\n";

    echo "Calling Middleware::getPaginationParams...\n";
    $pagination = Middleware::getPaginationParams();
    echo "Limit: {$pagination['limit']}, Offset: {$pagination['offset']}\n";

    echo "Calling Middleware::getSearchParams...\n";
    $search_params = Middleware::getSearchParams(['id', 'name', 'code', 'category']);
    echo "Sort: {$search_params['sort_by']} {$search_params['sort_order']}, Search: '{$search_params['search']}'\n";

    // Replicate the exact query from getAllSubjects
    echo "\nBuilding and executing query...\n";

    $query = "SELECT s.*, 
                     (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub) as assignment_count
               FROM subjects s";
    
    $count_query = "SELECT COUNT(*) as total FROM subjects s";

    $conditions = ["s.school_id = :school_id"];
    $params = [':school_id' => $school_id, ':school_id_sub' => $school_id];

    if (!empty($search_params['search'])) {
        $conditions[] = "(s.name LIKE :search OR s.code LIKE :search OR s.description LIKE :search)";
        $search_param = '%' . $search_params['search'] . '%';
        $params[':search'] = $search_param;
    }

    if (isset($_GET['category'])) {
        $conditions[] = "s.category = :category";
        $params[':category'] = Middleware::validateEnum($_GET['category'], ['Creche', 'Nursery', 'Primary', 'JSS', 'SS', 'General'], 'category');
    }

    if (isset($_GET['is_core'])) {
        $conditions[] = "s.is_core = :is_core";
        $params[':is_core'] = (bool)$_GET['is_core'];
    }

    if (!empty($conditions)) {
        $query .= " WHERE " . implode(' AND ', $conditions);
        $count_query .= " WHERE " . implode(' AND ', $conditions);
    }

    $query .= " ORDER BY s.{$search_params['sort_by']} {$search_params['sort_order']}";
    $query .= " LIMIT :limit OFFSET :offset";

    echo "Query: $query\n";
    echo "Params: " . json_encode($params) . "\n";

    $stmt = $conn->prepare($query);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
    $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
    $stmt->execute();

    $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Subjects found: " . count($subjects) . "\n";
    if (count($subjects) > 0) {
        echo "First subject: " . print_r($subjects[0], true) . "\n";
    }

    // Get total count
    $count_stmt = $conn->prepare($count_query);
    foreach ($params as $key => $value) {
        $count_stmt->bindValue($key, $value);
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch()['total'];
    echo "Total: $total\n";

    ob_end_clean();

} catch (PDOException $e) {
    ob_end_clean();
    echo "PDOException: " . $e->getMessage() . "\n";
    echo "Code: " . $e->getCode() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
} catch (Exception $e) {
    ob_end_clean();
    echo "Exception: " . get_class($e) . ": " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
