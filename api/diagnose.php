<?php
/**
 * DIAGNOSTIC SCRIPT - Upload to cPanel api/ directory
 * Visit: https://smug.site.gracelandroyalacademy.com.ng/api/diagnose.php
 * DELETE after use!
 */
header('Content-Type: text/plain');

echo "=== SMugFlex Diagnostic ===\n\n";

// 1. PHP Version
echo "1. PHP Version: " . PHP_VERSION . "\n";
echo "   PHP Major.Minor: " . PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION . "\n";

// 2. .env file
echo "\n2. .env file:\n";
$envPaths = [
    __DIR__ . '/.env',
    __DIR__ . '/../.env',
    dirname(__DIR__) . '/.env',
];
$envFound = false;
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        echo "   Found: $path\n";
        $envFound = true;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $keys = [];
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            $parts = explode('=', $line, 2);
            $keys[] = trim($parts[0]);
        }
        echo "   Keys: " . implode(', ', $keys) . "\n";
        echo "   Has JWT_SECRET: " . (in_array('JWT_SECRET', $keys) ? 'YES' : 'NO') . "\n";
        echo "   Has SUPER_ADMIN_JWT_SECRET: " . (in_array('SUPER_ADMIN_JWT_SECRET', $keys) ? 'YES' : 'NO') . "\n";
        echo "   Has DB_HOST: " . (in_array('DB_HOST', $keys) ? 'YES' : 'NO') . "\n";
        echo "   Has DB_NAME: " . (in_array('DB_NAME', $keys) ? 'YES' : 'NO') . "\n";
        echo "   Has DB_USER: " . (in_array('DB_USER', $keys) ? 'YES' : 'NO') . "\n";
        echo "   Has DB_PASS: " . (in_array('DB_PASS', $keys) ? 'YES' : 'NO') . "\n";
        break;
    }
}
if (!$envFound) {
    echo "   NO .env FILE FOUND!\n";
}

// 3. Config class test
echo "\n3. Config class:\n";
require_once __DIR__ . '/config/database.php';
try {
    $jwtSecret = Config::get('JWT_SECRET');
    echo "   JWT_SECRET: " . ($jwtSecret ? 'SET (len=' . strlen($jwtSecret) . ')' : 'EMPTY/MISSING') . "\n";
} catch (Exception $e) {
    echo "   JWT_SECRET ERROR: " . $e->getMessage() . "\n";
}

// 4. Database connection
echo "\n4. Database connection:\n";
try {
    $db = new Database();
    $conn = $db->getConnection();
    echo "   CONNECTED OK\n";
    
    // Check critical tables
    $tables = ['schools', 'users', 'super_admins', 'accountants', 'students', 'teachers', 
               'token_blacklist', 'platform_activity_logs', 'school_modules', 'school_settings'];
    foreach ($tables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) as cnt FROM `$table`");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            echo "   $table: " . $row['cnt'] . " rows\n";
        } catch (PDOException $e) {
            echo "   $table: MISSING or ERROR - " . $e->getMessage() . "\n";
        }
    }
    
    // Check token_blacklist columns
    echo "\n   token_blacklist columns:\n";
    try {
        $cols = $conn->query("SHOW COLUMNS FROM token_blacklist")->fetchAll(PDO::FETCH_COLUMN);
        echo "   " . implode(', ', $cols) . "\n";
    } catch (PDOException $e) {
        echo "   ERROR: " . $e->getMessage() . "\n";
    }
    
    // Check accountants columns
    echo "   accountants columns:\n";
    try {
        $cols = $conn->query("SHOW COLUMNS FROM accountants")->fetchAll(PDO::FETCH_COLUMN);
        echo "   " . implode(', ', $cols) . "\n";
    } catch (PDOException $e) {
        echo "   ERROR: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "   CONNECTION FAILED: " . $e->getMessage() . "\n";
}

