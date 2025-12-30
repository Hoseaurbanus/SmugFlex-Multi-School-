<?php
// This script will help us understand what the frontend is calling
require_once 'config/database.php';

$database = new Database();
$conn = $database->getConnection();

echo "Testing SubjectController assignSubject endpoint...\n\n";

// Test the assignSubject endpoint directly
$test_data = [
    'subject_id' => 84,  // ART AND CRAFT
    'class_id' => 7,    // GRADE 1 (DIAMOND)
    'teacher_id' => 44, // Urbanus Audu
    'academic_year' => '2025/2026',
    'term' => 'First Term'
];

echo "Test assignment data:\n";
print_r($test_data);

// Check if this assignment already exists
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM subject_assignments 
                       WHERE subject_id = ? AND class_id = ? AND academic_year = ? AND term = ?");
$stmt->execute([$test_data['subject_id'], $test_data['class_id'], $test_data['academic_year'], $test_data['term']]);
$existing = $stmt->fetch();

echo "\nExisting assignments with same subject/class/year/term: " . $existing['count'] . "\n";

if ($existing['count'] == 0) {
    echo "This assignment should succeed.\n";
} else {
    echo "This assignment might fail due to constraint.\n";
}

echo "\nTo test the frontend assignment:\n";
echo "1. Go to localhost/GG/build/\n";
echo "2. Login as admin\n";
echo "3. Navigate to Teacher Assignments\n";
echo "4. Select Urbanus Audu\n";
echo "5. Select ART AND CRAFT\n";
echo "6. Select GRADE 1 (DIAMOND)\n";
echo "7. Set Academic Year: 2025/2026\n";
echo "8. Set Term: First Term\n";
echo "9. Click Assign Subject\n";
echo "10. Check browser console for errors\n";
?>
