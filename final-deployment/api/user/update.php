<?php
/**
 * User Update API Endpoint
 * SMugFlex 2.0 Multi-School Platform
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow PUT/PATCH requests
if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'])) {
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

// Get user ID from URL or request body
$userId = $_GET['id'] ?? $input['id'] ?? null;

if (!$userId || !is_numeric($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid user ID required']);
    exit();
}

try {
    require_once __DIR__ . '/../config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Build update query dynamically
    $allowedFields = ['username', 'email', 'status', 'password_hash', 'role', 'linked_id'];
    $updateFields = [];
    $updateValues = [];
    
    // Extract profile fields for linked tables
    $profileFields = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field]) && (!is_string($input[$field]) || trim($input[$field]) !== '')) {
            // Special handling for username and email uniqueness
            if ($field === 'username') {
                $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
                $stmt->execute([$input[$field], $userId]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Username already exists']);
                    exit();
                }
            }
            
            if ($field === 'email') {
                $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
                $stmt->execute([$input[$field], $userId]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Email already exists']);
                    exit();
                }
            }

            if ($field === 'role') {
                $valid_roles = ['admin', 'teacher', 'parent', 'accountant'];
                if (!in_array($input[$field], $valid_roles)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid role specified']);
                    exit();
                }
            }

            if ($field === 'linked_id') {
                if (!is_numeric($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'linked_id must be numeric']);
                    exit();
                }
            }
            
            $updateFields[] = "$field = ?";
            $updateValues[] = is_string($input[$field]) ? trim($input[$field]) : $input[$field];
        }
    }
    
    // Extract profile-specific fields
    $profileFields = [
        'first_name' => $input['first_name'] ?? null,
        'last_name' => $input['last_name'] ?? null,
        'other_name' => $input['other_name'] ?? null,
        'phone' => $input['phone'] ?? null,
        'address' => $input['address'] ?? null,
        'gender' => $input['gender'] ?? null,
        'qualification' => $input['qualification'] ?? null,
        'specialization' => $input['specialization'] ?? [],
        'isClassTeacher' => $input['isClassTeacher'] ?? false,
        'assignedClassId' => $input['assignedClassId'] ?? null,
        'departmentId' => $input['departmentId'] ?? null,
        'alternatePhone' => $input['alternatePhone'] ?? null,
        'department' => $input['department'] ?? null,
        'occupation' => $input['occupation'] ?? null,
        'employee_id' => $input['employee_id'] ?? null
    ];
    
    // Get current user role and linked_id
    $stmt = $conn->prepare("SELECT role, linked_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentUser) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    $currentRole = $currentUser['role'];
    $linkedId = $currentUser['linked_id'];
    
    if (empty($updateFields)) {
        http_response_code(400);
        echo json_encode(['error' => 'No valid fields to update']);
        exit();
    }
    
    // Add updated_at timestamp
    $updateFields[] = "updated_at = NOW()";
    $updateValues[] = $userId;
    
    // Begin transaction for data consistency
    $conn->beginTransaction();
    
    try {
        $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($updateValues);
        $affected = $stmt->rowCount();
        
        if ($affected < 1) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'No changes applied',
                'data' => [
                    'id' => $userId,
                    'updated_fields' => array_keys($input),
                    'affected_rows' => $affected
                ]
            ]);
            exit();
        }

        // Update profile table if linked_id exists and role-specific fields are provided
        if ($linkedId && $linkedId > 0) {
            $profileUpdated = false;
            
            if ($currentRole === 'teacher') {
                $teacherFields = [];
                $teacherValues = [];
                
                // Update teacher-specific fields
                if ($profileFields['first_name'] !== null) {
                    $teacherFields[] = "first_name = ?";
                    $teacherValues[] = trim($profileFields['first_name']);
                }
                if ($profileFields['last_name'] !== null) {
                    $teacherFields[] = "last_name = ?";
                    $teacherValues[] = trim($profileFields['last_name']);
                }
                if ($profileFields['other_name'] !== null) {
                    $teacherFields[] = "other_name = ?";
                    $teacherValues[] = trim($profileFields['other_name']);
                }
                if ($profileFields['phone'] !== null) {
                    $teacherFields[] = "phone = ?";
                    $teacherValues[] = trim($profileFields['phone']);
                }
                if ($profileFields['gender'] !== null) {
                    $teacherFields[] = "gender = ?";
                    $teacherValues[] = trim($profileFields['gender']);
                }
                if ($profileFields['qualification'] !== null) {
                    $teacherFields[] = "qualification = ?";
                    $teacherValues[] = trim($profileFields['qualification']);
                }
                if ($profileFields['specialization'] !== null) {
                    $specializationJson = is_array($profileFields['specialization']) ? json_encode($profileFields['specialization']) : '[]';
                    $teacherFields[] = "specialization = ?";
                    $teacherValues[] = $specializationJson;
                }
                if ($profileFields['isClassTeacher'] !== null) {
                    $teacherFields[] = "is_class_teacher = ?";
                    $teacherValues[] = $profileFields['isClassTeacher'] ? 1 : 0;
                }
                if ($profileFields['assignedClassId'] !== null) {
                    $teacherFields[] = "department_id = ?";
                    $teacherValues[] = $profileFields['assignedClassId'];
                }
                if ($profileFields['employee_id'] !== null) {
                    $teacherFields[] = "employee_id = ?";
                    $teacherValues[] = trim($profileFields['employee_id']);
                }
                
                if (!empty($teacherFields)) {
                    $teacherFields[] = "updated_at = NOW()";
                    $teacherValues[] = $linkedId;
                    
                    $teacherSql = "UPDATE teachers SET " . implode(', ', $teacherFields) . " WHERE id = ?";
                    $teacherStmt = $conn->prepare($teacherSql);
                    $teacherStmt->execute($teacherValues);
                    $profileUpdated = $teacherStmt->rowCount() > 0;
                }
                
            } elseif ($currentRole === 'parent') {
                $parentFields = [];
                $parentValues = [];
                
                if ($profileFields['first_name'] !== null) {
                    $parentFields[] = "first_name = ?";
                    $parentValues[] = trim($profileFields['first_name']);
                }
                if ($profileFields['last_name'] !== null) {
                    $parentFields[] = "last_name = ?";
                    $parentValues[] = trim($profileFields['last_name']);
                }
                if ($profileFields['phone'] !== null) {
                    $parentFields[] = "phone = ?";
                    $parentValues[] = trim($profileFields['phone']);
                }
                if ($profileFields['alternatePhone'] !== null) {
                    $parentFields[] = "alternate_phone = ?";
                    $parentValues[] = trim($profileFields['alternatePhone']);
                }
                if ($profileFields['address'] !== null) {
                    $parentFields[] = "address = ?";
                    $parentValues[] = trim($profileFields['address']);
                }
                if ($profileFields['occupation'] !== null) {
                    $parentFields[] = "occupation = ?";
                    $parentValues[] = trim($profileFields['occupation']);
                }
                
                if (!empty($parentFields)) {
                    $parentFields[] = "updated_at = NOW()";
                    $parentValues[] = $linkedId;
                    
                    $parentSql = "UPDATE parents SET " . implode(', ', $parentFields) . " WHERE id = ?";
                    $parentStmt = $conn->prepare($parentSql);
                    $parentStmt->execute($parentValues);
                    $profileUpdated = $parentStmt->rowCount() > 0;
                }
                
            } elseif ($currentRole === 'accountant') {
                $accountantFields = [];
                $accountantValues = [];
                
                if ($profileFields['first_name'] !== null) {
                    $accountantFields[] = "first_name = ?";
                    $accountantValues[] = trim($profileFields['first_name']);
                }
                if ($profileFields['last_name'] !== null) {
                    $accountantFields[] = "last_name = ?";
                    $accountantValues[] = trim($profileFields['last_name']);
                }
                if ($profileFields['phone'] !== null) {
                    $accountantFields[] = "phone = ?";
                    $accountantValues[] = trim($profileFields['phone']);
                }
                if ($profileFields['department'] !== null) {
                    $accountantFields[] = "department = ?";
                    $accountantValues[] = trim($profileFields['department']);
                }
                if ($profileFields['employee_id'] !== null) {
                    $accountantFields[] = "employee_id = ?";
                    $accountantValues[] = trim($profileFields['employee_id']);
                }
                
                if (!empty($accountantFields)) {
                    $accountantFields[] = "updated_at = NOW()";
                    $accountantValues[] = $linkedId;
                    
                    $accountantSql = "UPDATE accountants SET " . implode(', ', $accountantFields) . " WHERE id = ?";
                    $accountantStmt = $conn->prepare($accountantSql);
                    $accountantStmt->execute($accountantValues);
                    $profileUpdated = $accountantStmt->rowCount() > 0;
                }
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => [
                'id' => $userId,
                'updated_fields' => array_keys($input),
                'affected_rows' => $affected,
                'profile_updated' => $profileUpdated ?? false
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
