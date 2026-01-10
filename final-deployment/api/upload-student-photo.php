<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config/database.php';
require_once 'config/auth.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed');
    }

    // Check if user is authenticated and is admin
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
        throw new Exception('Unauthorized access');
    }

    if (!isset($_FILES['passport']) || $_FILES['passport']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload error');
    }

    if (!isset($_POST['student_id']) || empty($_POST['student_id'])) {
        throw new Exception('Student ID is required');
    }

    $student_id = intval($_POST['student_id']);
    $file = $_FILES['passport'];

    // Validate file type
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    $file_type = mime_content_type($file['tmp_name']);
    
    if (!in_array($file_type, $allowed_types)) {
        throw new Exception('Only JPEG, PNG, and GIF images are allowed');
    }

    // Validate file size (max 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('File size must be less than 5MB');
    }

    // Create upload directory if it doesn't exist
    $upload_dir = '../assets/images/students/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    // Generate unique filename
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'student_' . $student_id . '_' . time() . '.' . $file_extension;
    $upload_path = $upload_dir . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
        throw new Exception('Failed to move uploaded file');
    }

    // Update database with new photo URL
    $photo_url = '/assets/images/students/' . $filename;
    
    $update_query = "UPDATE students SET photo_url = ? WHERE id = ?";
    $stmt = $pdo->prepare($update_query);
    $result = $stmt->execute([$photo_url, $student_id]);

    if (!$result) {
        // Remove uploaded file if database update fails
        unlink($upload_path);
        throw new Exception('Failed to update database');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Photo uploaded successfully',
        'photo_url' => $photo_url
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
