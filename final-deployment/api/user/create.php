<?php
/**
 * User Creation API Endpoint
 * SMugFlex 2.0 Multi-School Platform
 * Handles complete user creation with linked records
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

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
$required_fields = ['username', 'email', 'role', 'password'];
foreach ($required_fields as $field) {
    if (!isset($input[$field]) || empty(trim((string)$input[$field]))) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit();
    }
}

$username = trim((string)$input['username']);
$email = trim(strtolower((string)$input['email']));
$role = (string)$input['role'];

// firstName/lastName are required for non-admin roles. For admin creation, default them.
$firstName = isset($input['firstName']) ? trim((string)$input['firstName']) : '';
$lastName = isset($input['lastName']) ? trim((string)$input['lastName']) : '';
if (strtolower($role) === 'admin') {
    if ($firstName === '') $firstName = $username;
    if ($lastName === '') $lastName = 'Admin';
} else {
    if ($firstName === '' || $lastName === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required field: firstName/lastName']);
        exit();
    }
}

$password = (string)$input['password'];
$phone = $input['phone'] ?? '';
$address = $input['address'] ?? '';
$occupation = $input['occupation'] ?? '';
$status = $input['status'] ?? 'Active';

// Securely hash the password
$password_hash = password_hash($password, PASSWORD_BCRYPT);

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit();
}

// Validate role
$valid_roles = ['admin', 'teacher', 'parent', 'accountant'];
if (!in_array($role, $valid_roles)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid role specified']);
    exit();
}

try {
    // Only admins can create users
    Middleware::requireRole('admin');

    // Use existing database configuration
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Resolve school_id from auth token
    $school_id = TenantMiddleware::resolveSchoolId($conn);

    // Begin transaction for data consistency
    $conn->beginTransaction();
    
    // Check for duplicate username
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        $conn->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Username already exists']);
        exit();
    }
    
    // Check for duplicate email
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        $conn->rollBack();
        http_response_code(400);
        echo json_encode(['error' => 'Email already exists']);
        exit();
    }
    
    // Extract additional fields
    $phone = $input['phone'] ?? null;
    $address = $input['address'] ?? null;
    $occupation = $input['occupation'] ?? null;
    
    // Teacher specific fields
    $gender = $input['gender'] ?? null;
    $qualification = $input['qualification'] ?? null;
    $specialization = $input['specialization'] ?? [];
    $isClassTeacher = $input['isClassTeacher'] ?? false;
    $departmentId = $input['departmentId'] ?? null;
    
    // Parent specific fields
    $alternatePhone = $input['alternatePhone'] ?? null;
    
    // Accountant specific fields
    $department = $input['department'] ?? null;
    
    $linked_id = 0;
    
    // Create linked record based on role
    if ($role === 'teacher') {
        // Generate unique employee_id if not provided
        $employee_id = $input['employee_id'] ?? '';
        if (empty($employee_id)) {
            $prefix = 'TCH';
            $year = date('Y');
            $basePrefix = $prefix . $year;

            $attempt = 0;
            $maxAttempts = 10;
            while (true) {
                $stmt = $conn->prepare("SELECT MAX(CAST(SUBSTRING(employee_id, 8) AS UNSIGNED)) AS max_seq FROM teachers WHERE employee_id LIKE ?");
                $stmt->execute(["{$basePrefix}%"]);
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                $maxSeq = isset($row['max_seq']) && $row['max_seq'] !== null ? (int)$row['max_seq'] : 0;

                $nextSeq = $maxSeq + 1 + $attempt;
                $candidate = $basePrefix . sprintf('%03d', $nextSeq);

                $check = $conn->prepare("SELECT id FROM teachers WHERE employee_id = ? LIMIT 1");
                $check->execute([$candidate]);
                if (!$check->fetch()) {
                    $employee_id = $candidate;
                    break;
                }

                $attempt++;
                if ($attempt >= $maxAttempts) {
                    throw new Exception('Failed to generate unique employee ID');
                }
            }
        }
        
        // Handle specialization as JSON
        $specializationJson = is_array($specialization) ? json_encode($specialization) : '[]';
        
        $stmt = $conn->prepare("
            INSERT INTO teachers (first_name, last_name, email, phone, gender, qualification, specialization, is_class_teacher, department_id, employee_id, status, school_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $gender, $qualification, $specializationJson, $isClassTeacher ? 1 : 0, $departmentId, $employee_id, $status, $school_id]);
        $linked_id = $conn->lastInsertId();
        
    } elseif ($role === 'parent') {
        $stmt = $conn->prepare("
            INSERT INTO parents (first_name, last_name, email, phone, alternate_phone, address, occupation, status, school_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $alternatePhone, $address, $occupation, $status, $school_id]);
        $linked_id = $conn->lastInsertId();
        
    } elseif ($role === 'accountant') {
        // Generate unique employee_id if not provided
        $employee_id = $input['employee_id'] ?? '';
        if (empty($employee_id)) {
            // Generate unique employee ID for accountants
            $prefix = 'ACC';
            $year = date('Y');
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM accountants WHERE employee_id LIKE ?");
            $stmt->execute(["{$prefix}%"]);
            $count = $stmt->fetch()['count'];
            $employee_id = $prefix . $year . sprintf('%03d', $count + 1);
        }
        
        $stmt = $conn->prepare("
            INSERT INTO accountants (first_name, last_name, email, phone, department, employee_id, status, school_id, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $department, $employee_id, $status, $school_id]);
        $linked_id = $conn->lastInsertId();
        
    } elseif ($role === 'admin') {
        // Admin doesn't need linked record
        $linked_id = 0;
    }
    
    // Create user record
    $stmt = $conn->prepare("
        INSERT INTO users (username, password_hash, role, linked_id, email, status, school_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$username, $password_hash, $role, $linked_id, $email, $status, $school_id]);
    $user_id = $conn->lastInsertId();
    
    // Commit transaction
    $conn->commit();
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'User created successfully',
        'data' => [
            'id' => $user_id,
            'username' => $username,
            'email' => $email,
            'role' => $role,
            'linked_id' => $linked_id,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'status' => $status
        ]
    ]);
    
} catch (PDOException $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'Duplicate entry detected. Please retry.']);
        exit();
    }

    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    // Roll back transaction on error
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
