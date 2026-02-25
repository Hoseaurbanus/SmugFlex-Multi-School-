<?php
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Middleware.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    Response::options();
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::error('Method not allowed', 405);
}

// Require admin privileges via JWT
Middleware::requireRole('admin');

try {
    if (!isset($_FILES['passport']) || $_FILES['passport']['error'] !== UPLOAD_ERR_OK) {
        Response::badRequest('No file uploaded or upload error');
    }

    if (!isset($_POST['student_id']) || empty($_POST['student_id'])) {
        Response::badRequest('Student ID is required');
    }

    $database = new Database();
    $pdo = $database->getConnection();

    $student_id = intval($_POST['student_id']);
    $file = $_FILES['passport'];

    // Validate file type
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $file_type = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($file_type, $allowed_types)) {
        Response::badRequest('Only JPEG, PNG, and GIF images are allowed');
    }

    // Validate file size (max 6MB)
    if ($file['size'] > 6 * 1024 * 1024) {
        Response::badRequest('File size must be less than 6MB');
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
        Response::serverError('Failed to move uploaded file');
    }

    // Update database with new photo URL
    // Use /GG/ prefix for XAMPP subdirectory setup
    $photo_url = '/GG/assets/images/students/' . $filename;
    $update_query = "UPDATE students SET photo_url = ? WHERE id = ?";
    $stmt = $pdo->prepare($update_query);
    $result = $stmt->execute([$photo_url, $student_id]);

    if (!$result) {
        // Remove uploaded file if database update fails
        @unlink($upload_path);
        Response::serverError('Failed to update database');
    }

    Response::success(['photo_url' => $photo_url], 'Photo uploaded successfully');
} catch (Exception $e) {
    Response::error('Upload error', 400);
}
?>
