<?php
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$token_data = Middleware::requireAuth();
$database = new Database();
$conn = $database->getConnection();
$school_id = TenantMiddleware::resolveSchoolId($conn);

try {
    $academic_year = $_GET['academic_year'] ?? '2025/2026';

    $query = "SELECT cpr.*,
                     fc.name as from_class_name,
                     tc.name as to_class_name
              FROM class_progression_rules cpr
              JOIN classes fc ON cpr.from_class_id = fc.id
              JOIN classes tc ON cpr.to_class_id = tc.id
              WHERE cpr.academic_year = :year AND cpr.is_active = 1 AND cpr.school_id = :school_id
              ORDER BY fc.level, fc.name";

    $stmt = $conn->prepare($query);
    $stmt->execute([':year' => $academic_year, ':school_id' => $school_id]);
    $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => $rules,
        'message' => 'Progression rules loaded successfully'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading progression rules: ' . $e->getMessage()
    ]);
}
?>