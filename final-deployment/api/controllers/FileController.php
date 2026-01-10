<?php
require_once 'config/database.php';
require_once 'helpers/Response.php';
require_once 'helpers/Middleware.php';

class FileController {
    private $db;
    private $uploadDir;
    
    public function __construct() {
        $this->db = (new Database())->getConnection();
        $this->uploadDir = __DIR__ . '/../../assets/uploads/';
        
        // Create upload directory if it doesn't exist
        if (!file_exists($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    public function uploadLogo() {
        try {
            // Check if file was uploaded
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                Response::error('No file uploaded or upload error', 400);
                return;
            }
            
            $file = $_FILES['file'];
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);
            
            if (!in_array($mimeType, $allowedTypes)) {
                Response::error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed', 400);
                return;
            }
            
            // Validate file size (max 5MB)
            $maxSize = 5 * 1024 * 1024; // 5MB
            if ($file['size'] > $maxSize) {
                Response::error('File too large. Maximum size is 5MB', 400);
                return;
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'logo_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $this->uploadDir . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                Response::error('Failed to move uploaded file', 500);
                return;
            }
            
            // Create web-accessible URL
            $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
            $relativePath = '/GG/assets/uploads/' . $filename;
            $fullUrl = $baseUrl . $relativePath;
            
            Response::success([
                'filename' => $filename,
                'filepath' => $filepath,
                'url' => $fullUrl,
                'relative_path' => $relativePath,
                'size' => $file['size'],
                'mime_type' => $mimeType
            ], 'File uploaded successfully');
            
        } catch (Exception $e) {
            Response::error('Upload failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function deleteFile($filename) {
        try {
            $filepath = $this->uploadDir . $filename;
            
            if (file_exists($filepath)) {
                if (unlink($filepath)) {
                    Response::success(null, 'File deleted successfully');
                } else {
                    Response::error('Failed to delete file', 500);
                }
            } else {
                Response::error('File not found', 404);
            }
        } catch (Exception $e) {
            Response::error('Delete failed: ' . $e->getMessage(), 500);
        }
    }
}
?>
