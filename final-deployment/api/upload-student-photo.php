<?php
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';
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
$token_data = Middleware::requireRole('admin');

try {
    if (!isset($_FILES['passport']) || $_FILES['passport']['error'] !== UPLOAD_ERR_OK) {
        Response::badRequest('No file uploaded or upload error');
    }

    if (!isset($_POST['student_id']) || empty($_POST['student_id'])) {
        Response::badRequest('Student ID is required');
    }

    $database = new Database();
    $pdo = $database->getConnection();

    $school_id = TenantMiddleware::resolveSchoolId($pdo);

    $student_id = intval($_POST['student_id']);
    $file = $_FILES['passport'];

    // Validate file type
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $file_type = finfo_file($finfo, $file['tmp_name']);
    unset($finfo);
    if (!in_array($file_type, $allowed_types)) {
        Response::badRequest('Only JPEG, PNG, and GIF images are allowed');
    }

    // Validate file size (max 6MB)
    if ($file['size'] > 6 * 1024 * 1024) {
        Response::badRequest('File size must be less than 6MB');
    }

    // Compute deployment prefix dynamically.
    // Examples:
    // - If API is served from /GG/api, assets should be /GG/assets/...
    // - If API is served from /api, assets should be /assets/...
    $scriptDir = isset($_SERVER['SCRIPT_NAME']) ? dirname($_SERVER['SCRIPT_NAME']) : '';
    $basePrefix = preg_replace('#/api$#', '', $scriptDir);
    if ($basePrefix === '' || $basePrefix === '.') {
        $basePrefix = '';
    }

    // Create upload directory in the *public* web root so the URL is reachable
    $documentRoot = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') : '';
    $upload_dir = $documentRoot . rtrim($basePrefix, '/') . '/assets/images/students/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $canOptimize = extension_loaded('gd') && function_exists('imagecreatetruecolor');
    $isOptimizable = $canOptimize && in_array($file_type, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

    // Generate unique filename
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $target_extension = $isOptimizable ? 'jpg' : ($file_extension ?: 'jpg');
    $filename = 'student_' . $student_id . '_' . time() . '.' . $target_extension;
    $upload_path = $upload_dir . $filename;

    if ($isOptimizable) {
        $tmpName = $upload_dir . 'tmp_' . $student_id . '_' . time() . '.' . ($file_extension ?: 'upload');
        if (!move_uploaded_file($file['tmp_name'], $tmpName)) {
            Response::serverError('Failed to move uploaded file');
        }

        $src = null;
        if ($file_type === 'image/jpeg' || $file_type === 'image/jpg') {
            $src = @imagecreatefromjpeg($tmpName);
        } elseif ($file_type === 'image/png') {
            $src = @imagecreatefrompng($tmpName);
        } elseif ($file_type === 'image/webp') {
            if (function_exists('imagecreatefromwebp')) {
                $src = @imagecreatefromwebp($tmpName);
            }
        }

        if (!$src) {
            @unlink($tmpName);
            Response::serverError('Failed to process uploaded image');
        }

        $srcW = imagesx($src);
        $srcH = imagesy($src);

        $maxW = 600;
        $maxH = 800;
        $scale = min($maxW / max($srcW, 1), $maxH / max($srcH, 1), 1);

        $dstW = max((int)round($srcW * $scale), 1);
        $dstH = max((int)round($srcH * $scale), 1);

        $dst = imagecreatetruecolor($dstW, $dstH);
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $white);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);

        $quality = 75;
        $saved = @imagejpeg($dst, $upload_path, $quality);

        unset($dst);
        unset($src);
        @unlink($tmpName);

        if (!$saved) {
            Response::serverError('Failed to save optimized image');
        }
    } else {
        // Move uploaded file (no optimization)
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            Response::serverError('Failed to move uploaded file');
        }
    }

    // Update database with new photo URL
    $photo_url = rtrim($basePrefix, '/') . '/assets/images/students/' . $filename;
    $update_query = "UPDATE students SET photo_url = ? WHERE id = ? AND school_id = ?";
    $stmt = $pdo->prepare($update_query);
    $result = $stmt->execute([$photo_url, $student_id, $school_id]);

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
