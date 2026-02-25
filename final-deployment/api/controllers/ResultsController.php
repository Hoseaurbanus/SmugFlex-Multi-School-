<?php
/**
 * Results Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

class ResultsController
{
    private $conn;

    public function __construct()
    {
        try {
            $database = new Database();
            $this->conn = $database->getConnection();
            
            if ($this->conn) {
                $this->ensureCompiledResultsTableExists();
                $this->ensureScoresApprovalColumnsExist();
            } else {
                error_log("ResultsController: Database connection failed (conn is null)");
            }
        } catch (Throwable $e) {
            error_log("ResultsController Constructor Error: " . $e->getMessage());
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

    private function validateScoreStatus($status) {
        $allowed = ['Draft', 'Submitted', 'Rejected', 'Approved'];
        if (!in_array($status, $allowed, true)) {
            Response::badRequest('Invalid status value');
        }
        return $status;
    }

    private function getScoreWithAssignmentAndClass($score_id) {
        $query = "SELECT sc.*, sa.class_id, sa.teacher_id as subject_teacher_id, sa.term as assignment_term, sa.academic_year as assignment_year
                  FROM scores sc
                  JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                  WHERE sc.id = :score_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':score_id', $score_id);
        $stmt->execute();
        return $stmt->fetch();
    }

    private function requireClassTeacherForClass($token_data, $class_id) {
        $check_query = "SELECT COUNT(*) as count FROM classes WHERE id = :class_id AND class_teacher_id = :teacher_id";
        $check_stmt = $this->conn->prepare($check_query);
        $check_stmt->bindParam(':class_id', $class_id);
        $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
        $check_stmt->execute();
        if ($check_stmt->fetchColumn() == 0) {
            Response::forbidden('Only the class teacher can approve or reject scores for this class');
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
        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');

        try {
            // Check if teacher has access to this assignment
            if ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE id = :assignment_id AND teacher_id = :teacher_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':assignment_id', $assignment_id);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
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
                      ORDER BY s.last_name, s.first_name";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':assignment_id', $assignment_id);
            $stmt->execute();

            $scores = $stmt->fetchAll();

            Response::success($scores, 'Scores retrieved successfully');

        } catch (PDOException $e) {
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
                            WHERE sa.id = :assignment_id AND sa.teacher_id = :teacher_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->execute();

            $assignment_info = $check_stmt->fetch();

            if (!$assignment_info) {
                Response::forbidden('Access denied to this assignment');
            }

            // Check if this is a creche class
            $is_creche = strtolower($assignment_info['class_level']) === 'creche' ||
                strpos(strtolower($assignment_info['class_name']), 'creche') !== false;

            $class_id = (int)$assignment_info['class_id'];
            $assignment_term = $this->getAssignmentTerm($assignment_id);
            $assignment_year = $this->getAssignmentAcademicYear($assignment_id);

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
            $student_check_query = "SELECT COUNT(*) as count FROM students WHERE id = :student_id AND class_id = :class_id AND status = 'Active'";
            $student_check_stmt = $this->conn->prepare($student_check_query);
            $student_check_stmt->bindParam(':student_id', $student_id);
            $student_check_stmt->bindParam(':class_id', $class_id);
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
            if ($exam !== null && ($exam < 0 || $exam > 60)) {
                Response::badRequest('Exam must be between 0 and 60');
            }

            $total = ($ca1 ?? 0) + ($ca2 ?? 0) + ($exam ?? 0);
            $grade = $this->calculateGrade($total, $is_creche);
            $remark = $this->getRemark($grade, $is_creche);

            // Calculate class statistics
            $class_stats = $this->calculateClassStatistics($assignment_id, $total);

            // Check if score exists
            $existing_query = "SELECT id FROM scores WHERE subject_assignment_id = :assignment_id AND student_id = :student_id";
            $existing_stmt = $this->conn->prepare($existing_query);
            $existing_stmt->bindParam(':assignment_id', $assignment_id);
            $existing_stmt->bindParam(':student_id', $student_id);
            $existing_stmt->execute();

            $existing_score = $existing_stmt->fetch();

            if ($existing_score) {
                // Preserve existing values for components that were not provided in the request
                $existing_values_query = "SELECT ca1, ca2, exam FROM scores WHERE id = :score_id";
                $existing_values_stmt = $this->conn->prepare($existing_values_query);
                $existing_values_stmt->bindParam(':score_id', $existing_score['id']);
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
                                 WHERE id = :score_id";

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
                $update_stmt->execute();
            } else {
                // Insert new score
                $insert_query = "INSERT INTO scores (student_id, subject_assignment_id, ca1, ca2, exam, total,
                                 grade, remark, class_average, class_min, class_max, entered_by, status, term, academic_year)
                                 VALUES (:student_id, :assignment_id, :ca1, :ca2, :exam, :total,
                                        :grade, :remark, :class_average, :class_min, :class_max, :entered_by, :status, :term, :academic_year)";

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

            Response::success(null, 'Scores saved successfully');

        } catch (PDOException $e) {
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

        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');

        try {
            // Verify teacher owns this assignment
            $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE id = :assignment_id AND teacher_id = :teacher_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->execute();

            if ((int)$check_stmt->fetchColumn() === 0) {
                Response::forbidden('Access denied to this assignment');
            }

            // Require at least one score exists for this assignment
            $scores_query = "SELECT COUNT(*) as entered_scores FROM scores WHERE subject_assignment_id = :assignment_id";
            $scores_stmt = $this->conn->prepare($scores_query);
            $scores_stmt->bindParam(':assignment_id', $assignment_id);
            $scores_stmt->execute();
            $entered_scores = (int)$scores_stmt->fetchColumn();

            if ($entered_scores === 0) {
                Response::badRequest('Cannot submit scores. No scores have been entered yet.');
            }

            // Update all existing scores status to Submitted
            $update_query = "UPDATE scores SET status = 'Submitted' WHERE subject_assignment_id = :assignment_id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':assignment_id', $assignment_id);
            $update_stmt->execute();

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

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : 'First Term';
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : '2025/2026';

            // Base query filtered by term and academic year from subject_assignments
            $query = "SELECT sc.*, sa.subject_id, sa.class_id, sub.name as subject_name,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                             s.first_name as student_first_name, s.last_name as student_last_name,
                             s.admission_number, c.name as class_name, c.level
                      FROM scores sc
                      JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                      JOIN subjects sub ON sa.subject_id = sub.id
                      JOIN teachers t ON sa.teacher_id = t.id
                      JOIN students s ON sc.student_id = s.id
                      JOIN classes c ON sa.class_id = c.id
                      WHERE sa.term = :term AND sa.academic_year = :academic_year";

            $params = [
                ':term' => $term,
                ':academic_year' => $academic_year
            ];

            // Role-based filtering
            if (($token_data['role'] ?? null) === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    Response::success([], 'No scores found - teacher profile incomplete');
                    return;
                }

                $query .= " AND sa.teacher_id = :teacher_id";
                $params[':teacher_id'] = $token_data['linked_id'];
            } elseif (($token_data['role'] ?? null) === 'parent') {
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
            error_log("Database error in getScoresByTerm: " . $e->getMessage());
            Response::serverError('Database error retrieving scores');
        } catch (Exception $e) {
            error_log("General error in getScoresByTerm: " . $e->getMessage());
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
                error_log("getAllCompiledResults: Database connection failed");
                Response::serverError('Database connection failed');
                return;
            }

            $this->ensureCompiledResultsTableExists();

            $token_data = Middleware::requireAuth();
            if (!$token_data || !is_array($token_data) || !isset($token_data['role'])) {
                error_log("getAllCompiledResults: Invalid or missing authentication token");
                Response::unauthorized('Invalid authentication token');
                return;
            }

            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : null;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;
            $class_id = null;
            if (isset($_GET['class_id']) && $_GET['class_id'] !== '') {
                $class_id = Middleware::validateInteger($_GET['class_id'], 'class_id');
            }
            $status = isset($_GET['status']) ? Middleware::sanitizeString($_GET['status']) : null;

            error_log("getAllCompiledResults: Raw parameters - term: " . ($term ?? 'null') . ", academic_year: " . ($academic_year ?? 'null') . ", class_id: " . ($class_id ?? 'null') . ", status: " . ($status ?? 'null'));

            // For parents, always enforce Approved status at the backend level
            // so unapproved or draft results are never exposed regardless of caller params
            if ($token_data['role'] === 'parent') {
                $status = 'Approved';
            }

            // Start with a simple query that doesn't depend on complex joins
            // For parents, include basic info (scores will be loaded separately)
            // For other users, keep basic query
            if ($token_data['role'] === 'parent') {
                // Build WHERE clause based on available parameters
                $where_clause = "WHERE 1=1";
                if ($term) {
                    $where_clause .= " AND cr.term = :term";
                }
                if ($academic_year) {
                    $where_clause .= " AND cr.academic_year = :academic_year";
                }

                $query = "SELECT cr.*, s.first_name, s.last_name, s.admission_number,
                                 c.name as class_name, c.level
                          FROM compiled_results cr
                          JOIN students s ON cr.student_id = s.id
                          JOIN classes c ON cr.class_id = c.id
                          $where_clause";
            } else {
                // Build WHERE clause based on available parameters
                $where_clause = "WHERE 1=1";
                if ($term) {
                    $where_clause .= " AND cr.term = :term";
                }
                if ($academic_year) {
                    $where_clause .= " AND cr.academic_year = :academic_year";
                }

                $query = "SELECT cr.*, s.first_name, s.last_name, s.admission_number,
                                 c.name as class_name, c.level
                          FROM compiled_results cr
                          JOIN students s ON cr.student_id = s.id
                          JOIN classes c ON cr.class_id = c.id
                          $where_clause";
            }

            $params = [];
            if ($term) {
                $params[':term'] = $term;
            }
            if ($academic_year) {
                $params[':academic_year'] = $academic_year;
            }

            error_log("getAllCompiledResults: Initial query built for role " . $token_data['role']);
            error_log("getAllCompiledResults: Initial params: " . json_encode($params));

            // Add role-based filtering
            if ($token_data['role'] === 'parent') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    // Flat empty array keeps response shape consistent
                    error_log("getAllCompiledResults: Parent profile not linked, returning empty array");
                    Response::success([], 'Parent profile not linked');
                    return;
                }

                // First check if parent has any linked children
                $children_check = "SELECT COUNT(*) as count FROM parent_student_links psl
                                   WHERE psl.parent_id = :parent_id";
                $children_stmt = $this->conn->prepare($children_check);
                $children_stmt->bindValue(':parent_id', $token_data['linked_id']);
                $children_stmt->execute();

                $has_children = $children_stmt->fetch()['count'] > 0;

                if (!$has_children) {
                    error_log("getAllCompiledResults: Parent has no linked children, returning empty array");
                    Response::success([], 'No linked children found for parent');
                    return;
                }

                // Add parent filtering - only show results for parent's linked children
                $query .= " AND cr.student_id IN (
                    SELECT psl.student_id FROM parent_student_links psl
                    WHERE psl.parent_id = :parent_id
                )";
                $params[':parent_id'] = $token_data['linked_id'];
                error_log("getAllCompiledResults: Added parent filtering");
            } else if ($token_data['role'] === 'teacher') {
                if (!isset($token_data['linked_id']) || empty($token_data['linked_id'])) {
                    error_log("getAllCompiledResults: Teacher profile not linked, returning empty array");
                    Response::success(['data' => []], 'Teacher profile not linked');
                    return;
                }

                // Check if teacher has any class assignments first
                $check_term = $term ?: 'First Term';
                $check_academic_year = $academic_year ?: '2025/2026';
                $teacher_check = "SELECT COUNT(*) as count FROM class_teacher_assignments
                                 WHERE teacher_id = :teacher_id AND term = :term AND academic_year = :academic_year AND status = 'Active'";
                $check_stmt = $this->conn->prepare($teacher_check);
                $check_stmt->bindValue(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindValue(':term', $check_term);
                $check_stmt->bindValue(':academic_year', $check_academic_year);
                $check_stmt->execute();

                $result = $check_stmt->fetch();
                $assignment_count = $result ? $result['count'] : 0;

                error_log("getAllCompiledResults: Teacher " . $token_data['linked_id'] . " has $assignment_count assignments for term '$check_term' year '$check_academic_year'");

                if ($assignment_count == 0) {
                    // Teacher has no assignments for this term/year, return empty result
                    error_log("getAllCompiledResults: No assignments found for teacher, returning empty results");
                    Response::success([], 'No class assignments found for this term and academic year');
                    return;
                }

                $has_assignments = $assignment_count > 0;

                if ($has_assignments) {
                    $query .= " AND cr.class_id IN (
                        SELECT cta.class_id FROM class_teacher_assignments cta
                        WHERE cta.teacher_id = :teacher_id
                        AND cta.term = :term
                        AND cta.academic_year = :academic_year
                        AND cta.status = 'Active'
                    )";
                    $params[':teacher_id'] = $token_data['linked_id'];
                    $params[':term'] = $check_term;
                    $params[':academic_year'] = $check_academic_year;
                } else {
                    // Teacher has no assignments, return empty result
                    error_log("getAllCompiledResults: Teacher has no assignments, returning empty results");
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

            error_log("getAllCompiledResults: Final query: " . $query);
            error_log("getAllCompiledResults: Final params: " . json_encode($params));

            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($results === false) {
                $results = []; // Ensure we always have an array
            }

            error_log("getAllCompiledResults: Query executed successfully, returned " . count($results) . " results");

            // Return a flat array so frontend can reliably treat response.data as an array
            Response::success($results, 'Compiled results retrieved successfully');

        } catch (Exception $e) {
            error_log("getAllCompiledResults: Exception - " . $e->getMessage());
            error_log("getAllCompiledResults: Exception trace: " . $e->getTraceAsString());
            Response::serverError('Error retrieving compiled results');
        }
    }

    /**
     * Calculate Grade
     */
    private function calculateGrade($total, $is_creche = false)
    {
        if ($is_creche) {
            // CRECHE grading scale (0-200)
            if ($total >= 150)
                return 'A';
            if ($total >= 120)
                return 'B';
            if ($total >= 100)
                return 'C';
            if ($total >= 80)
                return 'D';
            if ($total >= 60)
                return 'E';
            return 'F';
        } else {
            // Standard grading scale (0-100)
            if ($total >= 80)
                return 'A';
            if ($total >= 70)
                return 'B';
            if ($total >= 60)
                return 'C';
            if ($total >= 50)
                return 'D';
            if ($total >= 40)
                return 'E';
            return 'F';
        }
    }

    /**
     * Get Remark
     */
    private function getRemark($grade, $is_creche = false)
    {
        if ($is_creche) {
            // CRECHE remarks
            $remarks = [
                'A' => 'Outstanding',
                'B' => 'Excellent',
                'C' => 'Very Good',
                'D' => 'Good',
                'E' => 'Fair',
                'F' => 'Fail'
            ];
        } else {
            // Standard remarks
            $remarks = [
                'A' => 'Excellent',
                'B' => 'Very Good',
                'C' => 'Good',
                'D' => 'Fair',
                'E' => 'Pass',
                'F' => 'Fail'
            ];
        }
        return $remarks[$grade] ?? 'N/A';
    }

    /**
     * Calculate Class Statistics
     */
    private function calculateClassStatistics($assignment_id, $new_score = null)
    {
        try {
            $query = "SELECT total FROM scores WHERE subject_assignment_id = :assignment_id";
            if ($new_score !== null) {
                // Include the new score in calculation
                $query .= " UNION ALL SELECT :new_score as total";
            }

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':assignment_id', $assignment_id);
            if ($new_score !== null) {
                $stmt->bindParam(':new_score', $new_score);
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

        try {
            // Get current school settings to ensure compliance
            $settings_query = "SELECT setting_value FROM school_settings WHERE setting_key IN ('current_term', 'current_academic_year')";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->execute();
            $settings = $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            // Validate that compilation uses current school settings
            if ($term !== $settings['current_term']) {
                $errors[] = "Compilation term ($term) does not match current school term ({$settings['current_term']})";
            }

            if ($academic_year !== $settings['current_academic_year']) {
                $errors[] = "Compilation academic year ($academic_year) does not match current school academic year ({$settings['current_academic_year']})";
            }
            // Check 1: All students have complete scores
            $score_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                 COUNT(DISTINCT sc.student_id) as students_with_scores,
                                 GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_scores
                                 FROM students s
                                 LEFT JOIN scores sc ON s.id = sc.student_id
                                 LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                                 WHERE s.class_id = :class_id AND s.status = 'Active' 
                                 AND sa.term = :term AND sa.academic_year = :academic_year
                                 GROUP BY s.id
                                 HAVING COUNT(sc.id) = 0";

            $score_stmt = $this->conn->prepare($score_check_query);
            $score_stmt->bindParam(':class_id', $class_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
            $score_stmt->execute();
            $students_without_scores = $score_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_scores) > 0) {
                $student_names = array_column($students_without_scores, 'students_without_scores');
                $errors[] = "Missing scores for students: " . implode(', ', $student_names);
            }

            // Check 2: All scores are submitted (not in Draft status)
            $submitted_check_query = "SELECT COUNT(*) as draft_count,
                                     GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name, ' - ', sub.name) ORDER BY s.last_name, s.first_name) as draft_details
                                     FROM scores sc
                                     JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                                     JOIN students s ON sc.student_id = s.id
                                     JOIN subjects sub ON sa.subject_id = sub.id
                                     WHERE sa.class_id = :class_id AND sa.term = :term AND sa.academic_year = :academic_year
                                     AND sc.status = :status";

            $submitted_stmt = $this->conn->prepare($submitted_check_query);
            $submitted_stmt->bindParam(':class_id', $class_id);
            $submitted_stmt->bindParam(':term', $term);
            $submitted_stmt->bindParam(':academic_year', $academic_year);
            $submitted_stmt->execute();
            $submitted_result = $submitted_stmt->fetch();

            if ($submitted_result['draft_count'] > 0) {
                $errors[] = "Draft scores found ({$submitted_result['draft_count']} records): " . $submitted_result['draft_details'];
            }

            // Check 3: Attendance data meets school requirements
            $attendance_setting_key = 'attendance_' . strtolower(str_replace(' ', '_', $term));
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key";
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            if ($required_days == 0) {
                $errors[] = "Attendance requirements not set for term: $term";
            } else {
                // Check attendance using the new attendance structure (single record per student)
                $attendance_check_query = "SELECT s.id, s.first_name, s.last_name,
                                          a.attended_days,
                                          a.required_days,
                                          a.attendance_rate
                                          FROM students s
                                          LEFT JOIN attendance a ON s.id = a.student_id
                                          WHERE s.class_id = :class_id AND s.status = 'Active'
                                          AND a.term = :term AND a.academic_year = :academic_year";

                $attendance_stmt = $this->conn->prepare($attendance_check_query);
                $attendance_stmt->bindParam(':class_id', $class_id);
                $attendance_stmt->bindParam(':term', $term);
                $attendance_stmt->bindParam(':academic_year', $academic_year);
                $attendance_stmt->execute();
                $attendance_records = $attendance_stmt->fetchAll(PDO::FETCH_ASSOC);

                $students_missing_attendance = [];
                $students_insufficient_attendance = [];

                foreach ($attendance_records as $record) {
                    if (!$record['attended_days'] || $record['attended_days'] === null) {
                        $students_missing_attendance[] = $record['first_name'] . ' ' . $record['last_name'];
                    } elseif ($record['attendance_rate'] < 75) { // Minimum 75% required
                        $students_insufficient_attendance[] = $record['first_name'] . ' ' . $record['last_name'] .
                            ' (' . $record['attendance_rate'] . '% - ' . $record['attended_days'] . '/' . $required_days . ' days)';
                    }
                }

                if (!empty($students_missing_attendance)) {
                    $errors[] = "Missing attendance records for students: " . implode(', ', $students_missing_attendance);
                }

                if (!empty($students_insufficient_attendance)) {
                    $errors[] = "Insufficient attendance (minimum 75% required): " . implode(', ', $students_insufficient_attendance);
                }
            }

            // Check 4: Affective domains are complete
            $affective_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                     COUNT(DISTINCT ad.student_id) as students_with_affective,
                                     GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_affective
                                     FROM students s
                                     LEFT JOIN affective_domains ad ON s.id = ad.student_id
                                     WHERE s.class_id = :class_id AND s.status = 'Active'
                                     AND ad.term = :term AND ad.academic_year = :academic_year
                                     GROUP BY s.id
                                     HAVING COUNT(ad.id) = 0";

            $affective_stmt = $this->conn->prepare($affective_check_query);
            $affective_stmt->bindParam(':class_id', $class_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
            $affective_stmt->execute();
            $students_without_affective = $affective_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_affective) > 0) {
                $student_names = array_column($students_without_affective, 'students_without_affective');
                $errors[] = "Missing affective domain assessments for students: " . implode(', ', $student_names);
            }

            // Check 5: Psychomotor domains are complete
            $psychomotor_check_query = "SELECT COUNT(DISTINCT s.id) as total_students,
                                       COUNT(DISTINCT pd.student_id) as students_with_psychomotor,
                                       GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name) ORDER BY s.last_name, s.first_name) as students_without_psychomotor
                                       FROM students s
                                       LEFT JOIN psychomotor_domains pd ON s.id = pd.student_id
                                       WHERE s.class_id = :class_id AND s.status = 'Active'
                                       AND pd.term = :term AND pd.academic_year = :academic_year
                                       GROUP BY s.id
                                       HAVING COUNT(pd.id) = 0";

            $psychomotor_stmt = $this->conn->prepare($psychomotor_check_query);
            $psychomotor_stmt->bindParam(':class_id', $class_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
            $psychomotor_stmt->execute();
            $students_without_psychomotor = $psychomotor_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($students_without_psychomotor) > 0) {
                $student_names = array_column($students_without_psychomotor, 'students_without_psychomotor');
                $errors[] = "Missing psychomotor domain assessments for students: " . implode(', ', $student_names);
            }

            // Check 6: Teacher comments are provided for each student
            $students_missing_comments = [];
            foreach ($student_results as $result) {
                if (!isset($result['class_teacher_comment']) || empty(trim($result['class_teacher_comment']))) {
                    $students_missing_comments[] = $result['student_id'];
                }
            }

            if (!empty($students_missing_comments)) {
                // Get student names for those missing comments
                $placeholders = str_repeat('?,', count($students_missing_comments) - 1) . '?';
                $comment_check_query = "SELECT first_name, last_name FROM students WHERE id IN ($placeholders)";
                $comment_stmt = $this->conn->prepare($comment_check_query);
                $comment_stmt->execute($students_missing_comments);
                $comment_students = $comment_stmt->fetchAll(PDO::FETCH_ASSOC);

                $student_names = array_map(function ($student) {
                    return $student['first_name'] . ' ' . $student['last_name'];
                }, $comment_students);

                $errors[] = "Teacher comments missing for students: " . implode(', ', $student_names);
            }

            // Check 7: Attendance summaries are calculated for all students
            $students_missing_attendance_summary = [];
            foreach ($student_results as $result) {
                $student_id = $result['student_id'];

                // Calculate attendance summary from daily records
                $attendance_summary_query = "SELECT 
                    SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as times_present,
                    SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as times_absent,
                    SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as times_late,
                    SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as times_excused
                    FROM attendance a
                    WHERE a.student_id = :student_id AND a.term = :term AND a.academic_year = :academic_year";

                $attendance_summary_stmt = $this->conn->prepare($attendance_summary_query);
                $attendance_summary_stmt->bindParam(':student_id', $student_id);
                $attendance_summary_stmt->bindParam(':term', $term);
                $attendance_summary_stmt->bindParam(':academic_year', $academic_year);
                $attendance_summary_stmt->execute();
                $attendance_summary = $attendance_summary_stmt->fetch();

                // Check if student has any attendance records
                $total_records = $attendance_summary['times_present'] + $attendance_summary['times_absent'] +
                    $attendance_summary['times_late'] + $attendance_summary['times_excused'];

                if ($total_records == 0) {
                    $students_missing_attendance_summary[] = $student_id;
                }
            }

            if (!empty($students_missing_attendance_summary)) {
                // Get student names for those missing attendance summaries
                $placeholders = str_repeat('?,', count($students_missing_attendance_summary) - 1) . '?';
                $attendance_check_query = "SELECT first_name, last_name FROM students WHERE id IN ($placeholders)";
                $attendance_stmt = $this->conn->prepare($attendance_check_query);
                $attendance_stmt->execute($students_missing_attendance_summary);
                $attendance_students = $attendance_stmt->fetchAll(PDO::FETCH_ASSOC);

                $student_names = array_map(function ($student) {
                    return $student['first_name'] . ' ' . $student['last_name'];
                }, $attendance_students);

                $errors[] = "No attendance records found for students: " . implode(', ', $student_names);
            }

        } catch (PDOException $e) {
            $errors[] = "Database error during validation";
        }

        return $errors;
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

            // Get student info and class
            $student_query = "SELECT s.id, s.first_name, s.last_name, s.class_id, c.name as class_name
                             FROM students s
                             JOIN classes c ON s.class_id = c.id
                             WHERE s.id = :student_id AND s.status = 'Active'";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->execute();
            $student = $student_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                Response::notFound('Student not found');
            }

            // Verify teacher has access to this class
            $teacher_check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id";
            $teacher_check_stmt = $this->conn->prepare($teacher_check_query);
            $teacher_check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $teacher_check_stmt->bindParam(':class_id', $student['class_id']);
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
                           JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                           WHERE sc.student_id = :student_id AND sa.term = :term AND sa.academic_year = :academic_year";
            $score_stmt = $this->conn->prepare($score_query);
            $score_stmt->bindParam(':student_id', $student_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
            $score_stmt->execute();
            $score_result = $score_stmt->fetch();

            // Get total subjects for this class
            $total_subjects_query = "SELECT COUNT(DISTINCT subject_id) as total_subjects
                                   FROM subject_assignments 
                                   WHERE class_id = :class_id AND term = :term AND academic_year = :academic_year";
            $total_subjects_stmt = $this->conn->prepare($total_subjects_query);
            $total_subjects_stmt->bindParam(':class_id', $student['class_id']);
            $total_subjects_stmt->bindParam(':term', $term);
            $total_subjects_stmt->bindParam(':academic_year', $academic_year);
            $total_subjects_stmt->execute();
            $total_subjects = $total_subjects_stmt->fetch()['total_subjects'];

            $status['scores']['completed'] = $score_result['subject_count'] >= $total_subjects;
            $status['scores']['subjects_completed'] = (int) $score_result['subject_count'];
            $status['scores']['subjects_required'] = (int) $total_subjects;

            // Check attendance for this student
            $attendance_setting_key = 'attendance_' . strtolower(str_replace(' ', '_', $term));
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key";
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            $attendance_query = "SELECT COUNT(*) as days_present
                               FROM attendance 
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $attendance_stmt = $this->conn->prepare($attendance_query);
            $attendance_stmt->bindParam(':student_id', $student_id);
            $attendance_stmt->bindParam(':term', $term);
            $attendance_stmt->bindParam(':academic_year', $academic_year);
            $attendance_stmt->execute();
            $attendance_result = $attendance_stmt->fetch();

            $status['attendance']['completed'] = $attendance_result['days_present'] >= $required_days;
            $status['attendance']['days_present'] = (int) $attendance_result['days_present'];
            $status['attendance']['days_required'] = (int) $required_days;

            // Check affective domains for this student
            $affective_query = "SELECT attentiveness, honesty, neatness, obedience, sense_of_responsibility
                               FROM affective_domains 
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $affective_stmt = $this->conn->prepare($affective_query);
            $affective_stmt->bindParam(':student_id', $student_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
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
                                 WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $psychomotor_stmt = $this->conn->prepare($psychomotor_query);
            $psychomotor_stmt->bindParam(':student_id', $student_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
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
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $comments_stmt = $this->conn->prepare($comments_query);
            $comments_stmt->bindParam(':student_id', $student_id);
            $comments_stmt->bindParam(':term', $term);
            $comments_stmt->bindParam(':academic_year', $academic_year);
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

            // Verify teacher is class teacher for this class
            $check_query = "SELECT COUNT(*) as count FROM classes WHERE id = :class_id AND class_teacher_id = :teacher_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->execute();

            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Only class teachers can check compilation status');
            }

            // Get all students for this class
            $students_query = "SELECT id, first_name, last_name, admission_number 
                             FROM students 
                             WHERE class_id = :class_id AND status = 'Active'";
            $students_stmt = $this->conn->prepare($students_query);
            $students_stmt->bindParam(':class_id', $class_id);
            $students_stmt->execute();
            $students = $students_stmt->fetchAll(PDO::FETCH_ASSOC);

            $student_results = [];
            foreach ($students as $student) {
                $student_results[] = ['student_id' => $student['id']];
            }

            // Run comprehensive validation
            $validation_errors = $this->validateCompilationRequirements($class_id, $term, $academic_year, $student_results);

            // Check detailed component status
            $status = $this->getDetailedCompilationStatus($class_id, $term, $academic_year, $students);

            $response = [
                'can_compile' => empty($validation_errors),
                'validation_errors' => $validation_errors,
                'status' => $status,
                'message' => empty($validation_errors) ? 'All requirements completed. Ready to compile results.' : 'Some requirements are still missing.'
            ];

            Response::success($response, 'Compilation status checked successfully');

        } catch (PDOException $e) {
            Response::serverError('Database error checking compilation status');
        }
    }

    /**
     * Get Detailed Compilation Status
     */
    private function getDetailedCompilationStatus($class_id, $term, $academic_year, $students)
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
                                 LEFT JOIN scores sc ON s.id = sc.student_id
                                 LEFT JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                                 WHERE s.class_id = :class_id AND s.status = 'Active' 
                                 AND sa.term = :term AND sa.academic_year = :academic_year
                                 GROUP BY s.id";

            $score_stmt = $this->conn->prepare($score_check_query);
            $score_stmt->bindParam(':class_id', $class_id);
            $score_stmt->bindParam(':term', $term);
            $score_stmt->bindParam(':academic_year', $academic_year);
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
            $required_days_query = "SELECT setting_value FROM school_settings WHERE setting_key = :setting_key";
            $required_days_stmt = $this->conn->prepare($required_days_query);
            $required_days_stmt->bindParam(':setting_key', $attendance_setting_key);
            $required_days_stmt->execute();
            $required_days = $required_days_stmt->fetchColumn() ?: 0;

            $attendance_check_query = "SELECT s.id, s.first_name, s.last_name,
                                      COUNT(a.id) as attendance_days
                                      FROM students s
                                      LEFT JOIN attendance a ON s.id = a.student_id
                                      WHERE s.class_id = :class_id AND s.status = 'Active'
                                      AND a.term = :term AND a.academic_year = :academic_year
                                      GROUP BY s.id";

            $attendance_stmt = $this->conn->prepare($attendance_check_query);
            $attendance_stmt->bindParam(':class_id', $class_id);
            $attendance_stmt->bindParam(':term', $term);
            $attendance_stmt->bindParam(':academic_year', $academic_year);
            $attendance_stmt->execute();
            $attendance_results = $attendance_stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($attendance_results as $result) {
                if ($result['attendance_days'] < $required_days) {
                    $status['attendance']['completed'] = false;
                    $status['attendance']['missing_students'][] = $result['first_name'] . ' ' . $result['last_name'] .
                        ' (' . $result['attendance_days'] . '/' . $required_days . ' days)';
                }
            }

            // Check affective domains
            $affective_check_query = "SELECT s.id, s.first_name, s.last_name,
                                       COUNT(ad.id) as affective_count
                                       FROM students s
                                       LEFT JOIN affective_domains ad ON s.id = ad.student_id
                                       WHERE s.class_id = :class_id AND s.status = 'Active'
                                       AND ad.term = :term AND ad.academic_year = :academic_year
                                       GROUP BY s.id";

            $affective_stmt = $this->conn->prepare($affective_check_query);
            $affective_stmt->bindParam(':class_id', $class_id);
            $affective_stmt->bindParam(':term', $term);
            $affective_stmt->bindParam(':academic_year', $academic_year);
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
                                         LEFT JOIN psychomotor_domains pd ON s.id = pd.student_id
                                         WHERE s.class_id = :class_id AND s.status = 'Active'
                                         AND pd.term = :term AND pd.academic_year = :academic_year
                                         GROUP BY s.id";

            $psychomotor_stmt = $this->conn->prepare($psychomotor_check_query);
            $psychomotor_stmt->bindParam(':class_id', $class_id);
            $psychomotor_stmt->bindParam(':term', $term);
            $psychomotor_stmt->bindParam(':academic_year', $academic_year);
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
                                          LEFT JOIN compiled_results cr ON s.id = cr.student_id
                                          WHERE s.class_id = :class_id AND s.status = 'Active'
                                          AND cr.term = :term AND cr.academic_year = :academic_year";

            $compiled_stmt = $this->conn->prepare($compiled_check_query);
            $compiled_stmt->bindParam(':class_id', $class_id);
            $compiled_stmt->bindParam(':term', $term);
            $compiled_stmt->bindParam(':academic_year', $academic_year);
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
    private function getAssignmentTerm($assignment_id)
    {
        $query = "SELECT term FROM subject_assignments WHERE id = :assignment_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':assignment_id', $assignment_id);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result ? $result['term'] : 'First Term';
    }

    /**
     * Get Assignment Academic Year
     */
    private function getAssignmentAcademicYear($assignment_id)
    {
        $query = "SELECT academic_year FROM subject_assignments WHERE id = :assignment_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':assignment_id', $assignment_id);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result ? $result['academic_year'] : '2025/2026';
    }
}
?>
