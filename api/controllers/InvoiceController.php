<?php
/**
 * Invoice Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class InvoiceController {
    private $conn;
    private $school_id;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        $this->ensureSchema();
    }

    private function ensureSchema() {
        try {
            // Create invoices table if missing
            $this->conn->exec("CREATE TABLE IF NOT EXISTS student_term_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                class_id INT NOT NULL,
                term VARCHAR(20) NOT NULL,
                academic_year VARCHAR(20) NOT NULL,
                fee_structure_id INT NULL,
                fee_total DECIMAL(12,2) NOT NULL DEFAULT 0,
                brought_forward DECIMAL(12,2) NOT NULL DEFAULT 0,
                invoice_total DECIMAL(12,2) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                version INT NOT NULL DEFAULT 1,
                created_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_invoice_student_term (student_id, academic_year, term),
                INDEX idx_invoice_class_term (class_id, academic_year, term),
                INDEX idx_invoice_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            // Ensure payments has invoice_id column
            $col_stmt = $this->conn->prepare("SHOW COLUMNS FROM payments LIKE 'invoice_id'");
            $col_stmt->execute();
            $col = $col_stmt->fetch(PDO::FETCH_ASSOC);
            if (!$col) {
                $this->conn->exec("ALTER TABLE payments ADD COLUMN invoice_id INT NULL AFTER student_id");
                $this->conn->exec("CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)");
            }
        } catch (PDOException $e) {
            // Don't block API if schema check fails
            error_log('Invoice schema ensure failed: ' . $e->getMessage());
        }
    }

    private function getPreviousTermYear($term, $academic_year) {
        // academic_year format expected: YYYY/YYYY
        $parts = explode('/', $academic_year);
        $startYear = isset($parts[0]) ? intval($parts[0]) : intval(date('Y'));
        $endYear = isset($parts[1]) ? intval($parts[1]) : ($startYear + 1);

        if ($term === 'First Term') {
            $prevStart = $startYear - 1;
            $prevEnd = $endYear - 1;
            return ['term' => 'Third Term', 'academic_year' => $prevStart . '/' . $prevEnd];
        }

        if ($term === 'Second Term') {
            return ['term' => 'First Term', 'academic_year' => $academic_year];
        }

        // Third Term
        return ['term' => 'Second Term', 'academic_year' => $academic_year];
    }

    private function getVerifiedPaidTotalByInvoice($invoice_id) {
        // Include reversed originals so (original amount + reversal negative) nets to 0
        $query = "SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE invoice_id = :invoice_id AND status IN ('Verified','Reversed') AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':invoice_id', $invoice_id);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return floatval($row['total'] ?? 0);
    }

    private function getBroughtForwardForStudent($student_id, $term, $academic_year) {
        $prev = $this->getPreviousTermYear($term, $academic_year);

        try {
            // Find previous term invoice (prefer Active, but accept any)
            $inv_query = "SELECT id, invoice_total FROM student_term_invoices
                          WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id
                          ORDER BY (status = 'Active') DESC, version DESC, id DESC
                          LIMIT 1";
            $inv_stmt = $this->conn->prepare($inv_query);
            $inv_stmt->bindParam(':student_id', $student_id);
            $inv_stmt->bindParam(':term', $prev['term']);
            $inv_stmt->bindParam(':academic_year', $prev['academic_year']);
            $inv_stmt->bindParam(':school_id', $this->school_id);
            $inv_stmt->execute();
            $inv = $inv_stmt->fetch(PDO::FETCH_ASSOC);

            if ($inv) {
                $paid = $this->getVerifiedPaidTotalByInvoice($inv['id']);
                return floatval($inv['invoice_total']) - $paid;
            }

            // Fallback to student_fee_balances for previous term if present (best-effort)
            $bal_query = "SELECT total_fee_required, total_paid FROM student_fee_balances
                          WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id
                          ORDER BY id DESC LIMIT 1";
            $bal_stmt = $this->conn->prepare($bal_query);
            $bal_stmt->bindParam(':student_id', $student_id);
            $bal_stmt->bindParam(':term', $prev['term']);
            $bal_stmt->bindParam(':academic_year', $prev['academic_year']);
            $bal_stmt->bindParam(':school_id', $this->school_id);
            $bal_stmt->execute();
            $bal = $bal_stmt->fetch(PDO::FETCH_ASSOC);

            if ($bal) {
                return floatval($bal['total_fee_required']) - floatval($bal['total_paid']);
            }

            return 0.0;
        } catch (PDOException $e) {
            error_log('Error computing brought forward: ' . $e->getMessage());
            return 0.0;
        }
    }

    private function getFeeStructureForClass($class_id, $term, $academic_year) {
        $query = "SELECT * FROM fee_structures WHERE class_id = :class_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id ORDER BY id DESC LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':class_id', $class_id);
        $stmt->bindParam(':term', $term);
        $stmt->bindParam(':academic_year', $academic_year);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getActiveInvoiceForStudent($student_id, $term, $academic_year) {
        $query = "SELECT * FROM student_term_invoices WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND status = 'Active' AND school_id = :school_id ORDER BY version DESC, id DESC LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->bindParam(':term', $term);
        $stmt->bindParam(':academic_year', $academic_year);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getMaxInvoiceVersion($student_id, $term, $academic_year) {
        $query = "SELECT COALESCE(MAX(version),0) as max_version FROM student_term_invoices WHERE student_id = :student_id AND term = :term AND academic_year = :academic_year AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->bindParam(':term', $term);
        $stmt->bindParam(':academic_year', $academic_year);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return intval($row['max_version'] ?? 0);
    }

    private function hasVerifiedPaymentsForInvoice($invoice_id) {
        $query = "SELECT COUNT(*) as cnt FROM payments WHERE invoice_id = :invoice_id AND status IN ('Verified','Reversed') AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':invoice_id', $invoice_id);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return intval($row['cnt'] ?? 0) > 0;
    }

    private function createOrUpdateInvoiceForStudent($student_id, $class_id, $term, $academic_year, $fee_structure, $created_by) {
        $fee_total = floatval($fee_structure['total_fee'] ?? 0);
        $brought_forward = $this->getBroughtForwardForStudent($student_id, $term, $academic_year);
        $invoice_total = $fee_total + $brought_forward;
        $fee_structure_id = isset($fee_structure['id']) ? intval($fee_structure['id']) : null;

        $existing = $this->getActiveInvoiceForStudent($student_id, $term, $academic_year);
        if ($existing) {
            $hasVerified = $this->hasVerifiedPaymentsForInvoice($existing['id']);

            if (!$hasVerified) {
                $update_query = "UPDATE student_term_invoices
                                 SET class_id = :class_id,
                                     fee_structure_id = :fee_structure_id,
                                     fee_total = :fee_total,
                                     brought_forward = :brought_forward,
                                     invoice_total = :invoice_total
                                 WHERE id = :id AND school_id = :school_id";
                $stmt = $this->conn->prepare($update_query);
                $stmt->bindParam(':class_id', $class_id);
                $stmt->bindParam(':fee_structure_id', $fee_structure_id);
                $stmt->bindParam(':fee_total', $fee_total);
                $stmt->bindParam(':brought_forward', $brought_forward);
                $stmt->bindParam(':invoice_total', $invoice_total);
                $stmt->bindParam(':id', $existing['id']);
                $stmt->bindParam(':school_id', $this->school_id);
                $stmt->execute();

                return intval($existing['id']);
            }

            // Supersede existing invoice
            $sup_query = "UPDATE student_term_invoices SET status = 'Superseded' WHERE id = :id AND school_id = :school_id";
            $sup_stmt = $this->conn->prepare($sup_query);
            $sup_stmt->bindParam(':id', $existing['id']);
            $sup_stmt->bindParam(':school_id', $this->school_id);
            $sup_stmt->execute();
        }

        $new_version = $this->getMaxInvoiceVersion($student_id, $term, $academic_year) + 1;

        $insert_query = "INSERT INTO student_term_invoices
                         (student_id, class_id, term, academic_year, fee_structure_id, fee_total, brought_forward, invoice_total, status, version, created_by, school_id)
                         VALUES
                         (:student_id, :class_id, :term, :academic_year, :fee_structure_id, :fee_total, :brought_forward, :invoice_total, 'Active', :version, :created_by, :school_id)";
        $stmt = $this->conn->prepare($insert_query);
        $stmt->bindParam(':student_id', $student_id);
        $stmt->bindParam(':class_id', $class_id);
        $stmt->bindParam(':term', $term);
        $stmt->bindParam(':academic_year', $academic_year);
        $stmt->bindParam(':fee_structure_id', $fee_structure_id);
        $stmt->bindParam(':fee_total', $fee_total);
        $stmt->bindParam(':brought_forward', $brought_forward);
        $stmt->bindParam(':invoice_total', $invoice_total);
        $stmt->bindParam(':version', $new_version);
        $stmt->bindParam(':created_by', $created_by);
        $stmt->bindParam(':school_id', $this->school_id);
        $stmt->execute();

        return intval($this->conn->lastInsertId());
    }

    /**
     * POST /invoices/auto-generate
     */
    public function autoGenerateInvoices() {
        $token_data = Middleware::requireAnyRole(['admin', 'accountant']);
        $school_id = $this->school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $data = json_decode(file_get_contents('php://input'), true);
        Middleware::validateRequired($data, ['class_id', 'term', 'academic_year']);

        $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
        $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
        $academic_year = Middleware::sanitizeString($data['academic_year']);

        // Validate academic year format (YYYY/YYYY)
        if (!preg_match('/^\d{4}\/\d{4}$/', $academic_year)) {
            Response::badRequest('Academic year must be in YYYY/YYYY format (e.g., 2024/2025)');
        }

        // Validate that second year is consecutive to first year
        $yearParts = explode('/', $academic_year);
        if (count($yearParts) === 2) {
            $firstYear = intval($yearParts[0]);
            $secondYear = intval($yearParts[1]);
            if ($secondYear !== $firstYear + 1) {
                Response::badRequest('Academic year must have consecutive years (e.g., 2024/2025)');
            }
        }

        try {
            // Ensure class exists
            $cls_stmt = $this->conn->prepare("SELECT id, name FROM classes WHERE id = :id AND school_id = :school_id");
            $cls_stmt->bindParam(':id', $class_id);
            $cls_stmt->bindParam(':school_id', $this->school_id);
            $cls_stmt->execute();
            $cls = $cls_stmt->fetch(PDO::FETCH_ASSOC);
            if (!$cls) {
                Response::notFound('Class not found');
            }

            $fee_structure = $this->getFeeStructureForClass($class_id, $term, $academic_year);
            if (!$fee_structure) {
                Response::badRequest('Fee structure not found for selected class, term and academic year');
            }

            // Fetch active students in class
            $students_query = "SELECT id FROM students WHERE class_id = :class_id AND (status IS NULL OR status = 'Active') AND school_id = :school_id";
            $students_stmt = $this->conn->prepare($students_query);
            $students_stmt->bindParam(':class_id', $class_id);
            $students_stmt->bindParam(':school_id', $this->school_id);
            $students_stmt->execute();
            $students = $students_stmt->fetchAll(PDO::FETCH_ASSOC);

            $created_by = $_SESSION['user_id'] ?? null;

            $generated = 0;
            $invoice_ids = [];

            foreach ($students as $s) {
                $invId = $this->createOrUpdateInvoiceForStudent(intval($s['id']), $class_id, $term, $academic_year, $fee_structure, $created_by);
                $invoice_ids[] = $invId;
                $generated++;
            }

            RealtimeEvents::publish(['payments', 'students', 'notifications'], [
                'action' => 'invoices_generated',
                'class_id' => (int)$class_id,
                'term' => (string)$term,
                'academic_year' => (string)$academic_year,
            ]);

            Response::success([
                'class_id' => $class_id,
                'term' => $term,
                'academic_year' => $academic_year,
                'generated_count' => $generated,
                'invoice_ids' => $invoice_ids
            ], 'Invoices generated successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in InvoiceController: " . $e->getMessage());
            Response::serverError('Database error generating invoices');
        }
    }

    /**
     * GET /invoices/student/{student_id}
     */
    public function getStudentInvoice($student_id) {
        $token_data = Middleware::requireAuth();
        $school_id = $this->school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $student_id = Middleware::validateInteger($student_id, 'student_id');

        $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : null;
        $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;

        if (empty($term) || empty($academic_year)) {
            Response::badRequest('term and academic_year are required');
        }

        // Parent access check
        if ($token_data['role'] === 'parent') {
            $check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $token_data['linked_id']);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->bindParam(':school_id', $this->school_id);
            $check_stmt->execute();

            if ($check_stmt->fetch()['count'] == 0) {
                Response::forbidden('Access denied to this student');
            }
        }

        try {
            $invoice = $this->getActiveInvoiceForStudent($student_id, $term, $academic_year);
            if (!$invoice) {
                Response::notFound('Invoice not found');
            }

            $paid_total = $this->getVerifiedPaidTotalByInvoice($invoice['id']);
            $invoice_total = floatval($invoice['invoice_total']);
            $outstanding = $invoice_total - $paid_total;

            Response::success([
                'invoice' => $invoice,
                'paid_total' => $paid_total,
                'outstanding' => $outstanding,
                'credit' => $outstanding < 0 ? abs($outstanding) : 0
            ], 'Invoice retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in InvoiceController: " . $e->getMessage());
            Response::serverError('Database error retrieving invoice');
        }
    }

    /**
     * GET /invoices/class/{class_id}
     */
    public function getClassInvoices($class_id) {
        $token_data = Middleware::requireAnyRole(['admin', 'accountant']);
        $school_id = $this->school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $class_id = Middleware::validateInteger($class_id, 'class_id');

        $term = isset($_GET['term']) ? Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term') : null;
        $academic_year = isset($_GET['academic_year']) ? Middleware::sanitizeString($_GET['academic_year']) : null;

        if (empty($term) || empty($academic_year)) {
            Response::badRequest('term and academic_year are required');
        }

        try {
            $query = "SELECT i.*, s.first_name, s.last_name, s.admission_number,
                             COALESCE(p.paid_total, 0) as paid_total,
                             (i.invoice_total - COALESCE(p.paid_total, 0)) as outstanding
                      FROM student_term_invoices i
                      JOIN students s ON i.student_id = s.id
                      LEFT JOIN (
                        SELECT invoice_id, SUM(amount) as paid_total
                        FROM payments
                        WHERE status = 'Verified'
                        GROUP BY invoice_id
                      ) p ON p.invoice_id = i.id
                       WHERE i.class_id = :class_id AND i.term = :term AND i.academic_year = :academic_year AND i.status = 'Active' AND i.school_id = :school_id
                       ORDER BY s.last_name, s.first_name";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':school_id', $this->school_id);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            Response::success($rows, 'Class invoices retrieved successfully');

        } catch (PDOException $e) {
            error_log("PDO Error in InvoiceController: " . $e->getMessage());
            Response::serverError('Database error retrieving class invoices');
        }
    }
}
?>
