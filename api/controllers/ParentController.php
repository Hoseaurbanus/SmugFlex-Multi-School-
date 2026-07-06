<?php
/**
 * Parent Controller
 * SMugFlex 2.0 Multi-School Platform
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class ParentController {
    private $conn;
    private $school_id;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Parents
     */
    public function getAllParents() {
        $token_data = Middleware::requireAuth();
        $school_id = $this->school_id = TenantMiddleware::resolveSchoolId($this->conn);
        // Clean output buffer to prevent HTML contamination
        if (ob_get_length()) ob_clean();
        
        try {
            $role = strtolower(trim((string)($token_data['role'] ?? '')));
            // Parents must not be able to enumerate all parent records.
            // If caller is a parent, return only their own parent record.
            if ($role === 'parent') {
                $token_parent_id = $token_data['linked_id'] ?? null;

                // Fallback: if linked_id is missing in the token, resolve it from the users table
                if (empty($token_parent_id)) {
                    $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                    $user_stmt = $this->conn->prepare($user_query);
                    $user_stmt->bindParam(':username', $token_data['username']);
                    $user_stmt->execute();
                    $user_data = $user_stmt->fetch();
                    $token_parent_id = $user_data['linked_id'] ?? null;
                }

                if (empty($token_parent_id)) {
                    Response::forbidden('Parent account not properly linked');
                }

                // Reuse the existing parent-by-id logic (includes parent-only access check)
                $this->getParentById((int)$token_parent_id);
                return;
            }

            $query = "SELECT p.*, 
                             (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id) as children_count,
                             (SELECT GROUP_CONCAT(s.first_name, ' ', s.last_name) 
                              FROM parent_student_links psl 
                              JOIN students s ON psl.student_id = s.id 
                              WHERE psl.parent_id = p.id AND s.status = 'Active') as children_names
                      FROM parents p
                      WHERE p.school_id = :school_id
                      ORDER BY p.first_name, p.last_name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            $parents = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Return parents in snake_case format to match frontend interface
            $mappedParents = array_map(function($parent) {
                return [
                    'id' => $parent['id'],
                    'first_name' => $parent['first_name'],
                    'last_name' => $parent['last_name'],
                    'email' => $parent['email'],
                    'phone' => $parent['phone'],
                    'alternate_phone' => $parent['alternate_phone'],
                    'address' => $parent['address'],
                    'occupation' => $parent['occupation'],
                    'status' => $parent['status'],
                    'created_at' => $parent['created_at'],
                    'updated_at' => $parent['updated_at'],
                    'children_count' => (int)$parent['children_count'],
                    'children_names' => $parent['children_names'] ? explode(',', $parent['children_names']) : []
                ];
            }, $parents);

            // Return all parents without pagination
            Response::success($mappedParents, 'All parents retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getAllParents: " . $e->getMessage());
            Response::serverError('Database error retrieving parents');
        } catch (Exception $e) {
            error_log("General error in getAllParents: " . $e->getMessage());
            Response::serverError('Error retrieving parents');
        }
    }
    
    /**
     * Get Parent by ID
     */
    public function getParentById($id) {
        $token_data = Middleware::requireAuth();
        $parent_id = Middleware::validateInteger($id, 'parent_id');
        
        // Check access permissions
        $role = strtolower(trim((string)($token_data['role'] ?? '')));
        if ($role === 'parent') {
            // Handle missing linked_id in JWT token
            $token_parent_id = $token_data['linked_id'] ?? null;
            
            // If linked_id is missing, get it from database based on username
            if (empty($token_parent_id)) {
                $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                $user_stmt = $this->conn->prepare($user_query);
                $user_stmt->bindParam(':username', $token_data['username']);
                $user_stmt->execute();
                $user_data = $user_stmt->fetch();
                $token_parent_id = $user_data['linked_id'] ?? null;
            }
            
            if ($token_parent_id != $parent_id) {
                Response::forbidden('Access denied');
            }
        }
        
        try {
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            $query = "SELECT p.*, 
                             (SELECT COUNT(*) FROM parent_student_links WHERE parent_id = p.id) as children_count,
                             (SELECT GROUP_CONCAT(
                                 JSON_OBJECT(
                                     'student_id', s.id,
                                     'first_name', s.first_name,
                                     'last_name', s.last_name,
                                     'admission_number', s.admission_number,
                                     'class_name', c.name,
                                     'level', c.level,
                                     'relationship', psl.relationship,
                                     'is_primary', psl.is_primary
                                 )
                              ) 
                              FROM parent_student_links psl 
                              JOIN students s ON psl.student_id = s.id 
                              JOIN classes c ON s.class_id = c.id
                              WHERE psl.parent_id = p.id AND s.status = 'Active') as children
                      FROM parents p
                      WHERE p.id = :id AND p.school_id = :school_id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $parent_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            $parent = $stmt->fetch();
            
            if (!$parent) {
                Response::notFound('Parent not found');
            }
            
            // Parse children JSON
            if ($parent['children']) {
                $parent['children'] = json_decode('[' . $parent['children'] . ']', true);
            } else {
                $parent['children'] = [];
            }
            
            Response::success($parent, 'Parent retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving parent');
        }
    }
    
    /**
     * Create New Parent
     */
    public function createParent() {
        Middleware::requireRole('admin');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['first_name', 'last_name', 'email', 'phone']);
        
        try {
            // Check if email already exists
            $email = Middleware::sanitizeString($data['email']);
            Middleware::validateEmail($email);
            
            $check_query = "SELECT id FROM parents WHERE email = :email";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':email', $email);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::conflict('Parent with this email already exists');
            }
            
            // Validate and prepare data
            $first_name = Middleware::sanitizeString($data['first_name']);
            $last_name = Middleware::sanitizeString($data['last_name']);
            $phone = Middleware::validatePhone($data['phone']);
            $alternate_phone = isset($data['alternate_phone']) ? Middleware::validatePhone($data['alternate_phone']) : null;
            $address = isset($data['address']) ? Middleware::sanitizeString($data['address']) : null;
            $occupation = isset($data['occupation']) ? Middleware::sanitizeString($data['occupation']) : null;
            
            // Insert parent
            $query = "INSERT INTO parents (first_name, last_name, email, phone, alternate_phone, address, occupation, status, school_id)
                      VALUES (:first_name, :last_name, :email, :phone, :alternate_phone, :address, :occupation, 'Active', :school_id)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':first_name', $first_name);
            $stmt->bindParam(':last_name', $last_name);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':phone', $phone);
            $stmt->bindParam(':alternate_phone', $alternate_phone);
            $stmt->bindParam(':address', $address);
            $stmt->bindParam(':occupation', $occupation);
            $stmt->bindParam(':school_id', $school_id);
            
            $stmt->execute();
            $parent_id = $this->conn->lastInsertId();
            
            // Create user account for parent
            $this->createParentUserAccount($parent_id, $first_name, $last_name, $email, $school_id);
            
            // Link with students if provided
            if (isset($data['students']) && is_array($data['students'])) {
                foreach ($data['students'] as $student_link) {
                    $student_id = Middleware::validateInteger($student_link['student_id'], 'student_id');
                    $relationship = Middleware::validateEnum($student_link['relationship'], ['Father', 'Mother', 'Guardian'], 'relationship');
                    $is_primary = isset($student_link['is_primary']) ? (bool)$student_link['is_primary'] : false;
                    
                    $link_query = "INSERT INTO parent_student_links (parent_id, student_id, relationship, is_primary) 
                                   VALUES (:parent_id, :student_id, :relationship, :is_primary)";
                    
                    $link_stmt = $this->conn->prepare($link_query);
                    $link_stmt->bindParam(':parent_id', $parent_id);
                    $link_stmt->bindParam(':student_id', $student_id);
                    $link_stmt->bindParam(':relationship', $relationship);
                    $link_stmt->bindParam(':is_primary', $is_primary);
                    $link_stmt->execute();
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'CREATE_PARENT',
                "Parent: $first_name $last_name",
                'Success',
                'New parent registered',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['parents', 'users', 'students', 'notifications', 'payments', 'compiled_results'], [
                'action' => 'created',
                'parent_id' => (int)$parent_id,
            ]);
            
            Response::created(['id' => $parent_id], 'Parent created successfully');
            
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                Response::conflict('Duplicate entry detected');
            }
            Response::serverError('Database error creating parent');
        }
    }
    
    /**
     * Update Parent
     */
    public function updateParent($id) {
        $token_data = Middleware::requireAuth();
        $parent_id = Middleware::validateInteger($id, 'parent_id');

        $role = strtolower(trim((string)($token_data['role'] ?? '')));
        
        // Check permissions
        if ($role === 'parent' && $token_data['linked_id'] != $parent_id) {
            Response::forbidden('Access denied');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            // Check if parent exists
            $check_query = "SELECT * FROM parents WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $parent_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $existing_parent = $check_stmt->fetch();
            if (!$existing_parent) {
                Response::notFound('Parent not found');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $parent_id];
            
            $allowed_fields = ['first_name', 'last_name', 'phone', 'alternate_phone', 'address', 'occupation', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'status') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Active', 'Inactive'], $field);
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            $query = "UPDATE parents SET " . implode(', ', $update_fields) . " WHERE id = :id AND school_id = :school_id";
            $params[':school_id'] = $school_id;
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                $token_data['role'] === 'parent' ? $token_data['username'] : 'Admin',
                ucfirst($token_data['role']),
                'UPDATE_PARENT',
                "Parent ID: $parent_id",
                'Success',
                'Parent information updated',
                $token_data['user_id']
            );

            RealtimeEvents::publish(['parents', 'users', 'students', 'notifications', 'payments', 'compiled_results'], [
                'action' => 'updated',
                'parent_id' => (int)$parent_id,
            ]);
            
            Response::success(null, 'Parent updated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating parent');
        }
    }
    
    /**
     * Delete Parent
     */
    public function deleteParent($id) {
        Middleware::requireRole('admin');
        
        $parent_id = Middleware::validateInteger($id, 'parent_id');
        
        try {
            $school_id = TenantMiddleware::resolveSchoolId($this->conn);
            // Check if parent exists
            $check_query = "SELECT first_name, last_name FROM parents WHERE id = :id AND school_id = :school_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $parent_id);
            $check_stmt->bindParam(':school_id', $school_id);
            $check_stmt->execute();
            
            $parent = $check_stmt->fetch();
            if (!$parent) {
                Response::notFound('Parent not found');
            }
            
            // Check for linked students
            $student_check_query = "SELECT COUNT(*) as count FROM parent_student_links WHERE parent_id = :parent_id";
            $student_check_stmt = $this->conn->prepare($student_check_query);
            $student_check_stmt->bindParam(':parent_id', $parent_id);
            $student_check_stmt->execute();
            
            if ($student_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete parent with linked students. Remove student links first.');
            }
            
            // Delete parent (cascade will handle user account)
            $query = "DELETE FROM parents WHERE id = :id AND school_id = :school_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $parent_id);
            $stmt->bindParam(':school_id', $school_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'DELETE_PARENT',
                "Parent: {$parent['first_name']} {$parent['last_name']}",
                'Success',
                'Parent record deleted',
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['parents', 'users', 'students', 'notifications', 'payments', 'compiled_results'], [
                'action' => 'deleted',
                'parent_id' => (int)$parent_id,
            ]);
            
            Response::success(null, 'Parent deleted successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error deleting parent');
        }
    }
    
    /**
     * Get Parent's Children
     */
    public function getParentChildren($id) {
        // Enforce that a parent can only access their own children
        $token_data = Middleware::requireAuth();
        $parent_id = Middleware::validateInteger($id, 'parent_id');
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $role = strtolower(trim((string)($token_data['role'] ?? '')));

        // If the caller is a parent, make sure the requested ID matches their linked parent record
        if ($role === 'parent') {
            $token_parent_id = $token_data['linked_id'] ?? null;

            // Fallback: if linked_id is missing in the token, resolve it from the users table
            if (empty($token_parent_id)) {
                $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                $user_stmt = $this->conn->prepare($user_query);
                $user_stmt->bindParam(':username', $token_data['username']);
                $user_stmt->execute();
                $user_data = $user_stmt->fetch();
                $token_parent_id = $user_data['linked_id'] ?? null;
            }

            if ($token_parent_id != $parent_id) {
                Response::forbidden('Access denied');
            }
        }

        // Clean output buffer to prevent HTML contamination
        if (ob_get_length()) ob_clean();
        
        try {
            $query = "SELECT s.id, s.class_id, s.first_name, s.last_name, s.other_name, s.admission_number, s.gender, s.date_of_birth,
                             s.status, s.photo_url, s.admission_date,
                             c.name as class_name, c.level,
                             psl.relationship, psl.is_primary,
                             sfb.balance as fee_balance, sfb.status as fee_status
                      FROM students s
                      JOIN parent_student_links psl ON s.id = psl.student_id
                      LEFT JOIN classes c ON s.class_id = c.id
                      LEFT JOIN student_fee_balances sfb ON s.id = sfb.student_id 
                        AND sfb.term = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_term' AND school_id = s.school_id)
                        AND sfb.academic_year = (SELECT setting_value FROM school_settings WHERE setting_key = 'current_academic_year' AND school_id = s.school_id)
                      WHERE psl.parent_id = :id AND s.status = 'Active' AND s.school_id = :school_id
                      ORDER BY c.level, c.name, s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $parent_id);
            $stmt->bindParam(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $children = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map snake_case to camelCase for frontend
            $mappedChildren = array_map(function($child) {
                return [
                    'id' => $child['id'],
                    'classId' => $child['class_id'],
                    'firstName' => $child['first_name'],
                    'lastName' => $child['last_name'],
                    'otherName' => $child['other_name'],
                    'admissionNumber' => $child['admission_number'],
                    'gender' => $child['gender'],
                    'dateOfBirth' => $child['date_of_birth'],
                    'status' => $child['status'],
                    'photoUrl' => $child['photo_url'],
                    'admissionDate' => $child['admission_date'],
                    'className' => $child['class_name'],
                    'level' => $child['level'],
                    'relationship' => $child['relationship'],
                    'isPrimary' => $child['is_primary'],
                    'feeBalance' => $child['fee_balance'],
                    'feeStatus' => $child['fee_status']
                ];
            }, $children);
            
            Response::success($mappedChildren, 'Parent children retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getParentChildren: " . $e->getMessage());
            Response::serverError('Database error retrieving parent children');
        } catch (Exception $e) {
            error_log("General error in getParentChildren: " . $e->getMessage());
            Response::serverError('Error retrieving parent children');
        }
    }
    
    /**
     * Get All Parent-Student Links
     */
    public function getAllParentStudentLinks() {
        $token_data = Middleware::requireAuth();
        // Clean output buffer to prevent HTML contamination
        if (ob_get_length()) ob_clean();
        
        try {
            $where = '';
            $params = [];

            $role = strtolower(trim((string)($token_data['role'] ?? '')));

            // Parents must only see their own links. Admin/staff can see all.
            if ($role === 'parent') {
                $token_parent_id = $token_data['linked_id'] ?? null;

                // Fallback: if linked_id is missing in the token, resolve it from the users table
                if (empty($token_parent_id)) {
                    $user_query = "SELECT linked_id FROM users WHERE username = :username AND role = 'parent'";
                    $user_stmt = $this->conn->prepare($user_query);
                    $user_stmt->bindParam(':username', $token_data['username']);
                    $user_stmt->execute();
                    $user_data = $user_stmt->fetch();
                    $token_parent_id = $user_data['linked_id'] ?? null;
                }

                if (empty($token_parent_id)) {
                    Response::forbidden('Parent account not properly linked');
                }

                $where = 'WHERE psl.parent_id = :parent_id';
                $params[':parent_id'] = (int)$token_parent_id;
            }

            $query = "SELECT psl.*, 
                             s.first_name as student_first_name, 
                             s.last_name as student_last_name,
                             p.first_name as parent_first_name, 
                             p.last_name as parent_last_name
                      FROM parent_student_links psl
                      LEFT JOIN students s ON psl.student_id = s.id
                      LEFT JOIN parents p ON psl.parent_id = p.id
                      $where
                      ORDER BY psl.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $links = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map snake_case to snake_case for frontend compatibility
            $mappedLinks = array_map(function($link) {
                return [
                    'id' => $link['id'],
                    'parent_id' => $link['parent_id'],
                    'student_id' => $link['student_id'],
                    'relationship' => $link['relationship'],
                    'is_primary' => $link['is_primary'],
                    'created_at' => $link['created_at'],
                    'updated_at' => $link['updated_at'] ?? null, // Handle missing updated_at
                    'student_first_name' => $link['student_first_name'] ?? '',
                    'student_last_name' => $link['student_last_name'] ?? '',
                    'parent_first_name' => $link['parent_first_name'] ?? '',
                    'parent_last_name' => $link['parent_last_name'] ?? ''
                ];
            }, $links);
            
            Response::success($mappedLinks, 'All parent-student links retrieved successfully');
            
        } catch (PDOException $e) {
            error_log("Database error in getAllParentStudentLinks: " . $e->getMessage());
            Response::serverError('Database error retrieving parent-student links');
        } catch (Exception $e) {
            error_log("General error in getAllParentStudentLinks: " . $e->getMessage());
            Response::serverError('Error retrieving parent-student links');
        }
    }
    
    /**
     * Link Parent to Student
     */
    public function linkToStudent($id) {
        Middleware::requireRole('admin');
        $token_data = Middleware::requireAuth();
        
        $parent_id = Middleware::validateInteger($id, 'parent_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['student_id', 'relationship']);
        
        try {
            $student_id = Middleware::validateInteger($data['student_id'], 'student_id');
            $relationship = Middleware::validateEnum($data['relationship'], ['Father', 'Mother', 'Guardian'], 'relationship');
            $is_primary = isset($data['is_primary']) ? (bool)$data['is_primary'] : false;

            $this->conn->beginTransaction();
            
            // Check if link already exists
            $check_query = "SELECT id FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $parent_id);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                if ($this->conn->inTransaction()) {
                    $this->conn->rollBack();
                }
                Response::conflict('Parent is already linked to this student');
            }
            
            // If setting as primary, remove primary status from other parents
            if ($is_primary) {
                $update_query = "UPDATE parent_student_links SET is_primary = FALSE WHERE student_id = :student_id";
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':student_id', $student_id);
                if (!$update_stmt->execute()) {
                    throw new Exception('Failed to update existing primary link');
                }
            }
            
            // Create link
            $link_query = "INSERT INTO parent_student_links (parent_id, student_id, relationship, is_primary) 
                           VALUES (:parent_id, :student_id, :relationship, :is_primary)";
            
            $link_stmt = $this->conn->prepare($link_query);
            $link_stmt->bindParam(':parent_id', $parent_id);
            $link_stmt->bindParam(':student_id', $student_id);
            $link_stmt->bindParam(':relationship', $relationship);
            $link_stmt->bindParam(':is_primary', $is_primary);
            
            if (!$link_stmt->execute()) {
                error_log("Failed to insert parent-student link: " . print_r($link_stmt->errorInfo(), true));
                throw new Exception('Failed to create parent-student link');
            }

            // Commit core link creation first so optional cache updates can't turn a successful link into a 500.
            if ($this->conn->inTransaction()) {
                $this->conn->commit();
            }
            
            // Best-effort cache updates (must never fail the link operation)
            $parent_email = null;
            $parent_name = null;
            try {
                $parent_info_query = "SELECT first_name, last_name, email FROM parents WHERE id = :parent_id";
                $parent_info_stmt = $this->conn->prepare($parent_info_query);
                $parent_info_stmt->bindParam(':parent_id', $parent_id);
                if ($parent_info_stmt->execute()) {
                    $parent_info = $parent_info_stmt->fetch();
                    if ($parent_info) {
                        $parent_name = ($parent_info['first_name'] ?? '') . ' ' . ($parent_info['last_name'] ?? '');
                        $parent_name = trim($parent_name);
                        $parent_email = $parent_info['email'] ?? null;
                    }
                }
            } catch (Exception $e) {
                error_log('Warning: Failed to fetch parent info for cache update: ' . $e->getMessage());
            }

            // Update student record (attempt parent_id + parent_name; fallback to only parent_id)
            try {
                if ($parent_name !== null) {
                    $update_student_query = "UPDATE students SET parent_id = :parent_id, parent_name = :parent_name WHERE id = :student_id";
                    $update_student_stmt = $this->conn->prepare($update_student_query);
                    $update_student_stmt->bindParam(':parent_id', $parent_id);
                    $update_student_stmt->bindParam(':parent_name', $parent_name);
                    $update_student_stmt->bindParam(':student_id', $student_id);
                    $update_student_stmt->execute();
                } else {
                    $update_student_query = "UPDATE students SET parent_id = :parent_id WHERE id = :student_id";
                    $update_student_stmt = $this->conn->prepare($update_student_query);
                    $update_student_stmt->bindParam(':parent_id', $parent_id);
                    $update_student_stmt->bindParam(':student_id', $student_id);
                    $update_student_stmt->execute();
                }
            } catch (Exception $e) {
                error_log('Warning: Failed to update student cache fields during link: ' . $e->getMessage());
            }

            // Ensure parent's linked_id matches the parent_id used in students table (best-effort)
            if (!empty($parent_email)) {
                try {
                    $update_user_query = "UPDATE users SET linked_id = :parent_id WHERE email = :email AND LOWER(role) = 'parent'";
                    $update_user_stmt = $this->conn->prepare($update_user_query);
                    $update_user_stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
                    $update_user_stmt->bindParam(':email', $parent_email);
                    $update_user_stmt->execute();
                } catch (Exception $e) {
                    error_log('Warning: Failed to update users.linked_id during link: ' . $e->getMessage());
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'LINK_PARENT_STUDENT',
                "Parent ID: $parent_id, Student ID: $student_id",
                'Success',
                "Parent linked to student as $relationship",
                $_SESSION['user_id'] ?? null
            );

            RealtimeEvents::publish(['parents', 'students', 'notifications', 'payments', 'compiled_results'], [
                'action' => 'linked',
                'parent_id' => (int)$parent_id,
                'student_id' => (int)$student_id,
            ]);

            Response::success(null, 'Parent linked to student successfully');
            
        } catch (PDOException $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            if ((string)$e->getCode() === '23000') {
                Response::conflict('Parent is already linked to this student');
            }
            error_log("Database error linking parent to student: " . $e->getMessage());
            Response::serverError('Database error linking parent to student');
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            error_log("Error linking parent to student: " . $e->getMessage());
            Response::serverError('Failed to link parent to student');
        }
    }
    
    /**
     * Unlink Parent from Student
     */
    public function unlinkFromStudent($parent_id, $student_id) {
        Middleware::requireRole('admin');
        $token_data = Middleware::requireAuth();
        
        $parent_id = Middleware::validateInteger($parent_id, 'parent_id');
        $student_id = Middleware::validateInteger($student_id, 'student_id');
        
        try {
            // Check if link exists
            $check_query = "SELECT id FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':parent_id', $parent_id);
            $check_stmt->bindParam(':student_id', $student_id);
            $check_stmt->execute();
            
            $link = $check_stmt->fetch();
            if (!$link) {
                Response::notFound('Parent-student link not found');
            }
            
            // Delete link
            $delete_query = "DELETE FROM parent_student_links WHERE parent_id = :parent_id AND student_id = :student_id";
            $delete_stmt = $this->conn->prepare($delete_query);
            $delete_stmt->bindParam(':parent_id', $parent_id);
            $delete_stmt->bindParam(':student_id', $student_id);
            $delete_stmt->execute();

            // If no more links exist for this student, clear cached parent fields on student record
            $remaining_query = "SELECT COUNT(*) FROM parent_student_links WHERE student_id = :student_id";
            $remaining_stmt = $this->conn->prepare($remaining_query);
            $remaining_stmt->bindParam(':student_id', $student_id);
            $remaining_stmt->execute();
            $remaining_count = (int)$remaining_stmt->fetchColumn();

            if ($remaining_count === 0) {
                // Best-effort cache clear (some environments may not have parent_name)
                try {
                    $clear_student_query = "UPDATE students SET parent_id = NULL, parent_name = NULL WHERE id = :student_id";
                    $clear_student_stmt = $this->conn->prepare($clear_student_query);
                    $clear_student_stmt->bindParam(':student_id', $student_id);
                    $clear_student_stmt->execute();
                } catch (Exception $e) {
                    error_log('Warning: Failed to clear students.parent_name during unlink, falling back to parent_id only: ' . $e->getMessage());
                    try {
                        $clear_student_query = "UPDATE students SET parent_id = NULL WHERE id = :student_id";
                        $clear_student_stmt = $this->conn->prepare($clear_student_query);
                        $clear_student_stmt->bindParam(':student_id', $student_id);
                        $clear_student_stmt->execute();
                    } catch (Exception $e2) {
                        error_log('Warning: Failed to clear students.parent_id during unlink: ' . $e2->getMessage());
                    }
                }
            }
            
            // Log activity
            Middleware::logActivity(
                'Admin',
                'Admin',
                'UNLINK_PARENT_STUDENT',
                "Parent ID: $parent_id, Student ID: $student_id",
                'Success',
                'Parent unlinked from student',
                $token_data['user_id'] ?? null
            );

            RealtimeEvents::publish(['parents', 'students', 'notifications', 'payments', 'compiled_results'], [
                'action' => 'unlinked',
                'parent_id' => (int)$parent_id,
                'student_id' => (int)$student_id,
            ]);
            
            Response::success(null, 'Parent unlinked from student successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error unlinking parent from student');
        }
    }
    
    /**
     * Create Parent User Account
     */
    private function createParentUserAccount($parent_id, $first_name, $last_name, $email, $school_id) {
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
                           VALUES (:username, :password_hash, 'parent', :linked_id, :email, 'Active', :school_id, TRUE)";
            
            $user_stmt = $this->conn->prepare($user_query);
            $user_stmt->bindParam(':username', $username);
            $user_stmt->bindParam(':password_hash', $password_hash);
            $user_stmt->bindParam(':linked_id', $parent_id);
            $user_stmt->bindParam(':email', $email);
            $user_stmt->bindParam(':school_id', $school_id);
            $user_stmt->execute();
            
        } catch (PDOException $e) {
            // Log error but don't fail the parent creation
            error_log("Error creating parent user account: " . $e->getMessage());
        }
    }
}
?>
