-- Migration 016: Fix parent_student_links school_id column type + Add school_id to student_domains
-- SMugFlex 2.0 Multi-School Platform

-- ============================================================
-- PART 1: Fix parent_student_links.school_id column type
-- Current: int(11) NOT NULL DEFAULT 0
-- Target:  int(10) UNSIGNED NOT NULL DEFAULT 1 (matches all other tables)
-- ============================================================

-- Fix column type
ALTER TABLE parent_student_links 
MODIFY COLUMN school_id INT(10) UNSIGNED NOT NULL DEFAULT 1;

-- Backfill any rows with school_id = 0 (shouldn't exist but safety net)
UPDATE parent_student_links SET school_id = 1 WHERE school_id = 0;

-- Add FK constraint if not exists
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'parent_student_links'
    AND CONSTRAINT_NAME = 'fk_parent_student_links_school'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE parent_student_links ADD CONSTRAINT fk_parent_student_links_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE',
    'SELECT "FK already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- PART 2: Add school_id to student_domains table
-- student_domains stores affective and psychomotor domain scores per student
-- Backfill from students table
-- ============================================================

-- Add school_id column if not exists
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_domains'
    AND COLUMN_NAME = 'school_id'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE student_domains ADD COLUMN school_id INT(10) UNSIGNED NOT NULL DEFAULT 1 AFTER id',
    'SELECT "Column already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill school_id from students table
UPDATE student_domains sd
JOIN students s ON sd.student_id = s.id
SET sd.school_id = s.school_id
WHERE sd.school_id = 0 OR sd.school_id IS NULL;

-- Set default for any remaining rows
UPDATE student_domains SET school_id = 1 WHERE school_id = 0 OR school_id IS NULL;

-- Add index
SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_domains'
    AND INDEX_NAME = 'idx_student_domains_school_id'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE student_domains ADD INDEX idx_student_domains_school_id (school_id)',
    'SELECT "Index already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK constraint
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'student_domains'
    AND CONSTRAINT_NAME = 'fk_student_domains_school'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE student_domains ADD CONSTRAINT fk_student_domains_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE',
    'SELECT "FK already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
SELECT 'Migration 016 complete' AS status;
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('parent_student_links', 'student_domains')
AND COLUMN_NAME = 'school_id'
ORDER BY TABLE_NAME;
