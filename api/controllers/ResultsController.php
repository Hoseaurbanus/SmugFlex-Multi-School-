<?php
/**
 * Results Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class ResultsController
{
    private $conn;

    private function tableExists(string $tableName): bool
    {
        if (!$this->conn) {
            return false;
        }

        try {
            $dbNameStmt = $this->conn->query('SELECT DATABASE()');
            $dbName = $dbNameStmt ? $dbNameStmt->fetchColumn() : null;
            if (!$dbName) {
                return false;
            }

            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table"
            );
            $stmt->bindValue(':db', $dbName);
            $stmt->bindValue(':table', $tableName);
            $stmt->execute();

            return (int)$stmt->fetchColumn() > 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    private function columnExists(string $tableName, string $columnName): bool
    {
        if (!$this->conn) {
            return false;
        }

        try {
            $dbNameStmt = $this->conn->query('SELECT DATABASE()');
            $dbName = $dbNameStmt ? $dbNameStmt->fetchColumn() : null;
            if (!$dbName) {
                return false;
            }

            $stmt = $this->conn->prepare(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table AND COLUMN_NAME = :col"
            );
            $stmt->bindValue(':db', $dbName);
            $stmt->bindValue(':table', $tableName);
            $stmt->bindValue(':col', $columnName);
            $stmt->execute();

            return (int)$stmt->fetchColumn() > 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    public function __construct()
    {
        try {
            $database = new Database();
            $this->conn = $database->getConnection();
            
            if ($this->conn) {
                $this->ensureCompiledResultsTableExists();
                $this->ensureCompiledResultsColumnsExist();
                $this->ensureScoresApprovalColumnsExist();
                $this->ensureCumulativeResultsTableExists();
            }
        } catch (Throwable $e) {
            // Silent fail for security
        }
    }

    /**
     * Ensure compiled_results table exists
     */
    private function ensureCompiledResultsTableExists() {
        try {
            $query = "CREATE TABLE IF NOT EXISTS compiled_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                term VARCHAR(50) NOT NULL,
                academic_year VARCHAR(20) NOT NULL,
                total_score DECIMAL(10, 2),
                average_score DECIMAL(10, 2),
                class_average DECIMAL(10, 2),
                position INT,
                total_students INT,
                times_present INT DEFAULT 0,
                times_absent INT DEFAULT 0,
                total_attendance_days INT DEFAULT 0,
                term_begin DATE,
                term_end DATE,
                next_term_begin DATE,
                class_teacher_name VARCHAR(100),
                class_teacher_comment TEXT,
                principal_name VARCHAR(100),
                principal_comment TEXT,
                principal_signature TEXT,
                compiled_by INT NOT NULL,
                compiled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'Draft',
                print_approved TINYINT(1) DEFAULT 0,
                approved_by INT,
                approved_date DATETIME,
                rejection_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (student_id),
                INDEX (class_id),
                INDEX (term),
                INDEX (academic_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            
            $this->conn->exec($query);
        } catch (Throwable $e) {
            // Silently handle table creation errors
        }
    }

    private function ensureCompiledResultsColumnsExist() {
        if (!$this->conn) {
            return;
        }

        try {
            $dbNameStmt = $this->conn->query('SELECT DATABASE()');
            $dbName = $dbNameStmt ? $dbNameStmt->fetchColumn() : null;
            if (!$dbName) {
                return;
            }

            $requiredColumns = [
                'status' => "ALTER TABLE compiled_results ADD COLUMN status VARCHAR(20) DEFAULT 'Draft'",
                'print_approved' => "ALTER TABLE compiled_results ADD COLUMN print_approved TINYINT(1) DEFAULT 0",
                'approved_by' => "ALTER TABLE compiled_results ADD COLUMN approved_by INT NULL",
                'approved_date' => "ALTER TABLE compiled_results ADD COLUMN approved_date DATETIME NULL",
                'rejection_reason' => "ALTER TABLE compiled_results ADD COLUMN rejection_reason TEXT NULL",
                'created_at' => "ALTER TABLE compiled_results ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                'updated_at' => "ALTER TABLE compiled_results ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
            ];

            foreach ($requiredColumns as $column => $alterSql) {
                $check = $this->conn->prepare(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'compiled_results' AND COLUMN_NAME = :col"
                );
                $check->bindParam(':db', $dbName);
                $check->bindParam(':col', $column);
                $check->execute();

                $exists = (int)$check->fetchColumn();
                if ($exists === 0) {
                    $this->conn->exec($alterSql);
                }
            }
        } catch (Throwable $e) {
            // Avoid breaking the API if migration fails.
        }
    }

    /**
     * Ensure scores table has approval/rejection metadata columns.
     */
    private function ensureScoresApprovalColumnsExist() {
        if (!$this->conn) {
            return;
        }

        try {
            $dbNameStmt = $this->conn->query('SELECT DATABASE()');
            $dbName = $dbNameStmt ? $dbNameStmt->fetchColumn() : null;
            if (!$dbName) {
                return;
            }

            $requiredColumns = [
                'approved_by' => "ALTER TABLE scores ADD COLUMN approved_by INT NULL",
                'approved_date' => "ALTER TABLE scores ADD COLUMN approved_date DATETIME NULL",
                'rejection_reason' => "ALTER TABLE scores ADD COLUMN rejection_reason TEXT NULL",
                'rejected_by' => "ALTER TABLE scores ADD COLUMN rejected_by INT NULL",
                'rejected_date' => "ALTER TABLE scores ADD COLUMN rejected_date DATETIME NULL"
            ];

            foreach ($requiredColumns as $column => $alterSql) {
                $check = $this->conn->prepare(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'scores' AND COLUMN_NAME = :col"
                );
                $check->bindParam(':db', $dbName);
                $check->bindParam(':col', $column);
                $check->execute();

                $exists = (int)$check->fetchColumn();
                if ($exists === 0) {
                    $this->conn->exec($alterSql);
                }
            }
        } catch (Throwable $e) {
            // Avoid breaking the API if migration fails.
        }
    }

    /**
     * Ensure cumulative_results table exists
     */
    private function ensureCumulativeResultsTableExists() {
        try {
            $query = "CREATE TABLE IF NOT EXISTS cumulative_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                academic_year VARCHAR(20) NOT NULL,
                total_score DECIMAL(8,2) DEFAULT 0,
                average_score DECIMAL(5,2) DEFAULT 0,
                position INT DEFAULT NULL,
                class_average DECIMAL(5,2) DEFAULT NULL,
                total_students INT DEFAULT NULL,
                promotion_status ENUM('Promoted','Repeated') DEFAULT NULL,
                session_attendance_pct DECIMAL(5,2) DEFAULT NULL,
                subject_data TEXT DEFAULT NULL,
                principal_comment TEXT DEFAULT NULL,
                compiled_by INT NOT NULL,
                compiled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_session (student_id, class_id, academic_year),
                INDEX idx_class_year (class_id, academic_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
            $this->conn->exec($query);
        } catch (Throwable $e) {
            // Silently handle table creation errors
        }
    }

    private function validateScoreStatus($status) {
        $allowed = ['Draft', 'Submitted', 'Rejected', 'Approved'];
        if (!in_array($status, $allowed, true)) {
            Response::badRequest('Invalid status value');
        }
        return $status;
    }

    private function getScoreWithAssignmentAndClass($score_id, $school_id = null) {
        $query = "SELECT sc.*, sa.class_id, sa.teacher_id as subject_teacher_id, sa.term as assignment_term, sa.academic_year as assignment_year
                  FROM scores sc
                  JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                  WHERE sc.id = :score_id";
        if ($school_id !== null) {
            $query .= " AND sc.school_id = :school_id";
        }
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':score_id', $score_id);
        if ($school_id !== null) {
            $stmt->bindParam(':school_id', $school_id);
        }
        $stmt->execute();
        return $stmt->fetch();
    }

    private function requireClassTeacherForClass($token_data, $class_id, $school_id = null) {
        $check_query = "SELECT COUNT(*) as count FROM classes WHERE id = :class_id AND class_teacher_id = :teacher_id";
        if ($school_id !== null) {
            $check_query .= " AND school_id = :school_id";
        }
        $check_stmt = $this->conn->prepare($check_query);
        $check_stmt->bindParam(':class_id', $class_id);
        $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
        if ($school_id !== null) {
            $check_stmt->bindParam(':school_id', $school_id);
        }
        $check_stmt->execute();
        if ($check_stmt->fetchColumn() == 0) {
            Response::forbidden('Only the class teacher can approve or reject scores for this class');
        }
    }

    /**
     * Approve a single score (class teacher)
     */
    public function approveScore($score_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireAuth();
        if (($token_data['role'] ?? null) !== 'teacher') {
            Response::forbidden('Only teachers can approve scores');
        }
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        try {
            $score_id = Middleware::validateInteger($score_id, 'score_id');
            $row = $this->getScoreWithAssignmentAndClass($score_id, $school_id);
            if (!$row) {
                Response::notFound('Score not found');
            }

            $this->requireClassTeacherForClass($token_data, (int)$row['class_id'], $school_id);

            $update = $this->conn->prepare(
                "UPDATE scores
                 SET status = 'Approved', approved_by = :approved_by, approved_date = NOW(),
                     rejection_reason = NULL, rejected_by = NULL, rejected_date = NULL
                 WHERE id = :score_id AND school_id = :school_id"
            );
            $update->bindParam(':approved_by', $token_data['user_id']);
            $update->bindParam(':score_id', $score_id);
            $update->bindParam(':school_id', $school_id);
            $update->execute();

            RealtimeEvents::publish(['scores', 'compiled_results'], [
                'action' => 'approved',
                'score_id' => (int)$score_id,
                'class_id' => (int)$row['class_id'],
                'term' => (string)($row['assignment_term'] ?? ''),
                'academic_year' => (string)($row['assignment_year'] ?? ''),
            ]);

            Response::success(null, 'Score approved successfully');
        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error approving score');
        } catch (Throwable $e) {
            Response::serverError('Error approving score');
        }
    }

    /**
     * Reject a single score (class teacher)
     */
    public function rejectScore($score_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireAuth();
        if (($token_data['role'] ?? null) !== 'teacher') {
            Response::forbidden('Only teachers can reject scores');
        }
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $data = json_decode(file_get_contents('php://input'), true);
        $reason = isset($data['rejection_reason']) ? Middleware::sanitizeString($data['rejection_reason']) : '';

        if (!$reason) {
            Response::badRequest('Rejection reason is required');
        }

        try {
            $score_id = Middleware::validateInteger($score_id, 'score_id');
            $row = $this->getScoreWithAssignmentAndClass($score_id, $school_id);
            if (!$row) {
                Response::notFound('Score not found');
            }

            $this->requireClassTeacherForClass($token_data, (int)$row['class_id'], $school_id);

            $update = $this->conn->prepare(
                "UPDATE scores
                 SET status = 'Rejected', rejection_reason = :reason, rejected_by = :rejected_by, rejected_date = NOW(),
                     approved_by = NULL, approved_date = NULL
                 WHERE id = :score_id AND school_id = :school_id"
            );
            $update->bindParam(':reason', $reason);
            $update->bindParam(':rejected_by', $token_data['user_id']);
            $update->bindParam(':score_id', $score_id);
            $update->bindParam(':school_id', $school_id);
            $update->execute();

            RealtimeEvents::publish(['scores', 'compiled_results'], [
                'action' => 'rejected',
                'score_id' => (int)$score_id,
                'class_id' => (int)$row['class_id'],
                'term' => (string)($row['assignment_term'] ?? ''),
                'academic_year' => (string)($row['assignment_year'] ?? ''),
            ]);

            Response::success(null, 'Score rejected successfully');
        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error rejecting score');
        } catch (Throwable $e) {
            Response::serverError('Error rejecting score');
        }
    }

    public function getPendingApprovals()
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        try {
            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            $token_data = Middleware::requireAuth();
            if (($token_data['role'] ?? null) !== 'teacher' && ($token_data['role'] ?? null) !== 'admin') {
                Response::forbidden('Only teachers and admins can view pending approvals');
            }
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : null;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;
            $class_id = null;
            if (isset($_GET['class_id']) && $_GET['class_id'] !== '') {
                $class_id = Middleware::validateInteger($_GET['class_id'], 'class_id');
            }

            if (!$term || !$academic_year) {
                $settings_query = "SELECT setting_key, setting_value FROM school_settings WHERE setting_key IN ('current_term', 'current_academic_year') AND school_id = :school_id";
                $settings_stmt = $this->conn->prepare($settings_query);
                $settings_stmt->bindParam(':school_id', $school_id);
                $settings_stmt->execute();
                $settings_results = $settings_stmt->fetchAll(PDO::FETCH_ASSOC);
                $settings = [];
                foreach ($settings_results as $result) {
                    $settings[$result['setting_key']] = $result['setting_value'];
                }

                $term = $term ?: ($settings['current_term'] ?? null);
                $academic_year = $academic_year ?: ($settings['current_academic_year'] ?? null);
            }

            if (!$term || !$academic_year) {
                Response::badRequest('Term and academic year are required');
                return;
            }

            $query = "SELECT cr.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
                      FROM compiled_results cr
                      JOIN students s ON cr.student_id = s.id
                      JOIN classes c ON cr.class_id = c.id
                      WHERE cr.status = 'Submitted'
                        AND cr.term = :term
                        AND cr.academic_year = :academic_year
                        AND cr.school_id = :school_id";

            $params = [
                ':term' => $term,
                ':academic_year' => $academic_year,
                ':school_id' => $school_id
            ];

            if ($class_id) {
                $query .= " AND cr.class_id = :class_id";
                $params[':class_id'] = $class_id;
            }

            if (($token_data['role'] ?? null) === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::success([], 'Teacher profile not linked');
                    return;
                }

                $query .= " AND cr.class_id IN (
                    SELECT cta.class_id FROM class_teacher_assignments cta
                    WHERE cta.teacher_id = :teacher_id
                      AND cta.term = :cta_term
                      AND cta.academic_year = :cta_academic_year
                      AND cta.status = 'Active'
                      AND cta.school_id = :school_id_cta
                )";
                $params[':teacher_id'] = $token_data['linked_id'];
                $params[':cta_term'] = $term;
                $params[':cta_academic_year'] = $academic_year;
                $params[':school_id_cta'] = $school_id;
            }

            $query .= " ORDER BY c.name, s.last_name, s.first_name";

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($results === false) {
                $results = [];
            }

            Response::success($results, 'Pending approvals retrieved successfully');
        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error retrieving pending approvals');
        } catch (Throwable $e) {
            Response::serverError('Error retrieving pending approvals');
        }
    }

    /**
     * Get Scores by Assignment
     */
    public function getScoresByAssignment($assignment_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');

        try {
            // Check if teacher has access to this assignment
            if ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE id = :assignment_id AND teacher_id = :teacher_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();

                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this assignment');
                }
            }

            $query = "SELECT sc.*, s.first_name, s.last_name, s.admission_number,
                             sub.name as subject_name, c.name as class_name,
                             sa.term, sa.academic_year
                      FROM scores sc
                      JOIN students s ON sc.student_id = s.id
                      JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                      JOIN subjects sub ON sa.subject_id = sub.id
                      JOIN classes c ON sa.class_id = c.id
                      WHERE sc.subject_assignment_id = :assignment_id
                        AND sc.school_id = :school_id
                      ORDER BY s.last_name, s.first_name";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':assignment_id', $assignment_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();

            $scores = $stmt->fetchAll();

            Response::success($scores, 'Scores retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error retrieving scores');
        }
    }

    /**
     * Create or Update Scores
     */
    public function upsertScores()
    {
        $token_data = Middleware::requireAuth();

        if ($token_data['role'] !== 'teacher') {
            Response::forbidden('Only teachers can enter scores');
        }
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $data = json_decode(file_get_contents('php://input'), true);

        Middleware::validateRequired($data, ['assignment_id', 'scores']);

        try {
            $assignment_id = Middleware::validateInteger($data['assignment_id'], 'assignment_id');
            $scores = $data['scores'];
            $request_status = isset($data['status']) ? $this->validateScoreStatus($data['status']) : null;

            // Verify teacher owns this assignment and get class info
            $check_query = "SELECT sa.id, sa.class_id, c.name as class_name, c.level as class_level 
                            FROM subject_assignments sa 
                            JOIN classes c ON sa.class_id = c.id 
                            WHERE sa.id = :assignment_id AND sa.teacher_id = :teacher_id AND sa.school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->execute();

            $assignment_info = $check_stmt->fetch();

            if (!$assignment_info) {
                Response::forbidden('Access denied to this assignment');
            }

            // Check if this is a creche class
            $class_level_lc = strtolower((string)($assignment_info['class_level'] ?? ''));
            $class_name_lc = strtolower((string)($assignment_info['class_name'] ?? ''));
            $is_creche = $class_level_lc === 'creche' ||
                strpos($class_name_lc, 'creche') !== false ||
                strpos($class_name_lc, 'crèche') !== false;

            $class_id = (int)$assignment_info['class_id'];
            $assignment_term = $this->getAssignmentTerm($assignment_id, $school_id);
            $assignment_year = $this->getAssignmentAcademicYear($assignment_id, $school_id);

            $this->conn->beginTransaction();

            foreach ($scores as $score_data) {
            // Determine per-row status early (Draft saves can be partial).
            $row_status = null;
            if (isset($score_data['status'])) {
                $row_status = $this->validateScoreStatus($score_data['status']);
            } elseif ($request_status) {
                $row_status = $request_status;
            } else {
                $row_status = 'Draft';
            }

            $has_ca1_key = array_key_exists('ca1', $score_data);
            $has_ca2_key = array_key_exists('ca2', $score_data);
            $has_exam_key = array_key_exists('exam', $score_data);

            // Required fields depend on status and class type.
            if ($row_status === 'Submitted') {
                // Submission requires at least one score component.
                Middleware::validateRequired($score_data, ['student_id']);
            } else {
                // Draft: allow partial entry (CA1/CA2/Exam can be recorded on different dates).
                Middleware::validateRequired($score_data, ['student_id']);

                // For non-creche draft, require at least one component to avoid saving empty rows.
                if (!$is_creche) {
                    $has_any_component = (
                        (isset($score_data['ca1']) && $score_data['ca1'] !== '' && $score_data['ca1'] !== null) ||
                        (isset($score_data['ca2']) && $score_data['ca2'] !== '' && $score_data['ca2'] !== null) ||
                        (isset($score_data['exam']) && $score_data['exam'] !== '' && $score_data['exam'] !== null)
                    );
                    if (!$has_any_component) {
                        Response::badRequest('Draft save requires at least one score component (CA1, CA2, or Exam)');
                    }
                }
            }

            $student_id = Middleware::validateInteger($score_data['student_id'], 'student_id');

            // CRITICAL: Validate that student is active and belongs to the class
            $student_check_query = "SELECT COUNT(*) as count FROM students WHERE id = :student_id AND class_id = :class_id AND status = 'Active' AND school_id = :school_id";
            $student_check_stmt = $this->conn->prepare($student_check_query);
            $student_check_stmt->bindParam(':student_id', $student_id);
            $student_check_stmt->bindParam(':class_id', $class_id);
            $student_check_stmt->bindParam(':school_id', $school_id);
            $student_check_stmt->execute();
            $student_exists = $student_check_stmt->fetchColumn();

            if ($student_exists == 0) {
                Response::badRequest("Student ID $student_id is not active or not enrolled in this class");
            }

            // Accept partial drafts: missing components are stored as NULL.
            $ca1 = 0;
            $ca2 = 0;
            $exam = null;

            if (!$is_creche) {
                $ca1 = (isset($score_data['ca1']) && $score_data['ca1'] !== '' && $score_data['ca1'] !== null)
                    ? Middleware::validateNonNegative($score_data['ca1'], 'ca1')
                    : null;
                $ca2 = (isset($score_data['ca2']) && $score_data['ca2'] !== '' && $score_data['ca2'] !== null)
                    ? Middleware::validateNonNegative($score_data['ca2'], 'ca2')
                    : null;
            }

            $exam = (isset($score_data['exam']) && $score_data['exam'] !== '' && $score_data['exam'] !== null)
                ? Middleware::validateNonNegative($score_data['exam'], 'exam')
                : null;

            // Validate score ranges only for present components
            if ($ca1 !== null && ($ca1 < 0 || $ca1 > 40)) {
                Response::badRequest('CA1 must be between 0 and 40');
            }
            if ($ca2 !== null && ($ca2 < 0 || $ca2 > 40)) {
                Response::badRequest('CA2 must be between 0 and 40');
            }
            $exam_max = $is_creche ? 100 : 60;
            if ($exam !== null && ($exam < 0 || $exam > $exam_max)) {
                Response::badRequest('Exam must be between 0 and ' . $exam_max);
            }

            $total = ($ca1 ?? 0) + ($ca2 ?? 0) + ($exam ?? 0);
            $grade = $this->calculateGrade($total, $is_creche);
            $remark = $this->getRemark($grade, $is_creche);

            // Calculate class statistics
            $class_stats = $this->calculateClassStatistics($assignment_id, $total);

            // Check if score exists
            $existing_query = "SELECT id FROM scores WHERE subject_assignment_id = :assignment_id AND student_id = :student_id AND school_id = :school_id";
            $existing_stmt = $this->conn->prepare($existing_query);
            $existing_stmt->bindParam(':assignment_id', $assignment_id);
            $existing_stmt->bindParam(':student_id', $student_id);
            $existing_stmt->bindParam(':school_id', $school_id);
            $existing_stmt->execute();

            $existing_score = $existing_stmt->fetch();

            if ($existing_score) {
                // Prevent overwriting already-approved scores
                $status_check_query = "SELECT status FROM scores WHERE id = :score_id AND school_id = :school_id";
                $status_check_stmt = $this->conn->prepare($status_check_query);
                $status_check_stmt->bindParam(':score_id', $existing_score['id']);
                $status_check_stmt->bindParam(':school_id', $school_id);
                $status_check_stmt->execute();
                $current_status = $status_check_stmt->fetchColumn();

                if ($current_status === 'Approved') {
                    $this->conn->rollBack();
                    Response::badRequest("Cannot modify approved score for student ID $student_id. Reject the existing score first.");
                }

                // Preserve existing values for components that were not provided in the request
                $existing_values_query = "SELECT ca1, ca2, exam FROM scores WHERE id = :score_id AND school_id = :school_id";
                $existing_values_stmt = $this->conn->prepare($existing_values_query);
                $existing_values_stmt->bindParam(':score_id', $existing_score['id']);
                $existing_values_stmt->bindParam(':school_id', $school_id);
                $existing_values_stmt->execute();
                $existing_values = $existing_values_stmt->fetch(PDO::FETCH_ASSOC);

                if (!$has_ca1_key) {
                    $ca1 = $existing_values ? $existing_values['ca1'] : $ca1;
                }
                if (!$has_ca2_key) {
                    $ca2 = $existing_values ? $existing_values['ca2'] : $ca2;
                }
                if (!$has_exam_key) {
                    $exam = $existing_values ? $existing_values['exam'] : $exam;
                }

                $total = ((is_null($ca1) ? 0 : (float)$ca1) + (is_null($ca2) ? 0 : (float)$ca2) + (is_null($exam) ? 0 : (float)$exam));
                $grade = $this->calculateGrade($total, $is_creche);
                $remark = $this->getRemark($grade, $is_creche);

                // Update existing score
                $update_query = "UPDATE scores SET ca1 = :ca1, ca2 = :ca2, exam = :exam, total = :total,
                                 grade = :grade, remark = :remark, class_average = :class_average,
                                 class_min = :class_min, class_max = :class_max, status = :status,
                                 term = :term, academic_year = :academic_year
                                 WHERE id = :score_id AND school_id = :school_id";

                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':ca1', $ca1);
                $update_stmt->bindParam(':ca2', $ca2);
                $update_stmt->bindParam(':exam', $exam);
                $update_stmt->bindParam(':total', $total);
                $update_stmt->bindParam(':grade', $grade);
                $update_stmt->bindParam(':remark', $remark);
                $update_stmt->bindParam(':class_average', $class_stats['average']);
                $update_stmt->bindParam(':class_min', $class_stats['min']);
                $update_stmt->bindParam(':class_max', $class_stats['max']);
                $update_stmt->bindParam(':status', $row_status);
                $update_stmt->bindParam(':term', $assignment_term);
                $update_stmt->bindParam(':academic_year', $assignment_year);
                $update_stmt->bindParam(':score_id', $existing_score['id']);
                $update_stmt->bindParam(':school_id', $school_id);
                $update_stmt->execute();
            } else {
                // Insert new score
                $insert_query = "INSERT INTO scores (student_id, subject_assignment_id, ca1, ca2, exam, total,
                                 grade, remark, class_average, class_min, class_max, entered_by, status, term, academic_year, school_id)
                                 VALUES (:student_id, :assignment_id, :ca1, :ca2, :exam, :total,
                                        :grade, :remark, :class_average, :class_min, :class_max, :entered_by, :status, :term, :academic_year, :school_id)";

                $insert_stmt = $this->conn->prepare($insert_query);
                $insert_stmt->bindParam(':student_id', $student_id);
                $insert_stmt->bindParam(':assignment_id', $assignment_id);
                $insert_stmt->bindParam(':ca1', $ca1);
                $insert_stmt->bindParam(':ca2', $ca2);
                $insert_stmt->bindParam(':exam', $exam);
                $insert_stmt->bindParam(':total', $total);
                $insert_stmt->bindParam(':grade', $grade);
                $insert_stmt->bindParam(':remark', $remark);
                $insert_stmt->bindParam(':class_average', $class_stats['average']);
                $insert_stmt->bindParam(':class_min', $class_stats['min']);
                $insert_stmt->bindParam(':class_max', $class_stats['max']);
                $insert_stmt->bindParam(':entered_by', $token_data['user_id']);
                $insert_stmt->bindParam(':status', $row_status);
                $insert_stmt->bindParam(':term', $assignment_term);
                $insert_stmt->bindParam(':academic_year', $assignment_year);
                $insert_stmt->bindParam(':school_id', $school_id);
                $insert_stmt->execute();
            }
        }

            $this->conn->commit();

        // Log activity
        Middleware::logActivity(
            $token_data['username'],
            'Teacher',
            'ENTER_SCORES',
            "Assignment ID: $assignment_id",
            'Success',
            count($scores) . ' scores entered/updated',
            $token_data['user_id']
        );

            RealtimeEvents::publish(['scores', 'compiled_results'], [
                'action' => 'saved',
                'assignment_id' => (int)$assignment_id,
            ]);

            Response::success(null, 'Scores saved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController.upsertScores: " . $e->getMessage());
            $this->conn->rollBack();
            Response::serverError('Database error saving scores');
        }
    }

    /**
     * Submit Scores for Approval
     *
     * Partial submissions are allowed. Teachers can submit CA1 only and submit again
     * later when CA2/Exam are added; the same score rows are updated.
     */
    public function submitScores($assignment_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireAuth();

        if (($token_data['role'] ?? null) !== 'teacher') {
            Response::forbidden('Only teachers can submit scores');
        }
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');

        try {
            // Verify teacher owns this assignment
            $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE id = :assignment_id AND teacher_id = :teacher_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();

            if ((int)$check_stmt->fetchColumn() === 0) {
                Response::forbidden('Access denied to this assignment');
            }

            // Require at least one score exists for this assignment
            $scores_query = "SELECT COUNT(*) as entered_scores FROM scores WHERE subject_assignment_id = :assignment_id AND school_id = :school_id";
            $scores_stmt = $this->conn->prepare($scores_query);
            $scores_stmt->bindParam(':assignment_id', $assignment_id);
            $scores_stmt->bindParam(':school_id', $school_id);
            $scores_stmt->execute();
            $entered_scores = (int)$scores_stmt->fetchColumn();

            if ($entered_scores === 0) {
                Response::badRequest('Cannot submit scores. No scores have been entered yet.');
            }

            // Update all existing scores status to Submitted
            $update_query = "UPDATE scores SET status = 'Submitted' WHERE subject_assignment_id = :assignment_id AND school_id = :school_id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':assignment_id', $assignment_id);
            $update_stmt->bindParam(':school_id', $school_id);
            $update_stmt->execute();

            RealtimeEvents::publish(['scores', 'compiled_results'], [
                'action' => 'submitted',
                'assignment_id' => (int)$assignment_id,
            ]);

            Middleware::logActivity(
                $token_data['username'],
                'Teacher',
                'SUBMIT_SCORES',
                "Assignment ID: $assignment_id",
                'Success',
                "$entered_scores scores submitted for approval",
                $token_data['user_id']
            );

            Response::success(null, 'Scores submitted successfully');
        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error submitting scores');
        }
    }

    /**
     * Get Scores by Term
     */
    public function getScoresByTerm()
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        try {
            $token_data = Middleware::requireAuth();
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            $role = strtolower(trim((string)($token_data['role'] ?? '')));

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : 'First Term';
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : '2025/2026';

            // Base query filtered by term and academic year from SCORE rows.
            // Using sa.term/sa.academic_year alone can hide valid score rows if assignments metadata
            // is stale/mismatched, causing class teachers not to see some submitted scores.
            $query = "SELECT sc.*, sa.subject_id, sa.class_id, sub.name as subject_name,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                             s.first_name as student_first_name, s.last_name as student_last_name,
                             s.admission_number, c.name as class_name
                      FROM scores sc
                      JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                      JOIN subjects sub ON sa.subject_id = sub.id
                      JOIN teachers t ON sa.teacher_id = t.id
                      JOIN students s ON sc.student_id = s.id
                      JOIN classes c ON sa.class_id = c.id
                      WHERE sc.term = :term AND sc.academic_year = :academic_year
                        AND sc.school_id = :school_id";

            $params = [
                ':term' => $term,
                ':academic_year' => $academic_year,
                ':school_id' => $school_id
            ];

            // Role-based filtering
            if ($role === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::success([], 'No scores found - teacher profile incomplete');
                    return;
                }

                // Subject teachers must always see their own scores (including Draft).
                // Class teachers must also see scores submitted for approval in their assigned classes.
                // To avoid leaking drafts from other subject teachers, only include non-draft rows
                // for the class-teacher class scope.

                $teacher_id = (int)$token_data['linked_id'];
                $params[':teacher_id'] = $teacher_id;

                if ($this->tableExists('class_teacher_assignments')) {
                    $query .= " AND (sa.teacher_id = :teacher_id OR (sa.class_id IN (
                        SELECT cta.class_id FROM class_teacher_assignments cta
                        WHERE cta.teacher_id = :class_teacher_id
                          AND cta.term = :cta_term
                          AND cta.academic_year = :cta_academic_year
                          AND cta.status = 'Active'
                          AND cta.school_id = :cta_school_id
                    ) AND sc.status IN ('Submitted','Rejected','Approved')))";
                    $params[':class_teacher_id'] = $teacher_id;
                    $params[':cta_term'] = $term;
                    $params[':cta_academic_year'] = $academic_year;
                    $params[':cta_school_id'] = $school_id;
                } else {
                    // Fallback for older schema (no term/year on classes; best-effort)
                    if ($this->columnExists('classes', 'class_teacher_id')) {
                        $query .= " AND (sa.teacher_id = :teacher_id OR (c.class_teacher_id = :fallback_class_teacher_id AND sc.status IN ('Submitted','Rejected','Approved')))";
                        $params[':fallback_class_teacher_id'] = $teacher_id;
                    } else {
                        $query .= " AND sa.teacher_id = :teacher_id";
                    }
                }
            } elseif ($role === 'parent') {
                $parent_id = $token_data['linked_id'] ?? null;
                if (!$parent_id) {
                    Response::forbidden('Parent ID not found in token');
                }

                // Only scores for the parent's linked children
                $query .= " AND sc.student_id IN (
                    SELECT psl.student_id FROM parent_student_links psl
                    WHERE psl.parent_id = :parent_id
                )";
                $params[':parent_id'] = $parent_id;
            }

            $query .= " ORDER BY s.last_name, s.first_name, sub.name";

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($scores, 'Scores retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error retrieving scores');
        } catch (Exception $e) {
            Response::serverError('Error retrieving scores');
        }
    }

    /**
     * Get All Compiled Results
     */
    public function getAllCompiledResults()
    {
        try {
            if (!$this->conn) {
                Response::serverError('Database connection failed');
                return;
            }

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            // If core tables are missing, avoid 500s and return empty results.
            if (!$this->tableExists('compiled_results') || !$this->tableExists('students') || !$this->tableExists('classes')) {
                Response::success([], 'Required tables missing');
                return;
            }

            $token_data = Middleware::requireAuth();
            if (!$token_data || !is_array($token_data) || !isset($token_data['role'])) {
                Response::unauthorized('Invalid authentication token');
                return;
            }

            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            $role = strtolower(trim((string)$token_data['role']));

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : null;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;
            $class_id = null;
            if (isset($_GET['class_id']) && $_GET['class_id'] !== '') {
                $class_id = Middleware::validateInteger($_GET['class_id'], 'class_id');
            }
            $status = isset($_GET['status']) ? Middleware::sanitizeString($_GET['status']) : null;

            // For parents, always enforce Approved status at the backend level
            // so unapproved or draft results are never exposed regardless of caller params
            if ($role === 'parent') {
                $status = 'Approved';
            }

            $studentSelect = [];
            if ($this->columnExists('students', 'first_name')) {
                $studentSelect[] = 's.first_name';
            }
            if ($this->columnExists('students', 'last_name')) {
                $studentSelect[] = 's.last_name';
            }
            if ($this->columnExists('students', 'admission_number')) {
                $studentSelect[] = 's.admission_number';
            }

            $classSelect = [];
            if ($this->columnExists('classes', 'name')) {
                $classSelect[] = 'c.name as class_name';
            }

            $extraSelectSql = '';
            $extraParts = array_merge($studentSelect, $classSelect);
            if (!empty($extraParts)) {
                $extraSelectSql = ', ' . implode(', ', $extraParts);
            }

            // Start with a basic query and only select columns that actually exist.
            if ($role === 'parent') {
                // Build WHERE clause based on available parameters
                $where_clause = "WHERE 1=1";
                $where_clause .= " AND cr.school_id = :school_id";
                if ($term) {
                    $where_clause .= " AND cr.term = :term";
                }
                if ($academic_year) {
                    $where_clause .= " AND cr.academic_year = :academic_year";
                }

                $query = "SELECT cr.*$extraSelectSql
                          FROM compiled_results cr
                          JOIN students s ON cr.student_id = s.id
                          JOIN classes c ON cr.class_id = c.id
                          $where_clause";
            } else {
                // Build WHERE clause based on available parameters
                $where_clause = "WHERE 1=1";
                $where_clause .= " AND cr.school_id = :school_id";
                if ($term) {
                    $where_clause .= " AND cr.term = :term";
                }
                if ($academic_year) {
                    $where_clause .= " AND cr.academic_year = :academic_year";
                }

                $query = "SELECT cr.*$extraSelectSql
                          FROM compiled_results cr
                          JOIN students s ON cr.student_id = s.id
                          JOIN classes c ON cr.class_id = c.id
                          $where_clause";
            }

            $params = [':school_id' => $school_id];
            if ($term) {
                $params[':term'] = $term;
            }
            if ($academic_year) {
                $params[':academic_year'] = $academic_year;
            }

            // Add role-based filtering
            if ($role === 'parent') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    // Flat empty array keeps response shape consistent
                    Response::success([], 'Parent profile not linked');
                    return;
                }

                // First check if parent has any linked children
                $children_check = "SELECT COUNT(*) as count FROM parent_student_links psl
                                   WHERE psl.parent_id = :parent_id AND psl.school_id = :school_id";
                $children_stmt = $this->conn->prepare($children_check);
                $children_stmt->bindValue(':parent_id', $token_data['linked_id']);
                $children_stmt->bindValue(':school_id', $school_id);
                $children_stmt->execute();

                $has_children = $children_stmt->fetch()['count'] > 0;

                if (!$has_children) {
                    Response::success([], 'No linked children found for parent');
                    return;
                }

                // Add parent filtering - only show results for parent's linked children
                $query .= " AND cr.student_id IN (
                    SELECT psl.student_id FROM parent_student_links psl
                    WHERE psl.parent_id = :parent_id AND psl.school_id = :school_id_psl
                )";
                $params[':parent_id'] = $token_data['linked_id'];
                $params[':school_id_psl'] = $school_id;
            } else if ($role === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::success([], 'Teacher profile not linked');
                    return;
                }

                if (!$this->tableExists('class_teacher_assignments')) {
                    Response::success([], 'No class assignments table found');
                    return;
                }

                // Check if teacher has any class assignments first
                $check_term = $term;
                $check_academic_year = $academic_year;

                if (!$check_term || !$check_academic_year) {
                    $settings_query = "SELECT setting_key, setting_value FROM school_settings WHERE setting_key IN ('current_term', 'current_academic_year') AND school_id = :school_id";
                    $settings_stmt = $this->conn->prepare($settings_query);
                    $settings_stmt->bindValue(':school_id', $school_id);
                    $settings_stmt->execute();
                    $settings_results = $settings_stmt->fetchAll(PDO::FETCH_ASSOC);
                    $settings = [];
                    foreach ($settings_results as $result) {
                        $settings[$result['setting_key']] = $result['setting_value'];
                    }

                    $check_term = $check_term ?: ($settings['current_term'] ?? null);
                    $check_academic_year = $check_academic_year ?: ($settings['current_academic_year'] ?? null);
                }

                if (!$check_term || !$check_academic_year) {
                    Response::badRequest('Term and academic year are required');
                    return;
                }

                try {
                    $teacher_check = "SELECT COUNT(*) as count FROM class_teacher_assignments
                                     WHERE teacher_id = :teacher_id AND term = :term AND academic_year = :academic_year AND status = 'Active' AND school_id = :school_id";
                    $check_stmt = $this->conn->prepare($teacher_check);
                    $check_stmt->bindValue(':teacher_id', $token_data['linked_id']);
                    $check_stmt->bindValue(':term', $check_term);
                    $check_stmt->bindValue(':academic_year', $check_academic_year);
                    $check_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                    $check_stmt->execute();

                    $result = $check_stmt->fetch();
                    $assignment_count = $result ? $result['count'] : 0;
                } catch (Throwable $e) {
                    Response::success([], 'Unable to verify class assignments');
                    return;
                }

                if ($assignment_count == 0) {
                    // Teacher has no assignments for this term/year, return empty result
                    Response::success([], 'No class assignments found for this term and academic year');
                    return;
                }

                $has_assignments = $assignment_count > 0;

                if ($has_assignments) {
                    $query .= " AND cr.class_id IN (
                        SELECT cta.class_id FROM class_teacher_assignments cta
                        WHERE cta.teacher_id = :teacher_id
                        AND cta.term = :cta_term
                        AND cta.academic_year = :cta_academic_year
                        AND cta.status = 'Active'
                        AND cta.school_id = :cta_school_id
                    )";
                    $params[':teacher_id'] = $token_data['linked_id'];
                    $params[':cta_term'] = $check_term;
                    $params[':cta_academic_year'] = $check_academic_year;
                    $params[':cta_school_id'] = $school_id;
                } else {
                    // Teacher has no assignments, return empty result
                    Response::success(['data' => []], 'No class assignments found for teacher');
                    return;
                }
            }

            // Add optional filters
            if ($class_id) {
                $query .= " AND cr.class_id = :class_id";
                $params[':class_id'] = $class_id;
            }

            if ($status) {
                $query .= " AND cr.status = :status";
                $params[':status'] = $status;
            }

            $query .= " ORDER BY c.name, s.last_name, s.first_name";

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($results === false) {
                $results = []; // Ensure we always have an array
            }

            // Attach affective/psychomotor domains so clients (especially parents) can render
            // the same domain values shown in the admin result sheet/PDF.
            $hasAffectiveTable = $this->tableExists('affective_domains');
            $hasPsychomotorTable = $this->tableExists('psychomotor_domains');

            $affectiveStmt = null;
            if ($hasAffectiveTable) {
                $affectiveStmt = $this->conn->prepare(
                    "SELECT * FROM affective_domains WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id LIMIT 1"
                );
            }

            $psychomotorStmt = null;
            if ($hasPsychomotorTable) {
                $psychomotorStmt = $this->conn->prepare(
                    "SELECT * FROM psychomotor_domains WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id LIMIT 1"
                );
            }

            if ($affectiveStmt || $psychomotorStmt) {
                foreach ($results as &$row) {
                    $sid = isset($row['student_id']) ? (int)$row['student_id'] : 0;
                    $rTerm = isset($row['term']) ? (string)$row['term'] : '';
                    $rYear = isset($row['academic_year']) ? (string)$row['academic_year'] : '';

                    if ($affectiveStmt && $sid > 0 && $rTerm !== '' && $rYear !== '') {
                        $affectiveStmt->bindValue(':student_id', $sid, PDO::PARAM_INT);
                        $affectiveStmt->bindValue(':term', $rTerm);
                        $affectiveStmt->bindValue(':academic_year', $rYear);
                        $affectiveStmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                        $affectiveStmt->execute();
                        $aff = $affectiveStmt->fetch(PDO::FETCH_ASSOC);
                        $row['affective'] = $aff ? $aff : null;
                    } else {
                        $row['affective'] = null;
                    }

                    if ($psychomotorStmt && $sid > 0 && $rTerm !== '' && $rYear !== '') {
                        $psychomotorStmt->bindValue(':student_id', $sid, PDO::PARAM_INT);
                        $psychomotorStmt->bindValue(':term', $rTerm);
                        $psychomotorStmt->bindValue(':academic_year', $rYear);
                        $psychomotorStmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                        $psychomotorStmt->execute();
                        $psy = $psychomotorStmt->fetch(PDO::FETCH_ASSOC);
                        $row['psychomotor'] = $psy ? $psy : null;
                    } else {
                        $row['psychomotor'] = null;
                    }
                }
                unset($row);
            }

            // Return a flat array so frontend can reliably treat response.data as an array
            Response::success($results, 'Compiled results retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error retrieving compiled results');
        } catch (Exception $e) {
            Response::serverError('Error retrieving compiled results');
        }
    }

    /**
     * Calculate Grade
     */
    private function calculateGrade($total, $is_creche = false)
    {
        if ($is_creche) {
            // CRECHE grading scale (0-100) - exam-only
            if ($total >= 90) return 'A';
            if ($total >= 80) return 'B';
            if ($total >= 70) return 'C';
            if ($total >= 60) return 'D';
            if ($total >= 50) return 'E';
            return 'F';
        }

        if ($total >= 90) return 'A';
        if ($total >= 80) return 'B';
        if ($total >= 70) return 'C';
        if ($total >= 60) return 'D';
        if ($total >= 50) return 'E';
        return 'F';
    }

    /**
     * Get Remark
     */
    private function getRemark($grade, $is_creche = false)
    {
        $remarks = [
            'A' => 'Excellent',
            'B' => 'V. Good',
            'C' => 'Good',
            'D' => 'Satisfactory',
            'E' => 'Fair',
            'F' => 'It is well'
        ];

        return $remarks[$grade] ?? 'N/A';
    }

    private function generateAutoTeacherComment($averageScore)
    {
        $avg = is_numeric($averageScore) ? (float)$averageScore : 0.0;

        if ($avg >= 90 && $avg <= 100) {
            return 'An excellent result Keep it up.';
        } elseif ($avg >= 80 && $avg < 90) {
            return 'A very good result, Keep it up.';
        } elseif ($avg >= 70 && $avg < 80) {
            return 'A good result, You can do better.';
        } elseif ($avg >= 60 && $avg < 70) {
            return 'A satisfactory result, you can do better.';
        } elseif ($avg >= 50 && $avg < 60) {
            return 'A Fair result you have it in you to do better.';
        } elseif ($avg >= 0 && $avg < 50) {
            return 'It is well';
        }

        return 'It is well';
    }

    /**
     * Calculate Class Statistics
     */
    private function calculateClassStatistics($assignment_id, $new_score = null)
    {
        try {
            $query = "SELECT total FROM scores WHERE subject_assignment_id = :assignment_id AND school_id = :school_id";
            $params = [':assignment_id' => $assignment_id, ':school_id' => $this->school_id ?? 0];
            if ($new_score !== null) {
                // Include the new score in calculation
                $query .= " UNION ALL SELECT :new_score as total";
                $params[':new_score'] = $new_score;
            }

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $totals = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

            if (empty($totals)) {
                return ['average' => 0, 'min' => 0, 'max' => 0];
            }

            $average = array_sum($totals) / count($totals);
            $min = min($totals);
            $max = max($totals);

            return [
                'average' => round($average, 2),
                'min' => $min,
                'max' => $max
            ];
        } catch (PDOException $e) {
            return ['average' => 0, 'min' => 0, 'max' => 0];
        }
    }

    /**
     * Validate compilation requirements
     */
    private function validateCompilationRequirements($class_id, $term, $academic_year, $student_results)
    {
        $errors = [];
        $__validation_step = 'init';
        $__validation_query = null;

        try {
            $student_ids = [];
            foreach (is_array($student_results) ? $student_results : [] as $r) {
                if (is_array($r) && isset($r['student_id'])) {
                    $sid = (int)$r['student_id'];
                    if ($sid > 0) {
                        $student_ids[] = $sid;
                    }
                }
            }
            $student_ids = array_values(array_unique($student_ids));

            if (empty($student_ids)) {
                $errors[] = 'No valid students provided for compilation';
                return $errors;
            }

            // IMPORTANT: PDO does not allow mixing named parameters (e.g. :class_id) with positional
            // parameters (?) in the same prepared statement.
            // Build a stable named placeholder list for the IN (...) clauses.
            $student_named_placeholders = [];
            foreach ($student_ids as $i => $sid) {
                $student_named_placeholders[] = ':sid' . $i;
            }
            $student_placeholders = implode(',', $student_named_placeholders);

            // Get current school settings to ensure compliance
            $__validation_step = 'school_settings_current_term_year';
            $__tenant_data = Middleware::requireAuth();
            $__school_id = (int)($__tenant_data['school_id'] ?? 0);
            $settings_query = "SELECT setting_key, setting_value FROM school_settings WHERE setting_key IN ('current_term', 'current_academic_year') AND school_id = :school_id";
            $__validation_query = $settings_query;
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->execute([':school_id' => $__school_id]);
            $settings = $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            // Validate that compilation uses current school settings
            $current_term = $settings['current_term'] ?? null;
            $current_academic_year = $settings['current_academic_year'] ?? null;

            if ($current_term !== null && $term !== $current_term) {
                $errors[] = "Compilation term ($term) does not match current school term ({$current_term})";
            }

            if ($current_academic_year !== null && $academic_year !== $current_academic_year) {
                $errors[] = "Compilation academic year ($academic_year) does not match current school academic year ({$current_academic_year})";
            }
            // Check 1: All students have complete scores
            $__validation_step = 'check_scores_complete';
            $score_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                 COUNT(DISTINCT sc.student_id) as students_with_scores,
                                 GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_scores
                                 FROM students s
                                 LEFT JOIN scores sc ON s.id = sc.student_id AND sc.school_id = :school_id
                                 LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id AND sa.school_id = :school_id2
                                 WHERE s.class_id = :class_id AND s.status = 'Active'
                                 AND s.school_id = :school_id3
                                 AND s.id IN ($student_placeholders)
                                 AND sa.term = :term AND sa.academic_year = :academic_year
                                 GROUP BY s.id
                                 HAVING COUNT(sc.id) = 0";

            $__validation_query = $score_check_query;
            $score_stmt = $this->conn->prepare($score_check_query);
            $score_stmt->bindParam(':class_id', $class_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
            $score_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
            $score_stmt->bindParam(':school_id2', $__school_id, PDO::PARAM_INT);
            $score_stmt->bindParam(':school_id3', $__school_id, PDO::PARAM_INT);
            foreach ($student_ids as $i => $sid) {
                $score_stmt->bindValue(':sid' . $i, (int)$sid, PDO::PARAM_INT);
            }
            $score_stmt->execute();
            $students_without_scores = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_scores) > 0) {
                $student_names = array_column($students_without_scores, 'students_without_scores');
                $errors[] = "Missing scores for students: " . implode(', ', $student_names);
            }

            // Check 2: All scores are submitted (not in Draft status)
            $__validation_step = 'check_scores_no_draft';
            $submitted_check_query = "SELECT COUNT(*) as draft_count,
                                     GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name, ' - ', sub.name) ORDER BY s.last_name, s.first_name) as draft_details
                                     FROM scores sc
                                     JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                                     JOIN students s ON sc.student_id = s.id
                                     JOIN subjects sub ON sa.subject_id = sub.id
                                     WHERE sa.class_id = :class_id AND sa.term = :term AND sa.academic_year = :academic_year
                                     AND sa.school_id = :school_id
                                     AND sc.student_id IN ($student_placeholders)
                                     AND sc.status = 'Draft'";

            $__validation_query = $submitted_check_query;
            $submitted_stmt = $this->conn->prepare($submitted_check_query);
            $submitted_stmt->bindParam(':class_id', $class_id);
            $submitted_stmt->bindParam(':term', $term);
            $submitted_stmt->bindParam(':academic_year', $academic_year);
            $submitted_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
            foreach ($student_ids as $i => $sid) {
                $submitted_stmt->bindValue(':sid' . $i, (int)$sid, PDO::PARAM_INT);
            }
            $submitted_stmt->execute();
            $submitted_result = $submitted_stmt->fetch();

            if ($submitted_result['draft_count'] > 0) {
                $errors[] = "Draft scores found ({$submitted_result['draft_count']} records): " . $submitted_result['draft_details'];
            }

            // Check 3: Attendance data meets school requirements
            $__validation_step = 'check_attendance_required_days_setting';
            $attendance_setting_key = 'attendance_' . strtolower(str_replace(' ', '_', $term));
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key AND school_id = :school_id";
            $__validation_query = $required_days_query;
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            if ($required_days == 0) {
                $errors[] = "Attendance requirements not set for term: $term";
            } else {
                // Attendance is stored as per-day rows (date/status) by AttendanceController.
                // However, the frontend compile flow also writes/updates a single row with a remarks summary like:
                //   "Attended X out of Y days"
                // So for validation we support BOTH:
                // - per-day present count
                // - max attended days parsed from remarks
                // and take whichever is higher.
                $__validation_step = 'check_attendance_records';
                $attendance_check_query = "SELECT s.id, s.first_name, s.last_name,
                                          COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) as present_days,
                                          COUNT(a.id) as recorded_days,
                                          GROUP_CONCAT(a.remarks SEPARATOR '\n') as remarks_blob
                                          FROM students s
                                          LEFT JOIN attendance a ON s.id = a.student_id
                                            AND a.class_id = :class_id_join
                                            AND a.term = :term
                                            AND a.academic_year = :academic_year
                                            AND a.school_id = :school_id
                                          WHERE s.class_id = :class_id_where AND s.status = 'Active'
                                          AND s.school_id = :school_id2
                                          AND s.id IN ($student_placeholders)
                                          GROUP BY s.id, s.first_name, s.last_name";

                $__validation_query = $attendance_check_query;
                $attendance_stmt = $this->conn->prepare($attendance_check_query);
                $attendance_stmt->bindValue(':class_id_join', $class_id, PDO::PARAM_INT);
                $attendance_stmt->bindValue(':class_id_where', $class_id, PDO::PARAM_INT);
                $attendance_stmt->bindParam(':term', $term);
                $attendance_stmt->bindParam(':academic_year', $academic_year);
                $attendance_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
                $attendance_stmt->bindParam(':school_id2', $__school_id, PDO::PARAM_INT);
                foreach ($student_ids as $i => $sid) {
                    $attendance_stmt->bindValue(':sid' . $i, (int)$sid, PDO::PARAM_INT);
                }
                $attendance_stmt->execute();
                $attendance_records = $attendance_stmt->fetchAll(PDO::FETCH_ASSOC);

                $students_missing_attendance = [];
                $students_insufficient_attendance = [];

                foreach ($attendance_records as $record) {
                    $present_days = isset($record['present_days']) ? (int) $record['present_days'] : 0;
                    $recorded_days = isset($record['recorded_days']) ? (int) $record['recorded_days'] : 0;

                    $remarks_blob = (string)($record['remarks_blob'] ?? '');
                    $parsed_attended_days = 0;
                    if ($remarks_blob !== '') {
                        // Support both formats that exist in the system:
                        // 1) "Attended X out of Y days" or "X out of Y days"
                        // 2) "Attended X" (legacy)

                        // Extract all "X out of Y days" occurrences and take the maximum X.
                        if (preg_match_all('/(\d+)\s*out\s*of\s*(\d+)\s*days/i', $remarks_blob, $m)) {
                            foreach ($m[1] as $num) {
                                $n = (int)$num;
                                if ($n > $parsed_attended_days) {
                                    $parsed_attended_days = $n;
                                }
                            }
                        }

                        // Extract all "Attended X" occurrences and take the maximum.
                        if (preg_match_all('/Attended\s+(\d+)/i', $remarks_blob, $m2)) {
                            foreach ($m2[1] as $num) {
                                $n = (int)$num;
                                if ($n > $parsed_attended_days) {
                                    $parsed_attended_days = $n;
                                }
                            }
                        }
                    }

                    $attended_days = max($present_days, $parsed_attended_days);
                    $record_required_days = (int) $required_days;
                    $attendance_rate = $record_required_days > 0 ? round(($attended_days / $record_required_days) * 100, 2) : 0;

                    if ($recorded_days === 0) {
                        $students_missing_attendance[] = $record['first_name'] . ' ' . $record['last_name'];
                    } elseif ($attendance_rate < 50) {
                        $students_insufficient_attendance[] = $record['first_name'] . ' ' . $record['last_name'] .
                            ' (' . $attendance_rate . '% - ' . $attended_days . '/' . $record_required_days . ' days)';
                    }
                }

                if (!empty($students_missing_attendance)) {
                    $errors[] = "Missing attendance records for students: " . implode(', ', $students_missing_attendance);
                }

                if (!empty($students_insufficient_attendance)) {
                    $errors[] = "Insufficient attendance (minimum 50% required): " . implode(', ', $students_insufficient_attendance);
                }
            }

            // Check 4: Affective domains are complete
            $__validation_step = 'check_affective_domains';
            $affective_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                     COUNT(DISTINCT ad.student_id) as students_with_affective,
                                     GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_affective
                                     FROM students s
                                     LEFT JOIN affective_domains ad ON s.id = ad.student_id AND ad.school_id = :school_id
                                     WHERE s.class_id = :class_id AND s.status = 'Active'
                                     AND s.school_id = :school_id2
                                     AND s.id IN ($student_placeholders)
                                     AND ad.term = :term AND ad.academic_year = :academic_year
                                     GROUP BY s.id
                                     HAVING COUNT(ad.id) = 0";

            $__validation_query = $affective_check_query;
            $affective_stmt = $this->conn->prepare($affective_check_query);
            $affective_stmt->bindParam(':class_id', $class_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
            $affective_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
            $affective_stmt->bindParam(':school_id2', $__school_id, PDO::PARAM_INT);
            foreach ($student_ids as $i => $sid) {
                $affective_stmt->bindValue(':sid' . $i, (int)$sid, PDO::PARAM_INT);
            }
            $affective_stmt->execute();
            $students_without_affective = $affective_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_affective) > 0) {
                $student_names = array_column($students_without_affective, 'students_without_affective');
                $errors[] = "Missing affective domain assessments for students: " . implode(', ', $student_names);
            }

            // Check 5: Psychomotor domains are complete
            $__validation_step = 'check_psychomotor_domains';
            $psychomotor_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                       COUNT(DISTINCT pd.student_id) as students_with_psychomotor,
                                       GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_psychomotor
                                       FROM students s
                                       LEFT JOIN psychomotor_domains pd ON s.id = pd.student_id AND pd.school_id = :school_id
                                       WHERE s.class_id = :class_id AND s.status = 'Active'
                                       AND s.school_id = :school_id2
                                       AND s.id IN ($student_placeholders)
                                       AND pd.term = :term AND pd.academic_year = :academic_year
                                       GROUP BY s.id
                                       HAVING COUNT(pd.id) = 0";

            $__validation_query = $psychomotor_check_query;
            $psychomotor_stmt = $this->conn->prepare($psychomotor_check_query);
            $psychomotor_stmt->bindParam(':class_id', $class_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
            $psychomotor_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
            $psychomotor_stmt->bindParam(':school_id2', $__school_id, PDO::PARAM_INT);
            foreach ($student_ids as $i => $sid) {
                $psychomotor_stmt->bindValue(':sid' . $i, (int)$sid, PDO::PARAM_INT);
            }
            $psychomotor_stmt->execute();
            $students_without_psychomotor = $psychomotor_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_psychomotor) > 0) {
                $student_names = array_column($students_without_psychomotor, 'students_without_psychomotor');
                $errors[] = "Missing psychomotor domain assessments for students: " . implode(', ', $student_names);
            }

            // Check 6: Teacher comments are provided for each student
            $students_missing_comments = [];
            foreach ($student_results as $result) {
                if (!is_array($result)) {
                    continue;
                }

                $comment = isset($result['class_teacher_comment']) ? (string)$result['class_teacher_comment'] : '';
                if (trim($comment) !== '') {
                    continue;
                }

                // If comment is missing, attempt to auto-generate from average_score.
                // This keeps the API robust even when the frontend fails to send a comment.
                $avg = $result['average_score'] ?? null;
                $auto = $this->generateAutoTeacherComment($avg);
                if (trim($auto) === '') {
                    $students_missing_comments[] = $result['student_id'] ?? null;
                }
            }

            if (!empty($students_missing_comments)) {
                $__validation_step = 'check_teacher_comments_lookup_student_names';
                $students_missing_comments = array_values(array_filter($students_missing_comments, function ($id) {
                    return is_numeric($id) && (int)$id > 0;
                }));

                if (!empty($students_missing_comments)) {
                    // Get student names for those missing comments
                    $comment_placeholders = [];
                    foreach ($students_missing_comments as $i => $sid) {
                        $comment_placeholders[] = ':cid' . $i;
                    }
                    $comment_check_query = 'SELECT first_name, last_name FROM students WHERE id IN (' . implode(', ', $comment_placeholders) . ') AND school_id = :school_id';
                    $__validation_query = $comment_check_query;
                    $comment_stmt = $this->conn->prepare($comment_check_query);
                    $comment_stmt->bindParam(':school_id', $__school_id, PDO::PARAM_INT);
                    foreach ($students_missing_comments as $i => $sid) {
                        $comment_stmt->bindValue(':cid' . $i, (int)$sid, PDO::PARAM_INT);
                    }
                    $comment_stmt->execute();
                    $comment_students = $comment_stmt->fetchAll(PDO::FETCH_ASSOC);
                } else {
                    $comment_students = [];
                }

                $student_names = array_map(function ($student) {
                    return $student['first_name'] . ' ' . $student['last_name'];
                }, $comment_students);

                $errors[] = "Teacher comments missing for students: " . implode(', ', $student_names);
            }

            // Check 7 is covered by Check 3 (recorded_days === 0 indicates missing attendance for the term/year).

        } catch (PDOException $e) {
            $debug = 'validateCompilationRequirements PDOException at step ' . $__validation_step . ': ' . $e->getMessage();
            if ($__validation_query) {
                $debug .= ' | query: ' . preg_replace('/\s+/', ' ', trim((string)$__validation_query));
            }
            $errors[] = 'Database error during validation: ' . ' (step: ' . $__validation_step . ')';
        }

        return $errors;
    }

    /**
     * Compile Results (Class Teacher/Admin)
     * Endpoint: POST /results/compile
     */
    public function compileResults()
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireAuth();
        $role = strtolower(trim((string)($token_data['role'] ?? '')));
        if ($role !== 'teacher' && $role !== 'admin') {
            Response::forbidden('Only teachers and admins can compile results');
            return;
        }

        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            Response::badRequest('Invalid JSON payload');
            return;
        }

        Middleware::validateRequired($data, ['class_id', 'term', 'academic_year', 'student_results']);

        try {
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $student_results = $data['student_results'];

            if (!is_array($student_results)) {
                Response::badRequest('student_results must be an array');
                return;
            }

            // Ensure class teacher comment is always present (auto-generated from average_score when missing)
            foreach ($student_results as $idx => $row) {
                if (!is_array($row)) {
                    continue;
                }
                $comment = isset($row['class_teacher_comment']) ? (string)$row['class_teacher_comment'] : '';
                if (trim($comment) === '') {
                    $avg = $row['average_score'] ?? null;
                    $student_results[$idx]['class_teacher_comment'] = $this->generateAutoTeacherComment($avg);
                }
            }

            // Teachers must have an assignment to the class for this term/year (best-effort enforcement).
            if ($role === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::forbidden('Teacher profile not linked');
                    return;
                }

                if ($this->tableExists('class_teacher_assignments')) {
                    $stmt = $this->conn->prepare(
                        "SELECT COUNT(*) FROM class_teacher_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id AND term = :term AND academic_year = :academic_year AND status = 'Active' AND school_id = :school_id"
                    );
                    $stmt->bindValue(':teacher_id', $token_data['linked_id']);
                    $stmt->bindValue(':class_id', $class_id);
                    $stmt->bindValue(':term', $term);
                    $stmt->bindValue(':academic_year', $academic_year);
                    $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                    $stmt->execute();
                    if ((int)$stmt->fetchColumn() === 0) {
                        Response::forbidden('You are not assigned as class teacher for this class/term/year');
                        return;
                    }
                }
            }

            $errors = $this->validateCompilationRequirements($class_id, $term, $academic_year, $student_results);
            if (!empty($errors)) {
                Response::badRequest('Compilation requirements not met', ['errors' => $errors]);
                return;
            }

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            $compiled_by = (int)($token_data['user_id'] ?? 0);
            if ($compiled_by <= 0) {
                Response::unauthorized('Invalid token: user_id missing');
                return;
            }

            $this->conn->beginTransaction();

            $saved = 0;
            $ids = [];

            foreach ($student_results as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $student_id = Middleware::validateInteger($row['student_id'] ?? null, 'student_id');

                // Find existing compiled_results row
                $findStmt = $this->conn->prepare(
                    'SELECT id FROM compiled_results WHERE student_id = :student_id AND class_id = :class_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id LIMIT 1'
                );
                $findStmt->bindValue(':student_id', $student_id);
                $findStmt->bindValue(':class_id', $class_id);
                $findStmt->bindValue(':term', $term);
                $findStmt->bindValue(':academic_year', $academic_year);
                $findStmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $findStmt->execute();
                $existing_id = $findStmt->fetchColumn();

                // Teachers always submit for admin approval.
                // Admins may create/update Drafts manually.
                $status = Middleware::sanitizeString($row['status'] ?? 'Draft');
                if ($role === 'teacher') {
                    $status = 'Submitted';
                }

                $payload = [
                    'total_score' => $row['total_score'] ?? null,
                    'average_score' => $row['average_score'] ?? null,
                    'class_average' => $row['class_average'] ?? null,
                    'position' => $row['position'] ?? null,
                    'total_students' => $row['total_students'] ?? null,
                    'times_present' => $row['times_present'] ?? 0,
                    'times_absent' => $row['times_absent'] ?? 0,
                    'total_attendance_days' => $row['total_attendance_days'] ?? 0,
                    'term_begin' => $row['term_begin'] ?? null,
                    'term_end' => $row['term_end'] ?? null,
                    'next_term_begin' => $row['next_term_begin'] ?? null,
                    'class_teacher_name' => Middleware::sanitizeString($row['class_teacher_name'] ?? ''),
                    'class_teacher_comment' => $row['class_teacher_comment'] ?? null,
                    'principal_name' => Middleware::sanitizeString($row['principal_name'] ?? ''),
                    'principal_comment' => $row['principal_comment'] ?? null,
                    'principal_signature' => $row['principal_signature'] ?? null,
                    'compiled_by' => $compiled_by,
                    'status' => $status,
                    'print_approved' => isset($row['print_approved']) ? (int)$row['print_approved'] : 0,
                    'approved_by' => $role === 'teacher' ? null : ($row['approved_by'] ?? null),
                    'approved_date' => $role === 'teacher' ? null : ($row['approved_date'] ?? null),
                    'rejection_reason' => $role === 'teacher' ? null : ($row['rejection_reason'] ?? null),
                ];

                if ($existing_id) {
                    $updateSql = 'UPDATE compiled_results SET
                        total_score = :total_score,
                        average_score = :average_score,
                        class_average = :class_average,
                        position = :position,
                        total_students = :total_students,
                        times_present = :times_present,
                        times_absent = :times_absent,
                        total_attendance_days = :total_attendance_days,
                        term_begin = :term_begin,
                        term_end = :term_end,
                        next_term_begin = :next_term_begin,
                        class_teacher_name = :class_teacher_name,
                        class_teacher_comment = :class_teacher_comment,
                        principal_name = :principal_name,
                        principal_comment = :principal_comment,
                        principal_signature = :principal_signature,
                        compiled_by = :compiled_by,
                        status = :status,
                        print_approved = :print_approved,
                        approved_by = :approved_by,
                        approved_date = :approved_date,
                        rejection_reason = :rejection_reason
                        WHERE id = :id';
                    $stmt = $this->conn->prepare($updateSql);
                    foreach ($payload as $k => $v) {
                        $stmt->bindValue(':' . $k, $v);
                    }
                    $stmt->bindValue(':id', $existing_id);
                    $stmt->execute();
                    $ids[] = (int)$existing_id;
                    $saved++;
                } else {
                    $insertSql = 'INSERT INTO compiled_results (
                        student_id, class_id, school_id, term, academic_year,
                        total_score, average_score, class_average, position,
                        total_students, times_present, times_absent, total_attendance_days,
                        term_begin, term_end, next_term_begin,
                        class_teacher_name, class_teacher_comment,
                        principal_name, principal_comment, principal_signature,
                        compiled_by, status, print_approved, approved_by, approved_date, rejection_reason
                    ) VALUES (
                        :student_id, :class_id, :school_id, :term, :academic_year,
                        :total_score, :average_score, :class_average, :position,
                        :total_students, :times_present, :times_absent, :total_attendance_days,
                        :term_begin, :term_end, :next_term_begin,
                        :class_teacher_name, :class_teacher_comment,
                        :principal_name, :principal_comment, :principal_signature,
                        :compiled_by, :status, :print_approved, :approved_by, :approved_date, :rejection_reason
                    )';
                    $stmt = $this->conn->prepare($insertSql);
                    $stmt->bindValue(':student_id', $student_id);
                    $stmt->bindValue(':class_id', $class_id);
                    $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                    $stmt->bindValue(':term', $term);
                    $stmt->bindValue(':academic_year', $academic_year);
                    foreach ($payload as $k => $v) {
                        $stmt->bindValue(':' . $k, $v);
                    }
                    $stmt->execute();
                    $newId = (int)$this->conn->lastInsertId();
                    $ids[] = $newId;
                    $saved++;
                }
            }

            $this->conn->commit();

            RealtimeEvents::publish(['compiled_results'], [
                'action' => 'compiled',
                'class_id' => (int)$class_id,
                'term' => (string)$term,
                'academic_year' => (string)$academic_year,
            ]);

            Response::success([
                'saved' => $saved,
                'ids' => $ids,
                'class_id' => $class_id,
                'term' => $term,
                'academic_year' => $academic_year
            ], 'Results compiled successfully');
        } catch (Throwable $e) {
            if ($this->conn && $this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            Response::serverError('Error compiling results');
        }
    }

    /**
     * Approve a compiled result (Admin)
     * Endpoint: POST /results/approve/{id}
     * Creates targeted notification for parent + class teacher only
     */
    public function approveResult($id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        try {
            $result_id = Middleware::validateInteger($id, 'id');

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            // Get result details with student and class info — scoped to school
            $stmt = $this->conn->prepare('SELECT cr.*, s.admission_number FROM compiled_results cr JOIN students s ON cr.student_id = s.id AND s.school_id = :school_id WHERE cr.id = :id AND cr.school_id = :school_id2 LIMIT 1');
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->bindValue(':school_id2', $school_id, PDO::PARAM_INT);
            $stmt->bindValue(':id', $result_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result) {
                Response::notFound('Compiled result not found');
                return;
            }

            $approved_by = (int)($token_data['user_id'] ?? 0);
            $approved_date = date('Y-m-d H:i:s');

            $update = $this->conn->prepare(
                "UPDATE compiled_results SET status = 'Approved', approved_by = :approved_by, approved_date = :approved_date WHERE id = :id AND school_id = :school_id"
            );
            $update->bindValue(':approved_by', $approved_by > 0 ? $approved_by : null);
            $update->bindValue(':approved_date', $approved_date);
            $update->bindValue(':id', $result_id);
            $update->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $update->execute();

            // Create targeted notification for parent and class teacher only
            $target_users = [];

            // Get parent user_id from parent_student_links
            $parent_stmt = $this->conn->prepare(
                "SELECT u.id as user_id FROM parent_student_links psl
                 JOIN users u ON u.linked_id = psl.parent_id AND u.role = 'parent' AND u.school_id = :school_id
                 WHERE psl.student_id = :student_id AND psl.is_primary = 1 AND psl.school_id = :school_id2 LIMIT 1"
            );
            $parent_stmt->bindValue(':student_id', $result['student_id']);
            $parent_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $parent_stmt->bindValue(':school_id2', $school_id, PDO::PARAM_INT);
            $parent_stmt->execute();
            $parent_user = $parent_stmt->fetch(PDO::FETCH_ASSOC);
            if ($parent_user) {
                $target_users[] = (int)$parent_user['user_id'];
            }

            // Get class teacher user_id
            $teacher_stmt = $this->conn->prepare(
                "SELECT u.id as user_id FROM classes c
                 JOIN teachers t ON t.id = c.class_teacher_id AND t.school_id = :school_id
                 JOIN users u ON u.linked_id = t.id AND u.role = 'teacher' AND u.school_id = :school_id2
                 WHERE c.id = :class_id AND c.school_id = :school_id3 LIMIT 1"
            );
            $teacher_stmt->bindValue(':class_id', $result['class_id']);
            $teacher_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $teacher_stmt->bindValue(':school_id2', $school_id, PDO::PARAM_INT);
            $teacher_stmt->bindValue(':school_id3', $school_id, PDO::PARAM_INT);
            $teacher_stmt->execute();
            $teacher_user = $teacher_stmt->fetch(PDO::FETCH_ASSOC);
            if ($teacher_user) {
                $target_users[] = (int)$teacher_user['user_id'];
            }

            // Create notification only for target users
            if (!empty($target_users)) {
                $notification_title = "Result Approved";
                $notification_message = "Result for student {$result['admission_number']} has been approved for {$result['term']} {$result['academic_year']}";
                
                $notif_stmt = $this->conn->prepare(
                    "INSERT INTO notifications (title, message, type, priority, target_audience, target_users, created_by, school_id)
                     VALUES (:title, :message, 'Success', 'High', 'Specific', :target_users, :created_by, :school_id)"
                );
                $notif_stmt->bindValue(':title', $notification_title);
                $notif_stmt->bindValue(':message', $notification_message);
                $notif_stmt->bindValue(':target_users', json_encode($target_users));
                $notif_stmt->bindValue(':created_by', $approved_by > 0 ? $approved_by : null);
                $notif_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $notif_stmt->execute();

                // Create user notification records for each target user
                $notification_id = $this->conn->lastInsertId();
                foreach ($target_users as $user_id) {
                    $user_notif_stmt = $this->conn->prepare(
                        "INSERT INTO user_notifications (user_id, notification_id, is_read) VALUES (:user_id, :notification_id, 0)"
                    );
                    $user_notif_stmt->bindValue(':user_id', $user_id);
                    $user_notif_stmt->bindValue(':notification_id', $notification_id);
                    $user_notif_stmt->execute();
                }

                RealtimeEvents::publish('notifications', [
                    'action' => 'created',
                    'notification_id' => (int)$notification_id,
                    'target_users' => $target_users
                ]);
            }

            RealtimeEvents::publish(['compiled_results'], [
                'action' => 'approved',
                'result_id' => (int)$result_id,
            ]);

            Response::success([
                'id' => $result_id,
                'status' => 'Approved',
                'approved_by' => $approved_by > 0 ? $approved_by : null,
                'approved_date' => $approved_date
            ], 'Compiled result approved');
        } catch (Throwable $e) {
            Response::serverError('Error approving compiled result');
        }
    }

    /**
     * Reject a compiled result (Admin)
     * Endpoint: POST /results/reject/{id}
     */
    public function rejectResult($id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $data = json_decode(file_get_contents('php://input'), true);
        $reason = isset($data['rejection_reason']) ? Middleware::sanitizeString($data['rejection_reason']) : '';
        if (!$reason) {
            Response::badRequest('Rejection reason is required');
        }

        try {
            $result_id = Middleware::validateInteger($id, 'id');

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            $stmt = $this->conn->prepare('SELECT id FROM compiled_results WHERE id = :id AND school_id = :school_id LIMIT 1');
            $stmt->bindValue(':id', $result_id);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $exists = $stmt->fetchColumn();
            if (!$exists) {
                Response::notFound('Compiled result not found');
                return;
            }

            $update = $this->conn->prepare(
                "UPDATE compiled_results
                 SET status = 'Rejected', rejection_reason = :reason, approved_by = NULL, approved_date = NULL
                 WHERE id = :id AND school_id = :school_id"
            );
            $update->bindValue(':reason', $reason);
            $update->bindValue(':id', $result_id);
            $update->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $update->execute();

            RealtimeEvents::publish(['compiled_results', 'notifications'], [
                'action' => 'rejected',
                'result_id' => (int)$result_id,
            ]);

            Response::success([
                'id' => $result_id,
                'status' => 'Rejected',
                'rejection_reason' => $reason,
            ], 'Compiled result rejected');
        } catch (Throwable $e) {
            Response::serverError('Error rejecting compiled result');
        }
    }

    /**
     * Delete a compiled result (Admin)
     * Endpoint: DELETE /results/compiled/{id}
     */
    public function deleteCompiledResult($id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        try {
            $result_id = Middleware::validateInteger($id, 'id');

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            $stmt = $this->conn->prepare('DELETE FROM compiled_results WHERE id = :id AND school_id = :school_id');
            $stmt->bindValue(':id', $result_id);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();

            RealtimeEvents::publish(['compiled_results'], [
                'action' => 'deleted',
                'result_id' => (int)$result_id,
            ]);

            Response::success(null, 'Compiled result deleted');
        } catch (Throwable $e) {
            Response::serverError('Error deleting compiled result');
        }
    }

    /**
     * Check Individual Student Compilation Status
     * Returns detailed status of compilation requirements for a single student
     */
    public function checkStudentCompilationStatus()
    {
        $token_data = Middleware::requireAuth();

        if ($token_data['role'] !== 'teacher') {
            Response::forbidden('Only teachers can check compilation status');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        Middleware::validateRequired($data, ['student_id', 'term', 'academic_year']);

        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $school_id = (int)($token_data['school_id'] ?? 0);

            // Get student info and class
            $student_query = "SELECT s.id, s.first_name, s.last_name, s.class_id, c.name as class_name
                             FROM students s
                             JOIN classes c ON s.class_id = c.id
                             WHERE s.id = :student_id AND s.status = 'Active' AND s.school_id = :school_id";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $student_stmt->execute();
            $student = $student_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                Response::notFound('Student not found');
            }

            // Verify teacher has access to this class
            $teacher_check_query = "SELECT COUNT(*) as count FROM (SELECT id FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id AND status = 'Active' AND school_id = :school_id UNION SELECT id FROM class_teacher_assignments WHERE teacher_id = :teacher_id_cta AND class_id = :class_id_cta AND status = 'Active' AND school_id = :school_id_cta) AS access_check";
            $teacher_check_stmt = $this->conn->prepare($teacher_check_query);
            $teacher_check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $teacher_check_stmt->bindParam(':class_id', $student['class_id']);
            $teacher_check_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $teacher_check_stmt->bindParam(':teacher_id_cta', $token_data['linked_id']);
            $teacher_check_stmt->bindParam(':class_id_cta', $student['class_id']);
            $teacher_check_stmt->bindParam(':school_id_cta', $school_id, PDO::PARAM_INT);
            $teacher_check_stmt->execute();

            if ($teacher_check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }

            // Check individual student requirements
            $status = [
                'student_info' => [
                    'id' => $student['id'],
                    'name' => $student['first_name'] . ' ' . $student['last_name'],
                    'class' => $student['class_name']
                ],
                'scores' => ['completed' => false, 'missing_subjects' => []],
                'attendance' => ['completed' => false, 'days_present' => 0, 'days_required' => 0],
                'affective_domains' => ['completed' => false, 'missing_fields' => []],
                'psychomotor_domains' => ['completed' => false, 'missing_fields' => []],
                'comments' => ['completed' => false, 'missing_comments' => []]
            ];

            // Check scores for this student
            $score_query = "SELECT COUNT(DISTINCT sa.subject_id) as subject_count
                           FROM scores sc
                           JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id AND sa.school_id = :school_id
                           WHERE sc.student_id = :student_id AND sa.term = :term AND sa.academic_year = :academic_year AND sc.school_id = :school_id2";
            $score_stmt = $this->conn->prepare($score_query);
            $score_stmt->bindParam(':student_id', $student_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
            $score_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $score_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $score_stmt->execute();
            $score_result = $score_stmt->fetch();

            // Get total subjects for this class
            $total_subjects_query = "SELECT COUNT(DISTINCT subject_id) as total_subjects
                                   FROM subject_assignments 
                                   WHERE class_id = :class_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id";
            $total_subjects_stmt = $this->conn->prepare($total_subjects_query);
            $total_subjects_stmt->bindParam(':class_id', $student['class_id']);
            $total_subjects_stmt->bindParam(':term', $term);
            $total_subjects_stmt->bindParam(':academic_year', $academic_year);
            $total_subjects_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $total_subjects_stmt->execute();
            $total_subjects = $total_subjects_stmt->fetch()['total_subjects'];

            $status['scores']['completed'] = $score_result['subject_count'] >= $total_subjects;
            $status['scores']['subjects_completed'] = (int) $score_result['subject_count'];
            $status['scores']['subjects_required'] = (int) $total_subjects;

            // Check attendance for this student
            $attendance_setting_key = 'attendance_' . strtolower(str_replace(' ', '_', $term));
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key AND school_id = :school_id";
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            // Attendance is stored as per-day rows (date/status/remarks). Some flows also store
            // a summary inside remarks like: "Attended X out of Y days".
            // Compute attended_days as the maximum of:
            // - count of Present rows
            // - max parsed "Attended X" in remarks
            $attendance_query = "SELECT
                                  COALESCE(SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END), 0) as present_days,
                                  COUNT(id) as recorded_days,
                                  GROUP_CONCAT(remarks SEPARATOR '\n') as remarks_blob
                                FROM attendance
                                WHERE student_id = :student_id
                                  AND class_id = :class_id
                                  AND term = :term
                                  AND academic_year = :academic_year
                                  AND school_id = :school_id";

            $attendance_stmt = $this->conn->prepare($attendance_query);
            $attendance_stmt->bindParam(':student_id', $student_id);
            $attendance_stmt->bindParam(':class_id', $student['class_id']);
            $attendance_stmt->bindParam(':term', $term);
            $attendance_stmt->bindParam(':academic_year', $academic_year);
            $attendance_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $attendance_stmt->execute();
            $attendance_result = $attendance_stmt->fetch(PDO::FETCH_ASSOC);

            $present_days = $attendance_result && isset($attendance_result['present_days']) ? (int)$attendance_result['present_days'] : 0;
            $remarks_blob = (string)($attendance_result['remarks_blob'] ?? '');
            $parsed_attended_days = 0;
            if ($remarks_blob !== '') {
                if (preg_match_all('/Attended\s+(\d+)/i', $remarks_blob, $m)) {
                    foreach ($m[1] as $num) {
                        $n = (int)$num;
                        if ($n > $parsed_attended_days) {
                            $parsed_attended_days = $n;
                        }
                    }
                }
            }

            $attended_days = max($present_days, $parsed_attended_days);

            $status['attendance']['completed'] = $required_days > 0 ? ($attended_days >= $required_days) : false;
            $status['attendance']['days_present'] = (int) $attended_days;
            $status['attendance']['days_required'] = (int) $required_days;

            // Check affective domains for this student
            $affective_query = "SELECT attentiveness, honesty, neatness, obedience, sense_of_responsibility
                               FROM affective_domains 
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id";
            $affective_stmt = $this->conn->prepare($affective_query);
            $affective_stmt->bindParam(':student_id', $student_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
            $affective_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $affective_stmt->execute();
            $affective_result = $affective_stmt->fetch();

            if ($affective_result) {
                $missing_fields = [];
                foreach ($affective_result as $field => $value) {
                    if ($value === null || $value === '') {
                        $missing_fields[] = $field;
                    }
                }
                $status['affective_domains']['completed'] = empty($missing_fields);
                $status['affective_domains']['missing_fields'] = $missing_fields;
            }

            // Check psychomotor domains for this student
            $psychomotor_query = "SELECT attention_to_direction, considerate_of_others, handwriting, sports, verbal_fluency, works_well_independently
                                 FROM psychomotor_domains 
                                 WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id";
            $psychomotor_stmt = $this->conn->prepare($psychomotor_query);
            $psychomotor_stmt->bindParam(':student_id', $student_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
            $psychomotor_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $psychomotor_stmt->execute();
            $psychomotor_result = $psychomotor_stmt->fetch();

            if ($psychomotor_result) {
                $missing_fields = [];
                foreach ($psychomotor_result as $field => $value) {
                    if ($value === null || $value === '') {
                        $missing_fields[] = $field;
                    }
                }
                $status['psychomotor_domains']['completed'] = empty($missing_fields);
                $status['psychomotor_domains']['missing_fields'] = $missing_fields;
            }

            // Check comments (teacher's comment, head teacher's comment, principal's comment)
            $comments_query = "SELECT teacher_comment, head_teacher_comment, principal_comment
                               FROM compiled_results 
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id";
            $comments_stmt = $this->conn->prepare($comments_query);
            $comments_stmt->bindParam(':student_id', $student_id);
            $comments_stmt->bindParam(':term', $term);
            $comments_stmt->bindParam(':academic_year', $academic_year);
            $comments_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $comments_stmt->execute();
            $comments_result = $comments_stmt->fetch();

            if ($comments_result) {
                $missing_comments = [];
                if (!$comments_result['teacher_comment'])
                    $missing_comments[] = 'Teacher comment';
                if (!$comments_result['head_teacher_comment'])
                    $missing_comments[] = 'Head teacher comment';
                if (!$comments_result['principal_comment'])
                    $missing_comments[] = 'Principal comment';
                $status['comments']['completed'] = empty($missing_comments);
                $status['comments']['missing_comments'] = $missing_comments;
            }

            // Overall completion status
            $all_completed = $status['scores']['completed'] &&
                $status['attendance']['completed'] &&
                $status['affective_domains']['completed'] &&
                $status['psychomotor_domains']['completed'];

            $response_data = [
                'student_info' => $status['student_info'],
                'components' => [
                    'scores' => $status['scores'],
                    'attendance' => $status['attendance'],
                    'affective_domains' => $status['affective_domains'],
                    'psychomotor_domains' => $status['psychomotor_domains']
                ],
                'all_completed' => $all_completed,
                'can_submit' => $all_completed,
                'missing_requirements' => []
            ];

            if (!$all_completed) {
                if (!$status['scores']['completed']) {
                    $response_data['missing_requirements'][] = 'Scores: ' . $status['scores']['subjects_completed'] . '/' . $status['scores']['subjects_required'] . ' subjects completed';
                }
                if (!$status['attendance']['completed']) {
                    $response_data['missing_requirements'][] = 'Attendance: ' . $status['attendance']['days_present'] . '/' . $status['attendance']['days_required'] . ' days present';
                }
                if (!$status['affective_domains']['completed']) {
                    $response_data['missing_requirements'][] = 'Affective domains: ' . implode(', ', $status['affective_domains']['missing_fields']);
                }
                if (!$status['psychomotor_domains']['completed']) {
                    $response_data['missing_requirements'][] = 'Psychomotor domains: ' . implode(', ', $status['psychomotor_domains']['missing_fields']);
                }
            }

            Response::success($response_data, 'Student compilation status retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error checking student compilation status');
        }
    }

    /**
     * Check Compilation Status (Real-time validation)
     */
    public function checkCompilationStatus()
    {
        $token_data = Middleware::requireAuth();

        if ($token_data['role'] !== 'teacher') {
            Response::forbidden('Only teachers can check compilation status');
        }

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['class_id', 'term', 'academic_year']);

        try {
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $school_id = (int)($token_data['school_id'] ?? 0);

            // Verify teacher is class teacher for this class
            $check_query = "SELECT COUNT(*) as count FROM classes WHERE id = :class_id AND class_teacher_id = :teacher_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $check_stmt->execute();

            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Only class teachers can check compilation status');
            }

            // Get all students for this class
            $students_query = "SELECT id, first_name, last_name, admission_number 
                             FROM students 
                             WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id";
            $students_stmt = $this->conn->prepare($students_query);
            $students_stmt->bindParam(':class_id', $class_id);
            $students_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $students_stmt->execute();
            $students = $students_stmt->fetchAll(PDO::FETCH_ASSOC);

            $student_results = [];
            foreach ($students as $student) {
                $student_results[] = ['student_id' => $student['id']];
            }

            // Run comprehensive validation
            $validation_errors = $this->validateCompilationRequirements($class_id, $term, $academic_year, $student_results);

            // Check detailed component status
            $status = $this->getDetailedCompilationStatus($class_id, $term, $academic_year, $students, $school_id);

            $response = [
                'can_compile' => empty($validation_errors),
                'validation_errors' => $validation_errors,
                'status' => $status,
                'message' => empty($validation_errors) ? 'All requirements completed. Ready to compile results.' : 'Some requirements are still missing.'
            ];

            Response::success($response, 'Compilation status checked successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController: " . $e->getMessage());
            Response::serverError('Database error checking compilation status');
        }
    }

    /**
     * Get Detailed Compilation Status
     */
    private function getDetailedCompilationStatus($class_id, $term, $academic_year, $students, $school_id = 0)
    {
        $status = [
            'scores' => ['completed' => true, 'missing_students' => []],
            'attendance' => ['completed' => true, 'missing_students' => []],
            'affective_domains' => ['completed' => true, 'missing_students' => []],
            'psychomotor_domains' => ['completed' => true, 'missing_students' => []],
            'comments' => ['completed' => true, 'missing_students' => []]
        ];

        try {
            // Check scores completion
            $score_check_query = "SELECT s.id, s.first_name, s.last_name,
                                 COUNT(sc.id) as score_count
                                 FROM students s
                                 LEFT JOIN scores sc ON s.id = sc.student_id AND sc.school_id = :school_id
                                 LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id AND sa.school_id = :school_id2
                                 WHERE s.class_id = :class_id AND s.status = 'Active' 
                                 AND s.school_id = :school_id3
                                 AND sa.term = :term AND sa.academic_year = :academic_year
                                 GROUP BY s.id";

            $score_stmt = $this->conn->prepare($score_check_query);
            $score_stmt->bindParam(':class_id', $class_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
            $score_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $score_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $score_stmt->bindParam(':school_id3', $school_id, PDO::PARAM_INT);
            $score_stmt->execute();
            $score_results = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($score_results as $result) {
                if ($result['score_count'] == 0) {
                    $status['scores']['completed'] = false;
                    $status['scores']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'];
                }
            }

            // Check attendance completion
            $attendance_setting_key = 'attendance_' . strtolower(str_replace(' ', '_', $term));
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key AND school_id = :school_id";
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            $attendance_check_query = "SELECT s.id, s.first_name, s.last_name,
                                      a.attended_days,
                                      a.required_days,
                                      a.attendance_rate
                                      FROM students s
                                      LEFT JOIN attendance a ON s.id = a.student_id
                                        AND a.class_id = :class_id
                                        AND a.term = :term AND a.academic_year = :academic_year
                                        AND a.school_id = :school_id
                                      WHERE s.class_id = :class_id AND s.status = 'Active'
                                      AND s.school_id = :school_id2";

            $attendance_stmt = $this->conn->prepare($attendance_check_query);
            $attendance_stmt->bindParam(':class_id', $class_id);
            $attendance_stmt->bindParam(':term', $term);
            $attendance_stmt->bindParam(':academic_year', $academic_year);
            $attendance_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $attendance_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $attendance_stmt->execute();
            $attendance_results = $attendance_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($attendance_results as $result) {
                $attended_days = isset($result['attended_days']) && $result['attended_days'] !== null ? (int) $result['attended_days'] : 0;
                $record_required_days = isset($result['required_days']) && $result['required_days'] !== null ? (int) $result['required_days'] : (int) $required_days;
                if ($record_required_days <= 0) {
                    $status['attendance']['completed'] = false;
                    $status['attendance']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'] . ' (requirements not set)';
                    continue;
                }

                if (!isset($result['attended_days']) || $result['attended_days'] === null || $attended_days < $record_required_days) {
                    $status['attendance']['completed'] = false;
                    $status['attendance']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'] .
                        ' (' . $attended_days . '/' . $record_required_days . ' days)';
                }
            }

            // Check affective domains
            $affective_check_query = "SELECT s.id, s.first_name, s.last_name,
                                       COUNT(ad.id) as affective_count
                                       FROM students s
                                       LEFT JOIN affective_domains ad ON s.id = ad.student_id AND ad.school_id = :school_id
                                       WHERE s.class_id = :class_id AND s.status = 'Active'
                                       AND s.school_id = :school_id2
                                       AND ad.term = :term AND ad.academic_year = :academic_year
                                       GROUP BY s.id";

            $affective_stmt = $this->conn->prepare($affective_check_query);
            $affective_stmt->bindParam(':class_id', $class_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
            $affective_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $affective_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $affective_stmt->execute();
            $affective_results = $affective_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($affective_results as $result) {
                if ($result['affective_count'] == 0) {
                    $status['affective_domains']['completed'] = false;
                    $status['affective_domains']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'];
                }
            }

            // Check psychomotor domains
            $psychomotor_check_query = "SELECT s.id, s.first_name, s.last_name,
                                         COUNT(pd.id) as psychomotor_count
                                         FROM students s
                                         LEFT JOIN psychomotor_domains pd ON s.id = pd.student_id AND pd.school_id = :school_id
                                         WHERE s.class_id = :class_id AND s.status = 'Active'
                                         AND s.school_id = :school_id2
                                         AND pd.term = :term AND pd.academic_year = :academic_year
                                         GROUP BY s.id";

            $psychomotor_stmt = $this->conn->prepare($psychomotor_check_query);
            $psychomotor_stmt->bindParam(':class_id', $class_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
            $psychomotor_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $psychomotor_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $psychomotor_stmt->execute();
            $psychomotor_results = $psychomotor_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($psychomotor_results as $result) {
                if ($result['psychomotor_count'] == 0) {
                    $status['psychomotor_domains']['completed'] = false;
                    $status['psychomotor_domains']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'];
                }
            }

            // Check for compiled results (which would include comments)
            $compiled_check_query = "SELECT s.id, s.first_name, s.last_name,
                                          cr.class_teacher_comment
                                          FROM students s
                                          LEFT JOIN compiled_results cr ON s.id = cr.student_id AND cr.school_id = :school_id
                                          WHERE s.class_id = :class_id AND s.status = 'Active'
                                          AND s.school_id = :school_id2
                                          AND cr.term = :term AND cr.academic_year = :academic_year";

            $compiled_stmt = $this->conn->prepare($compiled_check_query);
            $compiled_stmt->bindParam(':class_id', $class_id);
            $compiled_stmt->bindParam(':term', $term);
            $compiled_stmt->bindParam(':academic_year', $academic_year);
            $compiled_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $compiled_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $compiled_stmt->execute();
            $compiled_results = $compiled_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($compiled_results as $result) {
                if (empty($result['class_teacher_comment']) || trim($result['class_teacher_comment']) == '') {
                    $status['comments']['completed'] = false;
                    $status['comments']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'];
                }
            }

        } catch (PDOException $e) {
            // Return default status if there's an error
        }

        return $status;
    }

    /**
     * Get Assignment Term
     */
    private function getAssignmentTerm($assignment_id, $school_id)
    {
        $query = "SELECT term FROM subject_assignments WHERE id = :assignment_id AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':assignment_id', $assignment_id);
        $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result ? $result['term'] : 'First Term';
    }

    /**
     * Get Assignment Academic Year
     */
    private function getAssignmentAcademicYear($assignment_id, $school_id)
    {
        $query = "SELECT academic_year FROM subject_assignments WHERE id = :assignment_id AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':assignment_id', $assignment_id);
        $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result ? $result['academic_year'] : '2025/2026';
    }

    /**
     * Get Student Results
     * Returns compiled results for a specific student
     */
    public function getStudentResults($student_id)
    {
        try {
            if (!$this->conn) {
                Response::serverError('Database connection failed');
                return;
            }

            $this->ensureCompiledResultsTableExists();
            $this->ensureCompiledResultsColumnsExist();

            // If core tables are missing, avoid 500s and return empty results.
            if (!$this->tableExists('compiled_results') || !$this->tableExists('students') || !$this->tableExists('classes')) {
                Response::success([], 'Required tables missing');
                return;
            }

            $token_data = Middleware::requireAuth();
            if (!$token_data || !is_array($token_data) || !isset($token_data['role'])) {
                Response::unauthorized('Invalid authentication token');
                return;
            }

            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            $role = strtolower(trim((string)$token_data['role']));

            // Validate student_id parameter
            $student_id = Middleware::validateInteger($student_id, 'student_id');

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : null;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;

            // For parents, always enforce Approved status at the backend level
            $status_filter = '';
            if ($role === 'parent') {
                $status_filter = " AND cr.status = 'Approved'";
            }

            $studentSelect = [];
            if ($this->columnExists('students', 'first_name')) {
                $studentSelect[] = 's.first_name';
            }
            if ($this->columnExists('students', 'last_name')) {
                $studentSelect[] = 's.last_name';
            }
            if ($this->columnExists('students', 'admission_number')) {
                $studentSelect[] = 's.admission_number';
            }

            $classSelect = [];
            if ($this->columnExists('classes', 'name')) {
                $classSelect[] = 'c.name as class_name';
            }

            $extraSelectSql = '';
            $extraParts = array_merge($studentSelect, $classSelect);
            if (!empty($extraParts)) {
                $extraSelectSql = ', ' . implode(', ', $extraParts);
            }

            // Build WHERE clause
            $where_clause = "WHERE cr.student_id = :student_id AND cr.school_id = :school_id";
            if ($term) {
                $where_clause .= " AND cr.term = :term";
            }
            if ($academic_year) {
                $where_clause .= " AND cr.academic_year = :academic_year";
            }
            $where_clause .= $status_filter;

            $query = "SELECT cr.*$extraSelectSql
                      FROM compiled_results cr
                      JOIN students s ON cr.student_id = s.id
                      JOIN classes c ON cr.class_id = c.id
                      $where_clause
                      ORDER BY cr.academic_year DESC, 
                               CASE cr.term 
                                   WHEN 'First Term' THEN 1 
                                   WHEN 'Second Term' THEN 2 
                                   WHEN 'Third Term' THEN 3 
                               END DESC";

            $params = [':student_id' => $student_id, ':school_id' => $school_id];
            if ($term) {
                $params[':term'] = $term;
            }
            if ($academic_year) {
                $params[':academic_year'] = $academic_year;
            }

            // Add role-based access control
            if ($role === 'parent') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::forbidden('Parent profile not linked to any students');
                    return;
                }

                // Verify the requested student is linked to this parent
                $link_check = "SELECT COUNT(*) as count FROM parent_student_links psl
                               WHERE psl.parent_id = :parent_id AND psl.student_id = :student_id AND psl.school_id = :school_id";
                $link_stmt = $this->conn->prepare($link_check);
                $link_stmt->bindValue(':parent_id', $token_data['linked_id']);
                $link_stmt->bindValue(':student_id', $student_id);
                $link_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $link_stmt->execute();

                if ($link_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Not authorized to view this student\'s results');
                    return;
                }
            } elseif ($role === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::forbidden('Teacher profile not linked');
                    return;
                }

                // Verify teacher has access to this student's class
                $access_check = "SELECT COUNT(*) as count 
                                FROM students st
                                JOIN classes cl ON st.class_id = cl.id
                                LEFT JOIN class_teacher_assignments cta ON cl.id = cta.class_id AND cta.school_id = :cta_school_id
                                WHERE st.id = :student_id 
                                AND (cl.class_teacher_id = :teacher_id OR cta.teacher_id = :teacher_id)
                                AND cl.school_id = :class_school_id";
                $access_stmt = $this->conn->prepare($access_check);
                $access_stmt->bindValue(':student_id', $student_id);
                $access_stmt->bindValue(':teacher_id', $token_data['linked_id']);
                $access_stmt->bindValue(':cta_school_id', $school_id, PDO::PARAM_INT);
                $access_stmt->bindValue(':class_school_id', $school_id, PDO::PARAM_INT);
                $access_stmt->execute();

                if ($access_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Not authorized to view this student\'s results');
                    return;
                }
            }
            // Admin and accountant have full access

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert snake_case to camelCase for frontend compatibility
            $camelCaseResults = array_map(function($result) {
                return [
                    'id' => $result['id'] ?? null,
                    'studentId' => $result['student_id'] ?? null,
                    'classId' => $result['class_id'] ?? null,
                    'term' => $result['term'] ?? null,
                    'academicYear' => $result['academic_year'] ?? null,
                    'status' => $result['status'] ?? null,
                    'totalScore' => $result['total_score'] ?? null,
                    'average' => $result['average'] ?? null,
                    'position' => $result['position'] ?? null,
                    'grade' => $result['grade'] ?? null,
                    'subjects' => json_decode($result['subjects'] ?? '[]', true),
                    'attendance' => json_decode($result['attendance'] ?? '[]', true),
                    'affectiveDomains' => json_decode($result['affective_domains'] ?? '[]', true),
                    'psychomotorDomains' => json_decode($result['psychomotor_domains'] ?? '[]', true),
                    'teacherComment' => $result['teacher_comment'] ?? null,
                    'headTeacherComment' => $result['head_teacher_comment'] ?? null,
                    'compiledAt' => $result['compiled_at'] ?? null,
                    'compiledBy' => $result['compiled_by'] ?? null,
                    'firstName' => $result['first_name'] ?? null,
                    'lastName' => $result['last_name'] ?? null,
                    'admissionNumber' => $result['admission_number'] ?? null,
                    'className' => $result['class_name'] ?? null,
                ];
            }, $results);

            Response::success($camelCaseResults, 'Student results retrieved successfully');

        } catch (Exception $e) {
            Response::serverError('Failed to retrieve student results');
        }
    }

    /**
     * Compile Cumulative Results (Admin only)
     * Endpoint: POST /results/compile-cumulative
     */
    public function compileCumulative()
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        try {
            $token_data = Middleware::requireRole('admin');
            if (!$token_data) return;

            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                Response::badRequest('Invalid JSON body');
                return;
            }

            $validator_errors = Middleware::validateRequired($data, ['class_id', 'academic_year']);
            if (!empty($validator_errors)) {
                Response::badRequest('Validation failed: ' . implode(', ', $validator_errors));
                return;
            }

            $class_id = (int)$data['class_id'];
            $academic_year = Middleware::sanitizeString($data['academic_year']);

            // Check current term is Third Term
            $__school_id_for_term = (int)($token_data['school_id'] ?? 0);
            $term_check = $this->conn->prepare("SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' AND school_id = :school_id LIMIT 1");
            $term_check->execute([':school_id' => $__school_id_for_term]);
            $current_term = $term_check->fetchColumn();
            if (strtolower($current_term) !== 'third term') {
                Response::badRequest('Cumulative results can only be compiled during Third Term');
                return;
            }

            // Get all students in the class with active status
            $students_query = "SELECT id, first_name, last_name FROM students WHERE class_id = :class_id AND school_id = :school_id AND status = 'Active' ORDER BY first_name";
            $stmt = $this->conn->prepare($students_query);
            $stmt->bindValue(':class_id', $class_id, PDO::PARAM_INT);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($students)) {
                Response::badRequest('No active students found in this class');
                return;
            }

            $errors = [];
            $compiled_count = 0;
            $all_cumulative = [];

            foreach ($students as $student) {
                $student_id = (int)$student['id'];

                // Verify all 3 terms have approved compiled_results
                $check_query = "SELECT term, average_score, times_present, total_attendance_days
                                FROM compiled_results
                                WHERE student_id = :student_id AND class_id = :class_id
                                  AND academic_year = :academic_year AND status = 'Approved'
                                  AND school_id = :school_id
                                  AND term IN ('First Term','Second Term','Third Term')";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindValue(':student_id', $student_id, PDO::PARAM_INT);
                $check_stmt->bindValue(':class_id', $class_id, PDO::PARAM_INT);
                $check_stmt->bindValue(':academic_year', $academic_year);
                $check_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $check_stmt->execute();
                $term_results = $check_stmt->fetchAll(PDO::FETCH_ASSOC);

                $found_terms = array_column($term_results, 'term');

                // Check which terms are missing
                $missing = [];
                foreach (['First Term', 'Second Term', 'Third Term'] as $t) {
                    if (!in_array($t, $found_terms)) {
                        $missing[] = $t;
                    }
                }

                if (!empty($missing)) {
                    $errors[] = $student['first_name'] . ' ' . $student['last_name'] . ': missing approved results for ' . implode(', ', $missing);
                    continue;
                }

                // Get scores across all 3 terms, grouped by subject
                $scores_query = "SELECT sa.subject_id, sub.name AS subject_name,
                                        s.term, s.ca1, s.ca2, s.exam, s.total
                                 FROM scores s
                                 JOIN subject_assignments sa ON s.subject_assignment_id = sa.id
                                 JOIN subjects sub ON sa.subject_id = sub.id
                                 WHERE s.student_id = :student_id
                                   AND s.academic_year = :academic_year
                                   AND s.status = 'Approved'
                                   AND sa.school_id = :school_id
                                 ORDER BY sa.subject_id,
                                          FIELD(s.term, 'First Term','Second Term','Third Term')";
                $scores_stmt = $this->conn->prepare($scores_query);
                $scores_stmt->bindValue(':student_id', $student_id, PDO::PARAM_INT);
                $scores_stmt->bindValue(':academic_year', $academic_year);
                $scores_stmt->bindValue(':school_id', $__school_id_for_term, PDO::PARAM_INT);
                $scores_stmt->execute();
                $all_scores = $scores_stmt->fetchAll(PDO::FETCH_ASSOC);

                // Pivot by subject_id
                $subject_groups = [];
                foreach ($all_scores as $score_row) {
                    $sid = (int)$score_row['subject_id'];
                    if (!isset($subject_groups[$sid])) {
                        $subject_groups[$sid] = [
                            'subject_id' => $sid,
                            'subject_name' => $score_row['subject_name'],
                            'first_ca1' => 0, 'first_ca2' => 0, 'first_exam' => 0, 'first_total' => 0,
                            'second_ca1' => 0, 'second_ca2' => 0, 'second_exam' => 0, 'second_total' => 0,
                            'third_ca1' => 0, 'third_ca2' => 0, 'third_exam' => 0, 'third_total' => 0,
                        ];
                    }
                    $term = $score_row['term'];
                    $prefix = '';
                    if ($term === 'First Term') $prefix = 'first_';
                    elseif ($term === 'Second Term') $prefix = 'second_';
                    else $prefix = 'third_';

                    $subject_groups[$sid][$prefix . 'ca1'] = (float)($score_row['ca1'] ?? 0);
                    $subject_groups[$sid][$prefix . 'ca2'] = (float)($score_row['ca2'] ?? 0);
                    $subject_groups[$sid][$prefix . 'exam'] = (float)($score_row['exam'] ?? 0);
                    $subject_groups[$sid][$prefix . 'total'] = (float)($score_row['total'] ?? 0);
                }

                // Build subject_data and compute cumulative totals
                $subject_data = [];
                $running_grand_total = 0;
                foreach ($subject_groups as $sg) {
                    $grand_total = $sg['first_total'] + $sg['second_total'] + $sg['third_total'];
                    $average = count(array_filter([$sg['first_total'], $sg['second_total'], $sg['third_total']], function($v) { return $v > 0; })) > 0
                        ? round($grand_total / 3, 1)
                        : 0;
                    $grade = $this->calculateGrade($average);
                    $remark = $this->getRemark($grade);

                    $subject_data[] = [
                        'subject_id' => $sg['subject_id'],
                        'subject_name' => $sg['subject_name'],
                        'first_ca1' => $sg['first_ca1'],
                        'first_ca2' => $sg['first_ca2'],
                        'first_exam' => $sg['first_exam'],
                        'first_total' => $sg['first_total'],
                        'second_ca1' => $sg['second_ca1'],
                        'second_ca2' => $sg['second_ca2'],
                        'second_exam' => $sg['second_exam'],
                        'second_total' => $sg['second_total'],
                        'third_ca1' => $sg['third_ca1'],
                        'third_ca2' => $sg['third_ca2'],
                        'third_exam' => $sg['third_exam'],
                        'third_total' => $sg['third_total'],
                        'grand_total' => $grand_total,
                        'average' => $average,
                        'grade' => $grade,
                        'remark' => $remark,
                    ];
                    $running_grand_total += $grand_total;
                }

                $total_score = $running_grand_total;
                $num_subjects = count($subject_data);
                $average_score = $num_subjects > 0 ? round($total_score / $num_subjects, 2) : 0;

                // Aggregate attendance from all 3 term compiled_results
                $total_present = 0;
                $total_days = 0;
                foreach ($term_results as $tr) {
                    $total_present += (int)($tr['times_present'] ?? 0);
                    $total_days += (int)($tr['total_attendance_days'] ?? 0);
                }
                $session_attendance_pct = $total_days > 0 ? round(($total_present / $total_days) * 100, 2) : 0;

                // Determine promotion status
                $promotion_status = ($average_score >= 50 && $session_attendance_pct >= 50) ? 'Promoted' : 'Repeated';

                // Auto-generate principal comment
                $prefix = ($promotion_status === 'Promoted') ? 'Promoted. ' : 'Repeated. ';
                if ($average_score >= 80) {
                    $principal_comment = $prefix . 'Exceptional performance! Keep up the excellent work.';
                } elseif ($average_score >= 70) {
                    $principal_comment = $prefix . 'Very good performance! Continue to work hard and aim for excellence.';
                } elseif ($average_score >= 60) {
                    $principal_comment = $prefix . 'Good performance! There is room for improvement. Stay focused and dedicated.';
                } elseif ($average_score >= 50) {
                    $principal_comment = $prefix . 'Fair performance. More effort and dedication needed for better results.';
                } else {
                    $principal_comment = $prefix . 'Poor performance. Requires immediate attention and significant improvement.';
                }

                $all_cumulative[] = [
                    'student_id' => $student_id,
                    'class_id' => $class_id,
                    'academic_year' => $academic_year,
                    'total_score' => $total_score,
                    'average_score' => $average_score,
                    'class_average' => null,
                    'total_students' => null,
                    'promotion_status' => $promotion_status,
                    'session_attendance_pct' => $session_attendance_pct,
                    'subject_data' => json_encode($subject_data),
                    'principal_comment' => $principal_comment,
                    'compiled_by' => (int)($token_data['user_id'] ?? 1),
                ];
            }

            if (!empty($errors)) {
                Response::badRequest('Some students could not be compiled: ' . implode('; ', $errors));
                return;
            }

            if (empty($all_cumulative)) {
                Response::badRequest('No students to compile');
                return;
            }

            // Sort by average_score descending for position assignment
            usort($all_cumulative, function($a, $b) {
                return $b['average_score'] <=> $a['average_score'];
            });

            // Assign positions with tie handling
            $current_pos = 1;
            for ($i = 0; $i < count($all_cumulative); $i++) {
                if ($i > 0 && $all_cumulative[$i]['average_score'] < $all_cumulative[$i - 1]['average_score']) {
                    $current_pos = $i + 1;
                }
                $all_cumulative[$i]['position'] = $current_pos;
            }

            // Compute class average from all students
            $all_averages = array_column($all_cumulative, 'average_score');
            $class_avg = count($all_averages) > 0 ? round(array_sum($all_averages) / count($all_averages), 2) : 0;
            $total_students_count = count($all_cumulative);

            // UPSERT each cumulative result
            $compiled_count = 0;
            $this->conn->beginTransaction();
            $insert_query = "INSERT INTO cumulative_results 
                (student_id, class_id, school_id, academic_year, total_score, average_score, position, 
                 class_average, total_students, promotion_status, session_attendance_pct, 
                 subject_data, principal_comment, compiled_by, compiled_date)
                VALUES (:student_id, :class_id, :school_id, :academic_year, :total_score, :average_score, :position,
                 :class_average, :total_students, :promotion_status, :session_attendance_pct,
                 :subject_data, :principal_comment, :compiled_by, NOW())
                ON DUPLICATE KEY UPDATE
                 total_score = VALUES(total_score),
                 average_score = VALUES(average_score),
                 position = VALUES(position),
                 class_average = VALUES(class_average),
                 total_students = VALUES(total_students),
                 promotion_status = VALUES(promotion_status),
                 session_attendance_pct = VALUES(session_attendance_pct),
                 subject_data = VALUES(subject_data),
                 principal_comment = VALUES(principal_comment),
                 compiled_by = VALUES(compiled_by),
                 compiled_date = NOW()";

            $insert_stmt = $this->conn->prepare($insert_query);

            foreach ($all_cumulative as $row) {
                $insert_stmt->bindValue(':student_id', $row['student_id'], PDO::PARAM_INT);
                $insert_stmt->bindValue(':class_id', $row['class_id'], PDO::PARAM_INT);
                $insert_stmt->bindValue(':school_id', $__school_id_for_term, PDO::PARAM_INT);
                $insert_stmt->bindValue(':academic_year', $row['academic_year']);
                $insert_stmt->bindValue(':total_score', $row['total_score']);
                $insert_stmt->bindValue(':average_score', $row['average_score']);
                $insert_stmt->bindValue(':position', $row['position'], PDO::PARAM_INT);
                $insert_stmt->bindValue(':class_average', $class_avg);
                $insert_stmt->bindValue(':total_students', $total_students_count, PDO::PARAM_INT);
                $insert_stmt->bindValue(':promotion_status', $row['promotion_status']);
                $insert_stmt->bindValue(':session_attendance_pct', $row['session_attendance_pct']);
                $insert_stmt->bindValue(':subject_data', $row['subject_data']);
                $insert_stmt->bindValue(':principal_comment', $row['principal_comment']);
                $insert_stmt->bindValue(':compiled_by', $row['compiled_by'], PDO::PARAM_INT);
                $insert_stmt->execute();
                $compiled_count++;
            }

            $this->conn->commit();

            Response::success([
                'compiled_count' => $compiled_count,
                'class_average' => $class_avg,
                'total_students' => $total_students_count,
            ], "Cumulative results compiled for {$compiled_count} students");

        } catch (PDOException $e) {
            error_log("PDO Error in ResultsController.compileCumulative: " . $e->getMessage());
            if ($this->conn && $this->conn->inTransaction()) $this->conn->rollBack();
            Response::serverError('Database error during cumulative compilation');
        } catch (Exception $e) {
            error_log("Exception in ResultsController.compileCumulative: " . $e->getMessage());
            if ($this->conn && $this->conn->inTransaction()) $this->conn->rollBack();
            Response::serverError('Failed to compile cumulative results');
        }
    }

    /**
     * Get Cumulative Result for a Student
     * Endpoint: GET /results/cumulative/{student_id}
     */
    public function getCumulativeResult($student_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        try {
            $token_data = Middleware::requireAuth();
            if (!$token_data) return;

            $academic_year = $_GET['academic_year'] ?? null;
            if (!$academic_year) {
                Response::badRequest('academic_year query parameter is required');
                return;
            }

            $student_id = Middleware::validateInteger($student_id);
            if (!$student_id) {
                Response::badRequest('Invalid student ID');
                return;
            }

            $school_id = (int)($token_data['school_id'] ?? 0);

            // Role-based access control
            $role = $token_data['role'] ?? 'admin';
            if ($role === 'parent') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::forbidden('Parent profile not linked to any students');
                    return;
                }
                $link_check = "SELECT COUNT(*) as count FROM parent_student_links psl
                               WHERE psl.parent_id = :parent_id AND psl.student_id = :student_id AND psl.school_id = :school_id";
                $link_stmt = $this->conn->prepare($link_check);
                $link_stmt->bindValue(':parent_id', $token_data['linked_id']);
                $link_stmt->bindValue(':student_id', $student_id);
                $link_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $link_stmt->execute();
                if ($link_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Not authorized to view this student\'s cumulative result');
                    return;
                }
            }

            $query = "SELECT cr.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
                      FROM cumulative_results cr
                      JOIN students s ON cr.student_id = s.id
                      JOIN classes c ON cr.class_id = c.id
                      WHERE cr.student_id = :student_id AND cr.academic_year = :academic_year AND s.school_id = :school_id
                      LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':student_id', $student_id, PDO::PARAM_INT);
            $stmt->bindValue(':academic_year', $academic_year);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->bindValue(':academic_year', $academic_year);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                Response::notFound('Cumulative result not yet compiled');
                return;
            }

            // Decode subject_data JSON
            if (isset($result['subject_data'])) {
                $result['subject_data'] = json_decode($result['subject_data'], true);
            }

            Response::success($result, 'Cumulative result retrieved successfully');

        } catch (Exception $e) {
            Response::serverError('Failed to retrieve cumulative result');
        }
    }

    /**
     * Get Cumulative Results for a Class
     * Endpoint: GET /results/cumulative/class/{class_id}
     */
    public function getClassCumulativeResults($class_id)
    {
        if (!$this->conn) {
            Response::serverError('Database connection failed');
            return;
        }

        try {
            $token_data = Middleware::requireAuth();
            if (!$token_data) return;

            $academic_year = $_GET['academic_year'] ?? null;
            if (!$academic_year) {
                Response::badRequest('academic_year query parameter is required');
                return;
            }

            $class_id = Middleware::validateInteger($class_id);
            if (!$class_id) {
                Response::badRequest('Invalid class ID');
                return;
            }

            $school_id = (int)($token_data['school_id'] ?? 0);

            // Role-based access control
            $role = $token_data['role'] ?? 'admin';
            if ($role === 'parent') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::forbidden('Parent profile not linked to any students');
                    return;
                }
                $link_check = "SELECT COUNT(*) as count FROM parent_student_links psl
                               JOIN students s ON psl.student_id = s.id
                               WHERE psl.parent_id = :parent_id AND s.class_id = :class_id AND s.school_id = :school_id";
                $link_stmt = $this->conn->prepare($link_check);
                $link_stmt->bindValue(':parent_id', $token_data['linked_id']);
                $link_stmt->bindValue(':class_id', $class_id);
                $link_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $link_stmt->execute();
                if ($link_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Not authorized to view cumulative results for this class');
                    return;
                }
            }

            $query = "SELECT cr.*, s.first_name, s.last_name, s.admission_number, c.name as class_name
                      FROM cumulative_results cr
                      JOIN students s ON cr.student_id = s.id
                      JOIN classes c ON cr.class_id = c.id
                      WHERE cr.class_id = :class_id AND cr.academic_year = :academic_year AND c.school_id = :school_id
                      ORDER BY cr.position ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':class_id', $class_id, PDO::PARAM_INT);
            $stmt->bindValue(':academic_year', $academic_year);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Decode subject_data JSON for each row
            foreach ($results as &$row) {
                if (isset($row['subject_data'])) {
                    $row['subject_data'] = json_decode($row['subject_data'], true);
                }
            }
            unset($row);

            Response::success($results, 'Class cumulative results retrieved successfully');

        } catch (Exception $e) {
            Response::serverError('Failed to retrieve class cumulative results');
        }
    }
}
?>
