<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/JWT.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';
require_once __DIR__ . '/../helpers/RateLimiter.php';

class SuperAdminController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    private function ensureSchoolModulesTable(): void {
        try {
            $this->conn->query("SELECT 1 FROM school_modules LIMIT 1");
        } catch (PDOException $e) {
            error_log("school_modules table missing, auto-creating...");
            $this->conn->exec("CREATE TABLE IF NOT EXISTS `school_modules` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `school_id` INT UNSIGNED NOT NULL,
                `module_name` VARCHAR(50) NOT NULL,
                `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
                `disabled_reason` TEXT,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_school_module` (`school_id`, `module_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
    }

    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['username', 'password']);

        $username = trim($data['username']);
        $password = $data['password'];

        if (RateLimiter::isLimited('super_admin_' . $username, 'super_admin_login')) {
            RateLimiter::throttled('super_admin_' . $username, 'super_admin_login');
        }

        $stmt = $this->conn->prepare(
            "SELECT * FROM super_admins WHERE username = :u AND status = 'active' LIMIT 1"
        );
        $stmt->execute([':u' => $username]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            Response::unauthorized('Invalid credentials.');
        }

        RateLimiter::reset('super_admin_' . $username, 'super_admin_login');

        $token = JWT::generateSuperAdminToken($admin);

        $this->conn->prepare("UPDATE super_admins SET last_login = NOW(), last_login_ip = ? WHERE id = ?")
             ->execute([$_SERVER['REMOTE_ADDR'] ?? '', $admin['id']]);

        Response::success([
            'token'      => $token,
            'username'   => $admin['username'],
            'first_name' => $admin['first_name'],
            'last_name'  => $admin['last_name'],
        ], 'Super Admin login successful');
    }

    private function requireAuth(): array {
        return TenantMiddleware::requireSuperAdminAuth();
    }

    private function logAction(string $action, ?int $schoolId, ?string $schoolName, array $details = []): void {
        $admin = $this->requireAuth();
        $stmt = $this->conn->prepare(
            "INSERT INTO platform_activity_logs (super_admin_id, action, school_id, school_name, details, ip_address)
             VALUES (:sa, :action, :sid, :sname, :det, :ip)"
        );
        $stmt->execute([
            ':sa'     => $admin['super_admin_id'],
            ':action' => $action,
            ':sid'    => $schoolId,
            ':sname'  => $schoolName,
            ':det'    => json_encode($details),
            ':ip'     => $_SERVER['REMOTE_ADDR'] ?? '',
        ]);
    }

    public function listSchools() {
        $this->requireAuth();
        $status = $_GET['status'] ?? '';
        $plan = $_GET['plan'] ?? '';
        $search = $_GET['search'] ?? '';

        $where = [];
        $params = [];

        if ($status) {
            $where[] = "s.status = :status";
            $params[':status'] = $status;
        }
        if ($plan) {
            $where[] = "s.plan = :plan";
            $params[':plan'] = $plan;
        }
        if ($search) {
            $where[] = "(s.name LIKE :search OR s.email LIKE :search2)";
            $params[':search'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $query = "SELECT s.id, s.name, s.suffix, s.email, s.phone, s.plan, s.status,
                         s.access_until, s.suffix_locked, s.created_at,
                         COALESCE(st.cnt, 0) as student_count,
                         COALESCE(tc.cnt, 0) as teacher_count
                  FROM schools s
                  LEFT JOIN (SELECT school_id, COUNT(*) as cnt FROM students GROUP BY school_id) st ON st.school_id = s.id
                  LEFT JOIN (SELECT school_id, COUNT(*) as cnt FROM teachers GROUP BY school_id) tc ON tc.school_id = s.id
                  {$whereClause}
                  ORDER BY s.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        $schools = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success($schools, 'Schools retrieved successfully');
    }

    public function getPendingRegistrations() {
        $this->requireAuth();

        $stmt = $this->conn->prepare(
            "SELECT id, name, email, phone, address, city, state, school_type, created_at
             FROM schools WHERE status = 'pending' ORDER BY created_at ASC"
        );
        $stmt->execute();
        $schools = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success($schools, 'Pending registrations retrieved');
    }

    public function approveSchool(int $id) {
        $token_data = $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);

        $stmt = $this->conn->prepare("SELECT * FROM schools WHERE id = :id AND status = 'pending' LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('Pending school not found.');
        }

        $suffix = strtolower(trim($data['suffix'] ?? ''));
        if (empty($suffix)) {
            $suffix = strtolower(substr(preg_replace('/[^a-zA-Z0-9]/', '', $school['name']), 0, 6));
            if (strlen($suffix) < 2) $suffix = 'sch' . $id;
        }
        $accessUntil = $data['access_until'] ?? date('Y-m-d H:i:s', strtotime('+90 days'));

        if (!TenantMiddleware::validateSuffixFormat($suffix)) {
            Response::badRequest('Invalid suffix format. Use 2-20 lowercase letters/numbers.');
        }

        if (!TenantMiddleware::isSuffixAvailable($this->conn, $suffix)) {
            Response::badRequest("Suffix '{$suffix}' is already taken.");
        }

        $stmt = $this->conn->prepare("SELECT * FROM schools WHERE id = :id AND status = 'pending' LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('Pending school not found.');
        }

        $tempPassword = bin2hex(random_bytes(6));
        $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $this->ensureSchoolModulesTable();

        $this->conn->beginTransaction();
        try {
            $this->conn->prepare(
                "UPDATE schools SET suffix = :suffix, status = 'active', plan = 'trial',
                 access_until = :access_until, approved_by = :admin_id, approved_at = NOW(),
                 suffix_locked = FALSE, admin_credentials_shown = FALSE
                 WHERE id = :id"
            )->execute([
                ':suffix'      => $suffix,
                ':access_until' => $accessUntil,
                ':admin_id'    => $token_data['super_admin_id'],
                ':id'          => $id,
            ]);

            $this->conn->prepare(
                "INSERT INTO users (school_id, username, password_hash, role, status, email, created_at, updated_at)
                 VALUES (:sid, 'admin', :ph, 'admin', 'Active', :email, NOW(), NOW())"
            )->execute([
                ':sid'   => $id,
                ':ph'    => $passwordHash,
                ':email' => $school['email'],
            ]);

            $modules = ['students','teachers','results','cbt','fees','attendance','assignments','notifications','reports','accountant'];
            $modStmt = $this->conn->prepare(
                "INSERT INTO school_modules (school_id, module_name, is_enabled) VALUES (:sid, :name, 1)"
            );
            foreach ($modules as $m) {
                $modStmt->execute([':sid' => $id, ':name' => $m]);
            }

            $this->conn->commit();
        } catch (PDOException $e) {
            error_log("PDO Error in SuperAdminController.approveSchool: " . $e->getMessage());
            $this->conn->rollBack();
            Response::serverError('Failed to approve school');
        }

        $this->logAction('approve_school', $id, $school['name'], ['suffix' => $suffix]);

        Response::success([
            'school_id'       => $id,
            'school_name'     => $school['name'],
            'suffix'          => $suffix,
            'admin_identity'  => "admin@{$suffix}",
            'admin_password'  => $tempPassword,
        ], 'School approved successfully. Save the admin credentials — they will not be shown again.');
    }

    public function getInitialAdminCredentials(int $schoolId) {
        $this->requireAuth();

        $stmt = $this->conn->prepare(
            "SELECT name, suffix, admin_credentials_shown FROM schools WHERE id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $schoolId]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        if ($school['admin_credentials_shown']) {
            Response::error('Credentials have already been retrieved and are no longer available. Use reset admin password instead.', 410);
        }

        $this->conn->prepare("UPDATE schools SET admin_credentials_shown = TRUE WHERE id = ?")
             ->execute([$schoolId]);

        Response::success([
            'admin_identity' => "admin@{$school['suffix']}",
        ], 'Credentials have been previously shown.');
    }

    public function rejectSchool(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $reason = $data['reason'] ?? 'No reason provided';

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id AND status = 'pending' LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('Pending school not found.');
        }

        $this->conn->prepare("UPDATE schools SET status = 'rejected', rejection_reason = :reason WHERE id = :id")
             ->execute([':reason' => $reason, ':id' => $id]);

        $this->logAction('reject_school', $id, $school['name'], ['reason' => $reason]);

        Response::success(null, 'School registration rejected.');
    }

    public function deactivateSchool(int $id) {
        $token_data = $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $reason = $data['reason'] ?? 'No reason provided';

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $this->conn->prepare(
            "UPDATE schools SET status = 'inactive', deactivated_by = :admin_id, deactivated_at = NOW(), deactivation_reason = :reason WHERE id = :id"
        )->execute([':admin_id' => $token_data['super_admin_id'], ':reason' => $reason, ':id' => $id]);

        $this->logAction('deactivate_school', $id, $school['name'], ['reason' => $reason]);

        Response::success(null, 'School deactivated.');
    }

    public function activateSchool(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $newAccessUntil = $data['access_until'] ?? date('Y-m-d H:i:s', strtotime('+90 days'));

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $this->conn->prepare(
            "UPDATE schools SET status = 'active', access_until = :au, deactivated_by = NULL, deactivated_at = NULL, deactivation_reason = NULL WHERE id = :id"
        )->execute([':au' => $newAccessUntil, ':id' => $id]);

        $this->logAction('activate_school', $id, $school['name'], ['new_access_until' => $newAccessUntil]);

        Response::success(null, 'School activated.');
    }

    public function suspendSchool(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $reason = $data['reason'] ?? 'No reason provided';

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $this->conn->prepare("UPDATE schools SET status = 'suspended', deactivation_reason = :reason WHERE id = :id")
             ->execute([':reason' => $reason, ':id' => $id]);

        $this->logAction('suspend_school', $id, $school['name'], ['reason' => $reason]);

        Response::success(null, 'School suspended.');
    }

    public function extendAccess(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['days'])) {
            $days = (int)$data['days'];
            if ($days < 1) {
                Response::badRequest('Days must be at least 1.');
            }
            $accessUntil = date('Y-m-d H:i:s', strtotime("+{$days} days"));
        } elseif (isset($data['access_until'])) {
            $accessUntil = $data['access_until'];
            if (strtotime($accessUntil) === false) {
                Response::badRequest('Invalid access_until date format.');
            }
        } else {
            Response::badRequest('Either "days" or "access_until" is required.');
        }

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $this->conn->prepare("UPDATE schools SET access_until = :au WHERE id = :id")
             ->execute([':au' => $accessUntil, ':id' => $id]);

        $this->logAction('extend_access', $id, $school['name'], ['new_access_until' => $accessUntil]);

        Response::success(null, 'Access extended.');
    }

    public function setSchoolPlan(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['plan']);

        $plan = Middleware::validateEnum($data['plan'], ['trial', 'basic', 'standard', 'premium'], 'plan');

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $this->conn->prepare("UPDATE schools SET plan = :plan WHERE id = :id")
             ->execute([':plan' => $plan, ':id' => $id]);

        $this->logAction('set_plan', $id, $school['name'], ['plan' => $plan]);

        Response::success(null, 'School plan updated.');
    }

    public function resetAdminPassword(int $schoolId) {
        $this->requireAuth();

        $stmt = $this->conn->prepare("SELECT name, suffix FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $schoolId]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $userStmt = $this->conn->prepare(
            "SELECT id FROM users WHERE school_id = :sid AND role = 'admin' AND status = 'Active' LIMIT 1"
        );
        $userStmt->execute([':sid' => $schoolId]);
        $adminUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$adminUser) {
            Response::notFound('Admin user not found for this school.');
        }

        $tempPassword = bin2hex(random_bytes(6));
        $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $this->conn->prepare(
            "UPDATE users SET password_hash = :ph, must_change_password = TRUE, updated_at = NOW() WHERE id = :id"
        )->execute([':ph' => $passwordHash, ':id' => $adminUser['id']]);

        $this->logAction('reset_admin_password', $schoolId, $school['name']);

        Response::success([
            'admin_identity' => "admin@{$school['suffix']}",
            'temp_password'  => $tempPassword,
        ], 'Admin password reset. Save the temporary password — it will not be shown again.');
    }

    public function getSchoolDetails(int $id) {
        $this->requireAuth();

        $stmt = $this->conn->prepare("SELECT * FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        $counts = [
            'student_count' => 0, 'teacher_count' => 0, 'parent_count' => 0,
            'accountant_count' => 0, 'payment_count' => 0, 'class_count' => 0, 'term_count' => 0,
        ];

        $countTables = [
            'student_count' => 'students', 'teacher_count' => 'teachers',
            'parent_count' => 'parents', 'accountant_count' => 'accountants',
            'payment_count' => 'payments', 'class_count' => 'classes', 'term_count' => 'terms',
        ];

        foreach ($countTables as $key => $table) {
            try {
                $cstmt = $this->conn->prepare("SELECT COUNT(*) FROM {$table} WHERE school_id = :sid");
                $cstmt->execute([':sid' => $id]);
                $counts[$key] = (int)$cstmt->fetchColumn();
            } catch (PDOException $e) {
                error_log("School detail count error ({$table}): " . $e->getMessage());
            }
        }

        $school = array_merge($school, $counts);

        $school['recent_activity'] = [];
        try {
            $logStmt = $this->conn->prepare(
                "SELECT * FROM activity_logs WHERE school_id = :sid ORDER BY created_at DESC LIMIT 20"
            );
            $logStmt->execute([':sid' => $id]);
            $school['recent_activity'] = $logStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("School detail activity_logs error: " . $e->getMessage());
        }

        Response::success($school, 'School details retrieved');
    }

    public function getPlatformStats() {
        $this->requireAuth();

        // Single efficient query for school counts by status
        $statusRow = $this->conn->query("
            SELECT
                COUNT(*) as total_schools,
                SUM(status='active') as active_schools,
                SUM(status='pending') as pending_schools,
                SUM(status='inactive') as inactive_schools,
                SUM(status='suspended') as suspended_schools,
                SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_schools_this_month
            FROM schools
        ")->fetch(PDO::FETCH_ASSOC);

        // Single query for plan distribution among active schools
        $planRow = $this->conn->query("
            SELECT
                SUM(plan='trial') as trial_schools,
                SUM(plan='basic') as basic_schools,
                SUM(plan='standard') as standard_schools,
                SUM(plan='premium') as premium_schools
            FROM schools WHERE status='active'
        ")->fetch(PDO::FETCH_ASSOC);

        $studentCount = $this->conn->query("SELECT COUNT(*) FROM students")->fetchColumn();
        $teacherCount = $this->conn->query("SELECT COUNT(*) FROM teachers")->fetchColumn();

        $stats = array_merge($statusRow, $planRow, [
            'total_students' => (int)$studentCount,
            'total_teachers' => (int)$teacherCount,
        ]);

        Response::success($stats, 'Platform stats retrieved');
    }

    public function checkSuffix() {
        $this->requireAuth();
        $suffix = strtolower(trim($_GET['suffix'] ?? ''));

        if (empty($suffix)) {
            Response::badRequest('Suffix parameter is required.');
        }

        $available = TenantMiddleware::isSuffixAvailable($this->conn, $suffix);
        $valid = TenantMiddleware::validateSuffixFormat($suffix);

        Response::success([
            'suffix'    => $suffix,
            'available' => $available,
            'valid'     => $valid,
        ]);
    }

    public function getActivityLogs() {
        $this->requireAuth();
        $page = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;

        $stmt = $this->conn->prepare(
            "SELECT pal.*, sa.username as super_admin_name
             FROM platform_activity_logs pal
             LEFT JOIN super_admins sa ON pal.super_admin_id = sa.id
             ORDER BY pal.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countStmt = $this->conn->query("SELECT COUNT(*) FROM platform_activity_logs");
        $total = (int)$countStmt->fetchColumn();

        Response::paginated($logs, $page, $perPage, $total, 'Activity logs retrieved');
    }

    public function editSchoolDetails(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);

        $stmt = $this->conn->prepare("SELECT name, suffix_locked FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        if (isset($data['suffix']) && $school['suffix_locked']) {
            Response::badRequest('Suffix cannot be changed after first user login.');
        }

        $allowedFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'logo_url',
                          'primary_color', 'secondary_color', 'website', 'country'];

        $updates = [];
        $params = [':id' => $id];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }

        if (isset($data['suffix']) && !$school['suffix_locked']) {
            $suffix = strtolower(trim($data['suffix']));
            if (!TenantMiddleware::validateSuffixFormat($suffix)) {
                Response::badRequest('Invalid suffix format.');
            }
            if (!TenantMiddleware::isSuffixAvailable($this->conn, $suffix)) {
                Response::badRequest('Suffix already taken.');
            }
            $updates[] = "suffix = :suffix";
            $params[':suffix'] = $suffix;
        }

        if (empty($updates)) {
            Response::badRequest('No valid fields to update.');
        }

        $this->conn->prepare(
            "UPDATE schools SET " . implode(', ', $updates) . " WHERE id = :id"
        )->execute($params);

        $this->logAction('edit_school', $id, $school['name'], ['updated_fields' => array_keys($data)]);

        Response::success(null, 'School details updated.');
    }

    public function getSchoolModules(int $id) {
        $this->requireAuth();

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$school) Response::notFound('School not found.');

        $this->ensureSchoolModulesTable();

        $stmt = $this->conn->prepare(
            "SELECT module_name, is_enabled, disabled_reason FROM school_modules WHERE school_id = :sid ORDER BY id"
        );
        $stmt->execute([':sid' => $id]);
        $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        Response::success($modules, 'School modules retrieved');
    }

    public function updateSchoolModules(int $id) {
        $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$school) Response::notFound('School not found.');

        $this->ensureSchoolModulesTable();

        $modules = $data['modules'] ?? [];
        if (empty($modules)) {
            Response::badRequest('No modules provided.');
        }

        $this->conn->beginTransaction();
        try {
            foreach ($modules as $mod) {
                $name = $mod['module_name'] ?? '';
                $enabled = isset($mod['is_enabled']) ? (int)$mod['is_enabled'] : 1;
                $reason = $mod['disabled_reason'] ?? null;

                if (empty($name)) continue;

                $this->conn->prepare(
                    "INSERT INTO school_modules (school_id, module_name, is_enabled, disabled_reason)
                     VALUES (:sid, :name, :enabled, :reason)
                     ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), disabled_reason = VALUES(disabled_reason)"
                )->execute([':sid' => $id, ':name' => $name, ':enabled' => $enabled, ':reason' => $reason]);
            }
            $this->conn->commit();
        } catch (PDOException $e) {
            error_log("PDO Error in SuperAdminController.updateSchoolModules: " . $e->getMessage());
            $this->conn->rollBack();
            Response::serverError('Failed to update modules');
        }

        $this->logAction('update_modules', $id, $school['name'], ['modules' => $modules]);

        Response::success(null, 'School modules updated.');
    }

    public function deleteSchool(int $id) {
        $token_data = $this->requireAuth();

        $stmt = $this->conn->prepare("SELECT name FROM schools WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$school) Response::notFound('School not found.');

        $this->conn->beginTransaction();
        try {
            $this->conn->exec("SET FOREIGN_KEY_CHECKS = 0");

            $cascadeTables = [
                'student_parents', 'student_scores', 'exam_results',
                'results', 'result_templates',
                'payment_records', 'receipts', 'payments',
                'attendance_records', 'attendance',
                'students', 'teachers', 'accountants', 'parents',
                'notifications', 'notification_templates',
                'class_subjects', 'classes', 'terms',
                'school_modules', 'school_settings',
                'super_admin_activity_logs', 'platform_activity_logs',
            ];
            foreach ($cascadeTables as $table) {
                try {
                    $this->conn->prepare("DELETE FROM {$table} WHERE school_id = :sid")->execute([':sid' => $id]);
                } catch (PDOException $e) {
                    error_log("Cascade delete skip ({$table}): " . $e->getMessage());
                }
            }

            $this->conn->prepare("DELETE FROM users WHERE school_id = :sid")->execute([':sid' => $id]);
            $this->conn->prepare("DELETE FROM schools WHERE id = :id")->execute([':id' => $id]);

            $this->conn->exec("SET FOREIGN_KEY_CHECKS = 1");
            $this->conn->commit();
        } catch (PDOException $e) {
            error_log("PDO Error in SuperAdminController.deleteSchool: " . $e->getMessage());
            try { $this->conn->exec("SET FOREIGN_KEY_CHECKS = 1"); } catch ($x) {}
            $this->conn->rollBack();
            Response::serverError('Failed to delete school');
        }

        $this->logAction('delete_school', $id, $school['name']);

        Response::success(null, 'School deleted permanently.');
    }

    public function createSchool() {
        $token_data = $this->requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['name', 'email']);

        $name = trim($data['name']);
        $email = trim($data['email']);
        $phone = $data['phone'] ?? '';
        $address = $data['address'] ?? '';
        $city = $data['city'] ?? '';
        $state = $data['state'] ?? '';
        $suffix = strtolower(trim($data['suffix'] ?? ''));
        $plan = $data['plan'] ?? 'trial';
        $accessUntil = $data['access_until'] ?? date('Y-m-d H:i:s', strtotime('+90 days'));

        if (empty($suffix)) {
            $suffix = strtolower(substr(preg_replace('/[^a-zA-Z0-9]/', '', $name), 0, 6));
            if (strlen($suffix) < 2) $suffix = 'sch' . time();
        }

        if (!TenantMiddleware::validateSuffixFormat($suffix)) {
            Response::badRequest('Invalid suffix format.');
        }
        if (!TenantMiddleware::isSuffixAvailable($this->conn, $suffix)) {
            Response::badRequest("Suffix '{$suffix}' is already taken.");
        }

        $checkStmt = $this->conn->prepare("SELECT id FROM schools WHERE email = :email LIMIT 1");
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            Response::badRequest('A school with this email already exists.');
        }

        $tempPassword = bin2hex(random_bytes(6));
        $passwordHash = password_hash($tempPassword, PASSWORD_BCRYPT, ['cost' => 12]);

        $this->ensureSchoolModulesTable();

        $this->conn->beginTransaction();
        try {
            $this->conn->prepare(
                "INSERT INTO schools (name, suffix, email, phone, address, city, state, plan, status, access_until, approved_by, approved_at)
                 VALUES (:name, :suffix, :email, :phone, :address, :city, :state, :plan, 'active', :au, :admin_id, NOW())"
            )->execute([
                ':name' => $name, ':suffix' => $suffix, ':email' => $email,
                ':phone' => $phone, ':address' => $address, ':city' => $city, ':state' => $state,
                ':plan' => $plan, ':au' => $accessUntil, ':admin_id' => $token_data['super_admin_id'],
            ]);

            $newSchoolId = (int)$this->conn->lastInsertId();

            $this->conn->prepare(
                "INSERT INTO users (school_id, username, password_hash, role, status, email, created_at, updated_at)
                 VALUES (:sid, 'admin', :ph, 'admin', 'Active', :email, NOW(), NOW())"
            )->execute([':sid' => $newSchoolId, ':ph' => $passwordHash, ':email' => $email]);

            $modules = ['students','teachers','results','cbt','fees','attendance','assignments','notifications','reports','accountant'];
            $modStmt = $this->conn->prepare(
                "INSERT INTO school_modules (school_id, module_name, is_enabled) VALUES (:sid, :name, 1)"
            );
            foreach ($modules as $m) {
                $modStmt->execute([':sid' => $newSchoolId, ':name' => $m]);
            }

            $this->conn->commit();
        } catch (PDOException $e) {
            error_log("PDO Error in SuperAdminController.createSchool: " . $e->getMessage());
            $this->conn->rollBack();
            Response::serverError('Failed to create school');
        }

        $this->logAction('create_school', $newSchoolId, $name, ['suffix' => $suffix]);

        Response::success([
            'school_id'      => $newSchoolId,
            'school_name'    => $name,
            'suffix'         => $suffix,
            'admin_identity' => "admin@{$suffix}",
            'admin_password' => $tempPassword,
        ], 'School created successfully.', 201);
    }
}
