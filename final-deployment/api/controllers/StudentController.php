<?php
/**
 * Student Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';

class StudentController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Students (with pagination and filtering)
     */
    public function getAllStudents() {
        $token_data = Middleware::requireAuth();
        // Clean output buffer to prevent HTML contamination
        if (ob_get_length()) ob_clean();
        
        try {
            // Build base query
            $query = "SELECT s.*, c.name as class_name, c.level, 
                             CONCAT(p.first_name, ' ', p.last_name) as parent_name,
                             p.email as parent_email, p.phone as parent_phone
                      FROM students s
                      LEFT JOIN classes c ON s.class_id = c.id
                      LEFT JOIN parent_student_links psl ON s.id = psl.student_id 
                      LEFT JOIN parents p ON psl.parent_id = p.id
                      WHERE 1=1";

            $params = [];

            // Role-based conditions
            if (($token_data['role'] ?? null) === 'parent') {
                $parent_id = $token_data['linked_id'] ?? null;
                if (empty($parent_id)) {
                    Response::forbidden('Parent account not properly linked');
                }
                $query .= " AND s.id IN (SELECT student_id FROM parent_student_links WHERE parent_id = :parent_id)";
                $params[':parent_id'] = (int)$parent_id;
            } elseif (($token_data['role'] ?? null) === 'teacher') {
                $teacher_id = $token_data['linked_id'] ?? null;
                if (empty($teacher_id)) {
                    Response::forbidden('Teacher account not properly linked');
                }
                // Teachers can see students for classes they teach (via subject assignments)
                $query .= " AND s.class_id IN (SELECT class_id FROM subject_assignments WHERE teacher_id = :teacher_id)";
                $params[':teacher_id'] = (int)$teacher_id;
            } elseif (($token_data['role'] ?? null) === 'accountant' || ($token_data['role'] ?? null) === 'admin') {
                // Full access
            } else {
                Response::forbidden('Access denied');
            }

            $query .= " ORDER BY c.name, s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            $students = $stmt->fetchAll();
            
            // Map snake_case database fields to camelCase for frontend
            $mappedStudents = array_map(function($student) {
                return [
                    'id' => $student['id'],
                    'firstName' => $student['first_name'],
                    'lastName' => $student['last_name'],
                    'otherName' => $student['other_name'],
                    'admissionNumber' => $student['admission_number'],
                    'class_id' => $student['class_id'],
                    'level' => $student['level'],
                    'parent_id' => $student['parent_id'],
                    'date_of_birth' => $student['date_of_birth'],
                    'gender' => $student['gender'],
                    'photo_url' => $student['photo_url'],
                    'passport_photo' => $student['passport_photo'],
                    'status' => $student['status'],
                    'academic_year' => $student['academic_year'],
                    'admission_date' => $student['admission_date'],
                    'createdAt' => $student['created_at'],
                    'updatedAt' => $student['updated_at'],
                    'className' => $student['class_name'],
                    'parentName' => $student['parent_name'],
                    'parentEmail' => $student['parent_email'],
                    'parentPhone' => $student['parent_phone']
                ];
            }, $students);
            
            // Return all students without pagination
            Response::success($mappedStudents, 'All students retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getAllStudents: " . $e->getMessage());
            Response::serverError('Database error retrieving students');
        } catch (Exception $e) {
            error_log("General error in getAllStudents: " . $e->getMessage());
            Response::serverError('Error retrieving students');
        }
    }
    
    /**
     * Get Student by ID
     */
    public function getStudentById($id) {
        $token_data = Middleware::requireAuth();
        $student_id = Middleware::validateInteger($id, 'student_id');
        
        try {
            // Build query with role-based access control
            $query = "SELECT s.*, c.name as class_name, c.level, c.capacity,
                             CONCAT(p.first_name, ' ', p.last_name) as parent_name,
                             p.email as parent_email, p.phone as parent_phone, p.address as parent_address,
                             sfb.balance as fee_balance, sfb.status as fee_status
                      FROM students s
                      LEFT JOIN classes c ON s.class_id = c.id
                      LEFT JOIN parent_student_links psl ON s.id = psl.student_id 
                      LEFT JOIN parents p ON psl.parent_id = p.id
                      LEFT JOIN student_fee_balances sfb ON s.id = sfb.student_id 
                        AND sfb.term = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_term')
                        AND sfb.academic_year = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_academic_year')
                      WHERE s.id = :id";
            
            // Add role-based conditions
            if ($token_data['role'] === 'parent') {
                $query .= " AND s.id IN (SELECT student_id FROM parent_student_links WHERE parent_id = :parent_id)";
            } elseif ($token_data['role'] === 'teacher') {
                $query .= " AND s.class_id IN (SELECT class_id FROM subject_assignments WHERE teacher_id = :teacher_id)";
            }
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $student_id);
            
            if ($token_data['role'] === 'parent') {
                $stmt->bindParam(':parent_id', $token_data['linked_id']);
            } elseif ($token_data['role'] === 'teacher') {
                $stmt->bindParam(':teacher_id', $token_data['linked_id']);
            }
            
            $stmt->execute();
            $student = $stmt->fetch();
            
            if (!$student) {
                Response::notFound('Student not found or access denied');
            }
            
            // Get additional data for admin
            if ($token_data['role'] === 'admin') {
                $student['attendance_summary'] = $this->getStudentAttendanceSummary($student_id);
                $student['recent_scores'] = $this->getStudentRecentScores($student_id);
                $student['payment_history'] = $this->getStudentPaymentHistory($student_id);
            }
            
            // Map snake_case database fields to camelCase for frontend
            $mappedStudent = [
                'id' => $student['id'],
                'firstName' => $student['first_name'],
                'lastName' => $student['last_name'],
                'otherName' => $student['other_name'],
                'admissionNumber' => $student['admission_number'],
                'classId' => $student['class_id'],
                'level' => $student['level'],
                'parentId' => $student['parent_id'],
                'dateOfBirth' => $student['date_of_birth'],
                'gender' => $student['gender'],
                'photoUrl' => $student['photo_url'],
                'passportPhoto' => $student['passport_photo'],
                'status' => $student['status'],
                'academicYear' => $student['academic_year'],
                'admissionDate' => $student['admission_date'],
                'createdAt' => $student['created_at'],
                'updatedAt' => $student['updated_at'],
                'className' => $student['class_name'],
                'parentName' => $student['parent_name'],
                'parentEmail' => $student['parent_email'],
                'parentPhone' => $student['parent_phone'],
                'parentAddress' => $student['parent_address'],
                'feeBalance' => $student['fee_balance'],
                'feeStatus' => $student['fee_status']
            ];
            
            // Add admin-only data if applicable
            if ($token_data['role'] === 'admin') {
                $mappedStudent['attendanceSummary'] = $student['attendance_summary'];
                $mappedStudent['recentScores'] = $student['recent_scores'];
                $mappedStudent['paymentHistory'] = $student['payment_history'];
            }
            
            Response::success($mappedStudent, 'Student retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving student');
        }
    }
    
    /**
     * Create New Student
     */
    public function createStudent() {
        Middleware::requireRole('admin');
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['first_name', 'last_name', 'class_id', 'date_of_birth', 'gender']);
        
        try {
            // Check if admission number already exists
            if (!empty($data['admission_number'])) {
                $check_query = "SELECT id FROM students WHERE admission_number = :admission_number";
                $check_stmt = $this->conn->prepare($check_query);
                $admission_number = Middleware::sanitizeString($data['admission_number']);
                $check_stmt->bindParam(':admission_number', $admission_number);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()) {
                    Response::conflict('Admission number already exists');
                }
            } else {
                // Generate admission number
                $year = date('Y');
                $sequence_query = "SELECT COUNT(*) as count FROM students WHERE YEAR(created_at) = :year";
                $sequence_stmt = $this->conn->prepare($sequence_query);
                $sequence_stmt->bindParam(':year', $year);
                $sequence_stmt->execute();
                $count = $sequence_stmt->fetch()['count'] + 1;
                $admission_number = 'GRA/' . $year . '/' . str_pad($count, 4, '0', STR_PAD_LEFT);
            }
            
            // Validate and prepare data
            $first_name = Middleware::sanitizeString($data['first_name']);
            $last_name = Middleware::sanitizeString($data['last_name']);
            $other_name = isset($data['other_name']) ? Middleware::sanitizeString($data['other_name']) : null;
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $date_of_birth = Middleware::validateDate($data['date_of_birth']);
            $gender = Middleware::validateEnum($data['gender'], ['Male', 'Female'], 'gender');
            $parent_id = isset($data['parent_id']) ? Middleware::validateInteger($data['parent_id'], 'parent_id') : null;
            $academic_year = isset($data['academic_year']) ? Middleware::sanitizeString($data['academic_year']) : '2024/2025';
            $admission_date = isset($data['admission_date']) ? Middleware::validateDate($data['admission_date']) : date('Y-m-d');
            
            // Get class info
            $class_query = "SELECT name, level FROM classes WHERE id = :class_id";
            $class_stmt = $this->conn->prepare($class_query);
            $class_stmt->bindParam(':class_id', $class_id);
            $class_stmt->execute();
            $class_info = $class_stmt->fetch();
            
            if (!$class_info) {
                Response::badRequest('Invalid class selected');
            }
            
            // Insert student
            $query = "INSERT INTO students (first_name, last_name, other_name, admission_number, class_id, level, 
                                           parent_id, date_of_birth, gender, academic_year, admission_date, status)
                      VALUES (:first_name, :last_name, :other_name, :admission_number, :class_id, :level,
                              :parent_id, :date_of_birth, :gender, :academic_year, :admission_date, 'Active')";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':first_name', $first_name);
            $stmt->bindParam(':last_name', $last_name);
            $stmt->bindParam(':other_name', $other_name);
            $stmt->bindParam(':admission_number', $admission_number);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':level', $class_info['level']);
            $stmt->bindParam(':parent_id', $parent_id);
            $stmt->bindParam(':date_of_birth', $date_of_birth);
            $stmt->bindParam(':gender', $gender);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':admission_date', $admission_date);
            
            $stmt->execute();
            $student_id = $this->conn->lastInsertId();
            
            // Link with parent if provided
            if ($parent_id) {
                $link_query = "INSERT INTO parent_student_links (parent_id, student_id, relationship, is_primary) 
                               VALUES (:parent_id, :student_id, 'Guardian', TRUE)";
                $link_stmt = $this->conn->prepare($link_query);
                $link_stmt->bindParam(':parent_id', $parent_id);
                $link_stmt->bindParam(':student_id', $student_id);
                $link_stmt->execute();
            }
            
            // Initialize fee balance
            $this->initializeStudentFeeBalance($student_id, $class_id, $academic_year);
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_STUDENT',
                "Student: $first_name $last_name ($admission_number)",
                'Success',
                "New student admitted to class {$class_info['name']}",
                $_SESSION['user_id'] ?? null
            );
            
            RealtimeEvents::publish(['students', 'classes'], [
                'action' => 'created',
                'student_id' => (int)$student_id,
                'class_id' => (int)$class_id,
            ]);

            Response::created(['id' => $student_id, 'admission_number' => $admission_number], 'Student created successfully');
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                Response::conflict('Duplicate entry detected');
            }
            Response::serverError('Database error creating student');
        }
    }
    
    /**
     * Update Student
     */
    public function updateStudent($id) {
        Middleware::requireRole('admin');
        
        $student_id = Middleware::validateInteger($id, 'student_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if student exists
            $check_query = "SELECT * FROM students WHERE id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $student_id);
            $check_stmt->execute();
            
            $existing_student = $check_stmt->fetch();
            if (!$existing_student) {
                Response::notFound('Student not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $student_id];
            
            $allowed_fields = ['first_name', 'last_name', 'other_name', 'admission_number', 'class_id', 'parent_id', 'date_of_birth', 'gender', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    $update_fields[] = "$field = :$field";
                    
                    if ($field === 'class_id') {
                        $params[':' . $field] = Middleware::validateInteger($data[$field], $field);
                    } elseif ($field === 'date_of_birth') {
                        $params[':' . $field] = Middleware::validateDate($data[$field]);
                    } elseif ($field === 'gender') {
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Male', 'Female'], $field);
                    } elseif ($field === 'status') {
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Active', 'Inactive', 'Graduated', 'Transferred'], $field);
                    } else {
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            // Update level if class is changed
            if (isset($data['class_id'])) {
                $class_query = "SELECT level FROM classes WHERE id = :class_id";
                $class_stmt = $this->conn->prepare($class_query);
                $class_stmt->bindParam(':class_id', $params[':class_id']);
                $class_stmt->execute();
                $class_info = $class_stmt->fetch();
                
                if ($class_info) {
                    $update_fields[] = "level = :level";
                    $params[':level'] = $class_info['level'];
                }
            }
            
            $query = "UPDATE students SET " . implode(', ', $update_fields) . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'UPDATE_STUDENT',
                "Student ID: $student_id",
                'Success',
                'Student information updated',
                $_SESSION['user_id'] ?? null
            );
            
            // Emit realtime update. Include class_id when present so listeners can refresh class views.
            $topicPayload = [
                'action' => 'updated',
                'student_id' => (int)$student_id,
            ];
            if (isset($data['class_id'])) {
                $topicPayload['class_id'] = (int)$params[':class_id'];
            }
            RealtimeEvents::publish(['students', 'classes'], $topicPayload);

            Response::success(null, 'Student updated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating student');
        }
    }
    
    /**
     * Delete Student
     */
    public function deleteStudent($id) {
        Middleware::requireRole('admin');
        
        $student_id = Middleware::validateInteger($id, 'student_id');
        
        try {
            // Check if student exists
            $check_query = "SELECT first_name, last_name, admission_number FROM students WHERE id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $student_id);
            $check_stmt->execute();
            
            $student = $check_stmt->fetch();
            if (!$student) {
                Response::notFound('Student not found');
            }
            
            // Delete student (cascade will handle related records)
            $query = "DELETE FROM students WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $student_id);
            $stmt->execute();

            RealtimeEvents::publish(['students', 'classes', 'payments', 'compiled_results', 'scores'], [
                'action' => 'deleted',
                'student_id' => (int)$student_id,
            ]);
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_STUDENT',
                "Student: {$student['first_name']} {$student['last_name']} ({$student['admission_number']})",
                'Success',
                'Student record deleted',
                $_SESSION['user_id'] ?? null
            );
            
            Response::success(null, 'Student deleted successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error deleting student');
        }
    }
    
    /**
     * Get Students by Class
     */
    public function getStudentsByClass($class_id) {
        $token_data = Middleware::requireAuth();
        $class_id = Middleware::validateInteger($class_id, 'class_id');
        
        try {
            // Check access permissions
            if ($token_data['role'] === 'teacher') {
                // Verify teacher has access to this class
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this class');
                }
            }
            
            $query = "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender, s.status,
                             s.date_of_birth, s.photo_url,
                             CONCAT(p.first_name, ' ', p.last_name) as parent_name,
                             p.phone as parent_phone
                      FROM students s
                      LEFT JOIN parent_student_links psl ON s.id = psl.student_id AND psl.is_primary = TRUE
                      LEFT JOIN parents p ON psl.parent_id = p.id
                      WHERE s.class_id = :class_id AND s.status = 'Active'
                      ORDER BY s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->execute();
            
            $students = $stmt->fetchAll();
            
            Response::success($students, 'Students retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class students');
        }
    }
    
    /**
     * Promote Students
     */
    public function promoteStudents() {
        $token_data = Middleware::requireRole('admin');
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['promotions', 'to_academic_year']);
        
        try {
            // Promotion is only allowed at the end of the session (Third Term).
            // This is enforced server-side to guarantee correctness.
            try {
                $term_stmt = $this->conn->prepare("SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' LIMIT 1");
                $term_stmt->execute();
                $term_row = $term_stmt->fetch(PDO::FETCH_ASSOC);
                $current_term = $term_row ? ($term_row['setting_value'] ?? '') : '';
                if (trim((string)$current_term) !== 'Third Term') {
                    Response::error('Promotion can only be performed in Third Term');
                    return;
                }
            } catch (Throwable $e) {
                // If settings are unavailable, fail closed.
                Response::serverError('Unable to verify current term for promotion');
                return;
            }

            $promotions = $data['promotions'];
            $to_academic_year = Middleware::sanitizeString($data['to_academic_year']);
            $promotion_date = date('Y-m-d');

            // Validate batch size (max 50 students per call)
            if (count($promotions) > 50) {
                Response::error('Maximum 50 students can be processed per call');
                return;
            }

            // Load progression controller for validation
            require_once __DIR__ . '/ProgressionController.php';
            $database = new Database();
            $progressionController = new ProgressionController($database);

            $this->conn->beginTransaction();
            $processed_students = [];
            $failed_students = [];
        
            foreach ($promotions as $index => $promotion) {
                try {
                    $student_id = Middleware::validateInteger($promotion['student_id'], 'student_id');
                    $from_class_id = Middleware::validateInteger($promotion['from_class_id'], 'from_class_id');
                    $to_class_id = Middleware::validateInteger($promotion['to_class_id'], 'to_class_id');
                    $status = Middleware::validateEnum($promotion['status'], ['Promoted', 'Repeated', 'Transferred', 'On Hold', 'Withdrawn', 'Pending Approval', 'Conditional', 'Manual'], 'status');
                    
                    // Get current academic year
                    $from_academic_year = $promotion['from_academic_year'] ?? '2024/2025';

                    // Authoritative automatic promotion calculation (session-based).
                    // - Uses compiled_results for First/Second/Third Term in the FROM academic year.
                    // - Session average = mean of available term averages (divide by 2 if only 2 terms exist).
                    // - Session attendance = sum(times_present)/sum(total_attendance_days) * 100.
                    // - Student is Promoted if avg >= 50 AND attendance >= 50.
                    // Admin override rules:
                    // - If status is Manual, trust the admin.
                    // - If override_reason is provided, trust the admin-supplied status.
                    $override_reason_in = isset($promotion['override_reason']) ? trim((string)$promotion['override_reason']) : '';
                    $has_override = ($status === 'Manual') || ($override_reason_in !== '');

                    if (!$has_override) {
                        $terms = ['First Term', 'Second Term', 'Third Term'];
                        $cr_query = "SELECT term, average_score, times_present, total_attendance_days
                                     FROM compiled_results
                                     WHERE student_id = :student_id
                                       AND academic_year = :academic_year
                                       AND status = 'Approved'
                                       AND term IN ('First Term','Second Term','Third Term')";
                        $cr_stmt = $this->conn->prepare($cr_query);
                        $cr_stmt->bindParam(':student_id', $student_id);
                        $cr_stmt->bindParam(':academic_year', $from_academic_year);
                        $cr_stmt->execute();
                        $rows = $cr_stmt->fetchAll(PDO::FETCH_ASSOC);

                        $term_avgs = [];
                        $total_present = 0;
                        $total_days = 0;
                        foreach ($rows as $row) {
                            $avg = isset($row['average_score']) ? (float)$row['average_score'] : 0.0;
                            $term_avgs[] = $avg;
                            $total_present += (int)($row['times_present'] ?? 0);
                            $total_days += (int)($row['total_attendance_days'] ?? 0);
                        }

                        $term_count = count($term_avgs);
                        $session_avg = $term_count > 0 ? (array_sum($term_avgs) / $term_count) : 0.0;
                        $session_att = $total_days > 0 ? (($total_present / $total_days) * 100.0) : 0.0;

                        $status = ($session_avg >= 50.0 && $session_att >= 50.0) ? 'Promoted' : 'Repeated';
                    }

                    // Validate progression path ONLY for real promotions.
                    // - Manual: admin override (skip)
                    // - Repeated: can be same class or a demotion class (skip progression rule check here)
                    // Capacity is NOT enforced.
                    if ($status === 'Promoted') {
                        $validation = $progressionController->validatePromotion($student_id, $to_class_id, $to_academic_year);
                        if (!$validation['valid']) {
                            $failed_students[] = [
                                'student_id' => $student_id,
                                'error' => $validation['message']
                            ];
                            continue;
                        }
                    }

                    // Update student class/year for statuses that involve a class placement decision.
                    // - Promoted: move to next class
                    // - Manual: admin decides
                    // - Repeated: can stay in same class or move to a different class (demotion)
                    if (in_array($status, ['Promoted', 'Manual', 'Repeated'], true)) {
                        // Find current class_id in DB to keep class counts accurate even if payload is stale
                        $current_class_query = "SELECT class_id FROM students WHERE id = :student_id";
                        $current_class_stmt = $this->conn->prepare($current_class_query);
                        $current_class_stmt->bindParam(':student_id', $student_id);
                        $current_class_stmt->execute();
                        $current_student = $current_class_stmt->fetch(PDO::FETCH_ASSOC);
                        $actual_from_class_id = $current_student ? (int)$current_student['class_id'] : $from_class_id;

                        $update_query = "UPDATE students SET class_id = :to_class_id, academic_year = :to_academic_year WHERE id = :student_id";
                        $update_stmt = $this->conn->prepare($update_query);
                        $update_stmt->bindParam(':to_class_id', $to_class_id);
                        $update_stmt->bindParam(':to_academic_year', $to_academic_year);
                        $update_stmt->bindParam(':student_id', $student_id);
                        $update_stmt->execute();
                        
                        // Update level based on new class
                        $class_query = "SELECT level FROM classes WHERE id = :class_id";
                        $class_stmt = $this->conn->prepare($class_query);
                        $class_stmt->bindParam(':class_id', $to_class_id);
                        $class_stmt->execute();
                        $class_info = $class_stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($class_info) {
                            $level_update_query = "UPDATE students SET level = :level WHERE id = :student_id";
                            $level_update_stmt = $this->conn->prepare($level_update_query);
                            $level_update_stmt->bindParam(':level', $class_info['level']);
                            $level_update_stmt->bindParam(':student_id', $student_id);
                            $level_update_stmt->execute();
                        }
                        
                        // Update class counts only if class actually changed
                        if ($actual_from_class_id !== (int)$to_class_id) {
                            $this->updateClassCounts($actual_from_class_id, $to_class_id);
                        }
                    }
                
                // Record promotion with enhanced fields
                $promotion_query = "INSERT INTO student_promotions (student_id, from_class_id, to_class_id, 
                                    from_academic_year, to_academic_year, promotion_status, promoted_by, promotion_date,
                                    manual_override, override_reason)
                                    VALUES (:student_id, :from_class_id, :to_class_id, :from_academic_year, 
                                           :to_academic_year, :status, :promoted_by, :promotion_date, :manual_override, :override_reason)";
                
                $promotion_stmt = $this->conn->prepare($promotion_query);
                $promotion_stmt->bindParam(':student_id', $student_id);
                $promotion_stmt->bindParam(':from_class_id', $from_class_id);
                $promotion_stmt->bindParam(':to_class_id', $to_class_id);
                $promotion_stmt->bindParam(':from_academic_year', $from_academic_year);
                $promotion_stmt->bindParam(':to_academic_year', $to_academic_year);
                $promotion_stmt->bindParam(':status', $status);
                $promoted_by = (int)($token_data['user_id'] ?? 0);
                $promotion_stmt->bindParam(':promoted_by', $promoted_by);
                $promotion_stmt->bindParam(':promotion_date', $promotion_date);
                $manual_override = ($status === 'Manual') ? 1 : 0;
                $promotion_stmt->bindParam(':manual_override', $manual_override);
                $override_reason = $promotion['override_reason'] ?? null;
                $promotion_stmt->bindParam(':override_reason', $override_reason);
                $promotion_stmt->execute();
                
                $processed_students[] = $student_id;
                
            } catch (Exception $e) {
                $failed_students[] = [
                    'student_id' => $promotion['student_id'] ?? 'unknown',
                    'error' => $e->getMessage()
                ];
            }
            }
            
            $this->conn->commit();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'] ?? 'Admin',
                'Admin',
                'PROMOTE_STUDENTS',
                'Batch Promotion',
                'Success',
                count($processed_students) . ' students processed for promotion',
                $token_data['user_id'] ?? null
            );
            
            // Return detailed response
            Response::success([
                'processed_students' => count($processed_students),
                'failed_students' => count($failed_students),
                'failed_details' => $failed_students,
                'total_attempted' => count($promotions)
            ], 'Promotion processing completed');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error during student promotion');
        }
    }
    
    /**
     * Update class counts after promotion
     */
    private function updateClassCounts($fromClassId, $toClassId) {
        try {
            // Decrement from class
            $decrement_query = "UPDATE classes SET current_students = current_students - 1 WHERE id = :from_class_id AND current_students > 0";
            $decrement_stmt = $this->conn->prepare($decrement_query);
            $decrement_stmt->bindParam(':from_class_id', $fromClassId);
            $decrement_stmt->execute();
            
            // Increment to class
            $increment_query = "UPDATE classes SET current_students = current_students + 1 WHERE id = :to_class_id";
            $increment_stmt = $this->conn->prepare($increment_query);
            $increment_stmt->bindParam(':to_class_id', $toClassId);
            $increment_stmt->execute();
            
        } catch (PDOException $e) {
            // Log error but don't fail the promotion
            error_log("Error updating class counts: " . $e->getMessage());
        }
    }
    
    /**
     * Manual Class Change (Admin can change student class anytime)
     */
    public function manualClassChange() {
        $token_data = Middleware::requireRole('admin');
        
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['student_id', 'from_class_id', 'to_class_id', 'reason']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $from_class_id = Middleware::validateInteger($data['from_class_id'], 'from_class_id');
            $to_class_id = Middleware::validateInteger($data['to_class_id'], 'to_class_id');
            $reason = Middleware::sanitizeString($data['reason']);
            $academic_year = $data['academic_year'] ?? '2024/2025';
            
            $this->conn->beginTransaction();
            
            // Update student class
            $update_query = "UPDATE students SET class_id = :to_class_id WHERE id = :student_id";
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':to_class_id', $to_class_id);
            $update_stmt->bindParam(':student_id', $student_id);
            $update_stmt->execute();
            
            // Update student level
            $class_query = "SELECT level FROM classes WHERE id = :class_id";
            $class_stmt = $this->conn->prepare($class_query);
            $class_stmt->bindParam(':class_id', $to_class_id);
            $class_stmt->execute();
            $class_info = $class_stmt->fetch();
            
            if ($class_info) {
                $level_update_query = "UPDATE students SET level = :level WHERE id = :student_id";
                $level_update_stmt = $this->conn->prepare($level_update_query);
                $level_update_stmt->bindParam(':level', $class_info['level']);
                $level_update_stmt->bindParam(':student_id', $student_id);
                $level_update_stmt->execute();
            }
            
            // Record manual change
            $change_query = "INSERT INTO manual_class_changes 
                           (student_id, from_class_id, to_class_id, academic_year, reason, changed_by, change_date) 
                           VALUES (:student_id, :from_class_id, :to_class_id, :academic_year, :reason, :changed_by, :change_date)";
            
            $change_stmt = $this->conn->prepare($change_query);
            $change_stmt->bindParam(':student_id', $student_id);
            $change_stmt->bindParam(':from_class_id', $from_class_id);
            $change_stmt->bindParam(':to_class_id', $to_class_id);
            $change_stmt->bindParam(':academic_year', $academic_year);
            $change_stmt->bindParam(':reason', $reason);
            $changed_by = (int)($token_data['user_id'] ?? 0);
            $change_stmt->bindParam(':changed_by', $changed_by);
            $change_date = date('Y-m-d H:i:s');
            $change_stmt->bindParam(':change_date', $change_date);
            $change_stmt->execute();
            
            // Update class counts
            $this->updateClassCounts($from_class_id, $to_class_id);
            
            $this->conn->commit();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'] ?? 'Admin',
                'Admin',
                'MANUAL_CLASS_CHANGE',
                "Student ID: {$student_id} moved from class {$from_class_id} to {$to_class_id}",
                'Success',
                "Reason: {$reason}",
                $token_data['user_id'] ?? null
            );
            
            Response::success(null, 'Manual class change completed successfully');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error during manual class change');
        }
    }
    
    /**
     * Get Promotion History
     */
    public function getPromotionHistory() {
        Middleware::requireRole('admin');
        
        try {
            $query = "SELECT sp.*, 
                     s.first_name, s.last_name, s.admission_number,
                     c_from.name as from_class_name, c_to.name as to_class_name,
                     u.username as promoted_by_name
                     FROM student_promotions sp 
                     LEFT JOIN students s ON sp.student_id = s.id
                     LEFT JOIN classes c_from ON sp.from_class_id = c_from.id
                     LEFT JOIN classes c_to ON sp.to_class_id = c_to.id
                     LEFT JOIN users u ON sp.promoted_by = u.id
                     ORDER BY sp.promotion_date DESC 
                     LIMIT 50";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $promotions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($promotions, 'Promotion history retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving promotion history');
        }
    }
    
    /**
     * Initialize Student Fee Balance
     */
    private function initializeStudentFeeBalance($student_id, $class_id, $academic_year) {
        try {
            // Get current term
            $term_query = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term'";
            $term_stmt = $this->conn->prepare($term_query);
            $term_stmt->execute();
            $current_term = $term_stmt->fetch()['setting_value'] ?? 'First Term';
            
            // Get fee structure for this class
            $fee_query = "SELECT total_fee FROM fee_structures WHERE class_id = :class_id AND term = :term AND academic_year = :academic_year";
            $fee_stmt = $this->conn->prepare($fee_query);
            $fee_stmt->bindParam(':class_id', $class_id);
            $fee_stmt->bindParam(':term', $current_term);
            $fee_stmt->bindParam(':academic_year', $academic_year);
            $fee_stmt->execute();
            
            $fee_structure = $fee_stmt->fetch();
            
            if ($fee_structure) {
                $total_fee = $fee_structure['total_fee'];
                
                // Insert fee balance record
                $balance_query = "INSERT INTO student_fee_balances (student_id, class_id, term, academic_year, total_fee_required)
                                  VALUES (:student_id, :class_id, :term, :academic_year, :total_fee)";
                
                $balance_stmt = $this->conn->prepare($balance_query);
                $balance_stmt->bindParam(':student_id', $student_id);
                $balance_stmt->bindParam(':class_id', $class_id);
                $balance_stmt->bindParam(':term', $current_term);
                $balance_stmt->bindParam(':academic_year', $academic_year);
                $balance_stmt->bindParam(':total_fee', $total_fee);
                $balance_stmt->execute();
            }
        } catch (PDOException $e) {
            // Log error but don't fail the student creation
            error_log("Error initializing fee balance: " . $e->getMessage());
        }
    }
    
    /**
     * Get Student Attendance Summary
     */
    private function getStudentAttendanceSummary($student_id) {
        $query = "SELECT 
                    COUNT(*) as total_days,
                    SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                    SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                    SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days
                  FROM attendance 
                  WHERE student_id = :student_id 
                  AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Get Student Recent Scores
     */
    private function getStudentRecentScores($student_id) {
        $query = "SELECT sc.total, sc.grade, sc.remark, sub.name as subject_name, sc.entered_date
                  FROM scores sc
                  JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                  JOIN subjects sub ON sa.subject_id = sub.id
                  WHERE sc.student_id = :student_id
                  ORDER BY sc.entered_date DESC
                  LIMIT 5";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Get Student Payment History
     */
    private function getStudentPaymentHistory($student_id) {
        $query = "SELECT amount, payment_type, payment_method, receipt_number, recorded_date, status
                  FROM payments 
                  WHERE student_id = :student_id
                  ORDER BY recorded_date DESC
                  LIMIT 10";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->execute();
        
        return $stmt->fetchAll();
    }
    
    /**
     * Get Student Statistics
     */
    public function getStudentStatistics() {
        Middleware::requireAnyRole(['admin', 'teacher', 'accountant']);
        
        try {
            // Get total students
            $totalQuery = "SELECT COUNT(*) as total FROM students";
            $totalStmt = $this->conn->prepare($totalQuery);
            $totalStmt->execute();
            $totalStudents = $totalStmt->fetch()['total'];
            
            // Get students with parents
            $linkedQuery = "SELECT COUNT(DISTINCT s.id) as linked 
                          FROM students s 
                          LEFT JOIN parent_student_links psl ON s.id = psl.student_id 
                          WHERE psl.parent_id IS NOT NULL";
            $linkedStmt = $this->conn->prepare($linkedQuery);
            $linkedStmt->execute();
            $linkedStudents = $linkedStmt->fetch()['linked'];
            
            // Get students without parents
            $unlinkedStudents = $totalStudents - $linkedStudents;
            
            $statistics = [
                'totalStudents' => (int)$totalStudents,
                'linkedStudents' => (int)$linkedStudents,
                'unlinkedStudents' => (int)$unlinkedStudents
            ];
            
            Response::success($statistics, 'Student statistics retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving student statistics');
        }
    }
    
    /**
     * Save Affective Domains
     */
    public function saveAffectiveDomains() {
        $token_data = Middleware::requireAuth();
        
        if ($token_data['role'] !== 'teacher' && $token_data['role'] !== 'admin') {
            Response::forbidden('Only teachers and admins can save affective domains');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['student_id', 'class_id', 'term', 'academic_year', 'domains']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $domains = $data['domains'];
            
            // Verify student exists and is in the class
            $check_query = "SELECT COUNT(*) as count FROM students WHERE id = :student_id AND class_id = :class_id AND status = 'Active'";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::badRequest('Student not found in this class');
            }
            
            // Teacher can only save for their classes in current term
            if ($token_data['role'] === 'teacher') {
                $teacher_check_query = "SELECT COUNT(*) as count FROM subject_assignments 
                                       WHERE teacher_id = :teacher_id AND class_id = :class_id 
                                       AND academic_year = :academic_year AND term = :term AND status = 'Active'";
                $teacher_check_stmt = $this->conn->prepare($teacher_check_query);
                $teacher_check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $teacher_check_stmt->bindParam(':class_id', $class_id);
                $teacher_check_stmt->bindParam(':academic_year', $academic_year);
                $teacher_check_stmt->bindParam(':term', $term);
                $teacher_check_stmt->execute();
                
                if ($teacher_check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied: Teacher not assigned to this class for ' . $term . ' ' . $academic_year);
                }
            }
            
            $this->conn->beginTransaction();
            
            // Check if record exists
            $exist_query = "SELECT id FROM affective_domains WHERE student_id = :student_id AND class_id = :class_id AND term = :term AND academic_year = :academic_year";
            $exist_stmt = $this->conn->prepare($exist_query);
            $exist_stmt->bindParam(':student_id', $student_id);
            $exist_stmt->bindParam(':class_id', $class_id);
            $exist_stmt->bindParam(':term', $term);
            $exist_stmt->bindParam(':academic_year', $academic_year);
            $exist_stmt->execute();
            
            $existing = $exist_stmt->fetch();
            
            if ($existing) {
                // Update existing record
                $update_fields = [];
                $params = [':id' => $existing['id']];
                
                $domain_fields = ['attentiveness', 'honesty', 'neatness', 'obedience', 'sense_of_responsibility'];
                foreach ($domain_fields as $field) {
                    if (isset($domains[$field])) {
                        $update_fields[] = "$field = :$field";
                        $params[":$field"] = Middleware::validateInteger($domains[$field], $field);
                    }
                }
                
                $remark_fields = ['attentiveness_remark', 'honesty_remark', 'neatness_remark', 'obedience_remark', 'sense_of_responsibility_remark'];
                foreach ($remark_fields as $field) {
                    if (isset($domains[$field])) {
                        $update_fields[] = "$field = :$field";
                        $params[":$field"] = Middleware::sanitizeString($domains[$field]);
                    }
                }
                
                if (!empty($update_fields)) {
                    $update_query = "UPDATE affective_domains SET " . implode(', ', $update_fields) . " WHERE id = :id";
                    $update_stmt = $this->conn->prepare($update_query);
                    foreach ($params as $key => $value) {
                        $update_stmt->bindValue($key, $value);
                    }
                    $update_stmt->execute();
                }
            } else {
                // Insert new record
                $insert_fields = ['student_id', 'class_id', 'term', 'academic_year', 'entered_by'];
                $insert_values = [':student_id', ':class_id', ':term', ':academic_year', ':entered_by'];
                $params = [
                    ':student_id' => $student_id,
                    ':class_id' => $class_id,
                    ':term' => $term,
                    ':academic_year' => $academic_year,
                    ':entered_by' => $token_data['user_id']
                ];
                
                $domain_fields = ['attentiveness', 'honesty', 'neatness', 'obedience', 'sense_of_responsibility'];
                foreach ($domain_fields as $field) {
                    if (isset($domains[$field])) {
                        $insert_fields[] = $field;
                        $insert_values[] = ":$field";
                        $params[":$field"] = Middleware::validateInteger($domains[$field], $field);
                    }
                }
                
                $remark_fields = ['attentiveness_remark', 'honesty_remark', 'neatness_remark', 'obedience_remark', 'sense_of_responsibility_remark'];
                foreach ($remark_fields as $field) {
                    if (isset($domains[$field])) {
                        $insert_fields[] = $field;
                        $insert_values[] = ":$field";
                        $params[":$field"] = Middleware::sanitizeString($domains[$field]);
                    }
                }
                
                $insert_query = "INSERT INTO affective_domains (" . implode(', ', $insert_fields) . ") VALUES (" . implode(', ', $insert_values) . ")";
                $insert_stmt = $this->conn->prepare($insert_query);
                foreach ($params as $key => $value) {
                    $insert_stmt->bindValue($key, $value);
                }
                $insert_stmt->execute();
            }
            
            $this->conn->commit();
            
            Response::success(['message' => 'Affective domains saved successfully'], 'Affective domains saved successfully');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error saving affective domains');
        }
    }
    
    /**
     * Save Psychomotor Domains
     */
    public function savePsychomotorDomains() {
        $token_data = Middleware::requireAuth();
        
        if ($token_data['role'] !== 'teacher' && $token_data['role'] !== 'admin') {
            Response::forbidden('Only teachers and admins can save psychomotor domains');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['student_id', 'class_id', 'term', 'academic_year', 'domains']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $domains = $data['domains'];
            
            // Verify student exists and is in the class
            $check_query = "SELECT COUNT(*) as count FROM students WHERE id = :student_id AND class_id = :class_id AND status = 'Active'";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::badRequest('Student not found in this class');
            }
            
            // Teacher can only save for their classes in current term
            if ($token_data['role'] === 'teacher') {
                $teacher_check_query = "SELECT COUNT(*) as count FROM subject_assignments 
                                       WHERE teacher_id = :teacher_id AND class_id = :class_id 
                                       AND academic_year = :academic_year AND term = :term AND status = 'Active'";
                $teacher_check_stmt = $this->conn->prepare($teacher_check_query);
                $teacher_check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $teacher_check_stmt->bindParam(':class_id', $class_id);
                $teacher_check_stmt->bindParam(':academic_year', $academic_year);
                $teacher_check_stmt->bindParam(':term', $term);
                $teacher_check_stmt->execute();
                
                if ($teacher_check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied: Teacher not assigned to this class for ' . $term . ' ' . $academic_year);
                }
            }
            
            $this->conn->beginTransaction();
            
            // Check if record exists
            $exist_query = "SELECT id FROM psychomotor_domains WHERE student_id = :student_id AND class_id = :class_id AND term = :term AND academic_year = :academic_year";
            $exist_stmt = $this->conn->prepare($exist_query);
            $exist_stmt->bindParam(':student_id', $student_id);
            $exist_stmt->bindParam(':class_id', $class_id);
            $exist_stmt->bindParam(':term', $term);
            $exist_stmt->bindParam(':academic_year', $academic_year);
            $exist_stmt->execute();
            
            $existing = $exist_stmt->fetch();
            
            if ($existing) {
                // Update existing record
                $update_fields = [];
                $params = [':id' => $existing['id']];
                
                $domain_fields = ['attention_to_direction', 'considerate_of_others', 'handwriting', 'sports', 'verbal_fluency', 'works_well_independently'];
                foreach ($domain_fields as $field) {
                    if (isset($domains[$field])) {
                        $update_fields[] = "$field = :$field";
                        $params[":$field"] = Middleware::validateInteger($domains[$field], $field);
                    }
                }
                
                $remark_fields = ['attention_to_direction_remark', 'considerate_of_others_remark', 'handwriting_remark', 'sports_remark', 'verbal_fluency_remark', 'works_well_independently_remark'];
                foreach ($remark_fields as $field) {
                    if (isset($domains[$field])) {
                        $update_fields[] = "$field = :$field";
                        $params[":$field"] = Middleware::sanitizeString($domains[$field]);
                    }
                }
                
                if (!empty($update_fields)) {
                    $update_query = "UPDATE psychomotor_domains SET " . implode(', ', $update_fields) . " WHERE id = :id";
                    $update_stmt = $this->conn->prepare($update_query);
                    foreach ($params as $key => $value) {
                        $update_stmt->bindValue($key, $value);
                    }
                    $update_stmt->execute();
                }
            } else {
                // Insert new record
                $insert_fields = ['student_id', 'class_id', 'term', 'academic_year', 'entered_by'];
                $insert_values = [':student_id', ':class_id', ':term', ':academic_year', ':entered_by'];
                $params = [
                    ':student_id' => $student_id,
                    ':class_id' => $class_id,
                    ':term' => $term,
                    ':academic_year' => $academic_year,
                    ':entered_by' => $token_data['user_id']
                ];
                
                $domain_fields = ['attention_to_direction', 'considerate_of_others', 'handwriting', 'sports', 'verbal_fluency', 'works_well_independently'];
                foreach ($domain_fields as $field) {
                    if (isset($domains[$field])) {
                        $insert_fields[] = $field;
                        $insert_values[] = ":$field";
                        $params[":$field"] = Middleware::validateInteger($domains[$field], $field);
                    }
                }
                
                $remark_fields = ['attention_to_direction_remark', 'considerate_of_others_remark', 'handwriting_remark', 'sports_remark', 'verbal_fluency_remark', 'works_well_independently_remark'];
                foreach ($remark_fields as $field) {
                    if (isset($domains[$field])) {
                        $insert_fields[] = $field;
                        $insert_values[] = ":$field";
                        $params[":$field"] = Middleware::sanitizeString($domains[$field]);
                    }
                }
                
                $insert_query = "INSERT INTO psychomotor_domains (" . implode(', ', $insert_fields) . ") VALUES (" . implode(', ', $insert_values) . ")";
                $insert_stmt = $this->conn->prepare($insert_query);
                foreach ($params as $key => $value) {
                    $insert_stmt->bindValue($key, $value);
                }
                $insert_stmt->execute();
            }
            
            $this->conn->commit();
            
            Response::success(['message' => 'Psychomotor domains saved successfully'], 'Psychomotor domains saved successfully');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error saving psychomotor domains');
        }
    }
}
?>
