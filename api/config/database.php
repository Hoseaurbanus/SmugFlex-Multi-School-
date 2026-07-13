<?php
/**
 * Database Configuration
 * SMugFlex 2.0 Multi-School Platform
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

    private function shouldEmulatePrepares() {
        $value = $_ENV['DB_EMULATE_PREPARES'] ?? getenv('DB_EMULATE_PREPARES');
        if ($value === null || $value === false) {
            return true;
        }
        if (is_bool($value)) {
            return $value;
        }
        $value = strtolower(trim((string)$value));
        return in_array($value, ['1', 'true', 'on', 'yes'], true);
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

        if (!$envFile || !is_readable($envFile)) {
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $name = trim($parts[0]);
            if ($name === '') {
                continue;
            }

            $value = trim($parts[1]);

            // Remove quotes if present
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }

            if (!array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
    }
    
    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => $this->shouldEmulatePrepares(),
            ]);
        } catch(PDOException $exception) {
            error_log("Database connection failed: " . $exception->getMessage());
            throw new Exception("Database connection failed", 0, $exception);
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
        $possiblePaths = [
            __DIR__ . '/../.env',
            __DIR__ . '/../../.env',
            dirname(__DIR__) . '/.env',
            $_SERVER['DOCUMENT_ROOT'] . '/.env',
            getcwd() . '/.env'
        ];

        $envFile = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $envFile = $path;
                break;
            }
        }

        if (!$envFile || !is_readable($envFile)) {
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;

            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $name = trim($parts[0]);
            if ($name === '') {
                continue;
            }

            $value = trim($parts[1]);

            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }

            if (!array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
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
            // SECURITY FIX: Remove hardcoded fallback - require env var
            throw new Exception('JWT_SECRET environment variable is required. Please set it in your .env file.');
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
    
    // School Settings (multi-tenant: resolve from DB/JWT, not hardcoded)
    public static function getSchoolName() {
        $name = self::get('SCHOOL_NAME');
        if (!$name) {
            throw new Exception('SCHOOL_NAME environment variable is required for multi-tenant mode. Set per-school name via .env or resolve from JWT.');
        }
        return $name;
    }
    
    public static function getSchoolEmail() {
        $email = self::get('SCHOOL_EMAIL');
        if (!$email) {
            throw new Exception('SCHOOL_EMAIL environment variable is required for multi-tenant mode.');
        }
        return $email;
    }
    
    public static function getSchoolPhone() {
        return self::get('SCHOOL_PHONE', '');
    }
    
    public static function getSchoolAddress() {
        return self::get('SCHOOL_ADDRESS', '');
    }
    
    // CORS Headers
    public static function getAllowedOrigins() {
        $origins = self::get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173');
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
        return self::get('APP_TIMEZONE', date_default_timezone_get() ?: 'UTC');
    }
}
?>
