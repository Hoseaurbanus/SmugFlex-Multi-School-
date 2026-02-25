<?php
/**
 * Database Configuration
 * Graceland Royal Academy School Management System
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $charset = 'utf8mb4';
    
    public $conn;
    
    public function __construct() {
        $this->loadEnv();
        // Use environment variables if available, otherwise use defaults
        $this->host = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
        $this->db_name = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
        $this->username = $_ENV['DB_USER'] ?? getenv('DB_USER');
        $this->password = $_ENV['DB_PASS'] ?? getenv('DB_PASS');
        if (!$this->host || !$this->db_name || !$this->username || !$this->password) {
            throw new Exception('Database configuration is missing. Please set DB_HOST, DB_NAME, DB_USER, and DB_PASS in your .env or environment.');
        }
    }

    private function loadEnv() {
        if (isset($_ENV['DB_HOST']) || getenv('DB_HOST')) return;

        // Try multiple possible .env file locations
        $possiblePaths = [
            __DIR__ . '/../.env',           // Standard location
            __DIR__ . '/../../.env',        // One level up
            dirname(__DIR__) . '/.env',     // Alternative path
            $_SERVER['DOCUMENT_ROOT'] . '/.env', // Document root
            getcwd() . '/.env'              // Current working directory
        ];

        $envFile = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $envFile = $path;
                break;
            }
        }

        if (!$envFile) {
            error_log("Config: No .env file found in any of these locations: " . implode(', ', $possiblePaths));
            return;
        }

        if (!is_readable($envFile)) {
            error_log("Config: .env file exists but is not readable: $envFile");
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            error_log("Config: Failed to read .env file: $envFile");
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                error_log("Config: Skipping line: '$line'");
                continue;
            }
            if (strpos($line, '=') === false) {
                error_log("Config: No equals sign in line: '$line'");
                continue;
            }

                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Remove quotes if present
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }

                if (!array_key_exists($name, $_ENV)) {
                    $_ENV[$name] = $value;
                    putenv("$name=$value");
                    error_log("Config: Successfully loaded $name = " . (strpos($name, 'PASS') !== false ? '[HIDDEN]' : "'$value'"));
                } else {
                    error_log("Config: Skipping $name (already exists)");
                }
        }

        error_log("Config: Successfully loaded environment variables from: $envFile");
    }
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch(PDOException $exception) {
            error_log("Database connection failed: " . $exception->getMessage());
            throw new Exception("Database connection failed: " . $exception->getMessage());
        }
        
        return $this->conn;
    }
}

/**
 * Configuration Settings
 */
class Config {
    private static $envLoaded = false;

    private static function ensureEnvLoaded() {
        if (!self::$envLoaded) {
            self::loadEnvFile();
            self::$envLoaded = true;
        }
    }

    private static function loadEnvFile() {
        // Try multiple possible .env file locations
        $possiblePaths = [
            __DIR__ . '/../.env',           // Standard location
            __DIR__ . '/../../.env',        // One level up
            dirname(__DIR__) . '/.env',     // Alternative path
            $_SERVER['DOCUMENT_ROOT'] . '/.env', // Document root
            getcwd() . '/.env'              // Current working directory
        ];

        $envFile = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $envFile = $path;
                break;
            }
        }

        if (!$envFile) {
            error_log("Config: No .env file found in any of these locations: " . implode(', ', $possiblePaths));
            return;
        }

        if (!is_readable($envFile)) {
            error_log("Config: .env file exists but is not readable: $envFile");
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            error_log("Config: Failed to read .env file: $envFile");
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                error_log("Config: Skipping line: '$line'");
                continue;
            }
            if (strpos($line, '=') === false) {
                error_log("Config: No equals sign in line: '$line'");
                continue;
            }

                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Remove quotes if present
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }

                if (!array_key_exists($name, $_ENV)) {
                    $_ENV[$name] = $value;
                    putenv("$name=$value");
                    error_log("Config: Successfully loaded $name = " . (strpos($name, 'PASS') !== false ? '[HIDDEN]' : "'$value'"));
                } else {
                    error_log("Config: Skipping $name (already exists)");
                }
        }

        error_log("Config: Successfully loaded environment variables from: $envFile");
    }

    // Database Settings
    public static function get($key, $default = null) {
        self::ensureEnvLoaded();
        return $_ENV[$key] ?? getenv($key) ?? $default;
    }
    
    // JWT Settings
    const JWT_ALGORITHM = 'HS256';
    
    public static function getJwtSecret() {
        $secret = self::get('JWT_SECRET');
        if (!$secret) {
            // Fallback for production servers
            $fallbackSecret = 'graceland-academy-jwt-secret-key-2024-secure';
            error_log("Config: JWT_SECRET not found, using fallback secret");
            return $fallbackSecret;
        }
        return $secret;
    }
    
    public static function getJwtExpiry() {
        return (int)self::get('JWT_EXPIRY', '86400'); // 24 hours
    }
    
    // File Upload Settings
    public static function getUploadPath() {
        return self::get('UPLOAD_PATH', '../uploads/');
    }
    
    const MAX_FILE_SIZE = 5242880; // 5MB
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];
    
    // Pagination
    const DEFAULT_PAGE_SIZE = 20;
    const MAX_PAGE_SIZE = 100;
    
    // School Settings
    public static function getSchoolName() {
        return self::get('SCHOOL_NAME', 'Graceland Royal Academy');
    }
    
    public static function getSchoolEmail() {
        return self::get('SCHOOL_EMAIL', 'info@gracelandacademy.com');
    }
    
    public static function getSchoolPhone() {
        return self::get('SCHOOL_PHONE', '+234-800-000-0000');
    }
    
    public static function getSchoolAddress() {
        return self::get('SCHOOL_ADDRESS', '123 Education Street, Lagos, Nigeria');
    }
    
    // CORS Headers
    public static function getAllowedOrigins() {
        $origins = self::get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,https://gracelandroyalacademy.com.ng');
        return array_map('trim', explode(',', $origins));
    }
    
    // API Version
    const API_VERSION = '1.0.0';
    
    // Application Environment
    public static function isDebugMode() {
        return self::get('APP_DEBUG', 'false') === 'true';
    }
    
    public static function getAppEnv() {
        return self::get('APP_ENV', 'production');
    }
    
    // Timezone
    public static function getTimezone() {
        return self::get('APP_TIMEZONE', 'Africa/Lagos');
    }
}
?>
