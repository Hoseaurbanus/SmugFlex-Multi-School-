-- WhatsApp Groups Table for Parent Dashboard
-- This table stores WhatsApp group links for each class

CREATE TABLE IF NOT EXISTS `class_whatsapp_groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` int(11) NOT NULL,
  `whatsapp_group_link` varchar(500) NOT NULL,
  `group_name` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_class_active` (`class_id`, `is_active`),
  FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
  INDEX `idx_class_active` (`class_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FIRST: Check what WhatsApp groups already exist
-- SELECT * FROM class_whatsapp_groups ORDER BY class_id;

-- SECOND: Update existing records or insert new ones
-- Use INSERT ... ON DUPLICATE KEY UPDATE to handle duplicates

-- JSS 2 (CHRYSOPRASUS) WhatsApp Group - Class ID: 15
INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (15, 'https://chat.whatsapp.com/DVOjMaNncltKheAjhlz6gh?mode=gi_t', 'JSS 2 CHRYSOPRASUS Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

-- KG 1 (Sardius) WhatsApp Group - Class ID: 2
INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (2, 'https://chat.whatsapp.com/BWQLiSdUOImAb51xWlvZrb?mode=gi_t', 'KG 1 Sardius Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

-- KG 2 (PEARL) WhatsApp Group - Class ID: 4
INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (4, 'https://chat.whatsapp.com/DoDsverFzwyAFVh1cOm4Kr?mode=gi_t', 'KG 2 PEARL Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

-- GRADE 1 (GOLD) WhatsApp Group - Class ID: 8
INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (8, 'https://chat.whatsapp.com/KeEADjAGY7K8eG9YBf4FZO', 'Grade 1 GOLD Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (5, 'https://chat.whatsapp.com/Fcd1BYhpYs1EdwX6dRwBan?mode=gi_t', 'GRADE K RUBY Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (12, 'https://chat.whatsapp.com/HizYfNzo9Ev6YLOBhNKcMI', 'GRADE 4 JACINTH Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `class_whatsapp_groups` (`class_id`, `whatsapp_group_link`, `group_name`, `is_active`)
VALUES (11, 'https://chat.whatsapp.com/BaCF0QHTQ5MGfnDtkqi19T?mode=gi_t', 'GRADE 4 SAPPHIRE Parents Group', 1)
ON DUPLICATE KEY UPDATE
  `whatsapp_group_link` = VALUES(`whatsapp_group_link`),
  `group_name` = VALUES(`group_name`),
  `updated_at` = CURRENT_TIMESTAMP;
