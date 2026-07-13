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
