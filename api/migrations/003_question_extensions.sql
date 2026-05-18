-- CBT Question Extensions
-- Adds passage comprehension, image support, sections, fill-in-blank

ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS `passage_text` LONGTEXT DEFAULT NULL AFTER `question_text`;
ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS `image_url` VARCHAR(500) DEFAULT NULL AFTER `passage_text`;
ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS `section` VARCHAR(200) DEFAULT NULL AFTER `sort_order`;
ALTER TABLE cbt_questions ADD COLUMN IF NOT EXISTS `section_instructions` TEXT DEFAULT NULL AFTER `section`;
ALTER TABLE cbt_questions MODIFY COLUMN `question_type` ENUM('single_choice','true_false','multi_select','fill_in_blank') NOT NULL DEFAULT 'single_choice';

ALTER TABLE cbt_question_bank ADD COLUMN IF NOT EXISTS `passage_text` LONGTEXT DEFAULT NULL AFTER `question_text`;
ALTER TABLE cbt_question_bank ADD COLUMN IF NOT EXISTS `image_url` VARCHAR(500) DEFAULT NULL AFTER `passage_text`;
ALTER TABLE cbt_question_bank MODIFY COLUMN `question_type` ENUM('single_choice','true_false','multi_select','fill_in_blank') NOT NULL DEFAULT 'single_choice';
