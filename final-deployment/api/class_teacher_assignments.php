
<?php
/**
 * Class Teacher Assignments API
 * Term-specific class teacher assignments
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * Get teacher class teacher count
 */
function getTeacherClassTeacherCount($conn, $teacher_id) {
    $query = "SELECT COUNT(*) as count FROM class_teacher_assignments 
             WHERE teacher_id = :teacher_id AND status = 'Active'";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':teacher_id', $teacher_id);
    $stmt->execute();
    $result = $stmt->fetch();
    return $result['count'] ?? 0;
}

/**
 * Update teacher is_class_teacher flag based on whether they have any active class teacher assignments
 */
function updateTeacherIsClassTeacherFlag($conn, $teacher_id) {
    $count = getTeacherClassTeacherCount($conn, $teacher_id);
    $is_class_teacher = $count > 0 ? 1 : 0;

    $update_query = "UPDATE teachers SET is_class_teacher = :is_class_teacher WHERE id = :teacher_id";
    $stmt = $conn->prepare($update_query);
    $stmt->bindParam(':is_class_teacher', $is_class_teacher, PDO::PARAM_INT);
    $stmt->bindParam(':teacher_id', $teacher_id, PDO::PARAM_INT);
    $stmt->execute();

    return $count;
}

require_once 'config/database.php';
require_once 'helpers/Response.php';
require_once 'helpers/Middleware.php';

$database = new Database();
$conn = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get all class teacher assignments with filters
            $academic_year = $_GET['academic_year'] ?? '2025/2026';
            $term = $_GET['term'] ?? 'First Term';
            $teacher_id = $_GET['teacher_id'] ?? null;
            $class_id = $_GET['class_id'] ?? null;
            
            $query = "SELECT cta.*, 
                             CONCAT(t.first_name, ' ', t.last_name) as teacher_name,
                             t.email as teacher_email,
                             c.name as class_name,
                             c.level as class_level
                      FROM class_teacher_assignments cta
                      JOIN teachers t ON cta.teacher_id = t.id
                      JOIN classes c ON cta.class_id = c.id
                      WHERE cta.academic_year = :academic_year AND cta.term = :term AND cta.status = 'Active'";
            
            $params = [
                ':academic_year' => $academic_year,
                ':term' => $term
            ];
            
            if ($teacher_id) {
                $query .= " AND cta.teacher_id = :teacher_id";
                $params[':teacher_id'] = $teacher_id;
            }
            
            if ($class_id) {
                $query .= " AND cta.class_id = :class_id";
                $params[':class_id'] = $class_id;
            }
            
            $query .= " ORDER BY c.level, c.name";
            
            $stmt = $conn->prepare($query);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Class teacher assignments retrieved successfully',
                'data' => $assignments,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'POST':
            // Create new class teacher assignment
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            if (!$data || !isset($data['teacher_id']) || !isset($data['class_id']) || !isset($data['academic_year']) || !isset($data['term'])) {
                Response::error('Missing required fields: teacher_id, class_id, academic_year, term');
                break;
            }
            
            $teacher_id = (int)$data['teacher_id'];
            $class_id = (int)$data['class_id'];
            $academic_year = $data['academic_year'];
            $term = $data['term'];
            
            // Check if assignment already exists
            $check_query = "SELECT id FROM class_teacher_assignments 
                           WHERE teacher_id = :teacher_id AND class_id = :class_id 
                           AND academic_year = :academic_year AND term = :term AND status = 'Active'";
            $check_stmt = $conn->prepare($check_query);
            $check_stmt->bindParam(':teacher_id', $teacher_id);
            $check_stmt->bindParam(':class_id', $class_id);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->bindParam(':term', $term);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                Response::conflict('This class teacher assignment already exists for this term');
                break;
            }
            
            // Check if class already has a teacher for this term
            $class_check_query = "SELECT id FROM class_teacher_assignments 
                                 WHERE class_id = :class_id AND academic_year = :academic_year 
                                 AND term = :term AND status = 'Active'";
            $class_check_stmt = $conn->prepare($class_check_query);
            $class_check_stmt->bindParam(':class_id', $class_id);
            $class_check_stmt->bindParam(':academic_year', $academic_year);
            $class_check_stmt->bindParam(':term', $term);
            $class_check_stmt->execute();
            
            if ($class_check_stmt->fetch()) {
                Response::conflict('This class already has a teacher assigned for this term');
                break;
            }
            
            // Create assignment
            $insert_query = "INSERT INTO class_teacher_assignments 
                            (teacher_id, class_id, academic_year, term, status) 
                            VALUES (:teacher_id, :class_id, :academic_year, :term, 'Active')";
            $insert_stmt = $conn->prepare($insert_query);
            $insert_stmt->bindParam(':teacher_id', $teacher_id);
            $insert_stmt->bindParam(':class_id', $class_id);
            $insert_stmt->bindParam(':academic_year', $academic_year);
            $insert_stmt->bindParam(':term', $term);
            $insert_stmt->execute();
            
            $assignment_id = $conn->lastInsertId();
            
            // Update class teacher assignment count in real-time
            $update_class_query = "UPDATE classes SET class_teacher_id = :teacher_id WHERE id = :class_id";
            $update_class_stmt = $conn->prepare($update_class_query);
            $update_class_stmt->bindParam(':teacher_id', $teacher_id);
            $update_class_stmt->bindParam(':class_id', $class_id);
            $update_class_stmt->execute();
            
            // Keep teacher state consistent (teachers table does not have class_teacher_count column)
            $teacher_class_teacher_count = updateTeacherIsClassTeacherFlag($conn, $teacher_id);
            
            echo json_encode([
                'success' => true,
                'message' => 'Class teacher assignment created successfully',
                'data' => [
                    'id' => $assignment_id,
                    'updated_counts' => [
                        'teacher_class_teacher_count' => $teacher_class_teacher_count,
                        'class_teacher_assigned' => true
                    ]
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'DELETE':
            // Remove class teacher assignment (set to inactive)
            $assignment_id = $_GET['id'] ?? null;
            
            if (!$assignment_id) {
                Response::error('Assignment ID required');
                break;
            }
            
            $update_query = "UPDATE class_teacher_assignments 
                           SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP 
                           WHERE id = :id";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bindParam(':id', $assignment_id);
            $update_stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Class teacher assignment removed successfully',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            break;
            
        default:
            Response::notFound('Method not allowed');
            break;
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
