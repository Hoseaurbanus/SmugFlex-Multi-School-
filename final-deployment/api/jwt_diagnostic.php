<?php
/**
 * JWT Diagnostic Script
 * Run this on production server to identify JWT issues
 */

require_once 'config/database.php';

echo "=== JWT DIAGNOSTIC SCRIPT ===\n\n";

// 1. Check JWT Secret Loading
echo "1. JWT Secret Configuration:\n";
try {
    $secret = Config::getJwtSecret();
    echo "   JWT_SECRET loaded successfully: " . substr($secret, 0, 20) . "...\n";
    echo "   Secret length: " . strlen($secret) . " characters\n";
    echo "   Source: " . (Config::get('JWT_SECRET') ? 'from .env' : 'fallback') . "\n";
} catch (Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

echo "\n1.5. .env File Debug:\n";
$possiblePaths = [
    __DIR__ . '/../.env',
    __DIR__ . '/../../.env',
    dirname(__DIR__) . '/.env',
    $_SERVER['DOCUMENT_ROOT'] . '/.env',
    getcwd() . '/.env'
];

foreach ($possiblePaths as $path) {
    if (file_exists($path)) {
        echo "   FOUND: $path (readable: " . (is_readable($path) ? 'YES' : 'NO') . ")\n";
        $content = file_get_contents($path);
        if ($content !== false) {
            $lines = explode("\n", $content);
            $varCount = 0;
            foreach ($lines as $line) {
                $line = trim($line);
                if (!empty($line) && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
                    $varCount++;
                }
            }
            echo "   Lines in file: " . count($lines) . ", variables found: $varCount\n";
        }
        break;
    }
}

// 2. Check Environment Variables
echo "\n2. Environment Variables:\n";
$env_vars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
foreach ($env_vars as $var) {
    $value = Config::get($var);
    if ($value) {
        echo "   $var: " . (strpos($var, 'PASS') !== false ? '[HIDDEN]' : substr($value, 0, 20) . '...') . "\n";
    } else {
        echo "   $var: NOT SET\n";
    }
}

// 3. Test JWT Generation and Validation
echo "\n3. JWT Generation Test:\n";
$test_payload = [
    'user_id' => 1,
    'username' => 'test_user',
    'role' => 'admin',
    'iat' => time(),
    'exp' => time() + 3600
];

try {
    $token = JWT::generateUserToken($test_payload);
    echo "   Token generated successfully, length: " . strlen($token) . "\n";

    // Test validation
    $decoded = JWT::decode($token);
    if ($decoded) {
        echo "   Token validation: SUCCESS\n";
        echo "   Decoded user: " . ($decoded['username'] ?? 'unknown') . "\n";
    } else {
        echo "   Token validation: FAILED\n";
    }
} catch (Exception $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
}

// 4. Check PHP Environment
echo "\n4. PHP Environment:\n";
echo "   PHP Version: " . phpversion() . "\n";
echo "   Hash Extension: " . (extension_loaded('hash') ? 'LOADED' : 'NOT LOADED') . "\n";
echo "   OpenSSL Extension: " . (extension_loaded('openssl') ? 'LOADED' : 'NOT LOADED') . "\n";

// 5. Check File Permissions
echo "\n5. File Permissions:\n";
$files_to_check = ['.env', 'config/database.php', 'helpers/JWT.php'];
foreach ($files_to_check as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        $perms = substr(sprintf('%o', fileperms($path)), -4);
        echo "   $file: EXISTS (perms: $perms)\n";
    } else {
        echo "   $file: NOT FOUND\n";
    }
}

echo "\n=== END DIAGNOSTIC ===\n";
?>