// 5. Test each controller file for parse errors
echo "\n5. Controller parse check:\n";
$controllers = [
    'AuthController', 'SuperAdminController', 'TenantController', 'StudentController',
    'TeacherController', 'ClassController', 'SubjectController', 'ResultsController',
    'PaymentController', 'InvoiceController', 'ParentController', 'ReportController',
    'AttendanceController', 'NotificationController', 'AssignmentController', 'FileController',
    'UserController', 'ProgressionController', 'RealtimeController', 'CbtController'
];
foreach ($controllers as $ctrl) {
    $file = __DIR__ . "/controllers/$ctrl.php";
    if (!file_exists($file)) {
        echo "   $ctrl: FILE MISSING\n";
        continue;
    }
    // Check for BOM (Byte Order Mark) — causes PHP to treat file as HTML output
    $head = file_get_contents($file, false, null, 0, 3);
    if (bin2hex($head) === 'efbbbf') {
        echo "   $ctrl: HAS UTF-8 BOM — remove it!\n";
        continue;
    }
    // Syntax check — use the file directly (it already has <?php)
    $output = [];
    $exitCode = 0;
    exec('php -l ' . escapeshellarg($file) . ' 2>&1', $output, $exitCode);
    if ($exitCode === 0) {
        echo "   $ctrl: OK\n";
    } else {
        echo "   $ctrl: SYNTAX ERROR - " . implode("\n   ", $output) . "\n";
    }
}

// 6. Test helpers
echo "\n6. Helper parse check:\n";
$helpers = ['Response', 'Middleware', 'JWT', 'RateLimiter', 'TenantMiddleware', 'SchemaMigration', 'RealtimeEvents'];
foreach ($helpers as $h) {
    $file = __DIR__ . "/helpers/$h.php";
    if (!file_exists($file)) {
        echo "   $h: FILE MISSING\n";
        continue;
    }
    $head = file_get_contents($file, false, null, 0, 3);
    if (bin2hex($head) === 'efbbbf') {
        echo "   $h: HAS UTF-8 BOM — remove it!\n";
        continue;
    }
    $output = [];
    $exitCode = 0;
    exec('php -l ' . escapeshellarg($file) . ' 2>&1', $output, $exitCode);
    if ($exitCode === 0) {
        echo "   $h: OK\n";
    } else {
        echo "   $h: SYNTAX ERROR - " . implode("\n   ", $output) . "\n";
    }
}

// 7. Test index.php
echo "\n7. index.php parse check:\n";
$head = file_get_contents(__DIR__ . '/index.php', false, null, 0, 3);
if (bin2hex($head) === 'efbbbf') {
    echo "   index.php: HAS UTF-8 BOM — remove it!\n";
} else {
    $output = [];
    $exitCode = 0;
    exec('php -l ' . escapeshellarg(__DIR__ . '/index.php') . ' 2>&1', $output, $exitCode);
    echo "   index.php: " . ($exitCode === 0 ? "OK" : implode("\n   ", $output)) . "\n";
}

// 8. CWD vs __DIR__ check
echo "\n8. Path resolution check:\n";
echo "   CWD: " . getcwd() . "\n";
echo "   __DIR__: " . __DIR__ . "\n";
echo "   config/database.php exists (CWD): " . (file_exists('config/database.php') ? 'YES' : 'NO') . "\n";
echo "   config/database.php exists (__DIR__): " . (file_exists(__DIR__ . '/config/database.php') ? 'YES' : 'NO') . "\n";
echo "   helpers/Response.php exists (CWD): " . (file_exists('helpers/Response.php') ? 'YES' : 'NO') . "\n";
echo "   helpers/Response.php exists (__DIR__): " . (file_exists(__DIR__ . '/helpers/Response.php') ? 'YES' : 'NO') . "\n";

echo "\n=== END DIAGNOSTIC ===\n";
echo "DELETE THIS FILE AFTER USE!\n";
