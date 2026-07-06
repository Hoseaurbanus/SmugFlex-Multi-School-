<?php
/**
 * Class Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class ClassController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }


    /**
     * Get All Classes
     */
    public function getAllClasses() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams(['id', 'name', 'level', 'class_teacher', 'current_students']);
        
        try {
            $query = "SELECT c.*, 
                             CONCAT(t.first_name, ' ', t.last_name) as class_teacher_name,
                             (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'Active' AND school_id = c.school_id) as current_students,
                             (SELECT COUNT(*) FROM subject_assignments WHERE class_id = c.id AND status = 'Active' AND school_id = c.school_id) as subject_count
                      FROM classes c
                      LEFT JOIN teachers t ON c.class_teacher_id = t.id";
            
            $count_query = "SELECT COUNT(*) as total FROM classes c";
            
            // Add search conditions
            $conditions = ['c.school_id = :school_id'];
            $params = [':school_id' => $school_id];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(c.name LIKE :search OR c.level LIKE :search OR c.section LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
                $count_query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY c.{$search_params['sort_by']} {$search_params['sort_order']}";
            $query .= " LIMIT :limit OFFSET :offset";
            
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
            $stmt->execute();
            
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map fields to camelCase for frontend consistency
            $mappedClasses = array_map(function($class) {
                return [
                    'id' => $class['id'],
                    'name' => $class['name'],
                    'level' => $class['level'],
                    'section' => $class['section'],
                    'category' => $class['category'],
                    'capacity' => (int)$class['capacity'],
                    'currentStudents' => (int)$class['current_students'],
                    'classTeacherId' => $class['class_teacher_id'],
                    'classTeacher' => $class['class_teacher_name'],
                    'academicYear' => $class['academic_year'],
                    'status' => $class['status'],
                    'createdAt' => $class['created_at'],
                    'updatedAt' => $class['updated_at'],
                    'subjectCount' => (int)$class['subject_count']
                ];
            }, $classes);

            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($mappedClasses, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving classes');
        }
    }
    
    /**
     * Get Class by ID
     */
    public function getClassById($id) {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $class_id = Middleware::validateInteger($id, 'class_id');
        
        try {
            $query = "SELECT c.*, 
                             CONCAT(t.first_name, ' ', t.last_name) as class_teacher_name, t.email as class_teacher_email,
                             (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'Active' AND school_id = :school_id) as current_students,
                             (SELECT COUNT(*) FROM subject_assignments WHERE class_id = c.id AND status = 'Active' AND school_id = :school_id2) as subject_count,
                             (SELECT GROUP_CONCAT(sub.name) 
                              FROM subject_assignments sa 
                              JOIN subjects sub ON sa.subject_id = sub.id 
                              WHERE sa.class_id = c.id AND sa.status = 'Active' AND sa.school_id = :school_id3) as subjects
                      FROM classes c
                      LEFT JOIN teachers t ON c.class_teacher_id = t.id
                      WHERE c.id = :id AND c.school_id = :school_id4";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $class_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->bindParam(':school_id2', $school_id);
            $stmt->bindParam(':school_id3', $school_id);
            $stmt->bindParam(':school_id4', $school_id);
            $stmt->execute();
            
            $class = $stmt->fetch();
            
            if (!$class) {
                Response::notFound('Class not found');
            }
            
            // Parse subjects list
            if ($class['subjects']) {
                $class['subjects'] = explode(',', $class['subjects']);
            } else {
                $class['subjects'] = [];
            }
            
            Response::success($class, 'Class retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class');
        }
    }
    
    /**
     * Create New Class
     */
    public function createClass() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['name', 'level', 'category', 'capacity', 'academic_year']);
        
        try {
            // Check if class name already exists for this academic year
            $name = Middleware::sanitizeString($data['name']);
            $level = Middleware::sanitizeString($data['level']);
            $category = Middleware::sanitizeString($data['category']);
            $section = isset($data['section']) ? Middleware::sanitizeString($data['section']) : '';
            $academic_year = Middleware::sanitizeString($data['academic_year']);
            
            // Validate category
            if (!in_array($category, ['Primary', 'Secondary'])) {
                Response::badRequest('Invalid category. Must be Primary or Secondary');
            }
            
            $check_query = "SELECT id FROM classes WHERE name = :name AND level = :level AND section = :section AND academic_year = :academic_year AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':name', $name);
            $check_stmt->bindParam(':level', $level);
            $check_stmt->bindParam(':section', $section);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::conflict('Class with this name already exists for the specified academic year');
            }
            
            // Validate and prepare data
            $capacity = Middleware::validateInteger($data['capacity'], 'capacity');
            $class_teacher_id = isset($data['class_teacher_id']) ? Middleware::validateInteger($data['class_teacher_id'], 'class_teacher_id') : null;
            
            // Validate class teacher if provided
            if ($class_teacher_id) {
                $teacher_check_query = "SELECT id FROM teachers WHERE id = :teacher_id AND status = 'Active' AND school_id = :school_id";
                $teacher_check_stmt = $this->conn->prepare($teacher_check_query);
                $teacher_check_stmt->bindParam(':teacher_id', $class_teacher_id);
                $teacher_check_stmt->bindParam(':school_id', $school_id);
                $teacher_check_stmt->execute();
                
                if (!$teacher_check_stmt->fetch()) {
                    Response::badRequest('Invalid class teacher selected');
                }
            }
            
            // Insert class
            $query = "INSERT INTO classes (name, level, section, category, capacity, class_teacher_id, academic_year, school_id, status)
                      VALUES (:name, :level, :section, :category, :capacity, :class_teacher_id, :academic_year, :school_id, 'Active')";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':level', $level);
            $stmt->bindParam(':section', $section);
            $stmt->bindParam(':category', $category);
            $stmt->bindParam(':capacity', $capacity);
            $stmt->bindParam(':class_teacher_id', $class_teacher_id);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $class_id = $this->conn->lastInsertId();
            
            // Update teacher as class teacher if assigned
            if ($class_teacher_id) {
                $update_teacher_query = "UPDATE teachers SET is_class_teacher = TRUE WHERE id = :teacher_id AND school_id = :school_id";
                $update_teacher_stmt = $this->conn->prepare($update_teacher_query);
                $update_teacher_stmt->bindParam(':teacher_id', $class_teacher_id);
                $update_teacher_stmt->bindParam(':school_id', $school_id);
                $update_teacher_stmt->execute();

                // Also create class_teacher_assignments record for TeacherDashboard access
                $term_query = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' AND school_id = :school_id LIMIT 1";
                $term_stmt = $this->conn->prepare($term_query);
                $term_stmt->bindParam(':school_id', $school_id);
                $term_stmt->execute();
                $term_row = $term_stmt->fetch();
                $term = $term_row ? $term_row['setting_value'] : 'First Term';

                $cta_check_query = "SELECT id FROM class_teacher_assignments 
                                   WHERE teacher_id = :teacher_id AND class_id = :class_id 
                                   AND academic_year = :academic_year AND term = :term AND school_id = :school_id";
                $cta_check_stmt = $this->conn->prepare($cta_check_query);
                $cta_check_stmt->bindParam(':teacher_id', $class_teacher_id);
                $cta_check_stmt->bindParam(':class_id', $class_id);
                $cta_check_stmt->bindParam(':academic_year', $academic_year);
                $cta_check_stmt->bindParam(':term', $term);
                $cta_check_stmt->bindParam(':school_id', $school_id);
                $cta_check_stmt->execute();

                if (!$cta_check_stmt->fetch()) {
                    $cta_insert_query = "INSERT INTO class_teacher_assignments (teacher_id, class_id, academic_year, term, school_id, status)
                                        VALUES (:teacher_id, :class_id, :academic_year, :term, :school_id, 'Active')";
                    $cta_insert_stmt = $this->conn->prepare($cta_insert_query);
                    $cta_insert_stmt->bindParam(':teacher_id', $class_teacher_id);
                    $cta_insert_stmt->bindParam(':class_id', $class_id);
                    $cta_insert_stmt->bindParam(':academic_year', $academic_year);
                    $cta_insert_stmt->bindParam(':term', $term);
                    $cta_insert_stmt->bindParam(':school_id', $school_id);
                    $cta_insert_stmt->execute();
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_CLASS',
                "Class: $name ($level)",
                'Success',
                'New class created',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['classes', 'students', 'subject_assignments'], [
                'action' => 'created',
                'class_id' => (int)$class_id,
            ]);
            
            Response::created(['id' => $class_id], 'Class created successfully');
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                Response::conflict('Duplicate entry detected');
            }
            Response::serverError('Database error creating class');
        }
    }
    
    /**
     * Update Class
     */
    public function updateClass($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $class_id = Middleware::validateInteger($id, 'class_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if class exists
            $check_query = "SELECT * FROM classes WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $class_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_class = $check_stmt->fetch();
            if (!$existing_class) {
                Response::notFound('Class not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $class_id];
            
            $allowed_fields = ['name', 'level', 'category', 'section', 'capacity', 'class_teacher_id', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'capacity' || $field === 'class_teacher_id') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateInteger($data[$field], $field);
                    } elseif ($field === 'status') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Active', 'Inactive'], $field);
                    } elseif ($field === 'category') {
                        $update_fields[] = "$field = :$field";
                        $category_value = Middleware::sanitizeString($data[$field]);
                        if (!in_array($category_value, ['Primary', 'Secondary'])) {
                            Response::badRequest('Invalid category. Must be Primary or Secondary');
                        }
                        $params[':' . $field] = $category_value;
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            // Handle class teacher change
            if (isset($data['class_teacher_id'])) {
                // Remove class teacher status from previous teacher
                if ($existing_class['class_teacher_id']) {
                    $remove_teacher_query = "UPDATE teachers SET is_class_teacher = FALSE WHERE id = :old_teacher_id AND school_id = :school_id";
                    $remove_teacher_stmt = $this->conn->prepare($remove_teacher_query);
                    $remove_teacher_stmt->bindParam(':old_teacher_id', $existing_class['class_teacher_id']);
                    $remove_teacher_stmt->bindParam(':school_id', $school_id);
                    $remove_teacher_stmt->execute();
                }
                
                // Set new teacher as class teacher
                if ($data['class_teacher_id']) {
                    $set_teacher_query = "UPDATE teachers SET is_class_teacher = TRUE WHERE id = :new_teacher_id AND school_id = :school_id";
                    $set_teacher_stmt = $this->conn->prepare($set_teacher_query);
                    $set_teacher_stmt->bindParam(':new_teacher_id', $data['class_teacher_id']);
                    $set_teacher_stmt->bindParam(':school_id', $school_id);
                    $set_teacher_stmt->execute();
                }
            }
            
            $params[':school_id'] = $school_id;
            $query = "UPDATE classes SET " . implode(', ', $update_fields) . " WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();

            // Sync class_teacher_assignments if teacher changed
            if (isset($data['class_teacher_id'])) {
                $newTeacherId = $data['class_teacher_id'] ? (int)$data['class_teacher_id'] : null;
                $oldTeacherId = $existing_class['class_teacher_id'];
                
                $term_query = "SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' AND school_id = :school_id LIMIT 1";
                $term_stmt = $this->conn->prepare($term_query);
                $term_stmt->bindParam(':school_id', $school_id);
                $term_stmt->execute();
                $term_row = $term_stmt->fetch();
                $term = $term_row ? $term_row['setting_value'] : 'First Term';
                $academic_year = $existing_class['academic_year'];

                if ($newTeacherId && $newTeacherId !== (int)$oldTeacherId) {
                    $deactivate_query = "UPDATE class_teacher_assignments SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
                                        WHERE class_id = :class_id AND academic_year = :academic_year AND term = :term AND school_id = :school_id";
                    $deactivate_stmt = $this->conn->prepare($deactivate_query);
                    $deactivate_stmt->bindParam(':class_id', $class_id);
                    $deactivate_stmt->bindParam(':academic_year', $academic_year);
                    $deactivate_stmt->bindParam(':term', $term);
                    $deactivate_stmt->bindParam(':school_id', $school_id);
                    $deactivate_stmt->execute();

                    $cta_insert_query = "INSERT INTO class_teacher_assignments (teacher_id, class_id, academic_year, term, school_id, status)
                                        VALUES (:teacher_id, :class_id, :academic_year, :term, :school_id, 'Active')";
                    $cta_insert_stmt = $this->conn->prepare($cta_insert_query);
                    $cta_insert_stmt->bindParam(':teacher_id', $newTeacherId);
                    $cta_insert_stmt->bindParam(':class_id', $class_id);
                    $cta_insert_stmt->bindParam(':academic_year', $academic_year);
                    $cta_insert_stmt->bindParam(':term', $term);
                    $cta_insert_stmt->bindParam(':school_id', $school_id);
                    $cta_insert_stmt->execute();
                } elseif (!$newTeacherId && $oldTeacherId) {
                    $deactivate_query = "UPDATE class_teacher_assignments SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
                                        WHERE class_id = :class_id AND academic_year = :academic_year AND term = :term AND teacher_id = :teacher_id AND school_id = :school_id";
                    $deactivate_stmt = $this->conn->prepare($deactivate_query);
                    $deactivate_stmt->bindParam(':class_id', $class_id);
                    $deactivate_stmt->bindParam(':academic_year', $academic_year);
                    $deactivate_stmt->bindParam(':term', $term);
                    $deactivate_stmt->bindParam(':teacher_id', $oldTeacherId);
                    $deactivate_stmt->bindParam(':school_id', $school_id);
                    $deactivate_stmt->execute();
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'UPDATE_CLASS',
                "Class ID: $class_id",
                'Success',
                'Class information updated',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['classes', 'students', 'subject_assignments'], [
                'action' => 'updated',
                'class_id' => (int)$class_id,
            ]);
            
            Response::success(null, 'Class updated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating class');
        }
    }
    
    /**
     * Delete Class
     */
    public function deleteClass($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $class_id = Middleware::validateInteger($id, 'class_id');
        
        try {
            // Check if class exists
            $check_query = "SELECT name, level FROM classes WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $class_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $class = $check_stmt->fetch();
            if (!$class) {
                Response::notFound('Class not found');
            }
            
            // Check for active students
            $student_check_query = "SELECT COUNT(*) as count FROM students WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id";
            $student_check_stmt = $this->conn->prepare($student_check_query);
            $student_check_stmt->bindParam(':class_id', $class_id);
            $student_check_stmt->bindParam(':school_id', $school_id);
            $student_check_stmt->execute();
            
            if ($student_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete class with active students');
            }
            
            // Check for subject assignments
            $assignment_check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE class_id = :class_id AND status = 'Active' AND school_id = :school_id";
            $assignment_check_stmt = $this->conn->prepare($assignment_check_query);
            $assignment_check_stmt->bindParam(':class_id', $class_id);
            $assignment_check_stmt->bindParam(':school_id', $school_id);
            $assignment_check_stmt->execute();
            
            if ($assignment_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete class with active subject assignments');
            }
            
            // Delete class
            $query = "DELETE FROM classes WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $class_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_CLASS',
                "Class: {$class['name']} ({$class['level']})",
                'Success',
                'Class deleted',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['classes', 'students', 'subject_assignments'], [
                'action' => 'deleted',
                'class_id' => (int)$class_id,
            ]);
            
            Response::success(null, 'Class deleted successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error deleting class');
        }
    }
    
    /**
     * Get Class Students
     */
    public function getClassStudents($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $class_id = Middleware::validateInteger($id, 'class_id');
        
        try {
            // Check access permissions
            if ($token_data['role'] === 'teacher') {
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
            
            $query = "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender, s.date_of_birth,
                             s.status, s.photo_url, s.admission_date,
                             CONCAT(p.first_name, ' ', p.last_name) as parent_name,
                             p.phone as parent_phone, p.email as parent_email,
                             sfb.balance as fee_balance, sfb.status as fee_status
                      FROM students s
                      LEFT JOIN parent_student_links psl ON s.id = psl.student_id AND psl.is_primary = TRUE
                      LEFT JOIN parents p ON psl.parent_id = p.id
                      LEFT JOIN student_fee_balances sfb ON s.id = sfb.student_id 
                        AND sfb.term = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' AND school_id = :school_id)
                        AND sfb.academic_year = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_academic_year' AND school_id = :school_id)
                      WHERE s.class_id = :class_id AND s.school_id = :school_id
                      ORDER BY s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $students = $stmt->fetchAll();
            
            Response::success($students, 'Class students retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class students');
        }
    }
    
    /**
     * Get Class Subjects
     */
    public function getClassSubjects($id) {
        Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        
        $class_id = Middleware::validateInteger($id, 'class_id');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            $query = "SELECT sa.id as assignment_id, sub.id as subject_id, sub.name, sub.code, sub.is_core,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name, t.employee_id,
                             sa.term, sa.academic_year
                      FROM subject_assignments sa
                      JOIN subjects sub ON sa.subject_id = sub.id
                      JOIN teachers t ON sa.teacher_id = t.id
                      WHERE sa.class_id = :class_id AND sa.status = 'Active' AND sa.school_id = :school_id
                      ORDER BY sub.is_core DESC, sub.name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':class_id', $class_id);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $subjects = $stmt->fetchAll();
            
            Response::success($subjects, 'Class subjects retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class subjects');
        }
    }
    
    /**
     * Get Class Statistics
     */
    public function getClassStatistics($id) {
        Middleware::requireAnyRole(['admin', 'teacher', 'accountant']);
        
        $class_id = Middleware::validateInteger($id, 'class_id');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            $query = "SELECT 
                        c.name, c.level, c.capacity, c.current_students,
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'Active' AND school_id = :school_id) as active_students,
                        (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'Inactive' AND school_id = :school_id) as inactive_students,
                        (SELECT COUNT(*) FROM subject_assignments WHERE class_id = c.id AND status = 'Active' AND school_id = :school_id) as subject_assignments,
                        (SELECT COUNT(*) FROM attendance a 
                         JOIN students s ON a.student_id = s.id 
                         WHERE s.class_id = c.id AND s.school_id = :school_id AND a.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as attendance_records_30_days,
                        (SELECT COUNT(*) FROM payments p 
                         JOIN students s ON p.student_id = s.id 
                         WHERE s.class_id = c.id AND s.school_id = :school_id AND p.recorded_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as payments_30_days
                      FROM classes c
                      WHERE c.id = :id AND c.school_id = :school_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $class_id);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $statistics = $stmt->fetch();
            
            if (!$statistics) {
                Response::notFound('Class not found');
            }
            
            Response::success($statistics, 'Class statistics retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving class statistics');
        }
    }
    
    /**
     * Get Classes by Level
     */
    public function getClassesByLevel($level) {
        Middleware::requireAnyRole(['admin', 'teacher', 'accountant', 'parent']);
        
        $level = Middleware::sanitizeString($level);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        try {
            $query = "SELECT c.*, 
                             CONCAT(t.first_name, ' ', t.last_name) as class_teacher_name,
                             (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'Active' AND school_id = :school_id) as current_students
                      FROM classes c
                      LEFT JOIN teachers t ON c.class_teacher_id = t.id
                      WHERE c.level = :level AND c.status = 'Active' AND c.school_id = :school_id
                      ORDER BY c.name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':level', $level);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $classes = $stmt->fetchAll();
            
            Response::success($classes, 'Classes by level retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving classes by level');
        }
    }

    /**
     * Get WhatsApp Groups for Parent's Children Classes
     */
    public function getClassWhatsappGroups() {
        $token_data = Middleware::requireAuth();

        // Parents: only groups for their linked children's classes.
        // Admin: all active class WhatsApp groups.
        if ($token_data['role'] !== 'parent' && $token_data['role'] !== 'admin') {
            Response::forbidden('Access denied.');
        }

        $parent_id = $token_data['linked_id'];
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        try {
            if ($token_data['role'] === 'admin') {
                $whatsapp_query = "SELECT wg.*, c.name as class_name, c.level, c.section
                                  FROM class_whatsapp_groups wg
                                  JOIN classes c ON wg.class_id = c.id
                                  WHERE wg.is_active = 1 AND c.school_id = :school_id
                                  ORDER BY c.level, c.name";

                $whatsapp_stmt = $this->conn->prepare($whatsapp_query);
                $whatsapp_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
                $whatsapp_stmt->execute();

                $whatsapp_groups = $whatsapp_stmt->fetchAll(PDO::FETCH_ASSOC);

                $mapped_groups = array_map(function($group) {
                    return [
                        'class_id' => (int)$group['class_id'],
                        'class_name' => $group['class_name'],
                        'level' => $group['level'],
                        'section' => $group['section'],
                        'whatsapp_group_link' => $group['whatsapp_group_link'],
                        'group_name' => $group['group_name'] ?: ($group['class_name'] . ' Parents Group'),
                        'is_active' => (bool)$group['is_active']
                    ];
                }, $whatsapp_groups);

                Response::success($mapped_groups, 'WhatsApp groups retrieved successfully');
                return;
            }

            // Get all class IDs that the parent's children belong to
            $class_query = "SELECT DISTINCT s.class_id, c.name as class_name
                           FROM students s
                           JOIN classes c ON s.class_id = c.id AND c.school_id = :school_id2
                           JOIN parent_student_links psl ON s.id = psl.student_id AND psl.school_id = :school_id3
                           WHERE psl.parent_id = :parent_id
                           AND s.status = 'Active'
                           AND s.school_id = :school_id
                           AND c.status = 'Active'";

            $class_stmt = $this->conn->prepare($class_query);
            $class_stmt->bindParam(':parent_id', $parent_id);
            $class_stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $class_stmt->bindParam(':school_id2', $school_id, PDO::PARAM_INT);
            $class_stmt->bindParam(':school_id3', $school_id, PDO::PARAM_INT);
            $class_stmt->execute();

            $parent_classes = $class_stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($parent_classes)) {
                Response::success([], 'No WhatsApp groups found for your children\'s classes');
                return;
            }

            // Get class IDs
            $class_ids = array_column($parent_classes, 'class_id');

            // Query WhatsApp groups for these classes
            $placeholders = str_repeat('?,', count($class_ids) - 1) . '?';
            $whatsapp_query = "SELECT wg.*, c.name as class_name, c.level, c.section
                              FROM class_whatsapp_groups wg
                              JOIN classes c ON wg.class_id = c.id
                              WHERE wg.class_id IN ($placeholders)
                              AND wg.is_active = 1
                              ORDER BY c.level, c.name";

            $whatsapp_stmt = $this->conn->prepare($whatsapp_query);
            $whatsapp_stmt->execute($class_ids);

            $whatsapp_groups = $whatsapp_stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map to expected format
            $mapped_groups = array_map(function($group) {
                return [
                    'class_id' => (int)$group['class_id'],
                    'class_name' => $group['class_name'],
                    'level' => $group['level'],
                    'section' => $group['section'],
                    'whatsapp_group_link' => $group['whatsapp_group_link'],
                    'group_name' => $group['group_name'] ?: ($group['class_name'] . ' Parents Group'),
                    'is_active' => (bool)$group['is_active']
                ];
            }, $whatsapp_groups);

            Response::success($mapped_groups, 'WhatsApp groups retrieved successfully');

        } catch (PDOException $e) {
            Response::serverError('Database error retrieving WhatsApp groups');
        }
    }
}
?>
