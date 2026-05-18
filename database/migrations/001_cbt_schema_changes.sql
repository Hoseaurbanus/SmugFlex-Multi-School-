-- CBT System Schema Migrations
-- Extends existing cbt_* tables for full CBT support

ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS `feed_into_scores` TINYINT(1) DEFAULT 0 AFTER `score_slot`;
ALTER TABLE cbt_exams ADD COLUMN IF NOT EXISTS `shuffle_questions` TINYINT(1) DEFAULT 1 AFTER `feed_into_scores`;

ALTER TABLE cbt_questions MODIFY COLUMN `question_type` ENUM('single_choice','true_false','multi_select') NOT NULL DEFAULT 'single_choice';
ALTER TABLE cbt_question_bank MODIFY COLUMN `question_type` ENUM('single_choice','true_false','multi_select') NOT NULL DEFAULT 'single_choice';

ALTER TABLE cbt_attempts ADD COLUMN IF NOT EXISTS `metadata` LONGTEXT DEFAULT NULL AFTER `remark`;
ALTER TABLE cbt_attempts ADD COLUMN IF NOT EXISTS `tab_switch_count` INT NOT NULL DEFAULT 0 AFTER `metadata`;
ALTER TABLE cbt_attempts ADD COLUMN IF NOT EXISTS `ip_address` VARCHAR(45) DEFAULT NULL AFTER `tab_switch_count`;
ALTER TABLE cbt_attempts ADD COLUMN IF NOT EXISTS `user_agent` TEXT DEFAULT NULL AFTER `ip_address`;

-- Allow 'student' role in users table for CBT student login
ALTER TABLE users MODIFY COLUMN `role` ENUM('admin','teacher','student','accountant','parent') NOT NULL DEFAULT 'teacher';
