<?php
require_once __DIR__ . '/../helpers/Cors.php';
Cors::handle();
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

$token_data = Middleware::requireAuth();
$database = new Database();
$conn = $database->getConnection();
$school_id = TenantMiddleware::resolveSchoolId($conn);

try {
    $query = "SELECT sp.*,
                     s.first_name, s.last_name, s.admission_number,
                     fc.name as from_class_name,
                     tc.name as to_class_name,
                     u.username as promoted_by_name
              FROM student_promotions sp
              JOIN students s ON sp.student_id = s.id AND s.school_id = :school_id
              JOIN classes fc ON sp.from_class_id = fc.id
              JOIN classes tc ON sp.to_class_id = tc.id
              LEFT JOIN users u ON sp.promoted_by = u.id AND u.school_id = :school_id
              WHERE sp.school_id = :school_id2
              ORDER BY sp.promotion_date DESC
              LIMIT 50";

    $stmt = $conn->prepare($query);
    $stmt->execute([':school_id' => $school_id, ':school_id2' => $school_id]);
    $promotions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $promotions,
        'message' => 'Promotion history loaded successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading promotion history: ' . $e->getMessage()
    ]);
}
?>