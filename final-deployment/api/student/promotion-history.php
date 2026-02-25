<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once '../config/database.php';

try {
    // Query promotion history with student and class details
    $query = "SELECT sp.*, 
                     s.first_name, s.last_name, s.admission_number,
                     fc.name as from_class_name,
                     tc.name as to_class_name,
                     u.username as promoted_by_name
              FROM student_promotions sp
              JOIN students s ON sp.student_id = s.id
              JOIN classes fc ON sp.from_class_id = fc.id
              JOIN classes tc ON sp.to_class_id = tc.id
              LEFT JOIN users u ON sp.promoted_by = u.id
              ORDER BY sp.promotion_date DESC
              LIMIT 50";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $promotions = [];
    while ($row = $result->fetch_assoc()) {
        $promotions[] = $row;
    }
    
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
