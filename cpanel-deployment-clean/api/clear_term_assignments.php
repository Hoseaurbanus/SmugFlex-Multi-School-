<?php
/**
 * Clear class teacher assignments for a specific term only
 */

header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get term from query parameter, default to Second Term
    $term = $_GET['term'] ?? 'Second Term';
    $academicYear = $_GET['academic_year'] ?? '2025/2026';
    
    // Only delete assignments for the specified term
    $query = "DELETE FROM class_teacher_assignments WHERE term = ? AND academic_year = ?";
    $stmt = $conn->prepare($query);
    $stmt->execute([$term, $academicYear]);
    $deleted = $stmt->rowCount();
    
    echo json_encode([
        'success' => true,
        'message' => "Cleared {$deleted} assignments for {$term} {$academicYear}",
        'deleted_count' => $deleted,
        'term' => $term,
        'academic_year' => $academicYear,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
