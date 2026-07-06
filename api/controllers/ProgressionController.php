<?php
/**
 * Class Progression Controller
 * Handles dynamic class progression rules and validation
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class ProgressionController {
    private $conn;
    
    public function __construct($database) {
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get progression rules for academic year
     */
    public function getProgressionRules() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $academic_year = $_GET['academic_year'] ?? '2024/2025';
        
        try {
            $query = "SELECT cpr.*, 
                             c_from.name as from_class_name, 
                             c_to.name as to_class_name
                      FROM class_progression_rules cpr
                      JOIN classes c_from ON cpr.from_class_id = c_from.id
                      JOIN classes c_to ON cpr.to_class_id = c_to.id
                      WHERE cpr.academic_year = :academic_year AND cpr.is_active = 1 AND cpr.school_id = :school_id
                      ORDER BY c_from.level, c_from.name, c_to.level, c_to.name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            Response::success($rules, 'Progression rules retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving progression rules');
        }
    }
    
    /**
     * Create progression rule
     */
    public function createProgressionRule() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['from_class_id', 'to_class_id', 'academic_year']);
        
        $from_class_id = Middleware::validateInteger($data['from_class_id'], 'from_class_id');
        $to_class_id = Middleware::validateInteger($data['to_class_id'], 'to_class_id');
        $academic_year = Middleware::sanitizeString($data['academic_year']);
        $is_active = $data['is_active'] ?? true;
        
        try {
            // Check if rule already exists
            $check_query = "SELECT id FROM class_progression_rules 
                           WHERE from_class_id = :from_class_id AND to_class_id = :to_class_id 
                           AND academic_year = :academic_year AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':from_class_id', $from_class_id);
            $check_stmt->bindParam(':to_class_id', $to_class_id);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::error('Progression rule already exists');
                return;
            }
            
            // Create new rule
            $query = "INSERT INTO class_progression_rules 
                      (from_class_id, to_class_id, academic_year, is_active, school_id) 
                      VALUES (:from_class_id, :to_class_id, :academic_year, :is_active, :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':from_class_id', $from_class_id);
            $stmt->bindParam(':to_class_id', $to_class_id);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':is_active', $is_active);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $rule_id = $this->conn->lastInsertId();
            
            // Log activity
            Middleware::logActivity(
                $_SESSION['user_id'] ?? null,
                'Admin',
                'CREATE_PROGRESSION_RULE',
                "Created progression rule from class {$from_class_id} to {$to_class_id}",
                'Success',
                'Progression rule created successfully',
                $_SERVER['REMOTE_ADDR']
            );
            
            Response::created(['id' => $rule_id], 'Progression rule created successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error creating progression rule');
        }
    }
    
    /**
     * Validate promotion for a student
     */
    public function validatePromotion($studentId, $toClassId, $academicYear) {
        try {
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            // Get student's current class
            $student_query = "SELECT class_id, school_id FROM students WHERE id = :student_id";
            $student_stmt = $this->conn->prepare($student_query);
            $student_stmt->bindParam(':student_id', $studentId);
            $student_stmt->execute();
            $student = $student_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$student) {
                return ['valid' => false, 'message' => 'Student not found'];
            }
            
            $from_class_id = $student['class_id'];
            
            // Check if progression rule exists
            $rule_query = "SELECT COUNT(*) as count FROM class_progression_rules 
                          WHERE from_class_id = :from_class_id AND to_class_id = :to_class_id 
                          AND academic_year = :academic_year AND is_active = 1 AND school_id = :school_id";
            $rule_stmt = $this->conn->prepare($rule_query);
            $rule_stmt->bindParam(':from_class_id', $from_class_id);
            $rule_stmt->bindParam(':to_class_id', $toClassId);
            $rule_stmt->bindParam(':academic_year', $academicYear);
            $rule_stmt->bindParam(':school_id', $school_id);
            $rule_stmt->execute();
            $rule = $rule_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($rule['count'] == 0) {
                return ['valid' => false, 'message' => 'Invalid progression path'];
            }
            
            return ['valid' => true, 'message' => 'Promotion path is valid'];
            
        } catch (PDOException $e) {
            return ['valid' => false, 'message' => 'Database error during validation'];
        }
    }
    
    /**
     * Update progression rule
     */
    public function updateProgressionRule($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $rule_id = Middleware::validateInteger($id, 'rule_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $query = "UPDATE class_progression_rules 
                      SET is_active = :is_active, updated_at = CURRENT_TIMESTAMP
                      WHERE id = :rule_id AND school_id = :school_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':is_active', $data['is_active']);
            $stmt->bindParam(':rule_id', $rule_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            Response::success(null, 'Progression rule updated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating progression rule');
        }
    }
    
    /**
     * Delete progression rule
     */
    public function deleteProgressionRule($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $rule_id = Middleware::validateInteger($id, 'rule_id');
        
        try {
            $query = "DELETE FROM class_progression_rules WHERE id = :rule_id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':rule_id', $rule_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            Response::success(null, 'Progression rule deleted successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error deleting progression rule');
        }
    }
}
?>
