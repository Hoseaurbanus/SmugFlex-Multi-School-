<?php
/**
 * Teacher Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';

class TeacherController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Teachers (without pagination for frontend compatibility)
     */
    public function getAllTeachers() {
        $token_data = Middleware::requireAnyRole(['admin', 'teacher', 'accountant']);
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $search_params = Middleware::getSearchParams(['id', 'first_name', 'last_name', 'employee_id', 'email', 'phone', 'status']);
        
        try {
            $query = "SELECT t.*, d.name as department_name, c.name as class_teacher_of,
                             (SELECT COUNT(*) FROM subject_assignments WHERE teacher_id = t.id AND school_id = :school_id) as assignments_count
                      FROM teachers t
                      LEFT JOIN departments d ON t.department_id = d.id
                      LEFT JOIN classes c ON t.is_class_teacher = TRUE AND t.id = c.class_teacher_id AND c.school_id = :school_id_cls";
            
            // Add search conditions
            $conditions = ["t.school_id = :school_id2"];
            $params = [];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(t.first_name LIKE :search OR t.last_name LIKE :search OR t.employee_id LIKE :search OR t.email LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            if (!empty($conditions)) {
                $query .= " WHERE " . implode(' AND ', $conditions);
            }
            
            $query .= " ORDER BY t.first_name, t.last_name";
            
            $params[':school_id'] = $school_id;
            $params[':school_id2'] = $school_id;
            $params[':school_id_cls'] = $school_id;
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            $teachers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Map fields to camelCase for frontend consistency
            $mappedTeachers = array_map(function($teacher) {
                return [
                    'id' => $teacher['id'],
                    'firstName' => $teacher['first_name'],
                    'lastName' => $teacher['last_name'],
                    'otherName' => $teacher['other_name'],
                    'employeeId' => $teacher['employee_id'],
                    'email' => $teacher['email'],
                    'phone' => $teacher['phone'],
                    'gender' => $teacher['gender'],
                    'qualification' => $teacher['qualification'],
                    'specialization' => $teacher['specialization'] ? json_decode($teacher['specialization'], true) : [],
                    'status' => $teacher['status'],
                    'isClassTeacher' => (bool)$teacher['is_class_teacher'],
                    'departmentId' => $teacher['department_id'],
                    'departmentName' => $teacher['department_name'],
                    'classTeacherOf' => $teacher['class_teacher_of'],
                    'assignmentsCount' => (int)$teacher['assignments_count'],
                    'createdAt' => $teacher['created_at'],
                    'updatedAt' => $teacher['updated_at']
                ];
            }, $teachers);
            
            // Return all teachers without pagination
            Response::success($mappedTeachers, 'All teachers retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error retrieving teachers');
        }
    }
    
    /**
     * Get Teacher by ID
     */
    public function getTeacherById($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $teacher_id = Middleware::validateInteger($id, 'teacher_id');
        
        // Check access permissions
        if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $teacher_id) {
            Response::forbidden('Access denied');
        }
        
        try {
            $query = "SELECT t.*, d.name as department_name, c.name as class_teacher_of,
                             (SELECT GROUP_CONCAT(sa.class_id, ':', sub.name) 
                              FROM subject_assignments sa 
                              JOIN subjects sub ON sa.subject_id = sub.id 
                              WHERE sa.teacher_id = t.id AND sa.status = 'Active' AND sa.school_id = :school_id) as assignments
                      FROM teachers t
                    LEFT JOIN departments d ON t.department_id = d.id
                    LEFT JOIN classes c ON t.is_class_teacher = TRUE AND t.id = c.class_teacher_id AND c.school_id = :school_id3
                    WHERE t.id = :id AND t.school_id = :school_id2";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $teacher_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->bindParam(':school_id2', $school_id);
            $stmt->bindParam(':school_id3', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $teacher = $stmt->fetch();
            
            if (!$teacher) {
                Response::notFound('Teacher not found');
            }
            
            // Decode specialization and format assignments
            if ($teacher['specialization']) {
                $teacher['specialization'] = json_decode($teacher['specialization'], true);
            }
            
            if ($teacher['assignments']) {
                $assignments = [];
                $assignment_parts = explode(',', $teacher['assignments']);
                foreach ($assignment_parts as $part) {
                    list($class_id, $subject_name) = explode(':', $part);
                    $assignments[] = [
                        'class_id' => $class_id,
                        'subject_name' => $subject_name
                    ];
                }
                $teacher['assignments'] = $assignments;
            } else {
                $teacher['assignments'] = [];
            }
            
            Response::success($teacher, 'Teacher retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error retrieving teacher');
        }
    }
    
    /**
     * Create New Teacher
     */
    public function createTeacher() {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['first_name', 'last_name', 'email', 'phone', 'qualification']);
        
        try {
            // Check if email already exists
            $email = Middleware::sanitizeString($data['email']);
            Middleware::validateEmail($email);
            
            $check_query = "SELECT id FROM teachers WHERE email = :email AND school_id = :school_id_em";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':email', $email);
            $check_stmt->bindParam(':school_id_em', $school_id, PDO::PARAM_INT);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::conflict('Teacher with this email already exists');
            }
            
            // Generate employee ID if not provided
            $employee_id = isset($data['employee_id']) ? Middleware::sanitizeString($data['employee_id']) : '';
            if (empty($employee_id)) {
                $school_id = TenantMiddleware::resolveSchoolId($this->conn);
                $suffix_query = "SELECT suffix FROM schools WHERE id = :sid LIMIT 1";
                $suffix_stmt = $this->conn->prepare($suffix_query);
                $suffix_stmt->execute([':sid' => $school_id]);
                $school_row = $suffix_stmt->fetch(PDO::FETCH_ASSOC);
                $prefix = $school_row ? strtoupper($school_row['suffix']) : 'SCH';

                $year = date('Y');
                $sequence_query = "SELECT COUNT(*) as count FROM teachers WHERE YEAR(created_at) = :year AND school_id = :sid";
                $sequence_stmt = $this->conn->prepare($sequence_query);
                $sequence_stmt->bindParam(':year', $year);
                $sequence_stmt->bindParam(':sid', $school_id);
                $sequence_stmt->execute();
                $count = $sequence_stmt->fetch()['count'] + 1;
                $employee_id = $prefix . '-TCH-' . $year . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
            } else {
                // Check if employee ID already exists
                $emp_check_query = "SELECT id FROM teachers WHERE employee_id = :employee_id AND school_id = :school_id_emp";
                $emp_check_stmt = $this->conn->prepare($emp_check_query);
                $emp_check_stmt->bindParam(':employee_id', $employee_id);
                $emp_check_stmt->bindParam(':school_id_emp', $school_id, PDO::PARAM_INT);
                $emp_check_stmt->execute();
                
                if ($emp_check_stmt->fetch()) {
                    Response::conflict('Employee ID already exists');
                }
            }
            
            // Validate and prepare data
            $first_name = Middleware::sanitizeString($data['first_name']);
            $last_name = Middleware::sanitizeString($data['last_name']);
            $other_name = isset($data['other_name']) ? Middleware::sanitizeString($data['other_name']) : null;
            $phone = Middleware::validatePhone($data['phone']);
            $gender = isset($data['gender']) ? Middleware::validateEnum($data['gender'], ['Male', 'Female'], 'gender') : null;
            $qualification = Middleware::sanitizeString($data['qualification']);
            $specialization = isset($data['specialization']) ? json_encode($data['specialization']) : null;
            $department_id = isset($data['department_id']) ? Middleware::validateInteger($data['department_id'], 'department_id') : null;
            $is_class_teacher = isset($data['is_class_teacher']) ? (bool)$data['is_class_teacher'] : false;
            
            // Insert teacher
            $query = "INSERT INTO teachers (first_name, last_name, other_name, employee_id, email, phone, gender, 
                                           qualification, specialization, department_id, is_class_teacher, status, school_id)
                      VALUES (:first_name, :last_name, :other_name, :employee_id, :email, :phone, :gender,
                              :qualification, :specialization, :department_id, :is_class_teacher, 'Active', :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':first_name', $first_name);
            $stmt->bindParam(':last_name', $last_name);
            $stmt->bindParam(':other_name', $other_name);
            $stmt->bindParam(':employee_id', $employee_id);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':gender', $gender);
            $stmt->bindParam(':qualification', $qualification);
            $stmt->bindParam(':specialization', $specialization);
            $stmt->bindParam(':department_id', $department_id);
            $stmt->bindParam(':is_class_teacher', $is_class_teacher);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $teacher_id = $this->conn->lastInsertId();
            
            // Create user account for teacher
            $this->createTeacherUserAccount($teacher_id, $first_name, $last_name, $email, $school_id);
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_TEACHER',
                "Teacher: $first_name $last_name ($employee_id)",
                'Success',
                'New teacher registered',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['teachers', 'users', 'classes', 'subject_assignments'], [
                'action' => 'created',
                'teacher_id' => (int)$teacher_id,
            ]);
            
            Response::created(['id' => $teacher_id, 'employee_id' => $employee_id], 'Teacher created successfully');
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                Response::conflict('Duplicate entry detected');
            }
            Response::serverError('Database error creating teacher');
        }
    }
    
    /**
     * Update Teacher
     */
    public function updateTeacher($id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $teacher_id = Middleware::validateInteger($id, 'teacher_id');
        
        // Check permissions
        if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $teacher_id) {
            Response::forbidden('Access denied');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if teacher exists
            $check_query = "SELECT * FROM teachers WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $teacher_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_teacher = $check_stmt->fetch();
            if (!$existing_teacher) {
                Response::notFound('Teacher not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $teacher_id];
            
            $allowed_fields = ['first_name', 'last_name', 'other_name', 'phone', 'gender', 'qualification', 'specialization', 'department_id', 'is_class_teacher'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'specialization') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = json_encode($data[$field]);
                    } elseif ($field === 'department_id') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateInteger($data[$field], $field);
                    } elseif ($field === 'gender') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Male', 'Female'], $field);
                    } elseif ($field === 'is_class_teacher') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = (bool)$data[$field];
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            $query = "UPDATE teachers SET " . implode(', ', $update_fields) . " WHERE id = :id AND school_id = :school_id";
            $params[':school_id'] = $school_id;
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                $token_data['role'] === 'teacher' ? $token_data['username'] : 'Admin',
                ucfirst($token_data['role']),
                'UPDATE_TEACHER',
                "Teacher ID: $teacher_id",
                'Success',
                'Teacher information updated',
                $token_data['user_id']
            );

            RealtimeEvents::publish(['teachers', 'users', 'classes', 'subject_assignments'], [
                'action' => 'updated',
                'teacher_id' => (int)$teacher_id,
            ]);
            
            Response::success(null, 'Teacher updated successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error updating teacher');
        }
    }
    
    /**
     * Delete Teacher
     */
    public function deleteTeacher($id) {
        $token_data = Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $teacher_id = Middleware::validateInteger($id, 'teacher_id');
        
        try {
            // Check if teacher exists
            $check_query = "SELECT first_name, last_name, employee_id FROM teachers WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $teacher_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $teacher = $check_stmt->fetch();
            if (!$teacher) {
                Response::notFound('Teacher not found');
            }
            
            // Check for existing assignments
            $assignment_check_query = "SELECT COUNT(*) as count FROM subject_assignments WHERE teacher_id = :teacher_id AND school_id = :school_id";
            $assignment_check_stmt = $this->conn->prepare($assignment_check_query);
            $assignment_check_stmt->bindParam(':teacher_id', $teacher_id);
            $assignment_check_stmt->bindParam(':school_id', $school_id);
            $assignment_check_stmt->execute();
            
            if ($assignment_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete teacher with active subject assignments');
            }
            
            // Delete teacher (cascade will handle user account)
            $query = "DELETE FROM teachers WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $teacher_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_TEACHER',
                "Teacher: {$teacher['first_name']} {$teacher['last_name']} ({$teacher['employee_id']})",
                'Success',
                'Teacher record deleted',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['teachers', 'users', 'classes', 'subject_assignments'], [
                'action' => 'deleted',
                'teacher_id' => (int)$teacher_id,
            ]);
            
            Response::success(null, 'Teacher deleted successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error deleting teacher');
        }
    }
    
    /**
     * Get Teacher's Subject Assignments - Current Term/Year Only
     */
    public function getTeacherAssignments($teacher_id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        // Check permissions
        if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $teacher_id) {
            Response::forbidden('Access denied');
        }
        
        try {
            // Get current academic year and term from settings
            $settings_query = "SELECT setting_key, setting_value FROM school_settings WHERE school_id = :school_id AND setting_key IN ('current_academic_year', 'current_term')";
            $settings_stmt = $this->conn->prepare($settings_query);
            $settings_stmt->bindParam(':school_id', $school_id);
            $settings_stmt->execute();
            $settings_rows = $settings_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            $academic_year = $settings_rows['current_academic_year'] ?? '2025/2026';
            $term = $settings_rows['current_term'] ?? 'First Term';
            
            // Optional query parameters to override defaults (admin only)
            if ($token_data['role'] === 'admin' && isset($_GET['academic_year'])) {
                $academic_year = Middleware::sanitizeString($_GET['academic_year']);
            }
            if ($token_data['role'] === 'admin' && isset($_GET['term'])) {
                $term = Middleware::validateEnum($_GET['term'], ['First Term', 'Second Term', 'Third Term'], 'term');
            }
            
            $query = "SELECT sa.*, sub.name as subject_name, sub.code as subject_code, c.name as class_name, c.level
                      FROM subject_assignments sa
                      JOIN subjects sub ON sa.subject_id = sub.id AND sub.school_id = :school_id
                      JOIN classes c ON sa.class_id = c.id AND c.school_id = :school_id
                      WHERE sa.teacher_id = :teacher_id 
                      AND sa.academic_year = :academic_year 
                      AND sa.term = :term 
                      AND sa.status = 'Active'
                      AND sa.school_id = :school_id
                      ORDER BY c.level, c.name, sub.name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':teacher_id', $teacher_id);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':term', $term);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $assignments = $stmt->fetchAll();
            
            Response::success($assignments, 'Teacher assignments for ' . $term . ' ' . $academic_year . ' retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error retrieving teacher assignments');
        }
    }
    
    /**
     * Get Teacher's Class Students
     */
    public function getTeacherClassStudents($teacher_id) {
        $token_data = Middleware::requireAuth();
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        // Check permissions
        if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $teacher_id) {
            Response::forbidden('Access denied');
        }
        
        try {
            $query = "SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number, s.gender, 
                             c.name as class_name, c.level
                      FROM students s
                      JOIN classes c ON s.class_id = c.id
                      LEFT JOIN subject_assignments sa ON c.id = sa.class_id AND sa.teacher_id = :teacher_id AND sa.status = 'Active' AND sa.school_id = :school_id
                      LEFT JOIN class_teacher_assignments cta ON c.id = cta.class_id AND cta.teacher_id = :teacher_id_cta AND cta.status = 'Active' AND cta.school_id = :school_id_cta
                      WHERE s.status = 'Active' AND s.school_id = :school_id
                      AND (sa.id IS NOT NULL OR cta.id IS NOT NULL)
                      ORDER BY c.level, c.name, s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':teacher_id', $teacher_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->bindParam(':teacher_id_cta', $teacher_id);
            $stmt->bindParam(':school_id_cta', $school_id);
            $stmt->execute();
            
            $students = $stmt->fetchAll();
            
            Response::success($students, 'Teacher class students retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("PDO Error in TeacherController: " . $e->getMessage());
            Response::serverError('Database error retrieving teacher class students');
        }
    }
    
    /**
     * Create Teacher User Account
     */
    private function createTeacherUserAccount($teacher_id, $first_name, $last_name, $email, $school_id) {
        try {
            // Generate username
            $username = strtolower(substr($first_name, 0, 1) . $last_name);
            
            // Check if username exists and add number if needed
            $counter = 1;
            $original_username = $username;
            while (true) {
                $check_query = "SELECT id FROM users WHERE username = :username AND school_id = :school_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':username', $username);
                $check_stmt->bindParam(':school_id', $school_id);
                $check_stmt->execute();
                
                if (!$check_stmt->fetch()) {
                    break;
                }
                
                $username = $original_username . $counter;
                $counter++;
            }
            
            // Generate random password and force change
            $temp_password = bin2hex(random_bytes(6));
            $password_hash = password_hash($temp_password, PASSWORD_DEFAULT);
            
            $user_query = "INSERT INTO users (username, password_hash, role, linked_id, email, status, school_id, must_change_password)
                            VALUES (:username, :password_hash, 'teacher', :linked_id, :email, 'Active', :school_id, TRUE)";
            
            $user_stmt = $this->conn->prepare($user_query);
            $user_stmt->bindParam(':username', $username);
            $user_stmt->bindParam(':password_hash', $password_hash);
            $user_stmt->bindParam(':linked_id', $teacher_id);
            $user_stmt->bindParam(':email', $email);
            $user_stmt->bindParam(':school_id', $school_id);
            $user_stmt->execute();
            
        } catch (PDOException $e) {
            // Log error but don't fail the teacher creation
            error_log("Error creating teacher user account: " . $e->getMessage());
        }
    }
}
?>
