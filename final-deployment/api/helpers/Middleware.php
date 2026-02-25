<?php
/**
 * API Middleware
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/JWT.php';
require_once __DIR__ . '/Response.php';

class Middleware {
    /**
     * Require Authentication
     */
    public static function requireAuth() {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $token_data = JWT::validateToken($headers);
        
        if (!$token_data) {
            Response::unauthorized('Invalid or expired token');
        }
        
        return $token_data;
    }
    
    /**
     * Require Specific Role
     */
    public static function requireRole($required_role) {
        $token_data = self::requireAuth();
        
        if ($token_data['role'] !== $required_role) {
            Response::forbidden('Access denied. Required role: ' . $required_role);
        }
        
        return $token_data;
    }
    
    /**
     * Require Any of Multiple Roles
     */
    public static function requireAnyRole($allowed_roles) {
        $token_data = self::requireAuth();
        
        if (!in_array($token_data['role'], $allowed_roles)) {
            Response::forbidden('Access denied. Insufficient permissions');
        }
        
        return $token_data;
    }
    
    /**
     * Require Admin Role with Additional Verification
     */
    public static function requireAdminWithVerification() {
        $token_data = self::requireAuth();
        
        if ($token_data['role'] !== 'admin') {
            Response::forbidden('Access denied. Admin privileges required');
        }
        
        // Additional admin verification - check if user still exists and is active
        try {
            $database = new Database();
            $conn = $database->getConnection();
            
            $query = "SELECT id, username, role, status FROM users 
                     WHERE id = :user_id AND role = 'admin' AND status = 'Active'";
            $stmt = $conn->prepare($query);
            $stmt->bindParam(':user_id', $token_data['user_id']);
            $stmt->execute();
            
            $admin_user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admin_user) {
                Response::unauthorized('Admin account not found or inactive');
            }
            
            return $token_data;
            
        } catch (PDOException $e) {
            Response::serverError('Database error during admin verification');
        }
    }
    
    /**
     * Check if user can access resource
     */
    public static function canAccessResource($resource_user_id, $token_data = null) {
        if (!$token_data) {
            $token_data = self::requireAuth();
        }
        
        // Admin can access everything
        if ($token_data['role'] === 'admin') {
            return true;
        }
        
        // Users can access their own resources
        return $token_data['linked_id'] == $resource_user_id;
    }
    
    /**
     * Validate Input Data
     */
    public static function validateRequired($data, $required_fields) {
        $errors = [];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
            }
        }
        
        if (!empty($errors)) {
            Response::validationError($errors);
        }
        
        return true;
    }
    
    /**
     * Validate Email Format
     */
    public static function validateEmail($email) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::validationError(['email' => 'Invalid email format']);
        }
        
        return true;
    }
    
    /**
     * Validate Phone Number
     */
    public static function validatePhone($phone) {
        // Remove all non-numeric characters
        $clean_phone = preg_replace('/[^0-9]/', '', $phone);
        
        if (strlen($clean_phone) < 10 || strlen($clean_phone) > 15) {
            Response::validationError(['phone' => 'Invalid phone number format']);
        }
        
        return $clean_phone;
    }
    
    /**
     * Validate Date Format
     */
    public static function validateDate($date, $format = 'Y-m-d') {
        $d = DateTime::createFromFormat($format, $date);
        if (!$d || $d->format($format) !== $date) {
            Response::validationError(['date' => 'Invalid date format. Expected: ' . $format]);
        }
        
        return $date;
    }
    
    /**
     * Validate Numeric Input
     */
    public static function validateNumeric($value, $field_name = 'value') {
        if (!is_numeric($value)) {
            Response::validationError([$field_name => 'Must be a valid number']);
        }
        
        return (float)$value;
    }
    
    /**
     * Validate Integer Input
     */
    public static function validateInteger($value, $field_name = 'value') {
        if (!filter_var($value, FILTER_VALIDATE_INT)) {
            Response::validationError([$field_name => 'Must be a valid integer']);
        }
        
        return (int)$value;
    }
    
    /**
     * Validate Positive Number
     */
    public static function validatePositive($value, $field_name = 'value') {
        $numeric = self::validateNumeric($value, $field_name);
        
        if ($numeric <= 0) {
            Response::validationError([$field_name => 'Must be greater than 0']);
        }
        
        return $numeric;
    }
    
    /**
     * Validate Non-Negative Number (allows 0)
     */
    public static function validateNonNegative($value, $field_name = 'value') {
        $numeric = self::validateNumeric($value, $field_name);
        
        if ($numeric < 0) {
            Response::validationError([$field_name => 'Must be 0 or greater']);
        }
        
        return $numeric;
    }
    
    /**
     * Validate Enum Value
     */
    public static function validateEnum($value, $allowed_values, $field_name = 'value') {
        if (!in_array($value, $allowed_values)) {
            Response::validationError([$field_name => 'Invalid value. Allowed: ' . implode(', ', $allowed_values)]);
        }
        
        return $value;
    }
    
    /**
     * Sanitize String Input
     */
    public static function sanitizeString($value) {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Get Pagination Parameters
     */
    public static function getPaginationParams() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    /**
     * Get Search Parameters
     */
    public static function getSearchParams() {
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $sort_by = isset($_GET['sort_by']) ? trim($_GET['sort_by']) : 'id';
        $sort_order = isset($_GET['sort_order']) ? strtoupper(trim($_GET['sort_order'])) : 'ASC';
        
        if (!in_array($sort_order, ['ASC', 'DESC'])) {
            $sort_order = 'ASC';
        }
        
        return [
            'search' => $search,
            'sort_by' => $sort_by,
            'sort_order' => $sort_order
        ];
    }
    
    /**
     * Log Activity
     */
    public static function logActivity($actor, $actor_role, $action, $target = '', $status = 'Success', $details = '', $user_id = null) {
        try {
            $database = new Database();
            $conn = $database->getConnection();
            
            $query = "INSERT INTO activity_logs (actor, actor_role, action, target, ip_address, status, details, user_id) 
                      VALUES (:actor, :actor_role, :action, :target, :ip_address, :status, :details, :user_id)";
            
            $stmt = $conn->prepare($query);
            
            $stmt->bindParam(':actor', $actor);
            $stmt->bindParam(':actor_role', $actor_role);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':target', $target);
            $stmt->bindParam(':ip_address', $_SERVER['REMOTE_ADDR']);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':details', $details);
            $stmt->bindParam(':user_id', $user_id);
            
            $stmt->execute();
        } catch (Exception $e) {
            // Log error but don't break the application
            error_log("Activity log error: " . $e->getMessage());
        }
    }
    
    /**
     * Handle File Upload
     */
    public static function handleFileUpload($file_input_name, $upload_type, $allowed_extensions = null) {
        if (!isset($_FILES[$file_input_name]) || $_FILES[$file_input_name]['error'] !== UPLOAD_ERR_OK) {
            Response::badRequest('File upload error');
        }
        
        $file = $_FILES[$file_input_name];
        
        // Check file size (5MB default)
        if ($file['size'] > 5242880) {
            Response::badRequest('File size exceeds maximum limit of 5MB');
        }
        
        // Get file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if ($allowed_extensions && !in_array($extension, $allowed_extensions)) {
            Response::badRequest('File type not allowed');
        }
        
        // Generate unique filename
        $filename = uniqid() . '.' . $extension;
        $upload_path = '../uploads/' . $upload_type . '/';
        
        // Create directory if it doesn't exist
        if (!is_dir($upload_path)) {
            mkdir($upload_path, 0777, true);
        }
        
        // Move file
        if (!move_uploaded_file($file['tmp_name'], $upload_path . $filename)) {
            Response::serverError('Failed to upload file');
        }
        
        return [
            'filename' => $filename,
            'original_name' => $file['name'],
            'file_path' => $upload_path . $filename,
            'file_size' => $file['size'],
            'mime_type' => $file['type']
        ];
    }
}
?>
