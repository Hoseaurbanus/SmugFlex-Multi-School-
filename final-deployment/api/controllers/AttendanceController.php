<?php
/**
 * Attendance Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class AttendanceController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get Attendance Records
     */
    public function getAttendance() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams(['id', 'date', 'status', 'created_at']);
        
        try {
            // ============ NEW: GET CURRENT SETTINGS FOR DEFAULT FILTERING ============
            $settings_query = "SELECT setting_key, setting_value FROM school_settings 
                              WHERE setting_key IN ('current_academic_year', 'current_term') AND school_id = :school_id";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->bindParam(':school_id', $school_id);
            $settings_stmt->execute();
            $settings = [];
            while ($setting = $settings_stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$setting['setting_key']] = $setting['setting_value'];
            }
            
            $default_academic_year = $settings['current_academic_year'] ?? '2024/2025';
            $default_term = $settings['current_term'] ?? 'First Term';
            // ============ END: GET CURRENT SETTINGS ============
            
            $query = "SELECT a.*, s.first_name, s.last_name, s.admission_number,
                             c.name as class_name,
                             CONCAT(t.first_name, ' ', t.last_name) as recorded_by_name
                      FROM attendance a
                      JOIN students s ON a.student_id = s.id
                      JOIN classes c ON s.class_id = c.id
                      LEFT JOIN users u ON a.marked_by = u.id
                      LEFT JOIN teachers t ON u.linked_id = t.id AND u.role = 'teacher'";
            
            $count_query = "SELECT COUNT(*) as total FROM attendance a
                           JOIN students s ON a.student_id = s.id
                           JOIN classes c ON s.class_id = c.id";
            
            // Add search conditions
            $conditions = ["a.school_id = :school_id"];
            $params = [':school_id' => $school_id];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(s.first_name LIKE :search OR s.last_name LIKE :search OR s.admission_number LIKE :search OR c.name LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            // Filter by date range
            if (isset($_GET['date_from'])) {
                $conditions[] = "a.date >= :date_from";
                $params[':date_from'] = Middleware::validateDate($_GET['date_from']);
            }
            if (isset($_GET['date_to'])) {
                $conditions[] = "a.date <= :date_to";
                $params[':date_to'] = Middleware::validateDate($_GET['date_to']);
            }
            
            // Filter by status
            if (isset($_GET['status'])) {
                $conditions[] = "a.status = :status";
                $params[':status'] = Middleware::validateEnum($_GET['status'], ['Present', 'Absent', 'Late', 'Excused'], 'status');
            }
            
            // Filter by class
            if (isset($_GET['class_id'])) {
                $conditions[] = "a.student_id IN (SELECT id FROM students WHERE class_id = :class_id AND school_id = :school_id)";
                $params[':class_id'] = Middleware::validateInteger($_GET['class_id'], 'class_id');
            }
            
            // Teacher can only see attendance for their classes
            if ($token_data['role'] === 'teacher') {
                $conditions[] = "a.student_id IN (
                    SELECT s.id FROM students s 
                    JOIN subject_assignments sa ON s.class_id = sa.class_id 
                    WHERE sa.teacher_id = :teacher_id AND sa.school_id = :school_id
                )";
                $params[':teacher_id'] = $token_data['linked_id'];
            }
            
            // Parent can only see attendance for their children
            if ($token_data['role'] === 'parent') {
                $conditions[] = "a.student_id IN (
                    SELECT student_id FROM parent_student_links WHERE parent_id = :parent_id AND school_id = :school_id
                )";
                $params[':parent_id'] = $token_data['linked_id'];
            }
            
            // ============ NEW: MANDATORY TERM AND ACADEMIC YEAR FILTERING ============
            // Allow filtering by specific term/year, or use current defaults
            $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : $default_term;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : $default_academic_year;
            
            // CRITICAL: Always filter by academic year and term
            $conditions[] = "a.academic_year = :academic_year";
            $params[':academic_year'] = $academic_year;
            
            $conditions[] = "a.term = :term";
            $params[':term'] = $term;
            // ============ END: MANDATORY FILTERING ============
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
                $count_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY a.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $attendance = $stmt->fetchAll();
            
            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($attendance, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving attendance');
        }
    }
    
    /**
     * Get Attendance by Date
     */
    public function getAttendanceByDate($date) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $date = Middleware::validateDate($date);
        $class_id = isset($_GET['class_id']) ? Middleware::validateInteger($_GET['class_id'], 'class_id') : null;
        
        try {
            // ============ NEW: GET CURRENT SETTINGS FOR DEFAULT FILTERING ============
            $settings_query = "SELECT setting_key, setting_value FROM school_settings 
                              WHERE setting_key IN ('current_academic_year', 'current_term') AND school_id = :school_id";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->bindParam(':school_id', $school_id);
            $settings_stmt->execute();
            $settings = [];
            while ($setting = $settings_stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$setting['setting_key']] = $setting['setting_value'];
            }
            
            $default_academic_year = $settings['current_academic_year'] ?? '2024/2025';
            $default_term = $settings['current_term'] ?? 'First Term';
            // ============ END: GET CURRENT SETTINGS ============
            
            // ============ NEW: ALLOW FILTERING BY TERM/YEAR OR USE DEFAULTS ============
            $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : $default_term;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : $default_academic_year;
            // ============ END: PARAMETER VALIDATION ============
            
            // Teacher can only see attendance for their classes
            if ($token_data['role'] === 'teacher') {
                if (!$class_id) {
                    Response::badRequest('Class ID is required for teachers');
                }
                
                // Verify teacher has access to this class
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id AND school_id = :school_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->bindParam(':school_id', $school_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this class');
                }
            }
            
            $query = "SELECT a.*, s.first_name, s.last_name, s.admission_number,
                              c.name as class_name, c.level
                       FROM attendance a
                       JOIN students s ON a.student_id = s.id
                       JOIN classes c ON s.class_id = c.id
                       WHERE a.date = :date
                             AND a.academic_year = :academic_year
                             AND a.term = :term
                             AND a.school_id = :school_id";
            
            $params = [':date' => $date, ':academic_year' => $academic_year, ':term' => $term, ':school_id' => $school_id];
            
            if ($class_id) {
                $query .= " AND a.student_id IN (SELECT id FROM students WHERE class_id = :class_id AND school_id = :school_id)";
                $params[':class_id'] = $class_id;
            }
            
            // Parent can only see attendance for their children
            if ($token_data['role'] === 'parent') {
                $query .= " AND a.student_id IN (SELECT student_id FROM parent_student_links WHERE parent_id = :parent_id AND school_id = :school_id)";
                $params[':parent_id'] = $token_data['linked_id'];
            }
            
            $query .= " ORDER BY c.level, c.name, s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $attendance = $stmt->fetchAll();
            
            Response::success($attendance, 'Attendance retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving attendance');
        }
    }
    
    /**
     * Mark Attendance
     */
    public function markAttendance() {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        if ($token_data['role'] !== 'teacher' && $token_data['role'] !== 'admin') {
            Response::forbidden('Only teachers and admins can mark attendance');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['date', 'class_id', 'attendance_records']);
        
        try {
            $date = Middleware::validateDate($data['date']);
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $attendance_records = $data['attendance_records'];
            
            // Teacher can only mark attendance for their classes
            if ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id AND school_id = :school_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->bindParam(':school_id', $school_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this class');
                }
            }
            
            // Get all students in the class
            $students_query = "SELECT id FROM students WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id";
            $students_stmt = $this->conn->prepare($students_query);
            $students_stmt->bindParam(':class_id', $class_id);
            $students_stmt->bindParam(':school_id', $school_id);
            $students_stmt->execute();
            $students = $students_stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            
            if (empty($students)) {
                Response::badRequest('No active students found in this class');
            }
            
            // Validate attendance records
            $validated_records = [];
            foreach ($attendance_records as $record) {
                Middleware::validateRequired($record, ['student_id', 'status']);
                
                $student_id = Middleware::validateInteger($record['student_id'], 'student_id');
                $status = Middleware::validateEnum($record['status'], ['Present', 'Absent', 'Late', 'Excused'], 'status');
                $notes = isset($record['notes']) ? Middleware::sanitizeString($record['notes']) : null;
                
                // Verify student is in the class
                if (!in_array($student_id, $students)) {
                    continue; // Skip invalid students
                }
                
                $validated_records[] = [
                    'student_id' => $student_id,
                    'status' => $status,
                    'notes' => $notes
                ];
            }
            
            if (empty($validated_records)) {
                Response::badRequest('No valid attendance records provided');
            }
            
            $this->conn->beginTransaction();
            
            foreach ($validated_records as $record) {
                $student_id = $record['student_id'];
                $status = $record['status'];
                $notes = $record['notes'];
                
                // Check if attendance already exists for this date and student
                $check_query = "SELECT id FROM attendance WHERE student_id = :student_id AND date = :date AND school_id = :school_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':student_id', $student_id);
                $check_stmt->bindParam(':date', $date);
                $check_stmt->bindParam(':school_id', $school_id);
                $check_stmt->execute();
                
                $existing_attendance = $check_stmt->fetch();
                
                if ($existing_attendance) {
                    // Update existing attendance
                    $update_query = "UPDATE attendance SET status = :status, remarks = :remarks, marked_by = :marked_by, marked_date = NOW()
                                     WHERE id = :id AND school_id = :school_id";
                    
                    $update_stmt = $this->conn->prepare($update_query);
                    $update_stmt->bindParam(':status', $status);
                    $update_stmt->bindParam(':remarks', $notes);
                    $update_stmt->bindParam(':marked_by', $token_data['user_id']);
                    $update_stmt->bindParam(':id', $existing_attendance['id']);
                    $update_stmt->bindParam(':school_id', $school_id);
                    $update_stmt->execute();
                } else {
                    // Get current term and academic year from settings
                    $settings_query = "SELECT setting_key, setting_value FROM school_settings WHERE setting_key IN ('current_term', 'current_academic_year') AND school_id = :school_id";
                    $settings_stmt = $this->conn->prepare($settings_query);
                    $settings_stmt->bindParam(':school_id', $school_id);
                    $settings_stmt->execute();
                    $settings_results = $settings_stmt->fetchAll(PDO::FETCH_ASSOC);
                    $settings = [];
                    foreach ($settings_results as $result) {
                        $settings[$result['setting_key']] = $result['setting_value'];
                    }
                    
                    // Insert new attendance
                    $insert_query = "INSERT INTO attendance (student_id, class_id, date, status, remarks, marked_by, term, academic_year, school_id)
                                     VALUES (:student_id, :class_id, :date, :status, :remarks, :marked_by, :term, :academic_year, :school_id)";
                    
                    $insert_stmt = $this->conn->prepare($insert_query);
                    $insert_stmt->bindParam(':student_id', $student_id);
                    $insert_stmt->bindParam(':class_id', $class_id);
                    $insert_stmt->bindParam(':date', $date);
                    $insert_stmt->bindParam(':status', $status);
                    $insert_stmt->bindParam(':remarks', $notes);
                    $insert_stmt->bindParam(':marked_by', $token_data['user_id']);
                    $insert_stmt->bindParam(':term', $settings['current_term']);
                    $insert_stmt->bindParam(':academic_year', $settings['current_academic_year']);
                    $insert_stmt->bindParam(':school_id', $school_id);
                    $insert_stmt->execute();
                }
            }
            
            $this->conn->commit();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                ucfirst($token_data['role']),
                'MARK_ATTENDANCE',
                "Class ID: $class_id, Date: $date",
                'Success',
                count($validated_records) . ' attendance records marked',
                $token_data['user_id']
            );

            RealtimeEvents::publish(['attendance', 'compiled_results', 'notifications'], [
                'action' => 'marked',
                'class_id' => (int)$class_id,
                'date' => (string)$date,
            ]);
            
            Response::success(null, 'Attendance marked successfully');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error marking attendance');
        }
    }
    
    /**
     * Get Student Attendance Summary
     */
    public function getStudentAttendanceSummary($student_id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $student_id = Middleware::validateInteger($student_id, 'student_id');
        
        // Check access permissions
        if ($token_data['role'] === 'parent') {
            // Verify parent owns this student
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $token_data['linked_id']);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
        } elseif ($token_data['role'] === 'teacher') {
            // Verify teacher has access to this student's class
            $check_query = "SELECT COUNT(*) as count FROM students s
                           JOIN subject_assignments sa ON s.class_id = sa.class_id
                           WHERE s.id = :student_id AND sa.teacher_id = :teacher_id AND s.school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
        }
        
        try {
            $date_from = isset($_GET['date_from']) ? Middleware::validateDate($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? Middleware::validateDate($_GET['date_to']) : date('Y-m-d');
            
            // Get attendance summary
            $summary_query = "SELECT 
                                COUNT(*) as total_days,
                                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                                SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
                                SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused_days,
                                ROUND((SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
                              FROM attendance 
                              WHERE student_id = :student_id AND date BETWEEN :date_from AND :date_to AND school_id = :school_id";
            
            $summary_stmt = $this->conn->prepare($summary_query);
            $summary_stmt->bindParam(':student_id', $student_id);
            $summary_stmt->bindParam(':date_from', $date_from);
            $summary_stmt->bindParam(':date_to', $date_to);
            $summary_stmt->bindParam(':school_id', $school_id);
            $summary_stmt->execute();
            
            $summary = $summary_stmt->fetch();
            
            // Get detailed attendance records
            $details_query = "SELECT a.*, c.name as class_name, c.level
                              FROM attendance a
                              JOIN students s ON a.student_id = s.id
                              JOIN classes c ON s.class_id = c.id
                              WHERE a.student_id = :student_id AND a.date BETWEEN :date_from AND :date_to AND a.school_id = :school_id
                              ORDER BY a.date DESC";
            
            $details_stmt = $this->conn->prepare($details_query);
            $details_stmt->bindParam(':student_id', $student_id);
            $details_stmt->bindParam(':date_from', $date_from);
            $details_stmt->bindParam(':date_to', $date_to);
            $details_stmt->bindParam(':school_id', $school_id);
            $details_stmt->execute();
            
            $details = $details_stmt->fetchAll();
            
            $result_data = [
                'summary' => $summary,
                'details' => $details,
                'period' => [
                    'date_from' => $date_from,
                    'date_to' => $date_to
                ]
            ];
            
            Response::success($result_data, 'Student attendance summary retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving attendance summary');
        }
    }
    
    /**
     * Get Class Attendance Summary
     */
    public function getClassAttendanceSummary($class_id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $class_id = Middleware::validateInteger($class_id, 'class_id');
        
        // Teacher can only see attendance for their classes
        if ($token_data['role'] === 'teacher') {
            $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this class');
            }
        }
        
        try {
            $date = isset($_GET['date']) ? Middleware::validateDate($_GET['date']) : date('Y-m-d');
            
            // Get class attendance summary for specific date
            $summary_query = "SELECT 
                                COUNT(*) as total_students,
                                SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                                SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
                                SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_count,
                                SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_count,
                                ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
                              FROM students s
                              LEFT JOIN attendance a ON s.id = a.student_id AND a.date = :date
                              WHERE s.class_id = :class_id AND s.status = 'Active' AND s.school_id = :school_id";
            
            $summary_stmt = $this->conn->prepare($summary_query);
            $summary_stmt->bindParam(':date', $date);
            $summary_stmt->bindParam(':class_id', $class_id);
            $summary_stmt->bindParam(':school_id', $school_id);
            $summary_stmt->execute();
            
            $summary = $summary_stmt->fetch();
            
            // Get detailed attendance for the class
            $details_query = "SELECT s.id, s.first_name, s.last_name, s.admission_number,
                                     COALESCE(a.status, 'Not Marked') as status,
                                     a.notes, a.recorded_at
                              FROM students s
                              LEFT JOIN attendance a ON s.id = a.student_id AND a.date = :date
                              WHERE s.class_id = :class_id AND s.status = 'Active' AND s.school_id = :school_id
                              ORDER BY s.last_name, s.first_name";
            
            $details_stmt = $this->conn->prepare($details_query);
            $details_stmt->bindParam(':date', $date);
            $details_stmt->bindParam(':class_id', $class_id);
            $details_stmt->bindParam(':school_id', $school_id);
            $details_stmt->execute();
            
            $details = $details_stmt->fetchAll();
            
            $result_data = [
                'summary' => $summary,
                'details' => $details,
                'date' => $date,
                'class_info' => [
                    'class_id' => $class_id,
                    'date' => $date
                ]
            ];
            
            Response::success($result_data, 'Class attendance summary retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class attendance summary');
        }
    }
    
    /**
     * Get Attendance Reports
     */
    public function getAttendanceReports() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            $date_from = isset($_GET['date_from']) ? Middleware::validateDate($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? Middleware::validateDate($_GET['date_to']) : date('Y-m-d');
            $class_id = isset($_GET['class_id']) ? Middleware::validateInteger($_GET['class_id'], 'class_id') : null;
            
            // Teacher can only see reports for their classes
            $conditions = [];
            $params = [];
            
            if ($token_data['role'] === 'teacher') {
                if (!$class_id) {
                    Response::badRequest('Class ID is required for teachers');
                }
                
                $conditions[] = "sa.teacher_id = :teacher_id";
                $params[':teacher_id'] = $token_data['linked_id'];
            }
            
            // Overall attendance statistics
            $stats_query = "SELECT 
                               COUNT(DISTINCT a.student_id) as unique_students,
                               COUNT(*) as total_attendance_records,
                               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_records,
                               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_records,
                               SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_records,
                               SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_records,
                               ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as overall_percentage
                           FROM attendance a
                           JOIN students s ON a.student_id = s.id
                           JOIN classes c ON s.class_id = c.id";
            
            if ($class_id) {
                $stats_query .= " WHERE a.student_id IN (SELECT id FROM students WHERE class_id = :class_id) AND a.school_id = :school_id";
                $params[':class_id'] = $class_id;
            } else {
                $stats_query .= " WHERE a.school_id = :school_id";
            }
            $params[':school_id'] = $school_id;
            
            $stats_query .= " AND a.date BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $date_from;
            $params[':date_to'] = $date_to;
            
            $stats_stmt = $this->conn->prepare($stats_query);
            foreach ($params as $key => $value) {
                $stats_stmt->bindValue($key, $value);
            }
            $stats_stmt->execute();
            $statistics = $stats_stmt->fetch();
            
            // Daily breakdown
            $daily_query = "SELECT DATE(a.date) as date,
                                COUNT(*) as total_records,
                                SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                                SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
                                ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as percentage
                            FROM attendance a
                            JOIN students s ON a.student_id = s.id
                            WHERE a.date BETWEEN :date_from AND :date_to AND a.school_id = :school_id";
            
            if ($class_id) {
                $daily_query .= " AND a.student_id IN (SELECT id FROM students WHERE class_id = :class_id AND school_id = :school_id)";
            }
            
            $daily_query .= " GROUP BY DATE(a.date) ORDER BY date";
            
            $daily_stmt = $this->conn->prepare($daily_query);
            $daily_params = [':date_from' => $date_from, ':date_to' => $date_to, ':school_id' => $school_id];
            if ($class_id) {
                $daily_params[':class_id'] = $class_id;
            }
            foreach ($daily_params as $key => $value) {
                $daily_stmt->bindValue($key, $value);
            }
            $daily_stmt->execute();
            $daily_breakdown = $daily_stmt->fetchAll();
            
            // Class breakdown (admin only)
            $class_breakdown = [];
            if ($token_data['role'] === 'admin') {
                $class_query = "SELECT c.name as class_name, c.level,
                                   COUNT(*) as total_records,
                                   SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_count,
                                   ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as percentage
                                FROM attendance a
                                JOIN students s ON a.student_id = s.id
                                JOIN classes c ON s.class_id = c.id
                                WHERE a.date BETWEEN :date_from AND :date_to AND a.school_id = :school_id
                                GROUP BY c.id, c.name, c.level
                                ORDER BY c.level, c.name";
                
                $class_stmt = $this->conn->prepare($class_query);
                $class_stmt->bindParam(':date_from', $date_from);
                $class_stmt->bindParam(':date_to', $date_to);
                $class_stmt->bindParam(':school_id', $school_id);
                $class_stmt->execute();
                $class_breakdown = $class_stmt->fetchAll();
            }
            
            $report_data = [
                'statistics' => $statistics,
                'daily_breakdown' => $daily_breakdown,
                'class_breakdown' => $class_breakdown,
                'period' => [
                    'date_from' => $date_from,
                    'date_to' => $date_to,
                    'class_id' => $class_id
                ]
            ];
            
            Response::success($report_data, 'Attendance reports retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating attendance reports');
        }
    }
}
?>
