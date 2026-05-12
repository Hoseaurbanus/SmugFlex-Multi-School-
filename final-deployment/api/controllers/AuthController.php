<?php
/**
 * Authentication Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/JWT.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RateLimiter.php';

class AuthController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * User Login
     */
    public function login() {
        // Get request data
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['username', 'password', 'role']);
        
        $username = Middleware::sanitizeString($data['username']);
        $password = $data['password'];
        $role = Middleware::validateEnum($data['role'], ['admin', 'teacher', 'accountant', 'parent'], 'role');
        
        // Rate limiting: Check if user has exceeded login attempts (max 5 per 15 minutes)
        if (RateLimiter::isLimited($username, 'login_attempt')) {
            error_log("SECURITY: Login rate limit exceeded for username: {$username} from IP: {$_SERVER['REMOTE_ADDR']}");
            RateLimiter::throttled($username, 'login_attempt');
        }
        
        try {
            // Find user
            $query = "SELECT u.*, 
                             CASE 
                                 WHEN u.role = 'teacher' THEN t.first_name
                                 WHEN u.role = 'parent' THEN p.first_name
                                 WHEN u.role = 'accountant' THEN a.first_name
                                 ELSE 'Admin'
                             END as first_name,
                             CASE 
                                 WHEN u.role = 'teacher' THEN t.last_name
                                 WHEN u.role = 'parent' THEN p.last_name
                                 WHEN u.role = 'accountant' THEN a.last_name
                                 ELSE 'User'
                             END as last_name
                      FROM users u
                      LEFT JOIN teachers t ON u.role = 'teacher' AND u.linked_id = t.id
                      LEFT JOIN parents p ON u.role = 'parent' AND u.linked_id = p.id
                      LEFT JOIN accountants a ON u.role = 'accountant' AND u.linked_id = a.id
                      WHERE u.username = :username AND u.role = :role AND u.status = 'Active'";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':role', $role);
            $stmt->execute();
            
            $user = $stmt->fetch();

            $password_ok = false;
            if ($user) {
                $password_ok = password_verify($password, (string)$user['password_hash']);

                // Parent accounts in the exported DB include many legacy plaintext passwords (e.g. 'parent123').
                // Allow those to login ONLY for parent role, then upgrade to bcrypt hash.
                if (!$password_ok && $role === 'parent') {
                    $stored = (string)($user['password_hash'] ?? '');
                    if ($stored !== '' && hash_equals($stored, (string)$password)) {
                        $password_ok = true;

                        try {
                            $new_hash = password_hash((string)$password, PASSWORD_DEFAULT);
                            if ($new_hash) {
                                $upgrade_stmt = $this->conn->prepare("UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id");
                                $upgrade_stmt->bindParam(':hash', $new_hash);
                                $upgrade_stmt->bindParam(':id', $user['id']);
                                $upgrade_stmt->execute();
                            }
                        } catch (PDOException $e) {
                            // Do not fail login if hash upgrade fails; just log and continue.
                        }
                    }
                }
            }

            if (!$user || !$password_ok) {
                // Log failed attempt but do NOT include username (prevents enumeration attacks)
                error_log("AUTH_FAILED: role={$role}, ip={$_SERVER['REMOTE_ADDR']}");
                
                // Record in activity log without sensitive details
                Middleware::logActivity('Unknown', ucfirst($role), 'LOGIN_FAILED', 'Authentication', 'Failed', 'Invalid credentials');
                
                // Respond with generic message (don't reveal if user exists or password wrong)
                Response::unauthorized('Invalid username or password');
            }
            
            // Generate JWT token
            $token = JWT::generateUserToken($user);
            
            // Update last login
            $update_query = "UPDATE users SET last_login = NOW() WHERE id = :id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':id', $user['id']);
            $update_stmt->execute();
            
            // Log successful login
            Middleware::logActivity($user['first_name'] . ' ' . $user['last_name'], ucfirst($role), 'LOGIN', 'Authentication', 'Success', 'User logged in successfully', $user['id']);
            
            // Return user data and token
            $user_data = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'linked_id' => $user['linked_id'],
                'email' => $user['email'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'token' => $token
            ];
            
            Response::success($user_data, 'Login successful');
            
        } catch (PDOException $e) {
            Response::serverError('Database error during login');
        }
    }
    
    /**
     * User Logout
     */
    public function logout() {
        $token_data = Middleware::requireAuth();
        
        // Log logout
        Middleware::logActivity(
            $token_data['username'], 
            ucfirst($token_data['role']), 
            'LOGOUT', 
            'Authentication', 
            'Success', 
            'User logged out successfully', 
            $token_data['user_id']
        );
        
        Response::success(null, 'Logout successful');
    }
    
    /**
     * Get Current User Profile
     */
    public function getProfile() {
        $token_data = Middleware::requireAuth();
        
        try {
            $user_data = $this->getUserDetails($token_data['user_id'], $token_data['role']);
            
            if (!$user_data) {
                Response::notFound('User not found');
            }
            
            Response::success($user_data, 'Profile retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving profile');
        }
    }
    
    /**
     * Change Password
     */
    public function changePassword() {
        $token_data = Middleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['current_password', 'new_password']);
        
        $current_password = $data['current_password'];
        $new_password = $data['new_password'];
        
        // Validate new password strength
        if (strlen($new_password) < 8) {
            Response::validationError(['new_password' => 'Password must be at least 8 characters long']);
        }
        
        try {
            // Get current user
            $query = "SELECT password_hash FROM users WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $token_data['user_id']);
            $stmt->execute();
            
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($current_password, $user['password_hash'])) {
                Response::badRequest('Current password is incorrect');
            }
            
            // Update password
            $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $update_query = "UPDATE users SET password_hash = :password_hash WHERE id = :id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':password_hash', $new_password_hash);
            $update_stmt->bindParam(':id', $token_data['user_id']);
            $update_stmt->execute();
            
            // Log password change
            Middleware::logActivity(
                $token_data['username'], 
                ucfirst($token_data['role']), 
                'PASSWORD_CHANGE', 
                'Security', 
                'Success', 
                'Password changed successfully', 
                $token_data['user_id']
            );
            
            Response::success(null, 'Password changed successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error changing password');
        }
    }
    
    /**
     * Refresh Token
     */
    public function refreshToken() {
        error_log("AuthController: refreshToken called");
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth_header = $headers['Authorization'] ?? ($headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
        if (!$auth_header || !preg_match('/Bearer\s(\S+)/', (string)$auth_header, $matches)) {
            Response::unauthorized('Missing Authorization Bearer token');
            return;
        }

        $old_token = $matches[1];
        $new_token = JWT::refreshToken($old_token);
        if (!$new_token) {
            Response::unauthorized('Invalid or expired token');
            return;
        }

        $token_data = JWT::decode($new_token);
        if (!$token_data) {
            Response::unauthorized('Invalid refreshed token');
            return;
        }

        error_log("AuthController: Refreshed token data: " . json_encode($token_data));

        try {
            // Get updated user data
            $user_data = $this->getUserDetails($token_data['user_id'], $token_data['role']);
            error_log("AuthController: Retrieved user data for refresh: " . json_encode(array_keys($user_data)));

            if (!$user_data) {
                error_log("AuthController: User data not found for refresh");
                Response::notFound('User not found');
            }

            // Generate new token
            $user_data['token'] = $new_token;
            error_log("AuthController: Generated refreshed token, length: " . strlen($new_token));

            error_log("AuthController: Token refresh successful for user: " . ($user_data['username'] ?? 'unknown'));
            Response::success($user_data, 'Token refreshed successfully');

        } catch (PDOException $e) {
            error_log("AuthController: Database error in refreshToken: " . $e->getMessage());
            Response::serverError('Database error refreshing token');
        }
    }
    
    /**
     * Get User Details Based on Role
     */
    private function getUserDetails($user_id, $role) {
        switch ($role) {
            case 'admin':
                return $this->getAdminDetails($user_id);
            case 'teacher':
                return $this->getTeacherDetails($user_id);
            case 'parent':
                return $this->getParentDetails($user_id);
            case 'accountant':
                return $this->getAccountantDetails($user_id);
            default:
                return null;
        }
    }
    
    /**
     * Get Admin Details
     */
    private function getAdminDetails($user_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login,
                         'System Administrator' as position,
                         (SELECT COUNT(*) FROM students WHERE status = 'Active') as students_count,
                         (SELECT COUNT(*) FROM teachers WHERE status = 'Active') as teachers_count,
                         (SELECT COUNT(*) FROM classes WHERE status = 'Active') as classes_count
                  FROM users u
                  WHERE u.id = :id AND u.role = 'admin'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Get Teacher Details
     */
    private function getTeacherDetails($user_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         t.first_name, t.last_name, t.employee_id, t.phone, t.qualification,
                         t.specialization, t.is_class_teacher, t.status,
                         c.name as class_teacher_of,
                         (SELECT COUNT(*) FROM subject_assignments WHERE teacher_id = t.id) as assignments_count
                  FROM users u
                  JOIN teachers t ON u.linked_id = t.id
                  LEFT JOIN classes c ON t.is_class_teacher = TRUE AND t.id = c.class_teacher_id
                  WHERE u.id = :id AND u.role = 'teacher'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();
        
        $result = $stmt->fetch();
        
        if ($result && isset($result['specialization'])) {
            $result['specialization'] = json_decode($result['specialization'], true);
        }
        
        return $result;
    }
    
    /**
     * Get Parent Details
     */
    private function getParentDetails($user_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         p.first_name, p.last_name, p.phone, p.address, p.occupation, p.status,
                         (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id) as children_count,
                         (SELECT GROUP_CONCAT(s.first_name, ' ', s.last_name) 
                          FROM parent_student_links psl 
                          JOIN students s ON psl.student_id = s.id 
                          WHERE psl.parent_id = p.id AND s.status = 'Active') as children_names
                  FROM users u
                  JOIN parents p ON u.linked_id = p.id
                  WHERE u.id = :id AND u.role = 'parent'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Get Accountant Details
     */
    private function getAccountantDetails($user_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         a.first_name, a.last_name, a.employee_id, a.phone, a.department, a.status,
                         (SELECT COUNT(*) FROM payments WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as recent_payments_count,
                         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status = 'Verified') as recent_payments_total
                  FROM users u
                  JOIN accountants a ON u.linked_id = a.id
                  WHERE u.id = :id AND u.role = 'accountant'";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
}
?>
