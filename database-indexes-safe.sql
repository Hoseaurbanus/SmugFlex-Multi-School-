-- Safe Database Index Creation Script
-- Only creates indexes that don't already exist
-- Run this in phpMyAdmin for database: mdpjhtua_multi

-- Check existing indexes and create only if missing
-- Students table
ALTER TABLE students ADD INDEX idx_class_id (class_id);
ALTER TABLE students ADD INDEX idx_status (status);
ALTER TABLE students ADD INDEX idx_admission_number (admission_number);

-- Parents table
ALTER TABLE parents ADD INDEX idx_school_id (school_id);

-- Parent-Student Links
ALTER TABLE parent_student_links ADD INDEX idx_parent_id (parent_id);
ALTER TABLE parent_student_links ADD INDEX idx_student_id (student_id);

-- Teachers table
ALTER TABLE teachers ADD INDEX idx_school_id (school_id);
ALTER TABLE teachers ADD INDEX idx_department_id (department_id);

-- Subject Assignments
ALTER TABLE subject_assignments ADD INDEX idx_teacher_id (teacher_id);
ALTER TABLE subject_assignments ADD INDEX idx_class_id (class_id);
ALTER TABLE subject_assignments ADD INDEX idx_school_id (school_id);

-- Class Teacher Assignments
ALTER TABLE class_teacher_assignments ADD INDEX idx_teacher_id (teacher_id);
ALTER TABLE class_teacher_assignments ADD INDEX idx_class_id (class_id);
ALTER TABLE class_teacher_assignments ADD INDEX idx_school_id (school_id);

-- School Settings (composite index for faster lookups)
ALTER TABLE school_settings ADD INDEX idx_school_key (school_id, setting_key);

-- Classes
ALTER TABLE classes ADD INDEX idx_school_id (school_id);

-- Compiled Results (for faster result queries)
ALTER TABLE compiled_results ADD INDEX idx_school_id (school_id);
ALTER TABLE compiled_results ADD INDEX idx_student_id (student_id);
ALTER TABLE compiled_results ADD INDEX idx_academic_year (academic_year);

-- Payment table
ALTER TABLE payments ADD INDEX idx_school_id (school_id);
ALTER TABLE payments ADD INDEX idx_student_id (student_id);

-- Student Fee Balances
ALTER TABLE student_fee_balances ADD INDEX idx_student_id (student_id);
ALTER TABLE student_fee_balances ADD INDEX idx_school_id (school_id);
ALTER TABLE student_fee_balances ADD INDEX idx_term_year (term, academic_year);
