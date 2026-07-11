<?php
/**
 * SQL Database Query API Endpoint - Working Version
 * SMugFlex 2.0 Multi-School Platform
 * Handles direct MySQL database operations for CSV imports
 * Integrates with existing database configuration
 */

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// SECURITY FIX: Restrict to admin/teacher/accountant only - parents cannot use raw SQL
try {
    $token_data = Middleware::requireAuth();
    $role = strtolower(trim((string)($token_data['role'] ?? '')));
    if ($role !== 'admin' && $role !== 'teacher' && $role !== 'accountant') {
        error_log("SECURITY: Access denied: User " . ($token_data['username'] ?? 'unknown') . " with role " . ($token_data['role'] ?? 'none') . " attempted to access database query endpoint.");
        Response::forbidden('Access denied: Only administrators, teachers, and accountants can execute database queries');
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
$query = ltrim($query);
$queryType = strtoupper(strtok($query, " \t\r\n"));

// Allow only a safe subset of SQL verbs
$allowed_verbs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
if (!in_array($queryType, $allowed_verbs, true)) {
    Response::badRequest("Disallowed query type: only SELECT, INSERT, UPDATE, DELETE are permitted.");
}

// Restrict write operations (INSERT, UPDATE, DELETE) to admin only
if (in_array($queryType, ['INSERT', 'UPDATE', 'DELETE'], true) && $role !== 'admin') {
    error_log("SECURITY: Write query denied for non-admin role '{$role}' by user " . ($token_data['username'] ?? 'unknown'));
    Response::forbidden('Only administrators can execute write operations (INSERT/UPDATE/DELETE)');
}

// Basic security check: prevent highly destructive queries
$disallowed_keywords = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE'];
foreach ($disallowed_keywords as $keyword) {
    // Match whole words only to avoid false positives on column names like created_at
    if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/i', $query)) {
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

    // Inject school_id scoping for multi-tenant isolation
    $school_id = TenantMiddleware::resolveSchoolId($pdo);
    $school_id = (int)$school_id;

    // Audit log for all queries
    error_log("SQL_QUERY_AUDIT: user=" . ($token_data['username'] ?? 'unknown') . " role={$role} type={$queryType} school_id={$school_id}");

    // Helper: check if a table has a school_id column
    function tableHasSchoolId($pdo, $tableName) {
        $tableName = preg_replace('/[^a-zA-Z0-9_]/', '', $tableName);
        if (empty($tableName)) return false;
        $colStmt = $pdo->prepare("SHOW COLUMNS FROM `$tableName` LIKE 'school_id'");
        $colStmt->execute();
        return $colStmt->fetch() !== false;
    }

    // Helper: extract primary table name from query
    function extractTableName($query, $queryType) {
        if ($queryType === 'INSERT') {
            if (preg_match('/INSERT\s+INTO\s+`?(\w+)`?/i', $query, $m)) return $m[1];
        } elseif ($queryType === 'UPDATE') {
            if (preg_match('/UPDATE\s+`?(\w+)`?/i', $query, $m)) return $m[1];
        } elseif ($queryType === 'DELETE') {
            if (preg_match('/DELETE\s+FROM\s+`?(\w+)`?/i', $query, $m)) return $m[1];
        } elseif ($queryType === 'SELECT') {
            if (preg_match('/FROM\s+`?(\w+)`?/i', $query, $m)) return $m[1];
        }
        return null;
    }

    $targetTable = extractTableName($query, $queryType);
    $hasSchoolId = $targetTable ? tableHasSchoolId($pdo, $targetTable) : false;

    if (!$hasSchoolId && $targetTable) {
        error_log("SQL_QUERY_AUDIT_WARNING: Table '{$targetTable}' has no school_id column — skipping tenant injection for query type {$queryType}");
    }

    $paramsArePositional = $params !== [] && array_keys($params) === range(0, count($params) - 1);

    $queryAlreadyHasSchoolId = preg_match('/\bschool_id\b/i', $query);

    if ($hasSchoolId && !$queryAlreadyHasSchoolId) {
        // Only inject school_id when query doesn't already reference it
        if ($queryType === 'SELECT' && $targetTable) {
            $schoolIdValue = $paramsArePositional ? (int)$school_id : ':_school_id_';
            if (preg_match('/\bWHERE\b/i', $query)) {
                $query = preg_replace('/\bWHERE\b/i', "WHERE {$targetTable}.school_id = {$schoolIdValue} AND ", $query, 1);
            } else {
                $query = preg_replace('/(\s+ORDER\s+BY|\s+LIMIT|\s*$)/i', " WHERE {$targetTable}.school_id = {$schoolIdValue} $1", $query, 1);
            }
            if (!$paramsArePositional) {
                $params[':_school_id_'] = $school_id;
            }
        } elseif ($paramsArePositional) {
            $quotedSchoolId = (int)$school_id;
            if (in_array($queryType, ['UPDATE', 'DELETE'], true)) {
                if (preg_match('/\bWHERE\b/i', $query)) {
                    $query .= " AND {$targetTable}.school_id = $quotedSchoolId";
                } else {
                    $query .= " WHERE {$targetTable}.school_id = $quotedSchoolId";
                }
            } elseif ($queryType === 'INSERT' && preg_match('/^INSERT\s+INTO\s+`?(\w+)`?\s*\(/i', $query)) {
                $query = preg_replace(
                    '/^INSERT\s+INTO\s+`?(\w+)`?\s*\(/i',
                    "INSERT INTO $1 (school_id, ",
                    $query
                );
                $query = preg_replace('/VALUES\s*\(/i', "VALUES ($quotedSchoolId, ", $query);
            }
        } else {
            // Named params for non-SELECT queries
            if ($queryType === 'INSERT' && preg_match('/^INSERT\s+INTO\s+`?(\w+)`?\s*\(/i', $query)) {
                $query = preg_replace(
                    '/^INSERT\s+INTO\s+`?(\w+)`?\s*\(/i',
                    "INSERT INTO $1 (school_id, ",
                    $query
                );
                $query = preg_replace('/VALUES\s*\(/i', "VALUES (:_school_id_, ", $query);
                $params[':_school_id_'] = $school_id;
            } elseif (in_array($queryType, ['UPDATE', 'DELETE'], true)) {
                $hasWhere = (bool)preg_match('/\bWHERE\b/i', $query);
                if ($hasWhere) {
                    $query .= " AND {$targetTable}.school_id = :_school_id_";
                } else {
                    $query .= " WHERE {$targetTable}.school_id = :_school_id_";
                }
                $params[':_school_id_'] = $school_id;
            }
        }
    }
    
    // Prepare and execute query
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    // Build flat response matching frontend expectations
    $response = [
        'success' => true,
        'status' => 200,
        'message' => 'Query executed successfully',
        'data' => null,
        'insertId' => null,
        'affectedRows' => null,
        'timestamp' => date('Y-m-d H:i:s')
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
    
    header('Content-Type: application/json');
    echo json_encode($response, JSON_PRETTY_PRINT);
    exit;
    
} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    Response::serverError('Database error: ' . $e->getMessage() . ' | Query: ' . $query . ' | Params: ' . json_encode($params));
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    Response::serverError('Error: ' . $e->getMessage());
}
?>
