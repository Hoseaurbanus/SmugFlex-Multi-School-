<?php
/**
 * User Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

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
            // Get query parameters
            $role = $_GET['role'] ?? null;
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, intval($_GET['limit'] ?? 50));
            $offset = ($page - 1) * $limit;
            
            // Build WHERE clause
            $whereConditions = [];
            $params = [];
            
            if ($role && in_array($role, ['admin', 'teacher', 'parent', 'accountant'])) {
                $whereConditions[] = "u.role = ?";
                $params[] = $role;
            }
            
            if ($status && in_array($status, ['Active', 'Inactive'])) {
                $whereConditions[] = "u.status = ?";
                $params[] = $status;
            }
            
            if ($search) {
                $whereConditions[] = "(u.username LIKE ? OR CONCAT(COALESCE(t.first_name, ''), ' ', COALESCE(t.last_name, '')) LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Build main query
            $query = "
                SELECT u.id, u.username, u.role, u.status, u.email, u.last_login,
                       CASE 
                           WHEN u.role = 'teacher' THEN CONCAT(t.first_name, ' ', t.last_name)
                           WHEN u.role = 'parent' THEN CONCAT(p.first_name, ' ', p.last_name)
                           WHEN u.role = 'accountant' THEN CONCAT(a.first_name, ' ', a.last_name)
                           ELSE u.username
                       END as display_name,
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
            Response::error('Failed to fetch users: ' . $e->getMessage());
        }
    }
    
    /**
     * Create New User
     */
    public function createUser() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['username']) || !isset($data['role']) || !isset($data['password'])) {
                Response::error('Username, role, and password are required');
                return;
            }
            
            // Check if username already exists
            $checkStmt = $this->conn->prepare("SELECT id FROM users WHERE username = ?");
            $checkStmt->execute([$data['username']]);
            if ($checkStmt->fetch()) {
                Response::error('Username already exists');
                return;
            }
            
            // Hash password
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            
            // Insert user
            $query = "INSERT INTO users (username, password_hash, role, email, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'Active', NOW(), NOW())";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$data['username'], $passwordHash, $data['role'], $data['email'] ?? null]);
            
            $userId = $this->conn->lastInsertId();
            
            // If role requires linked record, create placeholder
            if ($data['role'] === 'teacher') {
                $teacherQuery = "INSERT INTO teachers (first_name, last_name, email, status, created_at, updated_at) VALUES ('', '', '', 'Active', NOW(), NOW())";
                $teacherStmt = $this->conn->prepare($teacherQuery);
                $teacherStmt->execute();
                $teacherId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$teacherId, $userId]);
            } elseif ($data['role'] === 'parent') {
                $parentQuery = "INSERT INTO parents (first_name, last_name, email, status, created_at, updated_at) VALUES ('', '', '', 'Active', NOW(), NOW())";
                $parentStmt = $this->conn->prepare($parentQuery);
                $parentStmt->execute();
                $parentId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$parentId, $userId]);
            } elseif ($data['role'] === 'accountant') {
                $accountantQuery = "INSERT INTO accountants (first_name, last_name, email, status, created_at, updated_at) VALUES ('', '', '', 'Active', NOW(), NOW())";
                $accountantStmt = $this->conn->prepare($accountantQuery);
                $accountantStmt->execute();
                $accountantId = $this->conn->lastInsertId();
                
                // Update user with linked_id
                $updateQuery = "UPDATE users SET linked_id = ? WHERE id = ?";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->execute([$accountantId, $userId]);
            }
            
            Response::success(['id' => $userId], 'User created successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to create user: ' . $e->getMessage());
        }
    }
    
    /**
     * Update User
     */
    public function updateUser($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                Response::error('Invalid data provided');
                return;
            }
            
            // Check if user exists
            $checkStmt = $this->conn->prepare("SELECT id FROM users WHERE id = ?");
            $checkStmt->execute([$id]);
            if (!$checkStmt->fetch()) {
                Response::error('User not found');
                return;
            }
            
            // Build update query dynamically
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
                $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $params[] = $id;
                
                $stmt = $this->conn->prepare($query);
                $stmt->execute($params);
            }
            
            Response::success(null, 'User updated successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to update user: ' . $e->getMessage());
        }
    }
    
    /**
     * Delete User
     */
    public function deleteUser($id) {
        try {
            // Check if user exists
            $checkStmt = $this->conn->prepare("SELECT id, role, linked_id FROM users WHERE id = ?");
            $checkStmt->execute([$id]);
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
                $deleteLinkedQuery = "DELETE FROM $table WHERE id = ?";
                $deleteLinkedStmt = $this->conn->prepare($deleteLinkedQuery);
                $deleteLinkedStmt->execute([$user['linked_id']]);
            }
            
            // Delete user
            $deleteQuery = "DELETE FROM users WHERE id = ?";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->execute([$id]);
            
            Response::success(null, 'User deleted successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to delete user: ' . $e->getMessage());
        }
    }
    
    /**
     * Reset User Password
     */
    public function resetPassword($id) {
        try {
            // Generate new password
            $newPassword = bin2hex(random_bytes(4));
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Update password
            $query = "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$passwordHash, $id]);
            
            Response::success(['password' => $newPassword], 'Password reset successfully');
            
        } catch (Exception $e) {
            Response::error('Failed to reset password: ' . $e->getMessage());
        }
    }
}
?>
