-- Smart Database Index Creation
-- Runs safely - skips duplicates automatically
-- Execute this entire script at once in phpMyAdmin

-- Critical indexes for performance (if not already present)

-- Parent-Student Links (crucial for queries)
ALTER TABLE parent_student_links ADD INDEX IF NOT EXISTS idx_parent_id (parent_id);
ALTER TABLE parent_student_links ADD INDEX IF NOT EXISTS idx_student_id (student_id);

-- Students table
ALTER TABLE students ADD INDEX IF NOT EXISTS idx_class_id (class_id);
ALTER TABLE students ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE students ADD INDEX IF NOT EXISTS idx_admission_number (admission_number);

-- Parents table
ALTER TABLE parents ADD INDEX IF NOT EXISTS idx_school_id (school_id);

-- Teachers table
ALTER TABLE teachers ADD INDEX IF NOT EXISTS idx_school_id (school_id);
ALTER TABLE teachers ADD INDEX IF NOT EXISTS idx_department_id (department_id);

-- Subject Assignments (for teacher queries)
ALTER TABLE subject_assignments ADD INDEX IF NOT EXISTS idx_teacher_id (teacher_id);
ALTER TABLE subject_assignments ADD INDEX IF NOT EXISTS idx_class_id (class_id);
ALTER TABLE subject_assignments ADD INDEX IF NOT EXISTS idx_school_id (school_id);

-- Class Teacher Assignments (for teacher queries)
ALTER TABLE class_teacher_assignments ADD INDEX IF NOT EXISTS idx_teacher_id (teacher_id);
ALTER TABLE class_teacher_assignments ADD INDEX IF NOT EXISTS idx_class_id (class_id);
ALTER TABLE class_teacher_assignments ADD INDEX IF NOT EXISTS idx_school_id (school_id);

-- School Settings (composite - speeds up settings lookups)
ALTER TABLE school_settings ADD INDEX IF NOT EXISTS idx_school_key (school_id, setting_key);

-- Classes
ALTER TABLE classes ADD INDEX IF NOT EXISTS idx_school_id (school_id);

-- Compiled Results (critical for result loading)
ALTER TABLE compiled_results ADD INDEX IF NOT EXISTS idx_school_id (school_id);
ALTER TABLE compiled_results ADD INDEX IF NOT EXISTS idx_student_id (student_id);
ALTER TABLE compiled_results ADD INDEX IF NOT EXISTS idx_academic_year (academic_year);

-- Payment table
ALTER TABLE payments ADD INDEX IF NOT EXISTS idx_school_id (school_id);
ALTER TABLE payments ADD INDEX IF NOT EXISTS idx_student_id (student_id);

-- Student Fee Balances
ALTER TABLE student_fee_balances ADD INDEX IF NOT EXISTS idx_student_id (student_id);
ALTER TABLE student_fee_balances ADD INDEX IF NOT EXISTS idx_school_id (school_id);
ALTER TABLE student_fee_balances ADD INDEX IF NOT EXISTS idx_term_year (term, academic_year);

-- Attendance records
ALTER TABLE attendance ADD INDEX IF NOT EXISTS idx_school_id (school_id);
ALTER TABLE attendance ADD INDEX IF NOT EXISTS idx_student_id (student_id);
ALTER TABLE attendance ADD INDEX IF NOT EXISTS idx_date (attendance_date);

-- Subjects
ALTER TABLE subjects ADD INDEX IF NOT EXISTS idx_school_id (school_id);
