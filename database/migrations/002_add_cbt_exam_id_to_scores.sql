-- Add cbt_exam_id column to scores table for tracking CBT-fed scores
ALTER TABLE scores ADD COLUMN IF NOT EXISTS `cbt_exam_id` INT DEFAULT NULL AFTER `exam`;
