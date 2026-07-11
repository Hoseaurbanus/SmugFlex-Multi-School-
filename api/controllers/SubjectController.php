<?php
/**
 * Subject Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class SubjectController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Subjects
     */
    public function getAllSubjects() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams(['id', 'name', 'code', 'category']);
        
        try {
            $query = "SELECT s.*, 
                             (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub) as assignment_count
                       FROM subjects s";
            
            $count_query = "SELECT COUNT(*) as total FROM subjects s";
            
            // Add search conditions
            $conditions = ["s.school_id = :school_id"];
            $params = [':school_id' => $school_id, ':school_id_sub' => $school_id];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(s.name LIKE :search OR s.code LIKE :search OR s.description LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            if (isset($_GET['category'])) {
                $conditions[] = "s.category = :category";
                $params[':category'] = Middleware::validateEnum($_GET['category'], ['Creche', 'Nursery', 'Primary', 'JSS', 'SS', 'General'], 'category');
            }
            
            if (isset($_GET['is_core'])) {
                $conditions[] = "s.is_core = :is_core";
                $params[':is_core'] = (bool)$_GET['is_core'];
            }
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
                $count_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY s.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $subjects = $stmt->fetchAll();
            
            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                if ($key === ':school_id_sub') continue;
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($subjects, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error retrieving subjects');
        }
    }
    
    /**
     * Get Subject by ID
     */
    public function getSubjectById($id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $subject_id = Middleware::validateInteger($id, 'subject_id');
        
        try {
            $query = "SELECT s.*, 
                             (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub1) as assignment_count,
                             (SELECT GROUP_CONCAT(
                                 JSON_OBJECT(
                                     'class_id', sa.class_id,
                                     'class_name', c.name,
                                     'level', c.level,
                                     'teacher_name', CONCAT(t.first_name, ' ', t.last_name),
                                     'academic_year', sa.academic_year,
                                     'term', sa.term
                                 )
                              ) 
                              FROM subject_assignments sa 
                              JOIN classes c ON sa.class_id = c.id 
                              JOIN teachers t ON sa.teacher_id = t.id
                              WHERE sa.subject_id = s.id AND sa.status = 'Active' AND sa.school_id = :school_id_sub2) as assignments
                       FROM subjects s
                       WHERE s.id = :id AND s.school_id = :school_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $subject_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->bindParam(':school_id_sub1', $school_id);
            $stmt->bindParam(':school_id_sub2', $school_id);
            $stmt->execute();
            
            $subject = $stmt->fetch();
            
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            
            // Parse assignments JSON
            if ($subject['assignments']) {
                $subject['assignments'] = json_decode('[' . $subject['assignments'] . ']', true);
            } else {
                $subject['assignments'] = [];
            }
            
            Response::success($subject, 'Subject retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error retrieving subject');
        }
    }
    
    /**
     * Create New Subject
     */
    public function createSubject() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['name', 'code', 'category']);
        
        try {
            // Check if code already exists
            $code = Middleware::sanitizeString($data['code']);
            $name = Middleware::sanitizeString($data['name']);
            
            $check_query = "SELECT id FROM subjects WHERE code = :code AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':code', $code);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::conflict('Subject with this code already exists');
            }
            
            // Validate and prepare data
            $category = Middleware::validateEnum($data['category'], ['Creche', 'Nursery', 'Primary', 'JSS', 'SS', 'General'], 'category');
            $department = isset($data['department']) ? Middleware::sanitizeString($data['department']) : null;
            $description = isset($data['description']) ? Middleware::sanitizeString($data['description']) : null;
            $is_core = isset($data['is_core']) ? (bool)$data['is_core'] : false;
            
            // Insert subject
            $query = "INSERT INTO subjects (name, code, category, department, description, is_core, status, school_id)
                      VALUES (:name, :code, :category, :department, :description, :is_core, 'Active', :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':code', $code);
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':department', $department);
            $stmt->bindParam(':description', $description);
            $stmt->bindValue(':is_core', $is_core ? 1 : 0, PDO::PARAM_INT);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $subject_id = $this->conn->lastInsertId();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_SUBJECT',
                "Subject: $name ($code)",
                'Success',
                'New subject created',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['subjects', 'subject_assignments', 'scores', 'compiled_results'], [
                'action' => 'created',
                'subject_id' => (int)$subject_id,
            ]);
            
            Response::created(['id' => $subject_id], 'Subject created successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController.createSubject: " . $e->getMessage());
            if ($e->getCode() == 23000) {
                Response::conflict('Duplicate entry detected');
            }
            Response::serverError('Database error creating subject');
        }
    }
    
    /**
     * Update Subject
     */
    public function updateSubject($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $subject_id = Middleware::validateInteger($id, 'subject_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if subject exists
            $check_query = "SELECT * FROM subjects WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $subject_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_subject = $check_stmt->fetch();
            if (!$existing_subject) {
                Response::notFound('Subject not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $subject_id];
            
            $allowed_fields = ['name', 'code', 'category', 'department', 'description', 'is_core', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'category') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Creche', 'Nursery', 'Primary', 'JSS', 'SS', 'General'], $field);
                    } elseif ($field === 'is_core' || $field === 'status') {
                        $update_fields[] = "$field = :$field";
                        if ($field === 'status') {
                            $params[':' . $field] = Middleware::validateEnum($data[$field], ['Active', 'Inactive'], $field);
                        } else {
                            $params[':' . $field] = (bool)$data[$field];
                        }
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            $query = "UPDATE subjects SET " . implode(', ', $update_fields) . " WHERE id = :id AND school_id = :school_id";
            $params[':school_id'] = $school_id;
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'UPDATE_SUBJECT',
                "Subject ID: $subject_id",
                'Success',
                'Subject information updated',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['subjects', 'subject_assignments', 'scores', 'compiled_results'], [
                'action' => 'updated',
                'subject_id' => (int)$subject_id,
            ]);
            
            Response::success(null, 'Subject updated successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error updating subject');
        }
    }
    
    /**
     * Delete Subject
     */
    public function deleteSubject($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $subject_id = Middleware::validateInteger($id, 'subject_id');
        
        try {
            // Check if subject exists
            $check_query = "SELECT name, code FROM subjects WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $subject_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $subject = $check_stmt->fetch();
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            
            // Check for active assignments
            $assignment_check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE subject_id = :subject_id AND status = 'Active' AND school_id = :school_id";
            $assignment_check_stmt = $this->conn->prepare($assignment_check_query);
            $assignment_check_stmt->bindParam(':subject_id', $subject_id);
            $assignment_check_stmt->bindParam(':school_id', $school_id);
            $assignment_check_stmt->execute();
            
            if ($assignment_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete subject with active assignments');
            }
            
            // Delete subject
            $query = "DELETE FROM subjects WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $subject_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_SUBJECT',
                "Subject: {$subject['name']} ({$subject['code']})",
                'Success',
                'Subject deleted',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['subjects', 'subject_assignments', 'scores', 'compiled_results'], [
                'action' => 'deleted',
                'subject_id' => (int)$subject_id,
            ]);
            
            Response::success(null, 'Subject deleted successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error deleting subject');
        }
    }
    
    /**
     * Get Subjects by Category
     */
    public function getSubjectsByCategory($category) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $category = Middleware::validateEnum($category, ['Creche', 'Nursery', 'Primary', 'JSS', 'SS', 'General'], 'category');
        
        try {
            $query = "SELECT s.*, 
                             (SELECT COUNT(*) FROM subject_assignments WHERE subject_id = s.id AND status = 'Active' AND school_id = :school_id_sub) as assignment_count
                       FROM subjects s
                       WHERE s.category = :category AND s.status = 'Active' AND s.school_id = :school_id
                       ORDER BY s.is_core DESC, s.name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->bindParam(':school_id_sub', $school_id);
            $stmt->execute();
            
            $subjects = $stmt->fetchAll();
            
            Response::success($subjects, 'Subjects by category retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error retrieving subjects by category');
        }
    }
    
    /**
     * Assign Subject to Class and Teacher
     */
    public function assignSubject() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Handle array format (frontend sends array of assignments)
        if (is_array($data) && isset($data[0])) {
            $data = $data[0]; // Take first assignment from array
        }
        
        // Validate required fields
        Middleware::validateRequired($data, ['subject_id', 'class_id', 'teacher_id', 'academic_year', 'term']);
        
        try {
            // Restore proper validation
            $subject_id = Middleware::validateInteger($data['subject_id'], 'subject_id');
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $teacher_id = Middleware::validateInteger($data['teacher_id'], 'teacher_id');
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            $term = Middleware::validateEnum($data['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            
            // Check if this subject is already assigned to ANY teacher in the same class for this academic year and term
            // This prevents duplicate subject assignments in the same class, but allows:
            // - Same subject in different classes with any teacher
            // - Same teacher teaching same subject in different classes
            $check_query = "SELECT id, teacher_id FROM subject_assignments 
                           WHERE subject_id = :subject_id AND class_id = :class_id AND academic_year = :academic_year AND term = :term AND status = 'Active' AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':subject_id', $subject_id);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->bindParam(':term', $term);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_assignment = $check_stmt->fetch();
            if ($existing_assignment) {
                // Get the existing teacher's name for a clearer error message
                $teacher_query = "SELECT CONCAT(first_name, ' ', last_name) as teacher_name FROM teachers WHERE id = :teacher_id AND school_id = :school_id";
                $teacher_stmt = $this->conn->prepare($teacher_query);
                $teacher_stmt->bindParam(':teacher_id', $existing_assignment['teacher_id']);
                $teacher_stmt->bindParam(':school_id', $school_id);
                $teacher_stmt->execute();
                $teacher_name = $teacher_stmt->fetch()['teacher_name'];
                
                Response::conflict("This subject is already assigned to '{$teacher_name}' for this class in {$academic_year} {$term}. Each subject can only be assigned to one teacher per class per term.");
            }
            
            // Verify subject, class, and teacher exist
            $verify_query = "SELECT s.name as subject_name, c.name as class_name, CONCAT(t.first_name, ' ', t.last_name) as teacher_name
                            FROM subjects s, classes c, teachers t
                            WHERE s.id = :subject_id AND c.id = :class_id AND t.id = :teacher_id
                            AND s.status = 'Active' AND c.status = 'Active' AND t.status = 'Active'
                            AND s.school_id = :school_id AND c.school_id = :school_id AND t.school_id = :school_id";
            $verify_stmt = $this->conn->prepare($verify_query);
            $verify_stmt->bindParam(':subject_id', $subject_id);
            $verify_stmt->bindParam(':class_id', $class_id);
            $verify_stmt->bindParam(':teacher_id', $teacher_id);
            $verify_stmt->bindParam(':school_id', $school_id);
            $verify_stmt->execute();
            
            $verification = $verify_stmt->fetch();
            if (!$verification) {
                Response::badRequest('Invalid subject, class, or teacher ID');
            }
            
            // Create assignment
            $query = "INSERT INTO subject_assignments (subject_id, class_id, teacher_id, academic_year, term, status, school_id)
                      VALUES (:subject_id, :class_id, :teacher_id, :academic_year, :term, 'Active', :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':subject_id', $subject_id);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':teacher_id', $teacher_id);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $assignment_id = $this->conn->lastInsertId();
            
            // Update teacher assignment count (safe: catches missing column)
            try {
                $update_count_query = "UPDATE teachers SET assignment_count = (
                    SELECT COUNT(*) FROM subject_assignments 
                    WHERE teacher_id = :teacher_id AND status = 'Active' AND school_id = :school_id
                ) WHERE id = :teacher_id AND school_id = :school_id";
                $update_stmt = $this->conn->prepare($update_count_query);
                $update_stmt->bindParam(':teacher_id', $teacher_id);
                $update_stmt->bindParam(':school_id', $school_id);
                $update_stmt->execute();
            } catch (PDOException $e) {
                error_log("SubjectController: Could not update assignment_count: " . $e->getMessage());
            }
            
            // Update class assignment count (safe: catches missing column)
            try {
                $update_class_count_query = "UPDATE classes SET current_assignments = (
                    SELECT COUNT(*) FROM subject_assignments 
                    WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id
                ) WHERE id = :class_id AND school_id = :school_id";
                $update_class_stmt = $this->conn->prepare($update_class_count_query);
                $update_class_stmt->bindParam(':class_id', $class_id);
                $update_class_stmt->bindParam(':school_id', $school_id);
                $update_class_stmt->execute();
            } catch (PDOException $e) {
                error_log("SubjectController: Could not update current_assignments: " . $e->getMessage());
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'ASSIGN_SUBJECT',
                "Subject: {$verification['subject_name']} to Class: {$verification['class_name']} by Teacher: {$verification['teacher_name']}",
                'Success',
                'Subject assigned successfully',
                $token_data['user_id'] ?? null
            );

            RealtimeEvents::publish(['subject_assignments', 'classes', 'teachers', 'scores', 'compiled_results'], [
                'action' => 'created',
                'assignment_id' => (int)$assignment_id,
                'class_id' => (int)$class_id,
                'teacher_id' => (int)$teacher_id,
                'subject_id' => (int)$subject_id,
                'term' => (string)$term,
                'academic_year' => (string)$academic_year,
            ]);
            
            Response::created([
                'id' => $assignment_id,
                'message' => 'Subject assigned successfully',
                'updated_counts' => [
                    'teacher_assignment_count' => $this->getTeacherAssignmentCount($teacher_id, $school_id),
                    'class_assignment_count' => $this->getClassAssignmentCount($class_id, $school_id)
                ]
            ], 'Subject assigned successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error assigning subject: ' . $e->getMessage());
        }
    }
    
    /**
     * Get teacher assignment count
     */
    private function getTeacherAssignmentCount($teacher_id, $school_id) {
        $query = "SELECT COUNT(*) as count FROM subject_assignments 
                 WHERE teacher_id = :teacher_id AND status = 'Active' AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':teacher_id', $teacher_id);
        $stmt->bindParam(':school_id', $school_id);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result['count'] ?? 0;
    }
    
    /**
     * Get class assignment count
     */
    private function getClassAssignmentCount($class_id, $school_id) {
        $query = "SELECT COUNT(*) as count FROM subject_assignments 
                 WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':class_id', $class_id);
        $stmt->bindParam(':school_id', $school_id);
        $stmt->execute();
        $result = $stmt->fetch();
        return $result['count'] ?? 0;
    }
    
    /**
     * Update Subject Assignment
     */
    public function updateAssignment($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $assignment_id = Middleware::validateInteger($id, 'assignment_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if assignment exists
            $check_query = "SELECT * FROM subject_assignments WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $assignment_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_assignment = $check_stmt->fetch();
            if (!$existing_assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $assignment_id];
            
            $allowed_fields = ['subject_id', 'class_id', 'teacher_id', 'academic_year', 'term', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'term') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['First Term', 'Second Term', 'Third Term'], $field);
                    } elseif ($field === 'status') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Active', 'Inactive'], $field);
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateInteger($data[$field], $field);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            $query = "UPDATE subject_assignments SET " . implode(', ', $update_fields) . " WHERE id = :id AND school_id = :school_id";
            $params[':school_id'] = $school_id;
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();

            RealtimeEvents::publish(['subject_assignments', 'classes', 'teachers', 'scores', 'compiled_results'], [
                'action' => 'updated',
                'assignment_id' => (int)$assignment_id,
            ]);

            Response::success(null, 'Assignment updated successfully');
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error updating assignment');
        }
    }
    
    /**
     * Delete Subject Assignment
     */
    public function deleteAssignment($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $assignment_id = Middleware::validateInteger($id, 'assignment_id');
        
        try {
            // Check if assignment exists
            $check_query = "SELECT sa.*, s.name as subject_name, c.name as class_name, CONCAT(t.first_name, ' ', t.last_name) as teacher_name
                            FROM subject_assignments sa
                            JOIN subjects s ON sa.subject_id = s.id
                            JOIN classes c ON sa.class_id = c.id
                            JOIN teachers t ON sa.teacher_id = t.id
                            WHERE sa.id = :id AND sa.school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $assignment_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $assignment = $check_stmt->fetch();
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Check for existing scores
            $score_check_query = "SELECT COUNT(*) as count FROM scores WHERE subject_assignment_id = :assignment_id AND school_id = :school_id";
            $score_check_stmt = $this->conn->prepare($score_check_query);
            $score_check_stmt->bindParam(':assignment_id', $assignment_id);
            $score_check_stmt->bindParam(':school_id', $school_id);
            $score_check_stmt->execute();
            
            if ($score_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete assignment with existing scores');
            }
            
            // Delete assignment
            $query = "DELETE FROM subject_assignments WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $assignment_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_ASSIGNMENT',
                "Assignment: {$assignment['subject_name']} - {$assignment['class_name']} by {$assignment['teacher_name']}",
                'Success',
                'Subject assignment deleted',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['subject_assignments', 'classes', 'teachers', 'scores', 'compiled_results'], [
                'action' => 'deleted',
                'assignment_id' => (int)$assignment_id,
            ]);
            
            Response::success(null, 'Assignment deleted successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in SubjectController: " . $e->getMessage());
            Response::serverError('Database error deleting assignment');
        }
    }
    /**
     * Get Subject Assignments
     */
    public function getAssignments() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        // Clean output buffer to prevent HTML contamination
        if (ob_get_length()) ob_clean();
        
        try {
            $query = "SELECT sa.*, sub.name as subject_name, sub.code as subject_code, sub.category,
                             c.name as class_name, c.level,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name, t.employee_id
                      FROM subject_assignments sa
                      JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :school_id
                      JOIN classes c ON sa.class_id = c.id AND c.school_id = :school_id
                      JOIN teachers t ON sa.teacher_id = t.id AND t.school_id = :school_id
                      WHERE sa.status = 'Active' AND sa.school_id = :school_id";
            
            $conditions = [];
            $params = [':school_id' => $school_id];
            
            // Add optional term/year filters
            if (!empty($_GET['term'])) {
                $conditions[] = "sa.term = :term";
                $params[':term'] = $_GET['term'];
            }
            
            if (!empty($_GET['academic_year'])) {
                $conditions[] = "sa.academic_year = :academic_year";
                $params[':academic_year'] = $_GET['academic_year'];
            }
            
            if (!empty($conditions)) {
                $query .= " AND " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY sa.id";
            
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Return assignments without pagination
            Response::success($assignments, 'All subject assignments retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getAssignments: " . $e->getMessage());
            Response::serverError('Database error retrieving assignments');
        } catch (Exception $e) {
            error_log("General error in getAssignments: " . $e->getMessage());
            Response::serverError('Error retrieving assignments');
        }
    }
}
?>
