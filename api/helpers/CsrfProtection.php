<?php
/**
 * CSRF Protection Helper
 * SMugFlex 2.0 Multi-School Platform
 * 
 * Validates CSRF tokens for state-changing operations.
 * Tokens are passed via X-CSRF-Token header and validated against session.
 */

class CsrfProtection {
    private static $tokenName = 'smugflex_csrf';
    private static $headerName = 'X-CSRF-Token';
    
    /**
     * Generate a new CSRF token
     */
    public static function generateToken(): string {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        $token = bin2hex(random_bytes(32));
        $_SESSION[self::$tokenName] = [
            'token' => $token,
            'expires' => time() + 3600, // 1 hour
        ];
        
        return $token;
    }
    
    /**
     * Get the current token (generate if needed)
     */
    public static function getToken(): string {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (isset($_SESSION[self::$tokenName]) && 
            $_SESSION[self::$tokenName]['expires'] > time()) {
            return $_SESSION[self::$tokenName]['token'];
        }
        
        return self::generateToken();
    }
    
    /**
     * Validate a CSRF token
     */
    public static function validateToken(string $token): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (!isset($_SESSION[self::$tokenName])) {
            return false;
        }
        
        $stored = $_SESSION[self::$tokenName];
        
        // Check expiry
        if ($stored['expires'] < time()) {
            unset($_SESSION[self::$tokenName]);
            return false;
        }
        
        // Validate token using timing-safe comparison
        return hash_equals($stored['token'], $token);
    }
    
    /**
     * Validate the CSRF token from request headers
     * Should be called for all state-changing operations (POST, PUT, DELETE)
     */
    public static function validateRequest(): bool {
        // Get token from header
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        
        if (empty($token)) {
            // Fallback to form data
            $token = $_POST['csrf_token'] ?? '';
        }
        
        if (empty($token)) {
            Response::forbidden('CSRF token missing. Please refresh the page and try again.');
            return false;
        }
        
        if (!self::validateToken($token)) {
            Response::forbidden('Invalid or expired CSRF token. Please refresh the page and try again.');
            return false;
        }
        
        return true;
    }
    
    /**
     * Middleware for protecting state-changing routes
     * Call this at the start of POST, PUT, DELETE handlers
     */
    public static function requireValidCsrf(): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
            self::validateRequest();
        }
    }
    
    /**
     * Regenerate token (for high-security operations)
     */
    public static function regenerateToken(): string {
        return self::generateToken();
    }
    
    /**
     * Clear token (for logout)
     */
    public static function clearToken(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        unset($_SESSION[self::$tokenName]);
    }
}
