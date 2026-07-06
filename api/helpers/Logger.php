<?php
/**
 * Logger Helper
 * SMugFlex 2.0 Multi-School Platform
 */

class Logger {
    private static $logFile = null;
    private static $logLevel = 'INFO';
    private static $levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    
    /**
     * Initialize logger
     */
    public static function init($logFile = null, $logLevel = 'INFO') {
        self::$logFile = $logFile ?: __DIR__ . '/../../logs/app.log';
        self::$logLevel = $logLevel;
        
        // Create log directory if it doesn't exist
        $logDir = dirname(self::$logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Log debug message
     */
    public static function debug($message, $context = []) {
        self::log('DEBUG', $message, $context);
    }
    
    /**
     * Log info message
     */
    public static function info($message, $context = []) {
        self::log('INFO', $message, $context);
    }
    
    /**
     * Log warning message
     */
    public static function warning($message, $context = []) {
        self::log('WARNING', $message, $context);
    }
    
    /**
     * Log error message
     */
    public static function error($message, $context = []) {
        self::log('ERROR', $message, $context);
    }
    
    /**
     * Log critical message
     */
    public static function critical($message, $context = []) {
        self::log('CRITICAL', $message, $context);
    }
    
    /**
     * Log security event
     */
    public static function security($event, $details = []) {
        self::log('SECURITY', $event, $details);
    }
    
    /**
     * Log performance metrics
     */
    public static function performance($metric, $value, $context = []) {
        self::log('PERFORMANCE', "{$metric}: {$value}", $context);
    }
    
    /**
     * Log API request
     */
    public static function api($method, $endpoint, $statusCode, $responseTime, $userId = null, $error = null) {
        $context = [
            'method' => $method,
            'endpoint' => $endpoint,
            'status_code' => $statusCode,
            'response_time_ms' => $responseTime,
            'user_id' => $userId,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        $message = $error ? "API {$method} {$endpoint} failed: {$error}" : "API {$method} {$endpoint} completed";
        $level = $statusCode >= 500 ? 'ERROR' : ($statusCode >= 400 ? 'WARNING' : 'INFO');
        
        self::log($level, $message, $context);
    }
    
    /**
     * Log database operation
     */
    public static function database($operation, $table, $affectedRows = null, $error = null) {
        $context = [
            'operation' => $operation,
            'table' => $table,
            'affected_rows' => $affectedRows,
            'execution_time' => microtime(true)
        ];
        
        $message = $error ? "DB {$operation} on {$table} failed: {$error}" : "DB {$operation} on {$table} completed";
        $level = $error ? 'ERROR' : 'INFO';
        
        self::log($level, $message, $context);
    }
    
    /**
     * Log authentication event
     */
    public static function auth($event, $userId = null, $username = null, $ip = null) {
        $context = [
            'event' => $event,
            'user_id' => $userId,
            'username' => $username,
            'ip' => $ip ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown'),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        self::log('SECURITY', "Auth event: {$event}", $context);
    }
    
    /**
     * Core logging method
     */
    private static function log($level, $message, $context = []) {
        if (!self::$logFile) {
            self::init();
        }
        
        // Check if we should log this level
        if (!self::shouldLog($level)) {
            return;
        }
        
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = empty($context) ? '' : ' ' . json_encode($context);
        
        $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
        
        // Write to log file
        file_put_contents(self::$logFile, $logEntry, FILE_APPEND | LOCK_EX);
        
        // Security: No logging to PHP error log in production
        // Use internal logging only
        // if ($level === 'CRITICAL' || $level === 'ERROR') {
        //     error_log("SCHOOL_SYSTEM: {$message}");
        // }
    }
    
    /**
     * Check if we should log at this level
     */
    private static function shouldLog($level) {
        $currentLevelIndex = array_search(self::$logLevel, self::$levels);
        $messageLevelIndex = array_search($level, self::$levels);
        
        return $messageLevelIndex >= $currentLevelIndex;
    }
    
    /**
     * Get recent log entries
     */
    public static function getRecent($lines = 100, $level = null) {
        if (!self::$logFile || !file_exists(self::$logFile)) {
            return [];
        }
        
        $content = file_get_contents(self::$logFile);
        $allLines = explode(PHP_EOL, trim($content));
        $allLines = array_reverse(array_filter($allLines));
        
        if ($level) {
            $allLines = array_filter($allLines, function($line) use ($level) {
                return strpos($line, "[{$level}]") !== false;
            });
        }
        
        return array_slice($allLines, 0, $lines);
    }
    
    /**
     * Clear log file
     */
    public static function clear() {
        if (self::$logFile && file_exists(self::$logFile)) {
            file_put_contents(self::$logFile, '');
        }
    }
    
    /**
     * Get log statistics
     */
    public static function getStats() {
        if (!self::$logFile || !file_exists(self::$logFile)) {
            return [
                'total_lines' => 0,
                'file_size' => 0,
                'last_modified' => null
            ];
        }
        
        $content = file_get_contents(self::$logFile);
        $lines = explode(PHP_EOL, trim($content));
        $lines = array_filter($lines);
        
        return [
            'total_lines' => count($lines),
            'file_size' => filesize(self::$logFile),
            'last_modified' => date('Y-m-d H:i:s', filemtime(self::$logFile))
        ];
    }
}
?>
