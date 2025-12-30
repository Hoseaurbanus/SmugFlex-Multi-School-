<?php
/**
 * User Creation API Endpoint
 * Graceland Royal Academy School Management System
 * Handles complete user creation with linked records
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
$required_fields = ['username', 'email', 'role', 'firstName', 'lastName', 'password'];
foreach ($required_fields as $field) {
    if (!isset($input[$field]) || empty(trim($input[$field]))) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit();
    }
}

$username = trim($input['username']);
$email = trim(strtolower($input['email']));
$role = $input['role'];
$firstName = trim($input['firstName']);
$lastName = trim($input['lastName']);
$password = $input['password'];
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
    // Use existing database configuration
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Check if username already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Username already exists']);
        exit();
    }
    
    // Check if email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
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
            // Generate unique employee ID
            $prefix = 'TCH';
            $year = date('Y');
            $stmt = $conn->prepare("SELECT COUNT(*) as count FROM teachers WHERE employee_id LIKE ?");
            $stmt->execute(["{$prefix}%"]);
            $count = $stmt->fetch()['count'];
            $employee_id = $prefix . $year . sprintf('%03d', $count + 1);
        }
        
        // Handle specialization as JSON
        $specializationJson = is_array($specialization) ? json_encode($specialization) : '[]';
        
        $stmt = $conn->prepare("
            INSERT INTO teachers (first_name, last_name, email, phone, gender, qualification, specialization, is_class_teacher, department_id, employee_id, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $gender, $qualification, $specializationJson, $isClassTeacher ? 1 : 0, $departmentId, $employee_id, $status]);
        $linked_id = $conn->lastInsertId();
        
    } elseif ($role === 'parent') {
        $stmt = $conn->prepare("
            INSERT INTO parents (first_name, last_name, email, phone, alternate_phone, address, occupation, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $alternatePhone, $address, $occupation, $status]);
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
            INSERT INTO accountants (first_name, last_name, email, phone, department, employee_id, status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$firstName, $lastName, $email, $phone, $department, $employee_id, $status]);
        $linked_id = $conn->lastInsertId();
        
    } elseif ($role === 'admin') {
        // Admin doesn't need linked record
        $linked_id = 0;
    }
    
    // Create user record
    $stmt = $conn->prepare("
        INSERT INTO users (username, password_hash, role, linked_id, email, status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$username, $password_hash, $role, $linked_id, $email, $status]);
    $user_id = $conn->lastInsertId();
    
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
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
