<?php
/**
 * Assignment Controller
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';

class AssignmentController {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    /**
     * Get All Assignments
     */
    public function getAllAssignments() {
        $token_data = Middleware::requireAuth();
        
        $pagination = Middleware::getPaginationParams();
        $search_params = Middleware::getSearchParams();
        
        try {
            $query = "SELECT a.*, sub.name as subject_name, sub.code as subject_code,
                             c.name as class_name, c.level,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                             (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
                             (SELECT COUNT(*) FROM students WHERE class_id = a.class_id AND status = 'Active') as total_students
                      FROM assignments a
                      JOIN subjects sub ON a.subject_id = sub.id
                      JOIN classes c ON a.class_id = c.id
                      JOIN teachers t ON a.teacher_id = t.id";
            
            $count_query = "SELECT COUNT(*) as total FROM assignments a
                           JOIN subjects sub ON a.subject_id = sub.id
                           JOIN classes c ON a.class_id = c.id
                           JOIN teachers t ON a.teacher_id = t.id";
            
            // Add search conditions
            $conditions = [];
            $params = [];
            
            if (!empty($search_params['search'])) {
                $conditions[] = "(a.title LIKE :search OR a.description LIKE :search OR sub.name LIKE :search OR c.name LIKE :search)";
                $search_param = '%' . $search_params['search'] . '%';
                $params[':search'] = $search_param;
            }
            
            // Filter by status
            if (isset($_GET['status'])) {
                $conditions[] = "a.status = :status";
                $params[':status'] = Middleware::validateEnum($_GET['status'], ['Draft', 'Published', 'Closed'], 'status');
            }
            
            // Filter by due date
            if (isset($_GET['due_date_from'])) {
                $conditions[] = "a.due_date >= :due_date_from";
                $params[':due_date_from'] = Middleware::validateDate($_GET['due_date_from']);
            }
            if (isset($_GET['due_date_to'])) {
                $conditions[] = "a.due_date <= :due_date_to";
                $params[':due_date_to'] = Middleware::validateDate($_GET['due_date_to']);
            }
            
            // Teacher can only see their assignments
            if ($token_data['role'] === 'teacher') {
                $conditions[] = "a.teacher_id = :teacher_id";
                $params[':teacher_id'] = $token_data['linked_id'];
            }
            
            // Parent can only see assignments for their children's classes
            if ($token_data['role'] === 'parent') {
                $conditions[] = "a.class_id IN (
                    SELECT DISTINCT s.class_id FROM students s
                    JOIN parent_student_links psl ON s.id = psl.student_id
                    WHERE psl.parent_id = :parent_id AND s.status = 'Active'
                )";
                $params[':parent_id'] = $token_data['linked_id'];
            }
            
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
            
            $assignments = $stmt->fetchAll();
            
            // Get total count
            $count_stmt = $this->conn->prepare($count_query);
            foreach ($params as $key => $value) {
                $count_stmt->bindValue($key, $value);
            }
            $count_stmt->execute();
            $total = $count_stmt->fetch()['total'];
            
            Response::paginated($assignments, $pagination['page'], $pagination['limit'], $total);
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving assignments');
        }
    }
    
    /**
     * Get Assignment by ID
     */
    public function getAssignmentById($id) {
        $token_data = Middleware::requireAuth();
        $assignment_id = Middleware::validateInteger($id, 'assignment_id');
        
        try {
            $query = "SELECT a.*, sub.name as subject_name, sub.code as subject_code,
                             c.name as class_name, c.level,
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                             (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
                             (SELECT COUNT(*) FROM students WHERE class_id = a.class_id AND status = 'Active') as total_students
                      FROM assignments a
                      JOIN subjects sub ON a.subject_id = sub.id
                      JOIN classes c ON a.class_id = c.id
                      JOIN teachers t ON a.teacher_id = t.id
                      WHERE a.id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $assignment_id);
            $stmt->execute();
            
            $assignment = $stmt->fetch();
            
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Check access permissions
            if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $assignment['teacher_id']) {
                Response::forbidden('Access denied to this assignment');
            }
            
            if ($token_data['role'] === 'parent') {
                // Check if parent has children in this class
                $check_query = "SELECT COUNT(*) as count FROM students s
                               JOIN parent_student_links psl ON s.id = psl.student_id
                               WHERE s.class_id = :class_id AND psl.parent_id = :parent_id AND s.status = 'Active'";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':class_id', $assignment['class_id']);
                $check_stmt->bindParam(':parent_id', $token_data['linked_id']);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('Access denied to this assignment');
                }
            }
            
            Response::success($assignment, 'Assignment retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving assignment');
        }
    }
    
    /**
     * Create New Assignment
     */
    public function createAssignment() {
        $token_data = Middleware::requireAuth();
        
        if ($token_data['role'] !== 'teacher' && $token_data['role'] !== 'admin') {
            Response::forbidden('Only teachers and admins can create assignments');
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        Middleware::validateRequired($data, ['title', 'description', 'subject_id', 'class_id', 'due_date']);
        
        try {
            $title = Middleware::sanitizeString($data['title']);
            $description = Middleware::sanitizeString($data['description']);
            $subject_id = Middleware::validateInteger($data['subject_id'], 'subject_id');
            $class_id = Middleware::validateInteger($data['class_id'], 'class_id');
            $due_date = Middleware::validateDate($data['due_date']);
            $max_score = isset($data['max_score']) ? Middleware::validatePositive($data['max_score'], 'max_score') : 100;
            $status = isset($data['status']) ? Middleware::validateEnum($data['status'], ['Draft', 'Published', 'Closed'], 'status') : 'Draft';
            
            // Teacher can only create assignments for their subjects/classes
            if ($token_data['role'] === 'teacher') {
                $check_query = "SELECT COUNT(*) as count FROM subject_assignments 
                                WHERE teacher_id = :teacher_id AND subject_id = :subject_id AND class_id = :class_id";
                $check_stmt = $this->conn->prepare($check_query);
                $check_stmt->bindParam(':teacher_id', $token_data['linked_id']);
                $check_stmt->bindParam(':subject_id', $subject_id);
                $check_stmt->bindParam(':class_id', $class_id);
                $check_stmt->execute();
                
                if ($check_stmt->fetch()['count'] == 0) {
                    Response::forbidden('You can only create assignments for your assigned subjects and classes');
                }
            }
            
            // Insert assignment
            $query = "INSERT INTO assignments (title, description, subject_id, class_id, teacher_id, due_date, max_score, status, created_by)
                      VALUES (:title, :description, :subject_id, :class_id, :teacher_id, :due_date, :max_score, :status, :created_by)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':title', $title);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':subject_id', $subject_id);
            $stmt->bindParam(':class_id', $class_id);
            $teacher_id = $token_data['role'] === 'teacher' ? $token_data['linked_id'] : $data['teacher_id'];
            $stmt->bindParam(':teacher_id', $teacher_id);
            $stmt->bindParam(':due_date', $due_date);
            $stmt->bindParam(':max_score', $max_score);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':created_by', $token_data['user_id']);
            
            $stmt->execute();
            $assignment_id = $this->conn->lastInsertId();
            
            // Handle file attachments if any
            if (isset($data['attachments']) && is_array($data['attachments'])) {
                foreach ($data['attachments'] as $attachment) {
                    $this->addAttachment($assignment_id, $attachment);
                }
            }
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                ucfirst($token_data['role']),
                'CREATE_ASSIGNMENT',
                "Assignment: $title",
                'Success',
                'New assignment created',
                $token_data['user_id']
            );
            
            Response::created(['id' => $assignment_id], 'Assignment created successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error creating assignment');
        }
    }
    
    /**
     * Update Assignment
     */
    public function updateAssignment($id) {
        $token_data = Middleware::requireAuth();
        $assignment_id = Middleware::validateInteger($id, 'assignment_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if assignment exists and user has permission
            $check_query = "SELECT * FROM assignments WHERE id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $assignment_id);
            $check_stmt->execute();
            
            $assignment = $check_stmt->fetch();
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Check permissions
            if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $assignment['teacher_id']) {
                Response::forbidden('Access denied to this assignment');
            }
            
            // Build update query dynamically
            $update_fields = [];
            $params = [':id' => $assignment_id];
            
            $allowed_fields = ['title', 'description', 'due_date', 'max_score', 'status'];
            
            foreach ($allowed_fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'due_date') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateDate($data[$field]);
                    } elseif ($field === 'max_score') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validatePositive($data[$field], $field);
                    } elseif ($field === 'status') {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::validateEnum($data[$field], ['Draft', 'Published', 'Closed'], $field);
                    } else {
                        $update_fields[] = "$field = :$field";
                        $params[':' . $field] = Middleware::sanitizeString($data[$field]);
                    }
                }
            }
            
            if (empty($update_fields)) {
                Response::badRequest('No valid fields to update');
            }
            
            $query = "UPDATE assignments SET " . implode(', ', $update_fields) . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                ucfirst($token_data['role']),
                'UPDATE_ASSIGNMENT',
                "Assignment ID: $assignment_id",
                'Success',
                'Assignment updated',
                $token_data['user_id']
            );
            
            Response::success(null, 'Assignment updated successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error updating assignment');
        }
    }
    
    /**
     * Delete Assignment
     */
    public function deleteAssignment($id) {
        $token_data = Middleware::requireAuth();
        $assignment_id = Middleware::validateInteger($id, 'assignment_id');
        
        try {
            // Check if assignment exists and user has permission
            $check_query = "SELECT a.*, sub.name as subject_name, c.name as class_name
                            FROM assignments a
                            JOIN subjects sub ON a.subject_id = sub.id
                            JOIN classes c ON a.class_id = c.id
                            WHERE a.id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $assignment_id);
            $check_stmt->execute();
            
            $assignment = $check_stmt->fetch();
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Check permissions
            if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $assignment['teacher_id']) {
                Response::forbidden('Access denied to this assignment');
            }
            
            // Check for existing submissions
            $submission_check_query = "SELECT COUNT(*) as count FROM assignment_submissions WHERE assignment_id = :assignment_id";
            $submission_check_stmt = $this->conn->prepare($submission_check_query);
            $submission_check_stmt->bindParam(':assignment_id', $assignment_id);
            $submission_check_stmt->execute();
            
            if ($submission_check_stmt->fetch()['count'] > 0) {
                Response::conflict('Cannot delete assignment with existing submissions');
            }
            
            // Delete assignment (cascade will handle attachments)
            $query = "DELETE FROM assignments WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $assignment_id);
            $stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                ucfirst($token_data['role']),
                'DELETE_ASSIGNMENT',
                "Assignment: {$assignment['title']} ({$assignment['subject_name']} - {$assignment['class_name']})",
                'Success',
                'Assignment deleted',
                $token_data['user_id']
            );
            
            Response::success(null, 'Assignment deleted successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error deleting assignment');
        }
    }
    
    /**
     * Get Assignment Submissions
     */
    public function getSubmissions($assignment_id) {
        $token_data = Middleware::requireAuth();
        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');
        
        try {
            // Check if assignment exists and user has permission
            $check_query = "SELECT a.*, sub.name as subject_name, c.name as class_name
                            FROM assignments a
                            JOIN subjects sub ON a.subject_id = sub.id
                            JOIN classes c ON a.class_id = c.id
                            WHERE a.id = :id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':id', $assignment_id);
            $check_stmt->execute();
            
            $assignment = $check_stmt->fetch();
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            
            // Check permissions
            if ($token_data['role'] === 'teacher' && $token_data['linked_id'] != $assignment['teacher_id']) {
                Response::forbidden('Access denied to this assignment');
            }
            
            // Parent can only see submissions for their children
            $parent_filter = "";
            $params = [':assignment_id' => $assignment_id];
            
            if ($token_data['role'] === 'parent') {
                $parent_filter = " AND asub.student_id IN (
                    SELECT s.id FROM students s
                    JOIN parent_student_links psl ON s.id = psl.student_id
                    WHERE psl.parent_id = :parent_id AND s.status = 'Active'
                )";
                $params[':parent_id'] = $token_data['linked_id'];
            }
            
            $query = "SELECT asub.*, s.first_name, s.last_name, s.admission_number
                      FROM assignment_submissions asub
                      JOIN students s ON asub.student_id = s.id
                      WHERE asub.assignment_id = :assignment_id $parent_filter
                      ORDER BY s.last_name, s.first_name";
            
            $stmt = $this->conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $submissions = $stmt->fetchAll();
            
            // Get attachments for each submission
            foreach ($submissions as &$submission) {
                $attachment_query = "SELECT * FROM assignment_attachments WHERE submission_id = :submission_id";
                $attachment_stmt = $this->conn->prepare($attachment_query);
                $attachment_stmt->bindParam(':submission_id', $submission['id']);
                $attachment_stmt->execute();
                $submission['attachments'] = $attachment_stmt->fetchAll();
            }
            
            Response::success($submissions, 'Assignment submissions retrieved successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error retrieving submissions');
        }
    }
    
    /**
     * Submit Assignment
     */
    public function submitAssignment($assignment_id) {
        $token_data = Middleware::requireAuth();
        
        if ($token_data['role'] !== 'student') {
            Response::forbidden('Only students can submit assignments');
        }
        
        $assignment_id = Middleware::validateInteger($assignment_id, 'assignment_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        try {
            // Check if assignment exists and is published
            $check_query = "SELECT a.*, s.class_id FROM assignments a
                            JOIN students s ON s.id = :student_id
                            WHERE a.id = :assignment_id AND a.status = 'Published'";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':assignment_id', $assignment_id);
            $check_stmt->bindParam(':student_id', $token_data['linked_id']);
            $check_stmt->execute();
            
            $assignment = $check_stmt->fetch();
            if (!$assignment) {
                Response::notFound('Assignment not found or not available for submission');
            }
            
            // Check if student is in the correct class
            if ($assignment['class_id'] != $check_stmt->fetch()['class_id']) {
                Response::forbidden('This assignment is not for your class');
            }
            
            // Check if due date has passed
            if (date('Y-m-d H:i:s') > $assignment['due_date']) {
                Response::badRequest('Assignment submission deadline has passed');
            }
            
            // Check if already submitted
            $submission_check_query = "SELECT id FROM assignment_submissions WHERE assignment_id = :assignment_id AND student_id = :student_id";
            $submission_check_stmt = $this->conn->prepare($submission_check_query);
            $submission_check_stmt->bindParam(':assignment_id', $assignment_id);
            $submission_check_stmt->bindParam(':student_id', $token_data['linked_id']);
            $submission_check_stmt->execute();
            
            $existing_submission = $submission_check_stmt->fetch();
            
            $this->conn->beginTransaction();
            
            if ($existing_submission) {
                // Update existing submission
                $update_query = "UPDATE assignment_submissions SET content = :content, submitted_at = NOW(), updated_at = NOW()
                                 WHERE id = :submission_id";
                
                $update_stmt = $this->conn->prepare($update_query);
                $update_stmt->bindParam(':content', $data['content']);
                $update_stmt->bindParam(':submission_id', $existing_submission['id']);
                $update_stmt->execute();
                
                $submission_id = $existing_submission['id'];
            } else {
                // Create new submission
                $insert_query = "INSERT INTO assignment_submissions (assignment_id, student_id, content, submitted_at)
                                 VALUES (:assignment_id, :student_id, :content, NOW())";
                
                $insert_stmt = $this->conn->prepare($insert_query);
                $insert_stmt->bindParam(':assignment_id', $assignment_id);
                $insert_stmt->bindParam(':student_id', $token_data['linked_id']);
                $insert_stmt->bindParam(':content', $data['content']);
                $insert_stmt->execute();
                
                $submission_id = $this->conn->lastInsertId();
            }
            
            // Handle file attachments if any
            if (isset($data['attachments']) && is_array($data['attachments'])) {
                foreach ($data['attachments'] as $attachment) {
                    $this->addSubmissionAttachment($submission_id, $attachment);
                }
            }
            
            $this->conn->commit();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                'Student',
                'SUBMIT_ASSIGNMENT',
                "Assignment ID: $assignment_id",
                'Success',
                'Assignment submitted',
                $token_data['user_id']
            );
            
            Response::success(['id' => $submission_id], 'Assignment submitted successfully');
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            Response::serverError('Database error submitting assignment');
        }
    }
    
    /**
     * Grade Assignment
     */
    public function gradeAssignment($submission_id) {
        $token_data = Middleware::requireAuth();
        
        if ($token_data['role'] !== 'teacher') {
            Response::forbidden('Only teachers can grade assignments');
        }
        
        $submission_id = Middleware::validateInteger($submission_id, 'submission_id');
        $data = json_decode(file_get_contents('php://input'), true);
        
        Middleware::validateRequired($data, ['score', 'feedback']);
        
        try {
            // Check if submission exists and teacher has permission
            $check_query = "SELECT asub.*, a.teacher_id, a.max_score
                            FROM assignment_submissions asub
                            JOIN assignments a ON asub.assignment_id = a.id
                            WHERE asub.id = :submission_id";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bindParam(':submission_id', $submission_id);
            $check_stmt->execute();
            
            $submission = $check_stmt->fetch();
            if (!$submission) {
                Response::notFound('Submission not found');
            }
            
            if ($token_data['linked_id'] != $submission['teacher_id']) {
                Response::forbidden('Access denied to this submission');
            }
            
            $score = Middleware::validatePositive($data['score'], 'score');
            $feedback = Middleware::sanitizeString($data['feedback']);
            
            // Validate score doesn't exceed max_score
            if ($score > $submission['max_score']) {
                Response::badRequest("Score cannot exceed maximum score of {$submission['max_score']}");
            }
            
            // Update submission with grade
            $update_query = "UPDATE assignment_submissions SET score = :score, feedback = :feedback, graded_at = NOW(), graded_by = :graded_by
                             WHERE id = :submission_id";
            
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(':score', $score);
            $update_stmt->bindParam(':feedback', $feedback);
            $update_stmt->bindParam(':graded_by', $token_data['user_id']);
            $update_stmt->bindParam(':submission_id', $submission_id);
            $update_stmt->execute();
            
            // Log activity
            Middleware::logActivity(
                $token_data['username'],
                'Teacher',
                'GRADE_ASSIGNMENT',
                "Submission ID: $submission_id",
                'Success',
                "Assignment graded with score: $score",
                $token_data['user_id']
            );
            
            Response::success(null, 'Assignment graded successfully');
            
        } catch (PDOException $e) {
            Response::serverError('Database error grading assignment');
        }
    }
    
    /**
     * Add Attachment Helper
     */
    private function addAttachment($assignment_id, $attachment) {
        try {
            $query = "INSERT INTO assignment_attachments (assignment_id, file_name, file_path, file_size, file_type)
                      VALUES (:assignment_id, :file_name, :file_path, :file_size, :file_type)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':assignment_id', $assignment_id);
            $stmt->bindParam(':file_name', $attachment['file_name']);
            $stmt->bindParam(':file_path', $attachment['file_path']);
            $stmt->bindParam(':file_size', $attachment['file_size']);
            $stmt->bindParam(':file_type', $attachment['file_type']);
            $stmt->execute();
            
        } catch (PDOException $e) {
            error_log("Error adding attachment: " . $e->getMessage());
        }
    }
    
    /**
     * Add Submission Attachment Helper
     */
    private function addSubmissionAttachment($submission_id, $attachment) {
        try {
            $query = "INSERT INTO assignment_attachments (submission_id, file_name, file_path, file_size, file_type)
                      VALUES (:submission_id, :file_name, :file_path, :file_size, :file_type)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':submission_id', $submission_id);
            $stmt->bindParam(':file_name', $attachment['file_name']);
            $stmt->bindParam(':file_path', $attachment['file_path']);
            $stmt->bindParam(':file_size', $attachment['file_size']);
            $stmt->bindParam(':file_type', $attachment['file_type']);
            $stmt->execute();
            
        } catch (PDOException $e) {
            error_log("Error adding submission attachment: " . $e->getMessage());
        }
    }
}
?>
