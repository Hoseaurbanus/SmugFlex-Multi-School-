<?php
/**
 * SMugFlex Migration Runner
 * Usage: php api/migrate.php run [filename]
 *        php api/migrate.php list
 *        php api/migrate.php status
 */

$baseDir = dirname(__DIR__);
$migrationsDir = $baseDir . '/database/migrations';
$envPaths = [
    __DIR__ . '/.env',
    $baseDir . '/.env',
    $baseDir . '/api/.env',
];

// Load .env
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            if (!array_key_exists($name, $_ENV)) {
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
        break;
    }
}

$dbHost = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
$dbUser = $_ENV['DB_USER'] ?? getenv('DB_USER');
$dbPass = $_ENV['DB_PASS'] ?? getenv('DB_PASS');

if (!$dbHost || !$dbName || !$dbUser) {
    die("ERROR: Database configuration missing. Set DB_HOST, DB_NAME, DB_USER in .env\n");
}

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    echo "✓ Connected to database: $dbName\n";
} catch (PDOException $e) {
    die("ERROR: Database connection failed: " . $e->getMessage() . "\n");
}

// Ensure migrations table exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS `migrations` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `filename` VARCHAR(255) NOT NULL UNIQUE,
        `executed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$command = $argv[1] ?? 'list';

switch ($command) {
    case 'run':
        $filename = $argv[2] ?? null;
        if (!$filename) {
            // Run all pending migrations
            $files = glob($migrationsDir . '/*.sql');
            sort($files);
            $executed = $pdo->query("SELECT filename FROM migrations")->fetchAll(PDO::FETCH_COLUMN);
            $pending = array_diff($files, $executed);
            if (empty($pending)) {
                echo "✓ All migrations are up to date.\n";
                exit(0);
            }
            foreach ($pending as $file) {
                runMigration($pdo, $file);
            }
        } else {
            $path = $migrationsDir . '/' . $filename;
            if (!file_exists($path)) {
                die("ERROR: Migration file not found: $path\n");
            }
            runMigration($pdo, $path);
        }
        break;

    case 'list':
        $files = glob($migrationsDir . '/*.sql');
        sort($files);
        $executed = $pdo->query("SELECT filename FROM migrations")->fetchAll(PDO::FETCH_COLUMN);
        echo "Migrations in $migrationsDir:\n";
        foreach ($files as $file) {
            $name = basename($file);
            $status = in_array($name, $executed) ? '✓' : ' ';
            echo "  [$status] $name\n";
        }
        break;

    case 'status':
        $executed = $pdo->query("SELECT filename, executed_at FROM migrations ORDER BY filename")->fetchAll();
        echo "Executed migrations:\n";
        foreach ($executed as $row) {
            echo "  ✓ {$row['filename']} ({$row['executed_at']})\n";
        }
        if (empty($executed)) {
            echo "  (none)\n";
        }
        break;

    default:
        echo "Usage: php api/migrate.php <command> [filename]\n";
        echo "  Commands:\n";
        echo "    run [filename]  Run migration(s). If filename omitted, runs all pending.\n";
        echo "    list            List all migrations with status.\n";
        echo "    status          Show executed migrations.\n";
        break;
}

function runMigration(PDO $pdo, string $path): void {
    $filename = basename($path);
    echo "Running: $filename...\n";

    $sql = file_get_contents($path);
    if ($sql === false) {
        echo "  ERROR: Could not read file.\n";
        return;
    }

    $statements = array_filter(
        array_map('trim', explode(';', $sql)),
        fn($s) => !empty($s) && stripos($s, 'DELIMITER') !== 0
    );

    $pdo->beginTransaction();
    try {
        foreach ($statements as $statement) {
            if (stripos($statement, 'INSERT') === 0 || stripos($statement, 'UPDATE') === 0 ||
                stripos($statement, 'DELETE') === 0 || stripos($statement, 'CREATE') === 0 ||
                stripos($statement, 'ALTER') === 0 || stripos($statement, 'DROP') === 0) {
                $pdo->exec($statement);
            }
        }
        $stmt = $pdo->prepare("INSERT IGNORE INTO migrations (filename) VALUES (:f)");
        $stmt->execute([':f' => $filename]);
        $pdo->commit();
        echo "  ✓ $filename completed successfully.\n";
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo "  ✗ ERROR: " . $e->getMessage() . "\n";
        exit(1);
    }
}
