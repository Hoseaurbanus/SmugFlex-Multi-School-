<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/JWT.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RateLimiter.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class AuthController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['identity', 'password', 'role']);

        $identity = trim($data['identity']);
        $password = $data['password'];
        $role = Middleware::validateEnum($data['role'],
                    ['admin', 'teacher', 'accountant', 'parent', 'student'], 'role');

        if (!str_contains($identity, '@')) {
            Response::badRequest('Invalid identity format. Use username@suffix (e.g. michael@joy)');
        }

        [$username, $suffix] = explode('@', $identity, 2);
        $username = strtolower(trim($username));
        $suffix = strtolower(trim($suffix));

        if (empty($username) || empty($suffix)) {
            Response::badRequest('Both username and suffix are required.');
        }

        $rateLimitKey = "{$identity}:login_attempt";
        if (RateLimiter::isLimited($rateLimitKey, 'login_attempt')) {
            error_log("SECURITY: Login rate limit exceeded for {$identity} from IP: {$_SERVER['REMOTE_ADDR']}");
            RateLimiter::throttled($rateLimitKey, 'login_attempt');
        }

        try {
            $schoolStmt = $this->conn->prepare(
                "SELECT id, name, status, access_until, suffix_locked, 
                        primary_color, secondary_color, logo_url 
                 FROM schools WHERE suffix = :suffix LIMIT 1"
            );
            $schoolStmt->execute([':suffix' => $suffix]);
            $school = $schoolStmt->fetch(PDO::FETCH_ASSOC);

            if (!$school) {
                usleep(random_int(50000, 200000));
                Response::unauthorized('Invalid credentials.');
            }

            if ($school['status'] === 'inactive') {
                Response::forbidden('This school account is currently inactive. Please contact SMugFlex support.');
            }
            if ($school['status'] === 'suspended') {
                Response::forbidden('This school account has been suspended. Please contact SMugFlex support.');
            }
            if (in_array($school['status'], ['pending', 'rejected'], true)) {
                Response::forbidden('This school account is not yet active.');
            }
            if ($school['access_until'] !== null && strtotime($school['access_until']) < time()) {
                Response::forbidden('Your access period has ended. Please contact SMugFlex to renew.');
            }

            $school_id = (int)$school['id'];

            $query = "SELECT u.*,
                        CASE WHEN u.role='teacher'    THEN t.first_name
                             WHEN u.role='parent'     THEN p.first_name
                             WHEN u.role='accountant' THEN a.first_name
                             WHEN u.role='student'    THEN s.first_name
                             ELSE 'Admin' END as first_name,
                        CASE WHEN u.role='teacher'    THEN t.last_name
                             WHEN u.role='parent'     THEN p.last_name
                             WHEN u.role='accountant' THEN a.last_name
                             WHEN u.role='student'    THEN s.last_name
                             ELSE 'User' END as last_name
                      FROM users u
                      LEFT JOIN teachers t    ON u.role='teacher'    AND u.linked_id=t.id    AND t.school_id=:sid1
                      LEFT JOIN parents p     ON u.role='parent'     AND u.linked_id=p.id    AND p.school_id=:sid2
                      LEFT JOIN accountants a ON u.role='accountant' AND u.linked_id=a.id    AND a.school_id=:sid3
                      LEFT JOIN students s    ON u.role='student'    AND u.linked_id=s.id    AND s.school_id=:sid4
                      WHERE u.username = :username
                        AND u.role = :role
                        AND u.school_id = :school_id
                        AND u.status = 'Active'
                      LIMIT 1";

            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                ':username'  => $username,
                ':role'      => $role,
                ':school_id' => $school_id,
                ':sid1' => $school_id, ':sid2' => $school_id,
                ':sid3' => $school_id, ':sid4' => $school_id,
            ]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                RateLimiter::increment($rateLimitKey, 'login_attempt');
                Response::unauthorized('Invalid credentials.');
            }

            $passwordValid = password_verify($password, $user['password_hash']);

            if (!$passwordValid) {
                RateLimiter::increment($rateLimitKey, 'login_attempt');
                Response::unauthorized('Invalid credentials.');
            }

            if (!$school['suffix_locked']) {
                $this->conn->prepare("UPDATE schools SET suffix_locked=TRUE WHERE id=?")
                     ->execute([$school_id]);
            }

            $mustChangePassword = !empty($user['must_change_password']);

            $tokenPayload = [
                'user_id'             => (int)$user['id'],
                'username'            => $username,
                'full_identity'       => "{$username}@{$suffix}",
                'role'                => $user['role'],
                'school_id'           => $school_id,
                'school_suffix'       => $suffix,
                'school_name'         => $school['name'],
                'must_change_password' => $mustChangePassword,
                'iat'                 => time(),
                'exp'                 => time() + (int)Config::getJwtExpiry(),
            ];

            $token = JWT::encode($tokenPayload, false);

            $this->conn->prepare("UPDATE users SET last_login=NOW() WHERE id=?")
                 ->execute([$user['id']]);

            Response::success([
                'token'                => $token,
                'id'                   => (int)$user['id'],
                'username'             => $username,
                'full_identity'        => "{$username}@{$suffix}",
                'role'                 => $user['role'],
                'linked_id'            => (int)$user['linked_id'],
                'first_name'           => $user['first_name'] ?? '',
                'last_name'            => $user['last_name'] ?? '',
                'school_id'            => $school_id,
                'school_name'          => $school['name'],
                'school_suffix'        => $suffix,
                'school_logo_url'      => $school['logo_url'],
                'school_primary_color' => $school['primary_color'],
                'school_secondary_color' => $school['secondary_color'],
                'must_change_password' => $mustChangePassword,
            ], 'Login successful');

        } catch (PDOException $e) {
            Response::serverError('Database error during login');
        }
    }

    public function studentLogin() {
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['admission_number', 'class_id']);

        $admission_number = Middleware::sanitizeString($data['admission_number']);
        $rateLimitKey = "{$admission_number}:student_login";
        if (RateLimiter::isLimited($rateLimitKey, 'student_login')) {
            error_log("SECURITY: Student login rate limit exceeded for {$admission_number} from IP: {$_SERVER['REMOTE_ADDR']}");
            RateLimiter::throttled($rateLimitKey, 'student_login');
        }

        try {
            $admission_number = Middleware::sanitizeString($data['admission_number']);
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');

            // Resolve school_id from admission number suffix (e.g. "SMF/001/000" → suffix "SMF")
            $suffixParts = explode('/', $admission_number);
            $schoolSuffix = count($suffixParts) >= 2 ? $suffixParts[0] : '';

            if (empty($schoolSuffix)) {
                Response::badRequest('Invalid admission number format. Expected format: PREFIX/XXX/XXX');
            }

            $schoolStmt = $this->conn->prepare("SELECT id, name, status, access_until FROM schools WHERE suffix = :suffix AND status = 'active' LIMIT 1");
            $schoolStmt->execute([':suffix' => strtolower($schoolSuffix)]);
            $schoolRecord = $schoolStmt->fetch(PDO::FETCH_ASSOC);

            if (!$schoolRecord) {
                Response::unauthorized('School not found or inactive.');
            }

            if (!empty($schoolRecord['access_until']) && strtotime($schoolRecord['access_until']) < time()) {
                Response::forbidden('School access has expired.');
            }

            $school_id = (int)$schoolRecord['id'];

            $query = "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.class_id,
                             c.name as class_name
                      FROM students s
                      JOIN classes c ON s.class_id = c.id
                      WHERE s.admission_number = :admission_number
                        AND s.class_id = :class_id
                        AND s.school_id = :school_id
                        AND s.status = 'Active'
                      LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':admission_number', $admission_number);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                $pos = strrpos($admission_number, '/');
                $suffix = $pos !== false ? substr($admission_number, $pos + 1) : $admission_number;
                if ($suffix !== $admission_number) {
                    $stmt = $this->conn->prepare(
                        "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.class_id,
                                c.name as class_name
                         FROM students s
                         JOIN classes c ON s.class_id = c.id
                         WHERE s.admission_number LIKE CONCAT('%/', :suffix)
                           AND s.class_id = :class_id2
                           AND s.school_id = :school_id2
                           AND s.status = 'Active'
                         LIMIT 1"
                    );
                    $stmt->bindParam(':suffix', $suffix);
                    $stmt->bindParam(':class_id2', $class_id);
                    $stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
                    $stmt->execute();
                    $student = $stmt->fetch(PDO::FETCH_ASSOC);
                }
            }

            if (!$student) {
                RateLimiter::increment($rateLimitKey, 'student_login');
                Response::unauthorized('Invalid admission number or class does not match');
            }

            $user_query = "SELECT * FROM users WHERE role = 'student' AND linked_id = :linked_id AND school_id = :school_id LIMIT 1";
            $user_stmt = $this->conn->prepare($user_query);
            $user_stmt->bindValue(':linked_id', $student['id']);
            $user_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $user_stmt->execute();
            $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                if ($user['status'] !== 'Active') {
                    $rStmt = $this->conn->prepare("UPDATE users SET status = 'Active', updated_at = NOW() WHERE id = :id");
                    $rStmt->bindValue(':id', $user['id']);
                    $rStmt->execute();
                    $user['status'] = 'Active';
                }
                $user['first_name'] = $student['first_name'];
                $user['last_name'] = $student['last_name'];
            } else {
                $username = $student['admission_number'];
                $eu_stmt = $this->conn->prepare("SELECT * FROM users WHERE username = :username AND school_id = :school_id LIMIT 1");
                $eu_stmt->bindParam(':username', $username);
                $eu_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
                $eu_stmt->execute();
                $existing_user = $eu_stmt->fetch(PDO::FETCH_ASSOC);

                if ($existing_user) {
                    $ra_stmt = $this->conn->prepare(
                        "UPDATE users SET linked_id = :linked_id, role = 'student', status = 'Active', updated_at = NOW() WHERE id = :id"
                    );
                    $ra_stmt->bindValue(':linked_id', $student['id']);
                    $ra_stmt->bindValue(':id', $existing_user['id']);
                    $ra_stmt->execute();
                    $user = $existing_user;
                    $user['linked_id'] = $student['id'];
                    $user['status'] = 'Active';
                    $user['first_name'] = $student['first_name'];
                    $user['last_name'] = $student['last_name'];
                } else {
                    $password_hash = password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
                    $user_email = 'student_' . $student['id'] . '_sid' . $school_id . '@student.smugflex.com';
                    $insert_query = "INSERT INTO users (school_id, username, password_hash, role, linked_id, email, status, created_at, updated_at)
                                     VALUES (:school_id, :username, :password_hash, 'student', :linked_id, :email, 'Active', NOW(), NOW())";
                    $insert_stmt = $this->conn->prepare($insert_query);
                    $insert_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
                    $insert_stmt->bindParam(':username', $username);
                    $insert_stmt->bindParam(':password_hash', $password_hash);
                    $insert_stmt->bindParam(':linked_id', $student['id']);
                    $insert_stmt->bindParam(':email', $user_email);
                    $insert_stmt->execute();
                    $user_id = $this->conn->lastInsertId();

                    $user = [
                        'id' => $user_id,
                        'username' => $username,
                        'role' => 'student',
                        'linked_id' => $student['id'],
                        'email' => '',
                        'first_name' => $student['first_name'],
                        'last_name' => $student['last_name'],
                    ];
                }
            }

            $full_name = $student['first_name'] . ' ' . $student['last_name'];
            Middleware::logActivity($full_name, 'Student', 'LOGIN', 'Authentication', 'Success', 'Student logged in via portal', $user['id']);

            $this->conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")
                 ->execute([$user['id']]);

            $schoolStmt = $this->conn->prepare("SELECT name, suffix FROM schools WHERE id=? LIMIT 1");
            $schoolStmt->execute([$school_id]);
            $schoolInfo = $schoolStmt->fetch(PDO::FETCH_ASSOC);
            $schoolSuffix = $schoolInfo['suffix'] ?? 'gra';

            $token = JWT::generateUserToken([
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => 'student',
                'linked_id' => $student['id'],
                'school_id' => $school_id,
                'school_suffix' => $schoolSuffix,
                'school_name' => $schoolInfo['name'] ?? 'SMugFlex School',
            ]);

            $user_data = [
                'id' => (int)$user['id'],
                'username' => $user['username'],
                'role' => 'student',
                'linked_id' => (int)$student['id'],
                'full_identity' => $user['username'] . '@' . $schoolSuffix,
                'school_id' => $school_id,
                'school_suffix' => $schoolSuffix,
                'first_name' => $student['first_name'],
                'last_name' => $student['last_name'],
                'token' => $token,
            ];

            Response::success($user_data, 'Student login successful');
        } catch (PDOException $e) {
            error_log("Student login PDO error: " . $e->getMessage());
            Response::serverError('Database error during student login');
        }
    }

    public function logout() {
        $token_data = Middleware::requireAuth();

        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth_header = $headers['Authorization'] ?? ($headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
        if (preg_match('/Bearer\s(\S+)/', (string)$auth_header, $matches)) {
            $decoded = JWT::decode($matches[1], false);
            if ($decoded) {
                JWT::blacklistToken($decoded);
            }
        }

        Middleware::logActivity(
            $token_data['username'],
            ucfirst($token_data['role'] ?? 'Unknown'),
            'LOGOUT',
            'Authentication',
            'Success',
            'User logged out successfully',
            $token_data['user_id']
        );

        Response::success(null, 'Logout successful');
    }

    public function getProfile() {
        $token_data = Middleware::requireAuth();
        $school_id = (int)($token_data['school_id'] ?? 0);

        try {
            $user_data = $this->getUserDetails($token_data['user_id'], $token_data['role'], $school_id);
            if (!$user_data) {
                Response::notFound('User not found');
            }
            $user_data['school_id'] = $school_id;
            $user_data['school_suffix'] = $token_data['school_suffix'] ?? '';
            $user_data['school_name'] = $token_data['school_name'] ?? '';
            Response::success($user_data, 'Profile retrieved successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving profile');
        }
    }

    public function changePassword() {
        $token_data = Middleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['current_password', 'new_password']);

        $rateLimitKey = "{$token_data['user_id']}:password_change";
        if (RateLimiter::isLimited($rateLimitKey, 'password_change')) {
            error_log("SECURITY: Password change rate limit exceeded for user {$token_data['user_id']}");
            RateLimiter::throttled($rateLimitKey, 'password_change');
        }

        $current_password = $data['current_password'];
        $new_password = $data['new_password'];

        if (strlen($new_password) < 8) {
            Response::validationError(['new_password' => 'Password must be at least 8 characters long']);
        }

        try {
            $school_id = (int)($token_data['school_id'] ?? 1);
            $query = "SELECT password_hash FROM users WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $token_data['user_id']);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $user = $stmt->fetch();

            if (!$user || !password_verify($current_password, $user['password_hash'])) {
                RateLimiter::increment($rateLimitKey, 'password_change');
                Response::badRequest('Current password is incorrect');
            }

            $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $update_query = "UPDATE users SET password_hash = :password_hash, must_change_password = FALSE, updated_at = NOW() WHERE id = :id AND school_id = :school_id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':password_hash', $new_hash);
            $update_stmt->bindParam(':id', $token_data['user_id']);
            $update_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $update_stmt->execute();

            Middleware::logActivity(
                $token_data['username'],
                ucfirst($token_data['role'] ?? 'Unknown'),
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

    public function refreshToken() {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth_header = $headers['Authorization'] ?? ($headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '')));
        if (!$auth_header || !preg_match('/Bearer\s(\S+)/', (string)$auth_header, $matches)) {
            Response::unauthorized('Missing Authorization Bearer token');
            return;
        }

        $old_token = $matches[1];
        $decoded = JWT::decode($old_token, false);
        if ($decoded && isset($decoded['user_id'])) {
            $rateLimitKey = "{$decoded['user_id']}:token_refresh";
            if (RateLimiter::isLimited($rateLimitKey, 'token_refresh')) {
                error_log("SECURITY: Token refresh rate limit exceeded for user {$decoded['user_id']}");
                RateLimiter::throttled($rateLimitKey, 'token_refresh');
            }
        }

        $new_token = JWT::refreshToken($old_token);
        if (!$new_token) {
            Response::unauthorized('Invalid or expired token');
            return;
        }

        $token_data = JWT::decode($new_token, false);
        if (!$token_data) {
            Response::unauthorized('Invalid refreshed token');
            return;
        }

        try {
            $school_id = (int)($token_data['school_id'] ?? 0);
            $user_data = $this->getUserDetails($token_data['user_id'], $token_data['role'], $school_id);
            if (!$user_data) {
                Response::notFound('User not found');
            }
            $user_data['school_id'] = $school_id;
            $user_data['school_suffix'] = $token_data['school_suffix'] ?? '';
            $user_data['school_name'] = $token_data['school_name'] ?? '';
            $user_data['full_identity'] = $token_data['full_identity'] ?? ($token_data['username'] . '@' . ($token_data['school_suffix'] ?? ''));
            $user_data['token'] = $new_token;

            Response::success($user_data, 'Token refreshed successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error refreshing token');
        }
    }

    private function getUserDetails($user_id, $role, $school_id = 0) {
        switch ($role) {
            case 'admin':    return $this->getAdminDetails($user_id, $school_id);
            case 'teacher':  return $this->getTeacherDetails($user_id, $school_id);
            case 'parent':   return $this->getParentDetails($user_id, $school_id);
            case 'accountant': return $this->getAccountantDetails($user_id, $school_id);
            case 'student':  return $this->getStudentDetails($user_id, $school_id);
            default:         return null;
        }
    }

    private function getAdminDetails($user_id, $school_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login,
                         'System Administrator' as position,
                         (SELECT COUNT(*) FROM students WHERE status = 'Active' AND school_id = :sid1) as students_count,
                         (SELECT COUNT(*) FROM teachers WHERE status = 'Active' AND school_id = :sid2) as teachers_count,
                         (SELECT COUNT(*) FROM classes WHERE status = 'Active' AND school_id = :sid3) as classes_count
                  FROM users u
                  WHERE u.id = :id AND u.role = 'admin' AND u.school_id = :sid4";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->bindParam(':sid1', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid2', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid3', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid4', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    private function getTeacherDetails($user_id, $school_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         t.first_name, t.last_name, t.employee_id, t.phone, t.qualification,
                         t.specialization, t.is_class_teacher, t.status,
                         c.name as class_teacher_of,
                         (SELECT COUNT(*) FROM subject_assignments WHERE teacher_id = t.id AND school_id = :sid1) as assignments_count
                  FROM users u
                  JOIN teachers t ON u.linked_id = t.id AND t.school_id = :sid2
                  LEFT JOIN classes c ON t.is_class_teacher = TRUE AND t.id = c.class_teacher_id AND c.school_id = :sid3
                  WHERE u.id = :id AND u.role = 'teacher' AND u.school_id = :sid4";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->bindParam(':sid1', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid2', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid3', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid4', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch();
        if ($result && isset($result['specialization'])) {
            $result['specialization'] = json_decode($result['specialization'], true);
        }
        return $result;
    }

    private function getParentDetails($user_id, $school_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         p.first_name, p.last_name, p.phone, p.address, p.occupation, p.status,
                         (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id AND school_id = :sid1) as children_count,
                         (SELECT GROUP_CONCAT(s.first_name, ' ', s.last_name)
                          FROM parent_student_links psl
                          JOIN students s ON psl.student_id = s.id AND s.school_id = :sid2
                          WHERE psl.parent_id = p.id AND psl.school_id = :sid3 AND s.status = 'Active') as children_names
                  FROM users u
                  JOIN parents p ON u.linked_id = p.id AND p.school_id = :sid4
                  WHERE u.id = :id AND u.role = 'parent' AND u.school_id = :sid5";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->bindParam(':sid1', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid2', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid3', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid4', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid5', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    private function getAccountantDetails($user_id, $school_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         a.first_name, a.last_name, a.employee_id, a.phone, a.department, a.status,
                         (SELECT COUNT(*) FROM payments WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND school_id = :sid1) as recent_payments_count,
                         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE recorded_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status = 'Verified' AND school_id = :sid2) as recent_payments_total
                  FROM users u
                  JOIN accountants a ON u.linked_id = a.id AND a.school_id = :sid3
                  WHERE u.id = :id AND u.role = 'accountant' AND u.school_id = :sid4";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->bindParam(':sid1', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid2', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid3', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid4', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    private function getStudentDetails($user_id, $school_id) {
        $query = "SELECT u.id, u.username, u.email, u.role, u.last_login, u.linked_id,
                         s.first_name, s.last_name, s.admission_number, s.class_id, s.status,
                         c.name as class_name
                  FROM users u
                  JOIN students s ON u.linked_id = s.id AND s.school_id = :sid1
                  LEFT JOIN classes c ON s.class_id = c.id AND c.school_id = :sid2
                  WHERE u.id = :id AND u.role = 'student' AND u.school_id = :sid3";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $user_id);
        $stmt->bindParam(':sid1', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid2', $school_id, PDO::PARAM_INT);
        $stmt->bindParam(':sid3', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }
}
