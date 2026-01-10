<?php
/**
 * API Response Helper
 * Graceland Royal Academy School Management System
 */

class Response {
    /**
     * Send JSON Response
     */
    public static function json($data, $status_code = 200, $message = '') {
        header_remove();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        http_response_code($status_code);
        
        $response = [
            'success' => $status_code >= 200 && $status_code < 300,
            'status' => $status_code,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * Success Response
     */
    public static function success($data = null, $message = 'Operation successful') {
        self::json($data, 200, $message);
    }
    
    /**
     * Created Response
     */
    public static function created($data = null, $message = 'Resource created successfully') {
        self::json($data, 201, $message);
    }
    
    /**
     * No Content Response
     */
    public static function noContent($message = 'Operation successful') {
        self::json(null, 204, $message);
    }
    
    /**
     * Bad Request Response
     */
    public static function badRequest($message = 'Bad request', $errors = null) {
        self::json($errors, 400, $message);
    }
    
    /**
     * Unauthorized Response
     */
    public static function unauthorized($message = 'Unauthorized access') {
        self::json(null, 401, $message);
    }
    
    /**
     * Forbidden Response
     */
    public static function forbidden($message = 'Access forbidden') {
        self::json(null, 403, $message);
    }
    
    /**
     * Not Found Response
     */
    public static function notFound($message = 'Resource not found') {
        self::json(null, 404, $message);
    }
    
    /**
     * Conflict Response
     */
    public static function conflict($message = 'Resource conflict') {
        self::json(null, 409, $message);
    }
    
    /**
     * Unprocessable Entity Response
     */
    public static function unprocessable($message = 'Validation failed', $errors = null) {
        self::json($errors, 422, $message);
    }
    
    /**
     * Error Response
     */
    public static function error($message = 'Error occurred', $status_code = 400) {
        self::json(null, $status_code, $message);
    }
    
    /**
     * Server Error Response
     */
    public static function serverError($message = 'Internal server error') {
        self::json(null, 500, $message);
    }
    
    /**
     * Paginated Response
     */
    public static function paginated($data, $page, $limit, $total, $message = 'Data retrieved successfully') {
        $total_pages = ceil($total / $limit);
        
        $pagination = [
            'current_page' => (int)$page,
            'per_page' => (int)$limit,
            'total' => (int)$total,
            'total_pages' => (int)$total_pages,
            'has_next' => $page < $total_pages,
            'has_prev' => $page > 1
        ];
        
        $response = [
            'items' => $data,
            'pagination' => $pagination
        ];
        
        self::json($response, 200, $message);
    }
    
    /**
     * Validation Error Response
     */
    public static function validationError($errors, $message = 'Validation failed') {
        self::json($errors, 422, $message);
    }
    
    /**
     * Options Response (for CORS preflight)
     */
    public static function options() {
        header_remove();
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
        http_response_code(200);
        exit;
    }
}
?>
