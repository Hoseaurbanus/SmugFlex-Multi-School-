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

        // Add max_score column to assignments (replaces total_marks)
        self::addColumnIfMissing($conn, 'assignments', 'max_score', 'DECIMAL(5,2) NOT NULL DEFAULT 100.00', 'due_date');

        // Add content column to assignment_submissions (replaces submission_text)
        self::addColumnIfMissing($conn, 'assignment_submissions', 'content', 'TEXT NULL', 'student_id');

        // Add address and assigned_class_id to teachers
        self::addColumnIfMissing($conn, 'teachers', 'address', 'TEXT NULL', 'department_id');
        self::addColumnIfMissing($conn, 'teachers', 'assigned_class_id', 'INT NULL', 'address');

        // Add school_id to user_notifications
        self::addColumnIfMissing($conn, 'user_notifications', 'school_id', 'INT UNSIGNED NOT NULL DEFAULT 1', 'read_at');

        // Ensure assignment_attachments table exists
        self::createTableIfMissing($conn, 'assignment_attachments', "CREATE TABLE IF NOT EXISTS assignment_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            assignment_id INT NULL,
            submission_id INT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size INT NULL,
            file_type VARCHAR(100) NULL,
            school_id INT UNSIGNED NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_assignment_id (assignment_id),
            INDEX idx_submission_id (submission_id),
            INDEX idx_school_id (school_id)
        )");

        // Ensure platform_activity_logs has ON DELETE SET NULL on school_id FK
        self::ensureForeignKeySetNull($conn, 'platform_activity_logs', 'school_id', 'schools', 'id');

        // Create placeholder school if none exists (prevents FK violations on school_id DEFAULT 1)
        self::ensurePlaceholderSchool($conn);
    }

    private static function ensurePlaceholderSchool($conn) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) FROM schools");
            $count = (int)$stmt->fetchColumn();
            if ($count === 0) {
                $conn->exec("INSERT IGNORE INTO schools (id, name, suffix, email, status, plan, created_at) VALUES (1, 'System Default', 'sys', 'system@placeholder.local', 'inactive', 'trial', NOW())");
                error_log("SchemaMigration: Created placeholder school id=1");
            }
        } catch (PDOException $e) {
            error_log("SchemaMigration: Failed creating placeholder school: " . $e->getMessage());
        }
    }

    private static function ensureForeignKeySetNull($conn, $table, $column, $refTable, $refColumn) {
        try {
            $check = $conn->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$table' AND COLUMN_NAME = '$column' AND REFERENCED_TABLE_NAME = '$refTable'");
            $fk = $check->fetch(PDO::FETCH_ASSOC);
            if (!$fk) return;
            $fkName = $fk['CONSTRAINT_NAME'];
            // Check if it already has ON DELETE SET NULL
            $opts = $conn->query("SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = '$fkName'");
            $opt = $opts->fetch(PDO::FETCH_ASSOC);
            if ($opt && $opt['DELETE_RULE'] === 'SET NULL') return;
            // Alter to add ON DELETE SET NULL
            $conn->exec("ALTER TABLE `$table` DROP FOREIGN KEY `$fkName`");
            $conn->exec("ALTER TABLE `$table` ADD CONSTRAINT `$fkName` FOREIGN KEY (`$column`) REFERENCES `$refTable` (`$refColumn`) ON DELETE SET NULL");
            error_log("SchemaMigration: Updated FK $fkName on $table to ON DELETE SET NULL");
        } catch (PDOException $e) {
            error_log("SchemaMigration: Failed updating FK on $table: " . $e->getMessage());
        }
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
