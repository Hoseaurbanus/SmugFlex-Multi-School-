<?php
/**
 * Rate Limiter Helper
 * Graceland Royal Academy School Management System
 * 
 * Protects against brute force attacks using in-process caching
 * Falls back to file-based storage if APCu not available
 */

class RateLimiter {
    private static $type = null;  // 'apcu', 'file', or null
    private static $storage_dir = null;
    private static $max_attempts = 5;
    private static $window_seconds = 900;  // 15 minutes
    
    /**
     * Initialize rate limiter
     */
    public static function init() {
        if (self::$type !== null) {
            return;  // Already initialized
        }
        
        // Prefer APCu if available (fastest, in-process)
        if (extension_loaded('apcu') && ini_get('apc.enabled')) {
            self::$type = 'apcu';
        } else {
            // Fallback to file-based storage
            self::$type = 'file';
            self::$storage_dir = sys_get_temp_dir() . '/graceland_rate_limit';
            
            // Create storage directory if needed
            if (!is_dir(self::$storage_dir)) {
                if (!@mkdir(self::$storage_dir, 0700, true)) {
                    self::$type = null;
                    return;
                }
            }
        }
    }
    
    /**
     * Check if request is rate limited
     * 
     * @param string $identifier Unique identifier (e.g., username, IP address)
     * @param string $action Action type (e.g., 'login_attempt', 'password_reset')
     * @return bool True if rate limited (reject request), false if allowed
     */
    public static function isLimited($identifier, $action = 'login_attempt') {
        self::init();
        
        if (self::$type === null) {
            // If initialization failed, don't block requests (fail secure)
            return false;
        }
        
        // Sanitize identifier to prevent path traversal in file mode
        $safe_identifier = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $identifier);
        if (empty($safe_identifier)) {
            $safe_identifier = 'unknown_' . substr(md5($identifier), 0, 8);
        }
        
        $key = "{$action}_{$safe_identifier}";
        $current_time = time();
        
        // Get current attempt data
        $data = self::get($key);
        
        if ($data === null) {
            // First attempt - initialize
            $data = [
                'attempts' => 1,
                'window_start' => $current_time,
                'last_attempt' => $current_time
            ];
            self::set($key, $data);
            return false;  // First attempt always allowed
        }
        
        // Check if within window
        $window_elapsed = $current_time - $data['window_start'];
        
        if ($window_elapsed > self::$window_seconds) {
            // Window expired, reset counter
            $data = [
                'attempts' => 1,
                'window_start' => $current_time,
                'last_attempt' => $current_time
            ];
            self::set($key, $data);
            return false;  // New window, request allowed
        }
        
        // Still within window - increment attempts
        $data['attempts']++;
        $data['last_attempt'] = $current_time;
        self::set($key, $data);
        
        // Check if exceeded limit
        if ($data['attempts'] > self::$max_attempts) {
            return true;  // Rate limited - reject request
        }
        
        return false;  // Within limit
    }
    
    /**
     * Get remaining attempts before rate limit
     * 
     * @param string $identifier Unique identifier
     * @param string $action Action type
     * @return int Number of attempts remaining (0 if rate limited)
     */
    public static function getRemaining($identifier, $action = 'login_attempt') {
        self::init();
        
        if (self::$type === null) {
            return self::$max_attempts;
        }
        
        $safe_identifier = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $identifier);
        if (empty($safe_identifier)) {
            $safe_identifier = 'unknown_' . substr(md5($identifier), 0, 8);
        }
        
        $key = "{$action}_{$safe_identifier}";
        $current_time = time();
        
        $data = self::get($key);
        
        if ($data === null) {
            return self::$max_attempts;
        }
        
        // Check if window expired
        $window_elapsed = $current_time - $data['window_start'];
        if ($window_elapsed > self::$window_seconds) {
            return self::$max_attempts;
        }
        
        // Return remaining attempts
        $remaining = self::$max_attempts - $data['attempts'];
        return max(0, $remaining);
    }
    
    /**
     * Get time until rate limit resets
     * 
     * @param string $identifier Unique identifier
     * @param string $action Action type
     * @return int Seconds until reset (0 if not limited)
     */
    public static function getResetTime($identifier, $action = 'login_attempt') {
        self::init();
        
        if (self::$type === null) {
            return 0;
        }
        
        $safe_identifier = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $identifier);
        if (empty($safe_identifier)) {
            $safe_identifier = 'unknown_' . substr(md5($identifier), 0, 8);
        }
        
        $key = "{$action}_{$safe_identifier}";
        $current_time = time();
        
        $data = self::get($key);
        
        if ($data === null) {
            return 0;
        }
        
        $window_elapsed = $current_time - $data['window_start'];
        $remaining_window = self::$window_seconds - $window_elapsed;
        
        if ($remaining_window <= 0) {
            return 0;
        }
        
        return (int)$remaining_window;
    }
    
    /**
     * Reset rate limit for an identifier
     * 
     * @param string $identifier Unique identifier
     * @param string $action Action type
     */
    public static function reset($identifier, $action = 'login_attempt') {
        self::init();
        
        if (self::$type === null) {
            return;
        }
        
        $safe_identifier = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $identifier);
        if (empty($safe_identifier)) {
            $safe_identifier = 'unknown_' . substr(md5($identifier), 0, 8);
        }
        
        $key = "{$action}_{$safe_identifier}";
        self::delete($key);
    }
    
    /**
     * Get value from cache
     */
    private static function get($key) {
        if (self::$type === 'apcu') {
            if (function_exists('apcu_fetch')) {
                return @apcu_fetch($key);
            }
        } elseif (self::$type === 'file') {
            $file = self::$storage_dir . '/' . md5($key) . '.json';
            if (!file_exists($file)) {
                return null;
            }
            
            $content = @file_get_contents($file);
            if ($content === false) {
                return null;
            }
            
            $data = @json_decode($content, true);
            return is_array($data) ? $data : null;
        }
        
        return null;
    }
    
    /**
     * Set value in cache
     */
    private static function set($key, $value) {
        if (self::$type === 'apcu') {
            // APCu with TTL of 2x window to allow expired windows to be cleaned up
            if (function_exists('apcu_store')) {
                @apcu_store($key, $value, self::$window_seconds * 2);
            }
        } elseif (self::$type === 'file') {
            $file = self::$storage_dir . '/' . md5($key) . '.json';
            @file_put_contents($file, json_encode($value));
            @chmod($file, 0600);
        }
    }
    
    /**
     * Delete value from cache
     */
    private static function delete($key) {
        if (self::$type === 'apcu') {
            if (function_exists('apcu_delete')) {
                @apcu_delete($key);
            }
        } elseif (self::$type === 'file') {
            $file = self::$storage_dir . '/' . md5($key) . '.json';
            if (file_exists($file)) {
                @unlink($file);
            }
        }
    }
    
    /**
     * Send rate limit response (429 Too Many Requests)
     */
    public static function throttled($identifier, $action = 'login_attempt') {
        $reset_time = self::getResetTime($identifier, $action);
        
        http_response_code(429);
        header('Retry-After: ' . $reset_time);
        header('Content-Type: application/json');
        
        echo json_encode([
            'success' => false,
            'error' => 'Too many attempts. Please try again in ' . $reset_time . ' seconds.',
            'retry_after' => $reset_time
        ]);
        
        exit;
    }
}
?>
