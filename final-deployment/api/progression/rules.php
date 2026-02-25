<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';

try {
    $academic_year = $_GET['academic_year'] ?? '2025/2026';
    
    // Query progression rules from database
    $query = "SELECT cpr.*, 
                     fc.name as from_class_name, 
                     tc.name as to_class_name
              FROM class_progression_rules cpr
              JOIN classes fc ON cpr.from_class_id = fc.id
              JOIN classes tc ON cpr.to_class_id = tc.id
              WHERE cpr.academic_year = ? AND cpr.is_active = 1
              ORDER BY fc.level, fc.name";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $academic_year);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $rules = [];
    while ($row = $result->fetch_assoc()) {
        $rules[] = $row;
    }
    
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
