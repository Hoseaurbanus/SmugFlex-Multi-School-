<?php
/**
 * Auto-migration: ensures school_id columns exist on tables that need them.
 * Called once from index.php before any controller is instantiated.
 */
class SchemaMigration {
    public static function run($conn) {
        $tables = [
            'payments' => ['after' => 'student_id'],
            'subjects' => ['after' => 'id'],
            'subject_assignments' => ['after' => 'id'],
            'parents' => ['after' => 'id'],
            'parent_student_links' => ['after' => 'id'],
            'notifications' => ['after' => 'id'],
            'attendance' => ['after' => 'id'],
            'assignments' => ['after' => 'id'],
            'results' => ['after' => 'id'],
            'teachers' => ['after' => 'id'],
            'classes' => ['after' => 'id'],
            'students' => ['after' => 'id'],
            'users' => ['after' => 'id'],
            'school_settings' => ['after' => 'id'],
        ];

        foreach ($tables as $table => $opts) {
            self::addSchoolIdIfMissing($conn, $table, $opts['after']);
        }

        // Additional columns that may be missing
        self::addColumnIfMissing($conn, 'payments', 'invoice_id', 'INT NULL', 'student_id');
        self::addColumnIfMissing($conn, 'payments', 'reversed_from_payment_id', 'INT NULL', 'invoice_id');
        self::addColumnIfMissing($conn, 'payments', 'reversed_by', 'INT NULL', 'verified_by');
        self::addColumnIfMissing($conn, 'payments', 'reversed_date', 'DATETIME NULL', 'reversed_by');
        self::addColumnIfMissing($conn, 'payments', 'academic_year', "VARCHAR(20) NULL", 'payment_method');
        self::addColumnIfMissing($conn, 'payments', 'term', "VARCHAR(20) NULL", 'academic_year');
        self::addColumnIfMissing($conn, 'notifications', 'priority', "ENUM('Low','Medium','High','Urgent') DEFAULT 'Medium'", 'type');
        self::addColumnIfMissing($conn, 'notifications', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP', 'sent_date');
        self::addColumnIfMissing($conn, 'notifications', 'status', "ENUM('active','archived') DEFAULT 'active'", 'type');
        self::addColumnIfMissing($conn, 'students', 'admission_number', 'VARCHAR(50) NULL', 'first_name');
        self::addColumnIfMissing($conn, 'students', 'status', "VARCHAR(20) DEFAULT 'Active'", 'gender');
        self::addColumnIfMissing($conn, 'parents', 'status', "VARCHAR(20) DEFAULT 'Active'", 'phone');

        // Ensure accountants table exists (used by UserController LEFT JOIN)
        self::createTableIfMissing($conn, 'accountants', "CREATE TABLE IF NOT EXISTS accountants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL DEFAULT '',
            last_name VARCHAR(100) NOT NULL DEFAULT '',
            email VARCHAR(255) NULL,
            phone VARCHAR(30) NULL,
            address TEXT NULL,
            department VARCHAR(100) NULL,
            employee_id VARCHAR(50) NULL,
            status VARCHAR(20) DEFAULT 'Active',
            school_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_accountants_school_id (school_id)
        )");

        // Ensure results table exists
        self::createTableIfMissing($conn, 'results', "CREATE TABLE IF NOT EXISTS results (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_id INT NULL,
            assignment_id INT NULL,
            score DECIMAL(5,2) NULL,
            grade VARCHAR(10) NULL,
            remark TEXT NULL,
            term VARCHAR(20) NULL,
            academic_year VARCHAR(20) NULL,
            compiled TINYINT(1) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'Pending',
            school_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_results_school_id (school_id),
            INDEX idx_results_student_id (student_id)
        )");

        // Ensure token_blacklist has school_id column
        self::addColumnIfMissing($conn, 'token_blacklist', 'school_id', 'INT UNSIGNED NULL', 'expires_at');
    }

    private static function createTableIfMissing($conn, $table, $sql) {
        try {
            $stmt = $conn->prepare("SHOW TABLES LIKE '$table'");
            $stmt->execute();
            if ($stmt->fetch()) return;
            $conn->exec($sql);
            error_log("SchemaMigration: Created table $table");
        } catch (PDOException $e) {
            error_log("SchemaMigration: Failed creating table $table: " . $e->getMessage());
        }
    }

    private static function addSchoolIdIfMissing($conn, $table, $afterCol = 'id') {
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE 'school_id'");
            $stmt->execute();
            if ($stmt->fetch()) return;

            // Check if afterCol exists, fall back to ADD COLUMN at end
            $colCheck = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE '$afterCol'");
            $colCheck->execute();
            if ($colCheck->fetch()) {
                $conn->exec("ALTER TABLE `$table` ADD COLUMN school_id INT NOT NULL AFTER `$afterCol`");
            } else {
                $conn->exec("ALTER TABLE `$table` ADD COLUMN school_id INT NOT NULL");
            }
            try {
                $conn->exec("CREATE INDEX idx_{$table}_school_id ON `$table`(school_id)");
            } catch (PDOException $e) {
                // Index may already exist
            }
            error_log("SchemaMigration: Added school_id to $table");
        } catch (PDOException $e) {
            error_log("SchemaMigration: Failed adding school_id to $table: " . $e->getMessage());
        }
    }

    private static function addColumnIfMissing($conn, $table, $column, $type, $afterCol) {
        try {
            $stmt = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE '$column'");
            $stmt->execute();
            if ($stmt->fetch()) return;

            // Check if afterCol exists, fall back to ADD COLUMN at end
            $colCheck = $conn->prepare("SHOW COLUMNS FROM `$table` LIKE '$afterCol'");
            $colCheck->execute();
            if ($colCheck->fetch()) {
                $conn->exec("ALTER TABLE `$table` ADD COLUMN `$column` $type AFTER `$afterCol`");
            } else {
                $conn->exec("ALTER TABLE `$table` ADD COLUMN `$column` $type");
            }
            error_log("SchemaMigration: Added $column to $table");
        } catch (PDOException $e) {
            error_log("SchemaMigration: Failed adding $column to $table: " . $e->getMessage());
        }
    }
}
