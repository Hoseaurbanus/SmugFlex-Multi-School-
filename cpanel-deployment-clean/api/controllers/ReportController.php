<?php
/**
 * Report Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

class ReportController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Generate Student Report Card
     */
    public function generateStudentReportCard() {
        $token_data = Middleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['student_id', 'term', 'academic_year']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            
            // Check access permissions
            if ($token_data['role'] === 'parent') {
                $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':parent_id', $token_data['linked_id']);
                $check_stmt->bindParam(':student_id', $student_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this student');
                }
            } elseif ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM students s
                               JOIN subject_assignments sa ON s.class_id = sa.class_id
                               WHERE s.id = :student_id AND sa.teacher_id = :teacher_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':student_id', $student_id);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this student');
                }
            }
            
            // Get student information
            $student_query = "SELECT s.*, c.name as class_name, c.level, 
                              CONCAT(p.first_name, ' ', p.last_name) as parent_name,
                              p.phone as parent_phone
                              FROM students s
                              JOIN classes c ON s.class_id = c.id
                              LEFT JOIN parent_student_links psl ON s.id = psl.student_id AND psl.is_primary = TRUE
                              LEFT JOIN parents p ON psl.parent_id = p.id
                              WHERE s.id = :student_id";
            
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->execute();
            
            $student = $student_stmt->fetch();
            if (!$student) {
                Response::notFound('Student not found');
            }
            
            // Get subject scores
            $scores_query = "SELECT sc.*, sub.name as subject_name, sub.code as subject_code,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name
                             FROM scores sc
                             JOIN subject_assignments sa ON sc.subject_assignment_id = sa.id
                             JOIN subjects sub ON sa.subject_id = sub.id
                             JOIN teachers t ON sa.teacher_id = t.id
                             WHERE sc.student_id = :student_id AND sa.term = :term AND sa.academic_year = :academic_year
                             ORDER BY sub.name";
            
            $scores_stmt = $this->conn->prepare($scores_query);
            $scores_stmt->bindParam(':student_id', $student_id);
            $scores_stmt->bindParam(':term', $term);
            $scores_stmt->bindParam(':academic_year', $academic_year);
            $scores_stmt->execute();
            
            $scores = $scores_stmt->fetchAll();
            
            // Get compiled result if available
            $compiled_query = "SELECT * FROM compiled_results 
                               WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $compiled_stmt = $this->conn->prepare($compiled_query);
            $compiled_stmt->bindParam(':student_id', $student_id);
            $compiled_stmt->bindParam(':term', $term);
            $compiled_stmt->bindParam(':academic_year', $academic_year);
            $compiled_stmt->execute();
            
            $compiled_result = $compiled_stmt->fetch();
            
            // Get attendance summary
            $attendance_query = "SELECT 
                                   COUNT(*) as total_days,
                                   SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
                                   SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                                   SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
                                   ROUND((SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
                                 FROM attendance 
                                 WHERE student_id = :student_id AND date BETWEEN :term_start AND :term_end";
            
            // Calculate term date range (simplified)
            $term_dates = $this->getTermDates($term, $academic_year);
            
            $attendance_stmt = $this->conn->prepare($attendance_query);
            $attendance_stmt->bindParam(':student_id', $student_id);
            $attendance_stmt->bindParam(':term_start', $term_dates['start']);
            $attendance_stmt->bindParam(':term_end', $term_dates['end']);
            $attendance_stmt->execute();
            
            $attendance_summary = $attendance_stmt->fetch();
            
            // Get affective and psychomotor domains
            $domains_query = "SELECT domain_type, domain_name, score, comment
                              FROM student_domains
                              WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year
                              ORDER BY domain_type, domain_name";
            
            $domains_stmt = $this->conn->prepare($domains_query);
            $domains_stmt->bindParam(':student_id', $student_id);
            $domains_stmt->bindParam(':term', $term);
            $domains_stmt->bindParam(':academic_year', $academic_year);
            $domains_stmt->execute();
            
            $domains = $domains_stmt->fetchAll();
            
            // Organize domains
            $affective_domains = array_filter($domains, function($d) { return $d['domain_type'] === 'Affective'; });
            $psychomotor_domains = array_filter($domains, function($d) { return $d['domain_type'] === 'Psychomotor'; });
            
            // Get school settings
            $settings_query = "SELECT setting_value FROM school_settings WHERE setting_key IN ('school_name', 'school_address', 'school_phone', 'school_email', 'principal_name')";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->execute();
            $settings = $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            // Calculate statistics
            $total_score = array_sum(array_column($scores, 'total'));
            $average_score = count($scores) > 0 ? round($total_score / count($scores), 2) : 0;
            
            $report_data = [
                'student' => $student,
                'term' => $term,
                'academic_year' => $academic_year,
                'scores' => $scores,
                'compiled_result' => $compiled_result,
                'statistics' => [
                    'total_score' => $total_score,
                    'average_score' => $average_score,
                    'total_subjects' => count($scores)
                ],
                'attendance' => $attendance_summary,
                'domains' => [
                    'affective' => array_values($affective_domains),
                    'psychomotor' => array_values($psychomotor_domains)
                ],
                'school_info' => $settings,
                'generated_at' => date('Y-m-d H:i:s')
            ];
            
            Response::success($report_data, 'Report card generated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating report card');
        }
    }
    
    /**
     * Generate Class Performance Report
     */
    public function generateClassPerformanceReport() {
        $token_data = Middleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['class_id', 'term', 'academic_year']);
        
        try {
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            
            // Teacher can only generate reports for their classes
            if ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this class');
                }
            }
            
            // Get class information
            $class_query = "SELECT c.*, CONCAT(t.first_name, ' ', t.last_name) as class_teacher_name
                            FROM classes c
                            LEFT JOIN teachers t ON c.class_teacher_id = t.id
                            WHERE c.id = :class_id";
            
            $class_stmt = $this->conn->prepare($class_query);
            $class_stmt->bindParam(':class_id', $class_id);
            $class_stmt->execute();
            
            $class = $class_stmt->fetch();
            if (!$class) {
                Response::notFound('Class not found');
            }
            
            // Get student performance summary
            $performance_query = "SELECT s.id, s.first_name, s.last_name, s.admission_number,
                                  COALESCE(cr.total_score, 0) as total_score,
                                  COALESCE(cr.average_score, 0) as average_score,
                                  COALESCE(cr.position, 0) as position,
                                  COALESCE(cr.total_students, 0) as total_students
                                  FROM students s
                                  LEFT JOIN compiled_results cr ON s.id = cr.student_id AND cr.term = :term AND cr.academic_year = :academic_year
                                  WHERE s.class_id = :class_id AND s.status = 'Active'
                                  ORDER BY cr.position ASC, s.last_name, s.first_name";
            
            $performance_stmt = $this->conn->prepare($performance_query);
            $performance_stmt->bindParam(':class_id', $class_id);
            $performance_stmt->bindParam(':term', $term);
            $performance_stmt->bindParam(':academic_year', $academic_year);
            $performance_stmt->execute();
            
            $students_performance = $performance_stmt->fetchAll();
            
            // Get subject-wise performance
            $subject_performance_query = "SELECT sub.name as subject_name, sub.code as subject_code,
                                          COUNT(*) as total_students,
                                          COALESCE(AVG(sc.total), 0) as class_average,
                                          COALESCE(MAX(sc.total), 0) as highest_score,
                                          COALESCE(MIN(sc.total), 0) as lowest_score,
                                          COUNT(CASE WHEN sc.grade IN ('A', 'B') THEN 1 END) as excellent_count,
                                          COUNT(CASE WHEN sc.grade IN ('C') THEN 1 END) as good_count,
                                          COUNT(CASE WHEN sc.grade IN ('D', 'E') THEN 1 END) as fair_count,
                                          COUNT(CASE WHEN sc.grade = 'F' THEN 1 END) as poor_count
                                          FROM subjects sub
                                          JOIN subject_assignments sa ON sub.id = sa.subject_id
                                          LEFT JOIN scores sc ON sa.id = sc.subject_assignment_id
                                          WHERE sa.class_id = :class_id AND sa.term = :term AND sa.academic_year = :academic_year
                                          GROUP BY sub.id, sub.name, sub.code
                                          ORDER BY sub.name";
            
            $subject_performance_stmt = $this->conn->prepare($subject_performance_query);
            $subject_performance_stmt->bindParam(':class_id', $class_id);
            $subject_performance_stmt->bindParam(':term', $term);
            $subject_performance_stmt->bindParam(':academic_year', $academic_year);
            $subject_performance_stmt->execute();
            
            $subjects_performance = $subject_performance_stmt->fetchAll();
            
            // Calculate class statistics
            $total_students = count($students_performance);
            $students_with_results = count(array_filter($students_performance, function($s) { return $s['total_score'] > 0; }));
            $class_average = $students_with_results > 0 ? round(array_sum(array_column($students_performance, 'average_score')) / $students_with_results, 2) : 0;
            
            // Grade distribution
            $grade_distribution = [
                'A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'E' => 0, 'F' => 0
            ];
            
            foreach ($students_performance as $student) {
                if ($student['average_score'] >= 80) $grade_distribution['A']++;
                elseif ($student['average_score'] >= 70) $grade_distribution['B']++;
                elseif ($student['average_score'] >= 60) $grade_distribution['C']++;
                elseif ($student['average_score'] >= 50) $grade_distribution['D']++;
                elseif ($student['average_score'] >= 40) $grade_distribution['E']++;
                else $grade_distribution['F']++;
            }
            
            // Get attendance summary for the class
            $attendance_query = "SELECT 
                                   COUNT(DISTINCT a.student_id) as total_students,
                                   COUNT(*) as total_records,
                                   SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_records,
                                   ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
                                 FROM attendance a
                                 JOIN students s ON a.student_id = s.id
                                 WHERE s.class_id = :class_id AND a.date BETWEEN :term_start AND :term_end";
            
            $term_dates = $this->getTermDates($term, $academic_year);
            
            $attendance_stmt = $this->conn->prepare($attendance_query);
            $attendance_stmt->bindParam(':class_id', $class_id);
            $attendance_stmt->bindParam(':term_start', $term_dates['start']);
            $attendance_stmt->bindParam(':term_end', $term_dates['end']);
            $attendance_stmt->execute();
            
            $attendance_summary = $attendance_stmt->fetch();
            
            $report_data = [
                'class' => $class,
                'term' => $term,
                'academic_year' => $academic_year,
                'students_performance' => $students_performance,
                'subjects_performance' => $subjects_performance,
                'class_statistics' => [
                    'total_students' => $total_students,
                    'students_with_results' => $students_with_results,
                    'class_average' => $class_average,
                    'grade_distribution' => $grade_distribution
                ],
                'attendance_summary' => $attendance_summary,
                'generated_at' => date('Y-m-d H:i:s')
            ];
            
            Response::success($report_data, 'Class performance report generated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating class performance report');
        }
    }
    
    /**
     * Generate Financial Report
     */
    public function generateFinancialReport() {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        try {
            $date_from = isset($_GET['date_from']) ? Middleware::validateDate($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? Middleware::validateDate($_GET['date_to']) : date('Y-m-d');
            $report_type = isset($_GET['type']) ? Middleware::validateEnum($_GET['type'], ['summary', 'detailed', 'by_class', 'by_payment_type'], 'type') : 'summary';
            
            $report_data = [];
            
            switch ($report_type) {
                case 'summary':
                    $report_data = $this->generateFinancialSummary($date_from, $date_to);
                    break;
                case 'detailed':
                    $report_data = $this->generateDetailedFinancialReport($date_from, $date_to);
                    break;
                case 'by_class':
                    $report_data = $this->generateFinancialByClass($date_from, $date_to);
                    break;
                case 'by_payment_type':
                    $report_data = $this->generateFinancialByPaymentType($date_from, $date_to);
                    break;
            }
            
            Response::success($report_data, 'Financial report generated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating financial report');
        }
    }
    
    /**
     * Generate Attendance Report
     */
    public function generateAttendanceReport() {
        $token_data = Middleware::requireAuth();
        
        try {
            $date_from = isset($_GET['date_from']) ? Middleware::validateDate($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? Middleware::validateDate($_GET['date_to']) : date('Y-m-d');
            $class_id = isset($_GET['class_id']) ? Middleware::validateInteger($_GET['class_id'], 'class_id') : null;
            
            // Teacher can only generate reports for their classes
            if ($token_data['role'] === 'teacher') {
                if (!$class_id) {
                    Response::badRequest('Class ID is required for teachers');
                }
                
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND class_id = :class_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this class');
                }
            }
            
            // Overall statistics
            $stats_query = "SELECT 
                               COUNT(DISTINCT a.student_id) as unique_students,
                               COUNT(*) as total_records,
                               SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) as present_records,
                               SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END) as absent_records,
                               SUM(CASE WHEN a.status = 'Late' THEN 1 ELSE 0 END) as late_records,
                               SUM(CASE WHEN a.status = 'Excused' THEN 1 ELSE 0 END) as excused_records,
                               ROUND((SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as overall_percentage
                           FROM attendance a
                           JOIN students s ON a.student_id = s.id";
            
            $params = [];
            $conditions = [];
            
            if ($class_id) {
                $conditions[] = "a.student_id IN (SELECT id FROM students WHERE class_id = :class_id)";
                $params[':class_id'] = $class_id;
            }
            
            $conditions[] = "a.date BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $date_from;
            $params[':date_to'] = $date_to;
            
            if (!empty($conditions)) {
                $stats_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
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
                           JOIN students s ON a.student_id = s.id";
            
            if (!empty($conditions)) {
                $daily_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $daily_query .= " GROUP BY DATE(a.date) ORDER BY date";
            
            $daily_stmt = $this->conn->prepare($daily_query);
            foreach ($params as $key => $value) {
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
                                WHERE a.date BETWEEN :date_from AND :date_to
                                GROUP BY c.id, c.name, c.level
                                ORDER BY c.level, c.name";
                
                $class_stmt = $this->conn->prepare($class_query);
                $class_stmt->bindParam(':date_from', $date_from);
                $class_stmt->bindParam(':date_to', $date_to);
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
                ],
                'generated_at' => date('Y-m-d H:i:s')
            ];
            
            Response::success($report_data, 'Attendance report generated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating attendance report');
        }
    }
    
    /**
     * Get Term Dates Helper
     */
    private function getTermDates($term, $academic_year) {
        // Simplified term date calculation
        $year = substr($academic_year, 0, 4);
        
        switch ($term) {
            case 'First Term':
                return [
                    'start' => "$year-09-01",
                    'end' => "$year-12-15"
                ];
            case 'Second Term':
                return [
                    'start' => "$year-01-10",
                    'end' => "$year-03-30"
                ];
            case 'Third Term':
                return [
                    'start' => "$year-04-20",
                    'end' => "$year-07-20"
                ];
            default:
                return [
                    'start' => "$year-01-01",
                    'end' => "$year-12-31"
                ];
        }
    }
    
    /**
     * Generate Financial Summary Helper
     */
    private function generateFinancialSummary($date_from, $date_to) {
        $query = "SELECT 
                   COUNT(*) as total_transactions,
                   COALESCE(SUM(CASE WHEN status = 'Verified' THEN amount ELSE 0 END), 0) as total_verified,
                   COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as total_pending,
                   COALESCE(SUM(CASE WHEN status = 'Rejected' THEN amount ELSE 0 END), 0) as total_rejected,
                   COUNT(CASE WHEN payment_method = 'Bank Transfer' THEN 1 END) as bank_transfers,
                   COUNT(CASE WHEN payment_method = 'Cash' THEN 1 END) as cash_payments,
                   COUNT(CASE WHEN payment_method = 'POS' THEN 1 END) as pos_payments
                 FROM payments 
                 WHERE recorded_date BETWEEN :date_from AND :date_to";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':date_from', $date_from);
        $stmt->bindParam(':date_to', $date_to);
        $stmt->execute();
        
        return $stmt->fetch();
    }
    
    /**
     * Generate Detailed Financial Report Helper
     */
    private function generateDetailedFinancialReport($date_from, $date_to) {
        $query = "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                         c.name as class_name, c.level,
                         CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
                  FROM payments p
                  JOIN students s ON p.student_id = s.id
                  JOIN classes c ON s.class_id = c.id
                  LEFT JOIN users u ON p.recorded_by = u.id
                  WHERE p.recorded_date BETWEEN :date_from AND :date_to
                  ORDER BY p.recorded_date DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':date_from', $date_from);
        $stmt->bindParam(':date_to', $date_to);
        $stmt->execute();
        
        return ['payments' => $stmt->fetchAll()];
    }
    
    /**
     * Generate Financial by Class Helper
     */
    private function generateFinancialByClass($date_from, $date_to) {
        $query = "SELECT c.name as class_name, c.level,
                     COUNT(*) as transaction_count,
                     COALESCE(SUM(CASE WHEN p.status = 'Verified' THEN p.amount ELSE 0 END), 0) as total_verified,
                     COALESCE(SUM(CASE WHEN p.status = 'Pending' THEN p.amount ELSE 0 END), 0) as total_pending,
                     COALESCE(SUM(p.amount), 0) as total_amount
                  FROM payments p
                  JOIN students s ON p.student_id = s.id
                  JOIN classes c ON s.class_id = c.id
                  WHERE p.recorded_date BETWEEN :date_from AND :date_to
                  GROUP BY c.id, c.name, c.level
                  ORDER BY c.level, c.name";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':date_from', $date_from);
        $stmt->bindParam(':date_to', $date_to);
        $stmt->execute();
        
        return ['by_class' => $stmt->fetchAll()];
    }
    
    /**
     * Generate Financial by Payment Type Helper
     */
    private function generateFinancialByPaymentType($date_from, $date_to) {
        $query = "SELECT payment_type, payment_method,
                     COUNT(*) as transaction_count,
                     COALESCE(SUM(CASE WHEN status = 'Verified' THEN amount ELSE 0 END), 0) as total_verified,
                     COALESCE(SUM(amount), 0) as total_amount
                  FROM payments 
                  WHERE recorded_date BETWEEN :date_from AND :date_to
                  GROUP BY payment_type, payment_method
                  ORDER BY total_amount DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':date_from', $date_from);
        $stmt->bindParam(':date_to', $date_to);
        $stmt->execute();
        
        return ['by_payment_type' => $stmt->fetchAll()];
    }
}
?>
