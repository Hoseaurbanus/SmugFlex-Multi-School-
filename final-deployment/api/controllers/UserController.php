<?php
/**
 * User Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class UserController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Users (with pagination and filtering)
     */
    public function getAllUsers() {
        try {
            // CRITICAL SECURITY FIX: Require admin authentication
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            
            // Prevent caching to ensure real-time data
            header('Cache-Control: no-cache, must-revalidate, no-store, max-age=0');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            // Get query parameters
            $role = $_GET['role'] ?? null;
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 50));
            $offset = ($page - 1) * $limit;
            
            // Build WHERE clause
            $whereConditions = ["u.school_id = ?"];
            $params = [$school_id];
            
            if ($role && in_array($role, ['admin', 'teacher', 'parent', 'accountant'])) {
                $whereConditions[] = "u.role = ?";
                $params[] = $role;
            }
            
            if ($status && in_array($status, ['Active', 'Inactive'])) {
                $whereConditions[] = "u.status = ?";
                $params[] = $status;
            }
            
            if ($search) {
                $whereConditions[] = "(u.username LIKE ? OR CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, '')) LIKE ? OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE ? OR CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) LIKE ? OR u.email LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Build main query
            $query = "
                SELECT u.id, u.username, u.role, u.status, u.email, u.last_login,
                       CASE 
                           WHEN u.role = 'teacher' THEN TRIM(CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, '')))
                           WHEN u.role = 'parent' THEN TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
                           WHEN u.role = 'accountant' THEN TRIM(CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')))
                           ELSE u.username
                       END as display_name,
                       CASE 
                           WHEN u.role = 'teacher' THEN t.first_name
                           WHEN u.role = 'parent' THEN p.first_name
                           WHEN u.role = 'accountant' THEN a.first_name
                           ELSE NULL
                       END as first_name,
                       CASE 
                           WHEN u.role = 'teacher' THEN t.last_name
                           WHEN u.role = 'parent' THEN p.last_name
                           WHEN u.role = 'accountant' THEN a.last_name
                           ELSE NULL
                       END as last_name,
                       CASE 
                           WHEN u.role = 'teacher' THEN t.email
                           WHEN u.role = 'parent' THEN p.email
                           WHEN u.role = 'accountant' THEN a.email
                           ELSE u.email
                       END as linked_email,
                       CASE 
                           WHEN u.role = 'teacher' THEN t.phone
                           WHEN u.role = 'parent' THEN p.phone
                           WHEN u.role = 'accountant' THEN a.phone
                           ELSE NULL
                       END as linked_phone
                FROM users u
                LEFT JOIN teachers t ON u.role = 'teacher' AND u.linked_id = t.id
                LEFT JOIN parents p ON u.role = 'parent' AND u.linked_id = p.id
                LEFT JOIN accountants a ON u.role = 'accountant' AND u.linked_id = a.id
                $whereClause
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute(array_merge($params, [$limit, $offset]));
            $users = $stmt->fetchAll();
            
            // Get total count
            $countQuery = "
                SELECT COUNT(DISTINCT u.id) as total
                FROM users u
                LEFT JOIN teachers t ON u.role = 'teacher' AND u.linked_id = t.id
                LEFT JOIN parents p ON u.role = 'parent' AND u.linked_id = p.id
                LEFT JOIN accountants a ON u.role = 'accountant' AND u.linked_id = a.id
                $whereClause
            ";
            
            $countStmt = $this->conn->prepare($countQuery);
            $countStmt->execute($params);
            $total = $countStmt->fetch()['total'];
            
            Response::success([
                'items' => $users,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'totalPages' => ceil($total / $limit)
                ]
            ]);
            
        } catch (Exception $e) {
            Response::error('Failed to fetch users: An error occurred');
        }
    }
    
    /**
     * Create New User
     */
    public function createUser() {
        try {
            // CRITICAL SECURITY FIX: Require admin authentication
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['username']) || !isset($data['role']) || !isset($data['password'])) {
                Response::error('Username, role, and password are required');
                return;
            }
            
            // Check if username already exists
            $checkStmt = $this->conn->prepare("SELECT id FROM users WHERE username = ? AND school_id = ?");
            $checkStmt->execute([$data['username'], $school_id]);
            if ($checkStmt->fetch()) {
                Response::error('Username already exists');
                return;
            }
            
            // Hash password
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            
            // Insert user with additional fields
            $query = "INSERT INTO users (username, password_hash, role, email, status, created_at, updated_at, school_id) VALUES (?, ?, ?, ?, 'Active', NOW(), NOW(), ?)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                $data['username'], 
                $passwordHash, 
                $data['role'], 
                $data['email'] ?? null,
                $school_id
            ]);
            
            $userId = $this->conn->lastInsertId();
            
            // If role requires linked record, create with additional details
            if ($data['role'] === 'teacher') {
                $firstName = $data['firstName'] ?? '';
                $lastName = $data['lastName'] ?? '';
                $phone = $data['phone'] ?? '';
                $address = $data['address'] ?? '';
                $gender = $data['gender'] ?? '';
                $qualification = $data['qualification'] ?? '';
                $specialization = isset($data['specialization']) ? json_encode($data['specialization']) : '[]';
                $isClassTeacher = $data['isClassTeacher'] ?? false;
                $assignedClassId = $data['assignedClassId'] ?? null;
                $departmentId = $data['departmentId'] ?? '';
                
                $teacherQuery = "INSERT INTO teachers (first_name, last_name, email, phone, address, gender, qualification, specialization, is_class_teacher, assigned_class_id, department_id, status, created_at, updated_at, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW(), ?)";
                $teacherStmt = $this->conn->prepare($teacherQuery);
                $teacherStmt->execute([
                    $firstName, $lastName, $data['email'] ?? null, $phone, $address, 
                    $gender, $qualification, $specialization, $isClassTeacher ? 1 : 0, 
                    $assignedClassId, $departmentId, $school_id
                ]);
                $teacherId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ? AND school_id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$teacherId, $userId, $school_id]);
                RealtimeEvents::publish(['users', 'teachers', 'classes', 'subject_assignments'], [
                    'action' => 'created',
                    'user_id' => (int)$userId,
                    'role' => 'teacher',
                    'linked_id' => (int)$teacherId,
                ]);
            } elseif ($data['role'] === 'parent') {
                $firstName = $data['firstName'] ?? '';
                $lastName = $data['lastName'] ?? '';
                $phone = $data['phone'] ?? '';
                $address = $data['address'] ?? '';
                $alternatePhone = $data['alternatePhone'] ?? '';
                $occupation = $data['occupation'] ?? '';
                
                $parentQuery = "INSERT INTO parents (first_name, last_name, email, phone, address, alternate_phone, occupation, status, created_at, updated_at, school_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW(), ?)";
                $parentStmt = $this->conn->prepare($parentQuery);
                $parentStmt->execute([
                    $firstName, $lastName, $data['email'] ?? null, $phone, $address, 
                    $alternatePhone, $occupation, $school_id
                ]);
                $parentId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ? AND school_id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$parentId, $userId, $school_id]);
                RealtimeEvents::publish(['users', 'parents', 'students', 'notifications', 'payments', 'compiled_results'], [
                    'action' => 'created',
                    'user_id' => (int)$userId,
                    'role' => 'parent',
                    'linked_id' => (int)$parentId,
                ]);
            } elseif ($data['role'] === 'accountant') {
                $firstName = $data['firstName'] ?? '';
                $lastName = $data['lastName'] ?? '';
                $phone = $data['phone'] ?? '';
                $address = $data['address'] ?? '';
                $department = $data['department'] ?? '';
                
                $accountantQuery = "INSERT INTO accountants (first_name, last_name, email, phone, address, department, status, created_at, updated_at, school_id) VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW(), ?)";
                $accountantStmt = $this->conn->prepare($accountantQuery);
                $accountantStmt->execute([
                    $firstName, $lastName, $data['email'] ?? null, $phone, $address, $department, $school_id
                ]);
                $accountantId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ? AND school_id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$accountantId, $userId, $school_id]);
                RealtimeEvents::publish(['users', 'payments', 'students'], [
                    'action' => 'created',
                    'user_id' => (int)$userId,
                    'role' => 'accountant',
                    'linked_id' => (int)$accountantId,
                ]);
            }

            if ($data['role'] === 'admin') {
                RealtimeEvents::publish(['users'], [
                    'action' => 'created',
                    'user_id' => (int)$userId,
                    'role' => 'admin',
                ]);
            }
            
            Response::success(['id' => $userId], 'User created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create user: An error occurred');
        }
    }
    
    /**
     * Update User
     */
    public function updateUser($id) {
        try {
            // CRITICAL SECURITY FIX: Require admin authentication
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid data provided');
                return;
            }
            
            // Check if user exists
            $checkStmt = $this->conn->prepare("SELECT u.*, t.id as teacher_id, p.id as parent_id, a.id as accountant_id FROM users u LEFT JOIN teachers t ON u.linked_id = t.id LEFT JOIN parents p ON u.linked_id = p.id LEFT JOIN accountants a ON u.linked_id = a.id WHERE u.id = ? AND u.school_id = ?");
            $checkStmt->execute([$id, $school_id]);
            $user = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                Response::error('User not found');
                return;
            }
            
            // Build update query dynamically for users table
            $updateFields = [];
            $params = [];
            
            if (isset($data['email'])) {
                $updateFields[] = "email = ?";
                $params[] = $data['email'];
            }
            
            if (isset($data['status'])) {
                $updateFields[] = "status = ?";
                $params[] = $data['status'];
            }
            
            if (isset($data['password']) && !empty($data['password'])) {
                $updateFields[] = "password_hash = ?";
                $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
            }
            
            if (!empty($updateFields)) {
                $updateFields[] = "updated_at = NOW()";
                $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ? AND school_id = ?";
                $params[] = $id;
                $params[] = $school_id;
                
                $stmt = $this->conn->prepare($query);
                $stmt->execute($params);
            }
            
            // Update role-specific records
            if ($user['role'] === 'teacher' && $user['teacher_id']) {
                $teacherFields = [];
                $teacherParams = [];
                
                if (isset($data['firstName'])) {
                    $teacherFields[] = "first_name = ?";
                    $teacherParams[] = $data['firstName'];
                }
                
                if (isset($data['lastName'])) {
                    $teacherFields[] = "last_name = ?";
                    $teacherParams[] = $data['lastName'];
                }
                
                if (isset($data['phone'])) {
                    $teacherFields[] = "phone = ?";
                    $teacherParams[] = $data['phone'];
                }
                
                if (isset($data['address'])) {
                    $teacherFields[] = "address = ?";
                    $teacherParams[] = $data['address'];
                }
                
                if (isset($data['gender'])) {
                    $teacherFields[] = "gender = ?";
                    $teacherParams[] = $data['gender'];
                }
                
                if (isset($data['qualification'])) {
                    $teacherFields[] = "qualification = ?";
                    $teacherParams[] = $data['qualification'];
                }
                
                if (isset($data['specialization'])) {
                    $teacherFields[] = "specialization = ?";
                    $teacherParams[] = json_encode($data['specialization']);
                }
                
                if (isset($data['isClassTeacher'])) {
                    $teacherFields[] = "is_class_teacher = ?";
                    $teacherParams[] = $data['isClassTeacher'] ? 1 : 0;
                }
                
                if (isset($data['assignedClassId'])) {
                    $teacherFields[] = "assigned_class_id = ?";
                    $teacherParams[] = $data['assignedClassId'];
                }
                
                if (isset($data['departmentId'])) {
                    $teacherFields[] = "department_id = ?";
                    $teacherParams[] = $data['departmentId'];
                }
                
                if (!empty($teacherFields)) {
                    $teacherFields[] = "updated_at = NOW()";
                    $teacherQuery = "UPDATE teachers SET " . implode(", ", $teacherFields) . " WHERE id = ? AND school_id = ?";
                    $teacherParams[] = $user['teacher_id'];
                    $teacherParams[] = $school_id;
                    
                    $teacherStmt = $this->conn->prepare($teacherQuery);
                    $teacherStmt->execute($teacherParams);
                }
            }
            
            if ($user['role'] === 'parent' && $user['parent_id']) {
                $parentFields = [];
                $parentParams = [];
                
                if (isset($data['firstName'])) {
                    $parentFields[] = "first_name = ?";
                    $parentParams[] = $data['firstName'];
                }
                
                if (isset($data['lastName'])) {
                    $parentFields[] = "last_name = ?";
                    $parentParams[] = $data['lastName'];
                }
                
                if (isset($data['phone'])) {
                    $parentFields[] = "phone = ?";
                    $parentParams[] = $data['phone'];
                }
                
                if (isset($data['address'])) {
                    $parentFields[] = "address = ?";
                    $parentParams[] = $data['address'];
                }
                
                if (isset($data['alternatePhone'])) {
                    $parentFields[] = "alternate_phone = ?";
                    $parentParams[] = $data['alternatePhone'];
                }
                
                if (isset($data['occupation'])) {
                    $parentFields[] = "occupation = ?";
                    $parentParams[] = $data['occupation'];
                }
                
                if (!empty($parentFields)) {
                    $parentFields[] = "updated_at = NOW()";
                    $parentQuery = "UPDATE parents SET " . implode(", ", $parentFields) . " WHERE id = ? AND school_id = ?";
                    $parentParams[] = $user['parent_id'];
                    $parentParams[] = $school_id;
                    
                    $parentStmt = $this->conn->prepare($parentQuery);
                    $parentStmt->execute($parentParams);
                }
            }
            
            if ($user['role'] === 'accountant' && $user['accountant_id']) {
                $accountantFields = [];
                $accountantParams = [];
                
                if (isset($data['firstName'])) {
                    $accountantFields[] = "first_name = ?";
                    $accountantParams[] = $data['firstName'];
                }
                
                if (isset($data['lastName'])) {
                    $accountantFields[] = "last_name = ?";
                    $accountantParams[] = $data['lastName'];
                }
                
                if (isset($data['phone'])) {
                    $accountantFields[] = "phone = ?";
                    $accountantParams[] = $data['phone'];
                }
                
                if (isset($data['address'])) {
                    $accountantFields[] = "address = ?";
                    $accountantParams[] = $data['address'];
                }
                
                if (isset($data['department'])) {
                    $accountantFields[] = "department = ?";
                    $accountantParams[] = $data['department'];
                }
                
                if (!empty($accountantFields)) {
                    $accountantFields[] = "updated_at = NOW()";
                    $accountantQuery = "UPDATE accountants SET " . implode(", ", $accountantFields) . " WHERE id = ? AND school_id = ?";
                    $accountantParams[] = $user['accountant_id'];
                    $accountantParams[] = $school_id;
                    
                    $accountantStmt = $this->conn->prepare($accountantQuery);
                    $accountantStmt->execute($accountantParams);
                }
            }
            
            $topics = ['users'];
            if ($user['role'] === 'teacher') {
                $topics[] = 'teachers';
                $topics[] = 'classes';
                $topics[] = 'subject_assignments';
            } elseif ($user['role'] === 'parent') {
                $topics[] = 'parents';
                $topics[] = 'students';
                $topics[] = 'notifications';
                $topics[] = 'payments';
                $topics[] = 'compiled_results';
            } elseif ($user['role'] === 'accountant') {
                $topics[] = 'payments';
                $topics[] = 'students';
            }

            RealtimeEvents::publish($topics, [
                'action' => 'updated',
                'user_id' => (int)$id,
                'role' => (string)$user['role'],
                'linked_id' => isset($user['linked_id']) ? (int)$user['linked_id'] : null,
            ]);

            Response::success(null, 'User updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update user: An error occurred');
        }
    }
    
    /**
     * Delete User
     */
    public function deleteUser($id) {
        try {
            // CRITICAL SECURITY FIX: Require admin authentication
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            
            // Check if user exists
            $checkStmt = $this->conn->prepare("SELECT id, role, linked_id, status FROM users WHERE id = ? AND school_id = ?");
            $checkStmt->execute([$id, $school_id]);
            $user = $checkStmt->fetch();
            
            if (!$user) {
                Response::error('User not found');
                return;
            }
            
            // Don't allow deletion of currently active users
            if ($user['status'] === 'Active') {
                Response::error('Cannot delete active user. Please deactivate first.');
                return;
            }
            
            // Delete linked record if exists
            if ($user['linked_id'] && $user['role'] !== 'admin') {
                $table = $user['role'] === 'teacher' ? 'teachers' : ($user['role'] === 'parent' ? 'parents' : 'accountants');
                $deleteLinkedQuery = "DELETE FROM $table WHERE id = ? AND school_id = ?";
                $deleteLinkedStmt = $this->conn->prepare($deleteLinkedQuery);
                $deleteLinkedStmt->execute([$user['linked_id'], $school_id]);
            }
            
            // Delete user
            $deleteQuery = "DELETE FROM users WHERE id = ? AND school_id = ?";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->execute([$id, $school_id]);

            $topics = ['users'];
            if ($user['role'] === 'teacher') {
                $topics[] = 'teachers';
                $topics[] = 'classes';
                $topics[] = 'subject_assignments';
            } elseif ($user['role'] === 'parent') {
                $topics[] = 'parents';
                $topics[] = 'students';
                $topics[] = 'notifications';
                $topics[] = 'payments';
                $topics[] = 'compiled_results';
            } elseif ($user['role'] === 'accountant') {
                $topics[] = 'payments';
                $topics[] = 'students';
            }

            RealtimeEvents::publish($topics, [
                'action' => 'deleted',
                'user_id' => (int)$id,
                'role' => (string)$user['role'],
                'linked_id' => isset($user['linked_id']) ? (int)$user['linked_id'] : null,
            ]);
            
            Response::success(null, 'User deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete user: An error occurred');
        }
    }
    
    /**
     * Reset User Password
     */
    public function resetPassword($id) {
        try {
            // CRITICAL SECURITY FIX: Require admin authentication
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            
            // Generate new password
            $newPassword = bin2hex(random_bytes(4));
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Update password
            $query = "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND school_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$passwordHash, $id, $school_id]);

            RealtimeEvents::publish(['users'], [
                'action' => 'password_reset',
                'user_id' => (int)$id,
            ]);
            
            Response::success(['password' => $newPassword], 'Password reset successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to reset password: An error occurred');
        }
    }
}
?>
