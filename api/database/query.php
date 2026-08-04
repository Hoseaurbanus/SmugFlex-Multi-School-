<?php
/**
 * SQL Database Query API Endpoint - Working Version
 * SMugFlex 2.0 Multi-School Platform
 * Handles direct MySQL database operations for CSV imports
 * Integrates with existing database configuration
 */

require_once __DIR__ . '/../helpers/Cors.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

Cors::handle();

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
$disallowed_keywords = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE', 'UNION', 'INTO OUTFILE', 'INTO DUMPFILE', 'LOAD_FILE'];
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

    // AUDIT: restrict non-admin roles to specific tables
    $adminOnlyTables = ['super_admins', 'token_blacklist', 'schools', 'rate_limits'];
    $teacherAccountantAllowedTables = [
        'students', 'teachers', 'classes', 'subjects', 'subject_assignments',
        'results', 'compiled_results', 'scores', 'attendance', 'attendance_records',
        'payments', 'fee_structures', 'student_fee_balances', 'invoices',
        'assignments', 'notifications', 'parents', 'parent_student_links',
        'academic_years', 'school_settings', 'users', 'departments',
        'cbt_exams', 'cbt_questions', 'cbt_attempts', 'cbt_answers',
        'progression_rules', 'student_promotions'
    ];

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

    // Helper: extract primary table name and alias from query
    function extractTableName($query, $queryType) {
        if ($queryType === 'INSERT') {
            if (preg_match('/INSERT\s+INTO\s+`?(\w+)`?/i', $query, $m)) return ['name' => $m[1], 'alias' => null];
        } elseif ($queryType === 'UPDATE') {
            if (preg_match('/UPDATE\s+`?(\w+)`?/i', $query, $m)) return ['name' => $m[1], 'alias' => null];
        } elseif ($queryType === 'DELETE') {
            if (preg_match('/DELETE\s+FROM\s+`?(\w+)`?/i', $query, $m)) return ['name' => $m[1], 'alias' => null];
        } elseif ($queryType === 'SELECT') {
            // Match "FROM tablename alias" where alias is optional
            if (preg_match('/FROM\s+`?(\w+)`?\s+(?:AS\s+)?(\w+)?/i', $query, $m)) {
                $alias = !empty($m[2]) && !in_array(strtoupper($m[2]), ['WHERE', 'JOIN', 'ON', 'LEFT', 'RIGHT', 'INNER', 'CROSS', 'GROUP', 'ORDER', 'LIMIT', 'UNION', 'HAVING', 'SET']) ? $m[2] : null;
                return ['name' => $m[1], 'alias' => $alias];
            }
        }
        return ['name' => null, 'alias' => null];
    }

    $targetTable = extractTableName($query, $queryType);
    $tableRef = $targetTable['alias'] ?: $targetTable['name'];
    $hasSchoolId = $tableRef ? tableHasSchoolId($pdo, $targetTable['name']) : false;

    // ENFORCE table access: block admin-only tables for non-admin roles
    if ($targetTable['name'] && in_array(strtolower($targetTable['name']), $adminOnlyTables) && $role !== 'admin') {
        error_log("SECURITY: Non-admin role '{$role}' blocked from accessing admin-only table '{$targetTable['name']}'");
        Response::forbidden('Access denied: You do not have permission to access this table');
    }

    // ENFORCE table access: teacher/accountant can only query allowed tables
    if ($targetTable['name'] && $role !== 'admin' && !in_array(strtolower($targetTable['name']), $teacherAccountantAllowedTables)) {
        error_log("SECURITY: Role '{$role}' blocked from accessing table '{$targetTable['name']}' — not in allowed list");
        Response::forbidden('Access denied: You do not have permission to access this table');
    }

    if (!$hasSchoolId && $targetTable['name']) {
        error_log("SQL_QUERY_AUDIT_WARNING: Table '{$targetTable['name']}' has no school_id column — skipping tenant injection for query type {$queryType}");
    }

    $paramsArePositional = $params !== [] && array_keys($params) === range(0, count($params) - 1);

    $queryAlreadyHasSchoolId = preg_match('/\bschool_id\b/i', $query);

    if ($hasSchoolId && !$queryAlreadyHasSchoolId) {
        // Use alias when available (MySQL requires alias when table is aliased)
        $schoolIdCol = $tableRef . '.school_id';

        if ($queryType === 'SELECT' && $targetTable['name']) {
            $schoolIdValue = $paramsArePositional ? (int)$school_id : ':_school_id_';
            if (preg_match('/\bWHERE\b/i', $query)) {
                $query = preg_replace('/\bWHERE\b/i', "WHERE {$schoolIdCol} = {$schoolIdValue} AND ", $query, 1);
            } else {
                $query = preg_replace('/(\s+ORDER\s+BY|\s+LIMIT|\s*$)/i', " WHERE {$schoolIdCol} = {$schoolIdValue} $1", $query, 1);
            }
            if (!$paramsArePositional) {
                $params[':_school_id_'] = $school_id;
            }
        } elseif ($paramsArePositional) {
            $quotedSchoolId = (int)$school_id;
            if (in_array($queryType, ['UPDATE', 'DELETE'], true)) {
                if (preg_match('/\bWHERE\b/i', $query)) {
                    $query .= " AND {$schoolIdCol} = $quotedSchoolId";
                } else {
                    $query .= " WHERE {$schoolIdCol} = $quotedSchoolId";
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
                    $query .= " AND {$schoolIdCol} = :_school_id_";
                } else {
                    $query .= " WHERE {$schoolIdCol} = :_school_id_";
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
    Response::serverError('A database error occurred. Please check your query syntax.');
} catch (Exception $e) {
    error_log("General Error: " . $e->getMessage());
    Response::serverError('An error occurred while processing your request.');
}
?>
