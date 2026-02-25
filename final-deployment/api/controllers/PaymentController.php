<?php
/**
 * Payment Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

class PaymentController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Payments (with filtering)
     */
    public function getAllPayments() {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams();
        
        try {
            // Get current academic year and term from settings (default filter)
            $settings_query = "SELECT setting_key, setting_value FROM school_settings 
                              WHERE setting_key IN ('current_academic_year', 'current_term')";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->execute();
            $settings = [];
            while ($setting = $settings_stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$setting['setting_key']] = $setting['setting_value'];
            }
            
            $default_academic_year = $settings['current_academic_year'] ?? '2024/2025';
            $default_term = $settings['current_term'] ?? 'First Term';
            
            $query = "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                             c.name as class_name, c.level,
                             u.username as recorded_by_name
                      FROM payments p
                      JOIN students s ON p.student_id = s.id
                      JOIN classes c ON s.class_id = c.id
                      LEFT JOIN users u ON p.recorded_by = u.id";
            
            $count_query = "SELECT COUNT(*) as total FROM payments p
                           JOIN students s ON p.student_id = s.id";
            
            // Add search conditions
            $conditions = [];
            $params = [];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(s.first_name LIKE :search OR s.last_name LIKE :search OR s.admission_number LIKE :search OR p.receipt_number LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            // Filter by status
            if (isset($_GET['status'])) {
                $conditions[] = "p.status = :status";
                $params[':status'] = Middleware::validateEnum($_GET['status'], ['Pending', 'Verified', 'Rejected'], 'status');
            }
            
            // Filter by date range
            if (isset($_GET['date_from'])) {
                $conditions[] = "p.recorded_date >= :date_from";
                $params[':date_from'] = Middleware::validateDate($_GET['date_from']);
            }
            if (isset($_GET['date_to'])) {
                $conditions[] = "p.recorded_date <= :date_to";
                $params[':date_to'] = Middleware::validateDate($_GET['date_to']);
            }
            
            // ============ NEW: TERM AND ACADEMIC YEAR FILTERING ============
            // Allow filtering by specific term/year, or use current defaults
            $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : $default_term;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : $default_academic_year;
            
            // CRITICAL: Always filter by academic year and term
            $conditions[] = "p.academic_year = :academic_year";
            $params[':academic_year'] = $academic_year;
            
            $conditions[] = "p.term = :term";
            $params[':term'] = $term;
            // ============ END: TERM AND ACADEMIC YEAR FILTERING ============
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
                $count_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY p.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $payments = $stmt->fetchAll();
            
            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($payments, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving payments');
        }
    }
    
    /**
     * Get Payment by ID
     */
    public function getPaymentById($id) {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        $payment_id = Middleware::validateInteger($id, 'payment_id');
        
        try {
            $query = "SELECT p.*, s.first_name, s.last_name, s.admission_number,
                             c.name as class_name, c.level,
                             u.username as recorded_by_name,
                             v.username as verified_by_name
                      FROM payments p
                      JOIN students s ON p.student_id = s.id
                      JOIN classes c ON s.class_id = c.id
                      LEFT JOIN users u ON p.recorded_by = u.id
                      LEFT JOIN users v ON p.verified_by = v.id
                      WHERE p.id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $payment_id);
            $stmt->execute();
            
            $payment = $stmt->fetch();
            
            if (!$payment) {
                Response::notFound('Payment not found');
            }
            
            Response::success($payment, 'Payment retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving payment');
        }
    }
    
    /**
     * Create New Payment
     */
    public function createPayment() {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['student_id', 'amount', 'payment_type', 'payment_method']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $amount = Middleware::validatePositive($data['amount'], 'amount');
            $payment_type = Middleware::validateEnum($data['payment_type'], ['School Fees', 'Examination Fees', 'Books', 'Uniform', 'Transport', 'Others'], 'payment_type');
            $payment_method = Middleware::validateEnum($data['payment_method'], ['Bank Transfer', 'Cash', 'POS', 'Online Payment', 'Cheque'], 'payment_method');
            
            $term = isset($data['term']) ? Middleware::sanitizeString($data['term']) : 'First Term';
            $academic_year = isset($data['academic_year']) ? Middleware::sanitizeString($data['academic_year']) : '2024/2025';
            $transaction_reference = isset($data['transaction_reference']) ? Middleware::sanitizeString($data['transaction_reference']) : null;
            $notes = isset($data['notes']) ? Middleware::sanitizeString($data['notes']) : null;
            
            // Check if student exists
            $student_query = "SELECT first_name, last_name FROM students WHERE id = :student_id";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->execute();
            
            $student = $student_stmt->fetch();
            if (!$student) {
                Response::notFound('Student not found');
            }
            
            // Generate receipt number
            $receipt_number = $this->generateReceiptNumber();
            
            // Insert payment
            $query = "INSERT INTO payments (student_id, amount, payment_type, term, academic_year, payment_method, 
                                          transaction_reference, receipt_number, recorded_by, notes, status)
                      VALUES (:student_id, :amount, :payment_type, :term, :academic_year, :payment_method,
                              :transaction_reference, :receipt_number, :recorded_by, :notes, 'Pending')";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->bindParam(':amount', $amount);
            $stmt->bindParam(':payment_type', $payment_type);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':payment_method', $payment_method);
            $stmt->bindParam(':transaction_reference', $transaction_reference);
            $stmt->bindParam(':receipt_number', $receipt_number);
            $recorded_by = $_SESSION['user_id'] ?? 1;
            $stmt->bindParam(':recorded_by', $recorded_by);
            $stmt->bindParam(':notes', $notes);
            
            $stmt->execute();
            $payment_id = $this->conn->lastInsertId();
            
            // Update student fee balance
            $this->updateStudentFeeBalance($student_id, $amount, $term, $academic_year);
            
            // Log activity
            Middleware::logActivity(
                $_SESSION['username'] ?? 'Accountant',
                'Accountant',
                'CREATE_PAYMENT',
                "Payment: $receipt_number",
                'Success',
                "Payment of $amount recorded for {$student['first_name']} {$student['last_name']}",
                $_SESSION['user_id'] ?? null
            );
            
            Response::created(['id' => $payment_id, 'receipt_number' => $receipt_number], 'Payment recorded successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error recording payment');
        }
    }
    
    /**
     * Verify Payment
     */
    public function verifyPayment($id) {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        $payment_id = Middleware::validateInteger($id, 'payment_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if payment exists and is pending
            $check_query = "SELECT * FROM payments WHERE id = :id AND status = 'Pending'";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $payment_id);
            $check_stmt->execute();
            
            $payment = $check_stmt->fetch();
            if (!$payment) {
                Response::notFound('Payment not found or already processed');
            }
            
            $action = Middleware::validateEnum($data['action'], ['verify', 'reject'], 'action');
            
            if ($action === 'verify') {
                $status = 'Verified';
                $message = 'Payment verified successfully';
                
                // Update student fee balance for verified payments
                $this->updateStudentFeeBalance($payment['student_id'], $payment['amount'], $payment['term'], $payment['academic_year']);
            } else {
                $status = 'Rejected';
                $rejection_reason = isset($data['rejection_reason']) ? Middleware::sanitizeString($data['rejection_reason']) : 'Payment rejected';
                $message = 'Payment rejected';
                
                // Update fee balance to reverse the payment
                $this->reverseStudentFeeBalance($payment['student_id'], $payment['amount'], $payment['term'], $payment['academic_year']);
            }
            
            // Update payment status
            $update_query = "UPDATE payments SET status = :status, verified_by = :verified_by, verified_date = NOW() 
                            WHERE id = :id";
            
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':status', $status);
            $verified_by = $_SESSION['user_id'] ?? 1;
            $update_stmt->bindParam(':verified_by', $verified_by);
            $update_stmt->bindParam(':id', $payment_id);
            $update_stmt->execute();
            
            // Add rejection reason if rejected
            if ($action === 'reject') {
                $notes_query = "UPDATE payments SET notes = CONCAT(IFNULL(notes, ''), '\nRejection: ', :rejection_reason) WHERE id = :id";
                $notes_stmt = $this->conn->prepare($notes_query);
                $notes_stmt->bindParam(':rejection_reason', $rejection_reason);
                $notes_stmt->bindParam(':id', $payment_id);
                $notes_stmt->execute();
            }
            
            // Log activity
            Middleware::logActivity(
                $_SESSION['username'] ?? 'Accountant',
                'Accountant',
                strtoupper($action) . '_PAYMENT',
                "Payment ID: $payment_id",
                'Success',
                "Payment $action" . ($action === 'reject' ? ": $rejection_reason" : ""),
                $_SESSION['user_id'] ?? null
            );
            
            Response::success(null, $message);
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating payment');
        }
    }
    
    /**
     * Get Student Payment History
     */
    public function getStudentPaymentHistory($student_id) {
        $token_data = Middleware::requireAuth();
        $student_id = Middleware::validateInteger($student_id, 'student_id');
        
        // Check access permissions
        if ($token_data['role'] === 'parent') {
            // Verify parent owns this student
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $token_data['linked_id']);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
        }
        
        try {
            // ============ NEW: GET CURRENT SETTINGS FOR DEFAULT FILTERING ============
            $settings_query = "SELECT setting_key, setting_value FROM school_settings 
                              WHERE setting_key IN ('current_academic_year', 'current_term')";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->execute();
            $settings = [];
            while ($setting = $settings_stmt->fetch(PDO::FETCH_ASSOC)) {
                $settings[$setting['setting_key']] = $setting['setting_value'];
            }
            
            $default_academic_year = $settings['current_academic_year'] ?? '2024/2025';
            $default_term = $settings['current_term'] ?? 'First Term';
            // ============ END: GET CURRENT SETTINGS ============
            
            // ============ NEW: ALLOW OPTIONAL FILTERING BY TERM/YEAR ============
            // If not specified, default to current academic year and term
            $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : $default_term;
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : $default_academic_year;
            
            $return_all = isset($_GET['all_history']) && $_GET['all_history'] === 'true' && $token_data['role'] === 'admin';
            // ============ END: ALLOW OPTIONAL FILTERING ============
            
            $query = "SELECT p.*, u.username as recorded_by_name
                      FROM payments p
                      LEFT JOIN users u ON p.recorded_by = u.id
                      WHERE p.student_id = :student_id";
            
            $params = [':student_id' => $student_id];
            
            // ============ NEW: MANDATORY FILTERING BY ACADEMIC YEAR AND TERM ============
            if (!$return_all) {
                $query .= " AND p.academic_year = :academic_year AND p.term = :term";
                $params[':academic_year'] = $academic_year;
                $params[':term'] = $term;
            }
            // ============ END: MANDATORY FILTERING ============
            
            $query .= " ORDER BY p.recorded_date DESC";
            
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $payments = $stmt->fetchAll();
            
            // Get current fee balance
            $balance_query = "SELECT * FROM student_fee_balances 
                              WHERE student_id = :student_id 
                              ORDER BY academic_year DESC, term DESC LIMIT 1";
            $balance_stmt = $this->conn->prepare($balance_query);
            $balance_stmt->bindParam(':student_id', $student_id);
            $balance_stmt->execute();
            $current_balance = $balance_stmt->fetch();
            
            $result_data = [
                'payments' => $payments,
                'current_balance' => $current_balance
            ];
            
            Response::success($result_data, 'Student payment history retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving payment history');
        }
    }

    /**
     * Submit Bank Transfer Proof (Parent)
     */
    public function submitBankTransferProof() {
        $token_data = Middleware::requireAuth();
        Middleware::requireAnyRole(['parent']);
        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['student_id', 'amount', 'payment_type', 'proof_url']);
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $amount = Middleware::validatePositive($data['amount'], 'amount');
            $payment_type = Middleware::validateEnum($data['payment_type'], ['School Fees', 'Examination Fees', 'Books', 'Uniform', 'Transport', 'Others'], 'payment_type');
            $term = isset($data['term']) ? Middleware::sanitizeString($data['term']) : 'First Term';
            $academic_year = isset($data['academic_year']) ? Middleware::sanitizeString($data['academic_year']) : '2024/2025';
            $notes = isset($data['notes']) ? Middleware::sanitizeString($data['notes']) : null;
            $proof_url = Middleware::sanitizeString($data['proof_url']);
            $transaction_reference = isset($data['transaction_reference']) ? Middleware::sanitizeString($data['transaction_reference']) : null;
            // Get parent ID from token or database
            $parent_id = $token_data['linked_id'] ?? null;
            if (empty($parent_id)) {
                $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                $user_stmt = $this->conn->prepare($user_query);
                $user_stmt->bindParam(':username', $token_data['username']);
                $user_stmt->execute();
                $user_data = $user_stmt->fetch();
                $parent_id = $user_data['linked_id'] ?? null;
            }
            if (empty($parent_id)) {
                Response::forbidden('Parent ID not found');
            }
            // Verify parent owns this student
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $parent_id);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
            // Get student details for logging
            $student_query = "SELECT first_name, last_name FROM students WHERE id = :student_id";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->execute();
            $student = $student_stmt->fetch();
            if (!$student) {
                Response::notFound('Student not found');
            }
            // Generate receipt number
            $receipt_number = $this->generateReceiptNumber();
            // Combine notes with proof URL
            $combined_notes = $notes ? ($notes . "\n") : '';
            $combined_notes .= 'Bank transfer receipt: ' . $proof_url;
            // Insert pending bank transfer payment
            $query = "INSERT INTO payments (student_id, amount, payment_type, term, academic_year, payment_method, transaction_reference, receipt_number, recorded_by, notes, status) VALUES (:student_id, :amount, :payment_type, :term, :academic_year, :payment_method, :transaction_reference, :receipt_number, :recorded_by, :notes, 'Pending')";
            $stmt = $this->conn->prepare($query);
            $payment_method = 'Bank Transfer';
            $stmt->bindParam(':student_id', $student_id);
            $stmt->bindParam(':amount', $amount);
            $stmt->bindParam(':payment_type', $payment_type);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':payment_method', $payment_method);
            $stmt->bindParam(':transaction_reference', $transaction_reference);
            $stmt->bindParam(':receipt_number', $receipt_number);
            $stmt->bindParam(':recorded_by', $parent_id);
            $stmt->bindParam(':notes', $combined_notes);
            $stmt->execute();
            $payment_id = $this->conn->lastInsertId();
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                'Parent',
                'SUBMIT_BANK_TRANSFER',
                "Payment: $receipt_number",
                'Success',
                "Bank transfer of $amount submitted for {$student['first_name']} {$student['last_name']}",
                $parent_id
            );
            Response::created([
                'id' => $payment_id,
                'receipt_number' => $receipt_number
            ], 'Bank transfer submitted successfully');
        } catch (PDOException $e) {
            Response::serverError('Database error submitting bank transfer');
        }
    }
    
    /**
     * Get Student Fee Balance
     */
    public function getStudentFeeBalance($student_id) {
        $token_data = Middleware::requireAuth();
        $student_id = Middleware::validateInteger($student_id, 'student_id');
        
        // Check access permissions
        if ($token_data['role'] === 'parent') {
            // Handle missing linked_id in JWT token
            $parent_id = $token_data['linked_id'] ?? null;
            
            // If linked_id is missing, get it from database based on username
            if (empty($parent_id)) {
                $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                $user_stmt = $this->conn->prepare($user_query);
                $user_stmt->bindParam(':username', $token_data['username']);
                $user_stmt->execute();
                $user_data = $user_stmt->fetch();
                $parent_id = $user_data['linked_id'] ?? null;
            }
            
            if (empty($parent_id)) {
                Response::forbidden('Parent ID not found');
            }
            
            // Verify parent owns this student
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $parent_id);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
        }
        
        try {
            $term = isset($_GET['term']) ? Middleware::sanitizeString($_GET['term']) : 'First Term';
            $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : '2024/2025';
            
            $query = "SELECT sfb.*, fs.*
                      FROM student_fee_balances sfb
                      JOIN fee_structures fs ON sfb.class_id = fs.class_id AND sfb.term = fs.term AND sfb.academic_year = fs.academic_year
                      WHERE sfb.student_id = :student_id AND sfb.term = :term AND sfb.academic_year = :academic_year";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->execute();
            
            $fee_balance = $stmt->fetch();
            
            if (!$fee_balance) {
                Response::notFound('Fee balance not found for specified term and year');
            }
            
            Response::success($fee_balance, 'Fee balance retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving fee balance');
        }
    }
    
    /**
     * Get Payment Reports
     */
    public function getPaymentReports() {
        Middleware::requireAnyRole(['admin', 'accountant']);
        
        try {
            $date_from = isset($_GET['date_from']) ? Middleware::validateDate($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? Middleware::validateDate($_GET['date_to']) : date('Y-m-d');
            
            // Summary statistics
            $summary_query = "SELECT 
                                COUNT(*) as total_transactions,
                                COALESCE(SUM(CASE WHEN status = 'Verified' THEN amount ELSE 0 END), 0) as total_verified,
                                COALESCE(SUM(CASE WHEN status = 'Pending' THEN amount ELSE 0 END), 0) as total_pending,
                                COALESCE(SUM(CASE WHEN status = 'Rejected' THEN amount ELSE 0 END), 0) as total_rejected,
                                COUNT(CASE WHEN payment_method = 'Bank Transfer' THEN 1 END) as bank_transfers,
                                COUNT(CASE WHEN payment_method = 'Cash' THEN 1 END) as cash_payments,
                                COUNT(CASE WHEN payment_method = 'POS' THEN 1 END) as pos_payments
                              FROM payments 
                              WHERE recorded_date BETWEEN :date_from AND :date_to";
            
            $summary_stmt = $this->conn->prepare($summary_query);
            $summary_stmt->bindParam(':date_from', $date_from);
            $summary_stmt->bindParam(':date_to', $date_to);
            $summary_stmt->execute();
            $summary = $summary_stmt->fetch();
            
            // Daily breakdown
            $daily_query = "SELECT DATE(recorded_date) as date, 
                              COUNT(*) as transactions,
                              COALESCE(SUM(amount), 0) as total_amount
                            FROM payments 
                            WHERE recorded_date BETWEEN :date_from AND :date_to
                            GROUP BY DATE(recorded_date)
                            ORDER BY date";
            
            $daily_stmt = $this->conn->prepare($daily_query);
            $daily_stmt->bindParam(':date_from', $date_from);
            $daily_stmt->bindParam(':date_to', $date_to);
            $daily_stmt->execute();
            $daily_breakdown = $daily_stmt->fetchAll();
            
            // Payment type breakdown
            $type_query = "SELECT payment_type, 
                             COUNT(*) as count,
                             COALESCE(SUM(amount), 0) as total
                           FROM payments 
                           WHERE recorded_date BETWEEN :date_from AND :date_to AND status = 'Verified'
                           GROUP BY payment_type
                           ORDER BY total DESC";
            
            $type_stmt = $this->conn->prepare($type_query);
            $type_stmt->bindParam(':date_from', $date_from);
            $type_stmt->bindParam(':date_to', $date_to);
            $type_stmt->execute();
            $type_breakdown = $type_stmt->fetchAll();
            
            $report_data = [
                'summary' => $summary,
                'daily_breakdown' => $daily_breakdown,
                'type_breakdown' => $type_breakdown,
                'period' => [
                    'date_from' => $date_from,
                    'date_to' => $date_to
                ]
            ];
            
            Response::success($report_data, 'Payment reports retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error generating payment reports');
        }
    }
    
    /**
     * Initialize Online Payment (Paystack) for Parent
     */
    public function initializeOnlinePayment() {
        $token_data = Middleware::requireAuth();
        Middleware::requireAnyRole(['parent']);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['student_id', 'amount', 'payment_type']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $amount = Middleware::validatePositive($data['amount'], 'amount');
            $payment_type = Middleware::validateEnum($data['payment_type'], ['School Fees', 'Examination Fees', 'Books', 'Uniform', 'Transport', 'Others'], 'payment_type');
            
            $term = isset($data['term']) ? Middleware::sanitizeString($data['term']) : 'First Term';
            $academic_year = isset($data['academic_year']) ? Middleware::sanitizeString($data['academic_year']) : '2024/2025';
            $notes = isset($data['notes']) ? Middleware::sanitizeString($data['notes']) : null;
            
            // Get parent ID from token
            $parent_id = $token_data['linked_id'] ?? null;
            if (empty($parent_id)) {
                // Fallback: get parent ID from users table
                $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                $user_stmt = $this->conn->prepare($user_query);
                $user_stmt->bindParam(':username', $token_data['username']);
                $user_stmt->execute();
                $user_data = $user_stmt->fetch();
                $parent_id = $user_data['linked_id'] ?? null;
            }
            
            if (empty($parent_id)) {
                Response::forbidden('Parent ID not found');
            }
            
            // Verify parent owns this student
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $parent_id);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
            
            // Get student and parent details
            $student_query = "SELECT first_name, last_name, admission_number FROM students WHERE id = :student_id";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $student_id);
            $student_stmt->execute();
            $student = $student_stmt->fetch();
            
            if (!$student) {
                Response::notFound('Student not found');
            }
            
            $parent_query = "SELECT first_name, last_name, email FROM parents WHERE id = :parent_id";
            $parent_stmt = $this->conn->prepare($parent_query);
            $parent_stmt->bindParam(':parent_id', $parent_id);
            $parent_stmt->execute();
            $parent = $parent_stmt->fetch();
            
            if (!$parent || empty($parent['email'])) {
                Response::badRequest('Parent email not found. Required for payment.');
            }
            
            // Convert amount to kobo (Paystack expects amount in smallest currency unit)
            $amount_kobo = $amount * 100;
            
            // Call Paystack API to initialize transaction
            $paystack_secret = $_ENV['PAYSTACK_SECRET_KEY'] ?? getenv('PAYSTACK_SECRET_KEY');
            if (empty($paystack_secret)) {
                Response::serverError('Paystack secret key not configured');
            }
            
            $callback_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]/GG/payment-callback";
            
            $metadata = [
                'student_id' => $student_id,
                'parent_id' => $parent_id,
                'payment_type' => $payment_type,
                'term' => $term,
                'academic_year' => $academic_year,
                'custom_fields' => [
                    [
                        'display_name' => 'Student Name',
                        'variable_name' => 'student_name',
                        'value' => $student['first_name'] . ' ' . $student['last_name']
                    ],
                    [
                        'display_name' => 'Admission Number',
                        'variable_name' => 'admission_number',
                        'value' => $student['admission_number']
                    ],
                    [
                        'display_name' => 'Payment Type',
                        'variable_name' => 'payment_type',
                        'value' => $payment_type
                    ]
                ]
            ];
            
            $post_fields = [
                'email' => $parent['email'],
                'amount' => $amount_kobo,
                'currency' => 'NGN',
                'callback_url' => $callback_url,
                'metadata' => $metadata
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://api.paystack.co/transaction/initialize');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_fields));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $paystack_secret,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response === false || $http_code !== 200) {
                Response::serverError('Failed to initialize payment with Paystack');
            }
            
            $paystack_response = json_decode($response, true);
            
            if (!isset($paystack_response['status']) || $paystack_response['status'] !== true) {
                Response::serverError('Paystack initialization failed: ' . ($paystack_response['message'] ?? 'Unknown error'));
            }
            
            $paystack_data = $paystack_response['data'];
            $reference = $paystack_data['reference'];
            $authorization_url = $paystack_data['authorization_url'];
            
            // Generate receipt number
            $receipt_number = $this->generateReceiptNumber();
            
            // Insert pending payment record
            $query = "INSERT INTO payments (student_id, amount, payment_type, term, academic_year, payment_method, 
                                          transaction_reference, receipt_number, recorded_by, notes, status)
                      VALUES (:student_id, :amount, :payment_type, :term, :academic_year, :payment_method,
                              :transaction_reference, :receipt_number, :recorded_by, :notes, 'Pending')";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':student_id', $student_id);
            $stmt->bindParam(':amount', $amount);
            $stmt->bindParam(':payment_type', $payment_type);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':payment_method', $payment_method = 'Online Payment');
            $stmt->bindParam(':transaction_reference', $reference);
            $stmt->bindParam(':receipt_number', $receipt_number);
            $stmt->bindParam(':recorded_by', $parent_id);
            $stmt->bindParam(':notes', $notes);
            
            $stmt->execute();
            $payment_id = $this->conn->lastInsertId();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                'Parent',
                'INITIALIZE_ONLINE_PAYMENT',
                "Payment: $receipt_number",
                'Success',
                "Online payment of $amount initialized for {$student['first_name']} {$student['last_name']}",
                $parent_id
            );
            
            Response::success([
                'payment_id' => $payment_id,
                'reference' => $reference,
                'authorization_url' => $authorization_url,
                'receipt_number' => $receipt_number,
                'amount' => $amount,
                'student_name' => $student['first_name'] . ' ' . $student['last_name']
            ], 'Online payment initialized successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error initializing online payment');
        }
    }
    
    /**
     * Verify Online Payment (Paystack) by Reference
     */
    public function verifyOnlinePayment() {
        $token_data = Middleware::requireAuth();
        Middleware::requireAnyRole(['parent', 'admin', 'accountant']);
        
        $reference = isset($_GET['reference']) ? Middleware::sanitizeString($_GET['reference']) : null;
        
        if (empty($reference)) {
            Response::badRequest('Reference is required');
        }
        
        try {
            // Find payment with this reference
            $payment_query = "SELECT p.*, s.first_name, s.last_name, s.admission_number
                              FROM payments p
                              JOIN students s ON p.student_id = s.id
                              WHERE p.transaction_reference = :reference AND p.status = 'Pending'";
            $payment_stmt = $this->conn->prepare($payment_query);
            $payment_stmt->bindParam(':reference', $reference);
            $payment_stmt->execute();
            
            $payment = $payment_stmt->fetch();
            
            if (!$payment) {
                Response::notFound('Payment not found or already processed');
            }
            
            // Check access permissions for parents
            if ($token_data['role'] === 'parent') {
                $parent_id = $token_data['linked_id'] ?? null;
                if (empty($parent_id)) {
                    $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                    $user_stmt = $this->conn->prepare($user_query);
                    $user_stmt->bindParam(':username', $token_data['username']);
                    $user_stmt->execute();
                    $user_data = $user_stmt->fetch();
                    $parent_id = $user_data['linked_id'] ?? null;
                }
                
                if (empty($parent_id)) {
                    Response::forbidden('Parent ID not found');
                }
                
                // Verify parent owns this student
                $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':parent_id', $parent_id);
                $check_stmt->bindParam(':student_id', $payment['student_id']);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this payment');
                }
            }
            
            // Call Paystack API to verify transaction
            $paystack_secret = $_ENV['PAYSTACK_SECRET_KEY'] ?? getenv('PAYSTACK_SECRET_KEY');
            if (empty($paystack_secret)) {
                Response::serverError('Paystack secret key not configured');
            }
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://api.paystack.co/transaction/verify/$reference");
            curl_setopt($ch, CURLOPT_HTTPGET, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $paystack_secret,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response === false || $http_code !== 200) {
                Response::serverError('Failed to verify payment with Paystack');
            }
            
            $paystack_response = json_decode($response, true);
            
            if (!isset($paystack_response['status']) || $paystack_response['status'] !== true) {
                Response::serverError('Paystack verification failed: ' . ($paystack_response['message'] ?? 'Unknown error'));
            }
            
            $paystack_data = $paystack_response['data'];
            $paystack_status = $paystack_data['status'] ?? 'unknown';
            $paid_amount = $paystack_data['amount'] ?? 0;
            $paid_at = $paystack_data['paid_at'] ?? null;
            
            // Convert paid amount from kobo to Naira
            $paid_amount_naira = $paid_amount / 100;
            
            // Verify amounts match (allowing for small rounding differences)
            if (abs($paid_amount_naira - $payment['amount']) > 1) {
                Response::badRequest('Payment amount mismatch');
            }
            
            if ($paystack_status === 'success') {
                // Update payment as verified
                $update_query = "UPDATE payments SET status = 'Verified', verified_by = :verified_by, verified_date = NOW() 
                                WHERE id = :id";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':verified_by', $verified_by = $token_data['role'] === 'parent' ? $payment['recorded_by'] : ($token_data['linked_id'] ?? $token_data['user_id']));
                $update_stmt->bindParam(':id', $payment['id']);
                $update_stmt->execute();
                
                // Update student fee balance
                $this->updateStudentFeeBalance($payment['student_id'], $payment['amount'], $payment['term'], $payment['academic_year']);
                
                // Log activity
                Middleware::logActivity(
                    $token_data['username'],
                    ucfirst($token_data['role']),
                    'VERIFY_ONLINE_PAYMENT',
                    "Payment: {$payment['receipt_number']}",
                    'Success',
                    "Online payment of {$payment['amount']} verified for {$payment['first_name']} {$payment['last_name']}",
                    $token_data['linked_id'] ?? $token_data['user_id']
                );
                
                Response::success([
                    'payment_id' => $payment['id'],
                    'receipt_number' => $payment['receipt_number'],
                    'amount' => $payment['amount'],
                    'status' => 'Verified',
                    'verified_date' => date('Y-m-d H:i:s'),
                    'student_name' => $payment['first_name'] . ' ' . $payment['last_name'],
                    'paid_at' => $paid_at
                ], 'Payment verified successfully');
                
            } else {
                // Payment failed or abandoned
                $update_query = "UPDATE payments SET status = 'Failed', notes = CONCAT(IFNULL(notes, ''), '\nPaystack status: ', :paystack_status) 
                                WHERE id = :id";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':paystack_status', $paystack_status);
                $update_stmt->bindParam(':id', $payment['id']);
                $update_stmt->execute();
                
                Response::badRequest('Payment was not successful. Status: ' . $paystack_status);
            }
            
        } catch (PDOException $e) {
            Response::serverError('Database error verifying online payment');
        }
    }
    
    /**
     * Generate Receipt Number
     */
    private function generateReceiptNumber() {
        try {
            $prefix = 'GRA';
            $date = date('Ymd');
            
            // Get count for today
            $count_query = "SELECT COUNT(*) as count FROM payments WHERE DATE(recorded_date) = CURDATE()";
            $count_stmt = $this->conn->prepare($count_query);
            $count_stmt->execute();
            $count = $count_stmt->fetch()['count'] + 1;
            
            return $prefix . $date . str_pad($count, 4, '0', STR_PAD_LEFT);
        } catch (PDOException $e) {
            return $prefix . date('Ymd') . '0001';
        }
    }
    
    /**
     * Update Student Fee Balance
     */
    private function updateStudentFeeBalance($student_id, $amount, $term, $academic_year) {
        try {
            // Check if fee balance record exists
            $check_query = "SELECT id, total_paid FROM student_fee_balances 
                           WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':term', $term);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->execute();
            
            $balance_record = $check_stmt->fetch();
            
            if ($balance_record) {
                // Update existing record
                $new_total_paid = $balance_record['total_paid'] + $amount;
                $update_query = "UPDATE student_fee_balances 
                                SET total_paid = :total_paid, 
                                    status = CASE 
                                        WHEN total_fee_required <= :total_paid THEN 'Paid'
                                        WHEN :total_paid > 0 THEN 'Partial'
                                        ELSE 'Unpaid'
                                    END,
                                    last_payment_date = NOW()
                                WHERE id = :id";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':total_paid', $new_total_paid);
                $update_stmt->bindParam(':id', $balance_record['id']);
                $update_stmt->execute();
            }
        } catch (PDOException $e) {
            error_log("Error updating fee balance: " . $e->getMessage());
        }
    }
    
    /**
     * Reverse Student Fee Balance (for rejected payments)
     */
    private function reverseStudentFeeBalance($student_id, $amount, $term, $academic_year) {
        try {
            // Check if fee balance record exists
            $check_query = "SELECT id, total_paid FROM student_fee_balances 
                           WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':term', $term);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->execute();
            
            $balance_record = $check_stmt->fetch();
            
            if ($balance_record && $balance_record['total_paid'] >= $amount) {
                // Update existing record
                $new_total_paid = $balance_record['total_paid'] - $amount;
                $update_query = "UPDATE student_fee_balances 
                                SET total_paid = :total_paid, 
                                    status = CASE 
                                        WHEN total_fee_required <= :total_paid THEN 'Paid'
                                        WHEN :total_paid > 0 THEN 'Partial'
                                        ELSE 'Unpaid'
                                    END
                                WHERE id = :id";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':total_paid', $new_total_paid);
                $update_stmt->bindParam(':id', $balance_record['id']);
                $update_stmt->execute();
            }
        } catch (PDOException $e) {
            error_log("Error reversing fee balance: " . $e->getMessage());
        }
    }
}
?>
