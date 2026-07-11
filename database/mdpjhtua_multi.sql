-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jul 11, 2026 at 04:55 AM
-- Server version: 11.4.12-MariaDB
-- PHP Version: 8.4.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mdpjhtua_multi`
--

-- --------------------------------------------------------

--
-- Table structure for table `academic_years`
--

CREATE TABLE `academic_years` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `year` varchar(20) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `accountants`
--

CREATE TABLE `accountants` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `employee_id` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `actor` varchar(255) NOT NULL,
  `actor_role` enum('Admin','Teacher','Accountant','Parent','System') NOT NULL,
  `action` varchar(255) NOT NULL,
  `target` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `status` enum('Success','Failed') NOT NULL,
  `details` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `actor`, `actor_role`, `action`, `target`, `ip_address`, `status`, `details`, `user_id`, `created_at`) VALUES
(1, 'Admin', 'Admin', 'CREATE_CLASS', 'Class: JSS 2 (JSS 2)', '102.91.77.121', 'Success', 'New class created', NULL, '2026-07-10 04:41:36'),
(2, 'Admin', 'Admin', 'DELETE_ASSIGNMENT', 'Assignment: MATHEMATICS - JSS1 by HOSEA URBANUS', '102.91.77.121', 'Success', 'Subject assignment deleted', NULL, '2026-07-10 04:42:21'),
(3, 'Admin', 'Admin', 'DELETE_ASSIGNMENT', 'Assignment: PHYSICAL HEALTH EDUCATION - JSS1 by HOSEA URBANUS', '102.91.77.121', 'Success', 'Subject assignment deleted', NULL, '2026-07-10 04:42:30'),
(4, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: ENGLISH LANGUAGE to Class: JSS 2 by Teacher: HOSEA URBANUS', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:42:56'),
(5, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: COMPUTER STUDIES to Class: JSS 2 by Teacher: HOSEA URBANUS', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:43:32'),
(6, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: MATHEMATICS to Class: JSS1 by Teacher: JET GOF', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:43:47'),
(7, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: PHYSICAL HEALTH EDUCATION to Class: JSS1 by Teacher: JET GOF', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:43:47'),
(8, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: MATHEMATICS to Class: JSS 2 by Teacher: JET GOF', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:43:59'),
(9, 'Admin', 'Admin', 'ASSIGN_SUBJECT', 'Subject: PHYSICAL HEALTH EDUCATION to Class: JSS 2 by Teacher: JET GOF', '102.91.77.121', 'Success', 'Subject assigned successfully', 3, '2026-07-10 04:43:59'),
(10, 'Admin', 'Admin', 'CREATE_STUDENT', 'Student: MOSES LOT (ECW/2026/0002)', '102.91.77.121', 'Success', 'New student admitted to class JSS 2', NULL, '2026-07-10 04:46:44'),
(11, 'Admin', 'Admin', 'UNLINK_PARENT_STUDENT', 'Parent ID: 1, Student ID: 2', '102.91.77.121', 'Success', 'Parent unlinked from student', 3, '2026-07-10 04:47:23'),
(12, 'admin', 'Admin', 'LOGOUT', 'Authentication', '102.91.77.254', 'Success', 'User logged out successfully', 3, '2026-07-10 12:45:10'),
(13, 'john.daniel', 'Parent', 'LOGOUT', 'Authentication', '102.91.77.254', 'Success', 'User logged out successfully', 13, '2026-07-10 12:46:15'),
(14, 'Admin', 'Admin', 'LINK_PARENT_STUDENT', 'Parent ID: 2, Student ID: 2', '102.91.77.254', 'Success', 'Parent linked to student as Guardian', NULL, '2026-07-10 13:28:04'),
(15, 'Admin', 'Admin', 'UPDATE_STUDENT', 'Student ID: 2', '102.91.77.254', 'Success', 'Student information updated', NULL, '2026-07-10 13:28:04');

-- --------------------------------------------------------

--
-- Table structure for table `affective_domains`
--

CREATE TABLE `affective_domains` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `attentiveness` int(11) DEFAULT NULL CHECK (`attentiveness` between 1 and 5),
  `attentiveness_remark` text DEFAULT NULL,
  `honesty` int(11) DEFAULT NULL CHECK (`honesty` between 1 and 5),
  `honesty_remark` text DEFAULT NULL,
  `neatness` int(11) DEFAULT NULL CHECK (`neatness` between 1 and 5),
  `neatness_remark` text DEFAULT NULL,
  `obedience` int(11) DEFAULT NULL CHECK (`obedience` between 1 and 5),
  `obedience_remark` text DEFAULT NULL,
  `sense_of_responsibility` int(11) DEFAULT NULL CHECK (`sense_of_responsibility` between 1 and 5),
  `sense_of_responsibility_remark` text DEFAULT NULL,
  `entered_by` int(11) NOT NULL,
  `entered_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignments`
--

CREATE TABLE `assignments` (
  `id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `due_date` date NOT NULL,
  `total_marks` decimal(5,2) NOT NULL,
  `assigned_date` date NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `status` enum('Active','Completed','Overdue') DEFAULT 'Active',
  `attachment_url` varchar(255) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `assignment_submissions`
--

CREATE TABLE `assignment_submissions` (
  `id` int(11) NOT NULL,
  `assignment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `submission_text` text DEFAULT NULL,
  `attachment_url` varchar(255) DEFAULT NULL,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `graded_at` datetime DEFAULT NULL,
  `graded_by` int(11) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `status` enum('Present','Absent','Late','Excused') NOT NULL,
  `marked_by` int(11) NOT NULL,
  `marked_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_backup`
--

CREATE TABLE `attendance_backup` (
  `id` int(11) NOT NULL DEFAULT 0,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `status` enum('Present','Absent','Late','Excused') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `marked_by` int(11) NOT NULL,
  `marked_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `term` enum('First Term','Second Term','Third Term') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `academic_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_summary`
--

CREATE TABLE `attendance_summary` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` varchar(50) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `present_days` int(11) DEFAULT 0,
  `expected_days` int(11) DEFAULT 0,
  `absent_days` int(11) DEFAULT 0,
  `attendance_rate` decimal(5,2) DEFAULT 0.00,
  `marked_by` int(11) DEFAULT NULL,
  `marked_date` timestamp NULL DEFAULT current_timestamp(),
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_account_settings`
--

CREATE TABLE `bank_account_settings` (
  `id` int(11) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `bank_transfer_enabled` tinyint(1) DEFAULT 1,
  `online_payment_enabled` tinyint(1) DEFAULT 0,
  `cash_payment_enabled` tinyint(1) DEFAULT 1,
  `updated_by` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cbt_answers`
--

CREATE TABLE `cbt_answers` (
  `id` int(11) NOT NULL,
  `attempt_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `answer_json` longtext DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `marks_awarded` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cbt_attempts`
--

CREATE TABLE `cbt_attempts` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` varchar(30) NOT NULL,
  `status` enum('in_progress','submitted','scored') NOT NULL DEFAULT 'in_progress',
  `started_at` datetime NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `score` int(11) NOT NULL DEFAULT 0,
  `max_score` int(11) NOT NULL DEFAULT 0,
  `percentage` decimal(6,2) NOT NULL DEFAULT 0.00,
  `remark` varchar(100) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `tab_switch_count` int(11) NOT NULL DEFAULT 0,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cbt_exams`
--

CREATE TABLE `cbt_exams` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `instructions` text DEFAULT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` varchar(30) NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 30,
  `total_marks` int(11) NOT NULL DEFAULT 0,
  `score_slot` enum('first_test','second_test') DEFAULT NULL,
  `feed_into_scores` tinyint(1) DEFAULT 0,
  `shuffle_questions` tinyint(1) DEFAULT 1,
  `published` tinyint(1) NOT NULL DEFAULT 0,
  `published_at` datetime DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `allow_review` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('Active','Archived') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `questions_per_student` int(11) DEFAULT NULL COMMENT 'Number of questions each student must answer. NULL = all questions.',
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cbt_questions`
--

CREATE TABLE `cbt_questions` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `question_type` enum('single_choice','true_false','multi_select','fill_in_blank') NOT NULL DEFAULT 'single_choice',
  `question_text` text NOT NULL,
  `passage_text` longtext DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `options_json` longtext DEFAULT NULL,
  `correct_answer_json` longtext NOT NULL,
  `marks` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `section` varchar(200) DEFAULT NULL,
  `section_instructions` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cbt_question_bank`
--

CREATE TABLE `cbt_question_bank` (
  `id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `class_id` int(11) DEFAULT NULL,
  `question_type` enum('single_choice','true_false','multi_select','fill_in_blank') NOT NULL DEFAULT 'single_choice',
  `question_text` text NOT NULL,
  `passage_text` longtext DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `options_json` longtext DEFAULT NULL,
  `correct_answer_json` longtext NOT NULL,
  `marks` int(11) NOT NULL DEFAULT 1,
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
  `topic` varchar(100) DEFAULT NULL,
  `tags_json` longtext DEFAULT NULL,
  `status` enum('Active','Archived') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `classes`
--

CREATE TABLE `classes` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `name` varchar(50) NOT NULL,
  `level` varchar(50) NOT NULL,
  `section` varchar(10) DEFAULT NULL,
  `category` enum('Primary','Secondary') NOT NULL DEFAULT 'Primary',
  `capacity` int(11) NOT NULL DEFAULT 30,
  `max_capacity` int(11) DEFAULT 40,
  `current_promotions` int(11) DEFAULT 0,
  `promotion_locked` tinyint(1) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `current_students` int(11) DEFAULT 0,
  `class_teacher_id` int(11) DEFAULT NULL,
  `class_teacher` varchar(100) DEFAULT NULL,
  `academic_year` varchar(20) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `classes`
--

INSERT INTO `classes` (`id`, `school_id`, `name`, `level`, `section`, `category`, `capacity`, `max_capacity`, `current_promotions`, `promotion_locked`, `sort_order`, `current_students`, `class_teacher_id`, `class_teacher`, `academic_year`, `status`, `created_at`, `updated_at`) VALUES
(1, 4, 'JSS1', 'JSS 1', '', 'Secondary', 50, 40, 0, 0, 0, 0, 1, NULL, '2026/2027', 'Active', '2026-07-05 19:36:27', '2026-07-05 19:36:27'),
(2, 4, 'JSS 2', 'JSS 2', '', 'Secondary', 50, 40, 0, 0, 0, 0, 2, NULL, '2026/2027', 'Active', '2026-07-10 04:41:36', '2026-07-10 04:41:36');

-- --------------------------------------------------------

--
-- Stand-in structure for view `class_performance_summary`
-- (See below for the actual view)
--
CREATE TABLE `class_performance_summary` (
`school_id` int(10) unsigned
,`class_id` int(11)
,`class_name` varchar(50)
,`level` varchar(50)
,`term` enum('First Term','Second Term','Third Term')
,`academic_year` varchar(20)
,`total_students` bigint(21)
,`class_average` decimal(6,2)
,`highest_score` decimal(5,2)
,`lowest_score` decimal(5,2)
,`first_position_count` bigint(21)
);

-- --------------------------------------------------------

--
-- Table structure for table `class_progression_rules`
--

CREATE TABLE `class_progression_rules` (
  `id` int(11) NOT NULL,
  `from_class_id` int(11) NOT NULL,
  `to_class_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_teacher_assignments`
--

CREATE TABLE `class_teacher_assignments` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `teacher_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `assigned_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `class_teacher_assignments`
--

INSERT INTO `class_teacher_assignments` (`id`, `school_id`, `teacher_id`, `class_id`, `academic_year`, `term`, `status`, `assigned_at`, `updated_at`) VALUES
(1, 4, 1, 1, '2026/2027', 'First Term', 'Active', '2026-07-06 12:31:05', '2026-07-06 12:31:05'),
(2, 4, 2, 2, '2026/2027', 'First Term', 'Active', '2026-07-10 04:41:36', '2026-07-10 04:41:36');

-- --------------------------------------------------------

--
-- Table structure for table `class_timetable`
--

CREATE TABLE `class_timetable` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  `period` int(11) NOT NULL CHECK (`period` between 1 and 8),
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `subject_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `venue` varchar(50) DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `class_whatsapp_groups`
--

CREATE TABLE `class_whatsapp_groups` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `whatsapp_group_link` varchar(500) NOT NULL,
  `group_name` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `compiled_results`
--

CREATE TABLE `compiled_results` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `total_score` decimal(6,2) DEFAULT NULL,
  `average_score` decimal(5,2) DEFAULT NULL,
  `class_average` decimal(5,2) DEFAULT NULL,
  `position` int(11) DEFAULT NULL,
  `total_students` int(11) DEFAULT NULL,
  `times_present` int(11) DEFAULT 0,
  `times_absent` int(11) DEFAULT 0,
  `total_attendance_days` int(11) DEFAULT 0,
  `term_begin` date DEFAULT NULL,
  `term_end` date DEFAULT NULL,
  `next_term_begin` date DEFAULT NULL,
  `class_teacher_name` varchar(100) DEFAULT NULL,
  `class_teacher_comment` text DEFAULT NULL,
  `principal_name` varchar(100) DEFAULT NULL,
  `principal_comment` text DEFAULT NULL,
  `principal_signature` text DEFAULT NULL,
  `compiled_by` int(11) NOT NULL,
  `compiled_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Draft','Submitted','Approved','Rejected') DEFAULT 'Draft',
  `print_approved` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `head_teacher_name` varchar(100) DEFAULT NULL,
  `head_teacher_comment` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cumulative_results`
--

CREATE TABLE `cumulative_results` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `total_score` decimal(8,2) DEFAULT 0.00,
  `average_score` decimal(5,2) DEFAULT 0.00,
  `position` int(11) DEFAULT NULL,
  `class_average` decimal(5,2) DEFAULT NULL,
  `total_students` int(11) DEFAULT NULL,
  `promotion_status` enum('Promoted','Repeated') DEFAULT NULL,
  `session_attendance_pct` decimal(5,2) DEFAULT NULL,
  `subject_data` text DEFAULT NULL,
  `principal_comment` text DEFAULT NULL,
  `compiled_by` int(11) NOT NULL,
  `compiled_date` timestamp NULL DEFAULT current_timestamp(),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_changes_summary`
--

CREATE TABLE `data_changes_summary` (
  `table_name` varchar(100) DEFAULT NULL,
  `action_type` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `change_count` bigint(21) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_change_logs`
--

CREATE TABLE `data_change_logs` (
  `id` int(11) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` int(11) NOT NULL,
  `action_type` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `changed_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changed_fields`)),
  `username` varchar(100) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `head_of_department` varchar(100) DEFAULT NULL,
  `head_of_department_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `teacher_count` int(11) DEFAULT 0,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exam_timetable`
--

CREATE TABLE `exam_timetable` (
  `id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `exam_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `duration` int(11) NOT NULL,
  `venue` varchar(50) DEFAULT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `instructions` text DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fee_structures`
--

CREATE TABLE `fee_structures` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `class_id` int(11) NOT NULL,
  `level` varchar(50) DEFAULT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `tuition_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `development_levy` decimal(10,2) NOT NULL DEFAULT 0.00,
  `sports_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `exam_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `books_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `uniform_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `transport_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_fee` decimal(10,2) GENERATED ALWAYS AS (`tuition_fee` + `development_levy` + `sports_fee` + `exam_fee` + `books_fee` + `uniform_fee` + `transport_fee`) STORED,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `file_uploads`
--

CREATE TABLE `file_uploads` (
  `id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `upload_type` enum('student_photo','teacher_signature','document','assignment_attachment') NOT NULL,
  `entity_id` int(11) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `manual_class_changes`
--

CREATE TABLE `manual_class_changes` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `from_class_id` int(11) NOT NULL,
  `to_class_id` int(11) NOT NULL,
  `reason` text NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `changed_by` int(11) NOT NULL,
  `change_date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `filename` varchar(255) NOT NULL,
  `executed_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') NOT NULL,
  `target_audience` enum('all','teachers','parents','students','accountants','specific') NOT NULL,
  `target_users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_users`)),
  `sent_by` int(11) NOT NULL,
  `sent_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) DEFAULT 0,
  `read_by` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`read_by`)),
  `expires_at` datetime DEFAULT NULL,
  `deleted_by` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `parents`
--

CREATE TABLE `parents` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `alternate_phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parents`
--

INSERT INTO `parents` (`id`, `school_id`, `first_name`, `last_name`, `email`, `phone`, `alternate_phone`, `address`, `occupation`, `status`, `created_at`, `updated_at`) VALUES
(1, 4, 'KIND', 'URBANUS', 'hoseaurbanusaudu2@gmail.com', '09030031278', NULL, NULL, NULL, 'Active', '2026-07-05 07:29:41', '2026-07-05 07:29:41'),
(2, 4, 'Daniel', 'John', 'john.daniel@school.local', '09033392958', NULL, NULL, NULL, 'Active', '2026-07-10 12:42:09', '2026-07-10 12:42:09');

-- --------------------------------------------------------

--
-- Table structure for table `parent_student_links`
--

CREATE TABLE `parent_student_links` (
  `id` int(11) NOT NULL,
  `parent_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `relationship` enum('Father','Mother','Guardian') NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parent_student_links`
--

INSERT INTO `parent_student_links` (`id`, `parent_id`, `student_id`, `relationship`, `is_primary`, `school_id`, `created_at`) VALUES
(2, 2, 2, 'Guardian', 1, 4, '2026-07-10 13:28:04');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_log`
--

CREATE TABLE `password_reset_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reset_by` int(11) NOT NULL,
  `reset_type` enum('self_change','admin_reset','forgot_password') NOT NULL,
  `old_password_hash` varchar(255) DEFAULT NULL,
  `new_password_hash` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_reason` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `reversed_from_payment_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_type` enum('School Fees','Examination Fees','Books','Uniform','Transport','Others') NOT NULL,
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `payment_method` enum('Bank Transfer','Cash','POS','Online Payment','Cheque') NOT NULL,
  `transaction_reference` varchar(100) DEFAULT NULL,
  `receipt_number` varchar(50) NOT NULL,
  `recorded_by` int(11) NOT NULL,
  `recorded_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Pending','Verified','Rejected') DEFAULT 'Pending',
  `verified_by` int(11) DEFAULT NULL,
  `reversed_by` int(11) DEFAULT NULL,
  `reversed_date` datetime DEFAULT NULL,
  `verified_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `performance_logs`
--

CREATE TABLE `performance_logs` (
  `id` int(11) NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `response_time_ms` int(11) NOT NULL,
  `memory_usage_mb` decimal(8,2) DEFAULT NULL,
  `query_count` int(11) DEFAULT NULL,
  `status_code` int(11) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `platform_activity_logs`
--

CREATE TABLE `platform_activity_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `super_admin_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(100) NOT NULL,
  `school_id` int(10) UNSIGNED DEFAULT NULL,
  `school_name` varchar(255) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `platform_activity_logs`
--

INSERT INTO `platform_activity_logs` (`id`, `super_admin_id`, `action`, `school_id`, `school_name`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'create_school', 4, 'ECWA SECONDARY SCHOOL BILLIRI', '{\"suffix\":\"ecw\"}', '197.211.63.84', '2026-07-04 13:41:16');

-- --------------------------------------------------------

--
-- Table structure for table `psychomotor_domains`
--

CREATE TABLE `psychomotor_domains` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `attention_to_direction` int(11) DEFAULT NULL CHECK (`attention_to_direction` between 1 and 5),
  `attention_to_direction_remark` text DEFAULT NULL,
  `considerate_of_others` int(11) DEFAULT NULL CHECK (`considerate_of_others` between 1 and 5),
  `considerate_of_others_remark` text DEFAULT NULL,
  `handwriting` int(11) DEFAULT NULL CHECK (`handwriting` between 1 and 5),
  `handwriting_remark` text DEFAULT NULL,
  `sports` int(11) DEFAULT NULL CHECK (`sports` between 1 and 5),
  `sports_remark` text DEFAULT NULL,
  `verbal_fluency` int(11) DEFAULT NULL CHECK (`verbal_fluency` between 1 and 5),
  `verbal_fluency_remark` text DEFAULT NULL,
  `works_well_independently` int(11) DEFAULT NULL CHECK (`works_well_independently` between 1 and 5),
  `works_well_independently_remark` text DEFAULT NULL,
  `entered_by` int(11) NOT NULL,
  `entered_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `realtime_events`
--

CREATE TABLE `realtime_events` (
  `id` bigint(20) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `topic` varchar(64) NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `realtime_events`
--

INSERT INTO `realtime_events` (`id`, `school_id`, `topic`, `payload`, `created_at`) VALUES
(1, 4, 'students', '{\"action\":\"created\",\"student_id\":1,\"class_id\":1}', '2026-07-08 13:17:49'),
(2, 4, 'classes', '{\"action\":\"created\",\"student_id\":1,\"class_id\":1}', '2026-07-08 13:17:49'),
(3, 4, 'subjects', '{\"action\":\"created\",\"subject_id\":1}', '2026-07-09 19:42:28'),
(4, 4, 'subject_assignments', '{\"action\":\"created\",\"subject_id\":1}', '2026-07-09 19:42:28'),
(5, 4, 'scores', '{\"action\":\"created\",\"subject_id\":1}', '2026-07-09 19:42:28'),
(6, 4, 'compiled_results', '{\"action\":\"created\",\"subject_id\":1}', '2026-07-09 19:42:28'),
(7, 4, 'subjects', '{\"action\":\"created\",\"subject_id\":2}', '2026-07-10 03:03:58'),
(8, 4, 'subject_assignments', '{\"action\":\"created\",\"subject_id\":2}', '2026-07-10 03:03:58'),
(9, 4, 'scores', '{\"action\":\"created\",\"subject_id\":2}', '2026-07-10 03:03:58'),
(10, 4, 'compiled_results', '{\"action\":\"created\",\"subject_id\":2}', '2026-07-10 03:03:58'),
(11, 4, 'subjects', '{\"action\":\"created\",\"subject_id\":3}', '2026-07-10 03:08:34'),
(12, 4, 'subject_assignments', '{\"action\":\"created\",\"subject_id\":3}', '2026-07-10 03:08:34'),
(13, 4, 'scores', '{\"action\":\"created\",\"subject_id\":3}', '2026-07-10 03:08:34'),
(14, 4, 'compiled_results', '{\"action\":\"created\",\"subject_id\":3}', '2026-07-10 03:08:34'),
(15, 4, 'subjects', '{\"action\":\"created\",\"subject_id\":4}', '2026-07-10 03:16:28'),
(16, 4, 'subject_assignments', '{\"action\":\"created\",\"subject_id\":4}', '2026-07-10 03:16:28'),
(17, 4, 'scores', '{\"action\":\"created\",\"subject_id\":4}', '2026-07-10 03:16:28'),
(18, 4, 'compiled_results', '{\"action\":\"created\",\"subject_id\":4}', '2026-07-10 03:16:28'),
(19, 4, 'classes', '{\"action\":\"created\",\"class_id\":2}', '2026-07-10 04:41:36'),
(20, 4, 'students', '{\"action\":\"created\",\"class_id\":2}', '2026-07-10 04:41:36'),
(21, 4, 'subject_assignments', '{\"action\":\"created\",\"class_id\":2}', '2026-07-10 04:41:36'),
(22, 4, 'subject_assignments', '{\"action\":\"deleted\",\"assignment_id\":1}', '2026-07-10 04:42:21'),
(23, 4, 'classes', '{\"action\":\"deleted\",\"assignment_id\":1}', '2026-07-10 04:42:21'),
(24, 4, 'teachers', '{\"action\":\"deleted\",\"assignment_id\":1}', '2026-07-10 04:42:21'),
(25, 4, 'scores', '{\"action\":\"deleted\",\"assignment_id\":1}', '2026-07-10 04:42:21'),
(26, 4, 'compiled_results', '{\"action\":\"deleted\",\"assignment_id\":1}', '2026-07-10 04:42:21'),
(27, 4, 'subject_assignments', '{\"action\":\"deleted\",\"assignment_id\":3}', '2026-07-10 04:42:30'),
(28, 4, 'classes', '{\"action\":\"deleted\",\"assignment_id\":3}', '2026-07-10 04:42:30'),
(29, 4, 'teachers', '{\"action\":\"deleted\",\"assignment_id\":3}', '2026-07-10 04:42:30'),
(30, 4, 'scores', '{\"action\":\"deleted\",\"assignment_id\":3}', '2026-07-10 04:42:30'),
(31, 4, 'compiled_results', '{\"action\":\"deleted\",\"assignment_id\":3}', '2026-07-10 04:42:30'),
(32, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":5,\"class_id\":2,\"teacher_id\":1,\"subject_id\":2,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:42:56'),
(33, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":5,\"class_id\":2,\"teacher_id\":1,\"subject_id\":2,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:42:56'),
(34, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":5,\"class_id\":2,\"teacher_id\":1,\"subject_id\":2,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:42:56'),
(35, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":5,\"class_id\":2,\"teacher_id\":1,\"subject_id\":2,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:42:56'),
(36, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":5,\"class_id\":2,\"teacher_id\":1,\"subject_id\":2,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:42:56'),
(37, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":6,\"class_id\":2,\"teacher_id\":1,\"subject_id\":4,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:32'),
(38, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":6,\"class_id\":2,\"teacher_id\":1,\"subject_id\":4,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:32'),
(39, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":6,\"class_id\":2,\"teacher_id\":1,\"subject_id\":4,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:32'),
(40, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":6,\"class_id\":2,\"teacher_id\":1,\"subject_id\":4,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:32'),
(41, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":6,\"class_id\":2,\"teacher_id\":1,\"subject_id\":4,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:32'),
(42, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":7,\"class_id\":1,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(43, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":7,\"class_id\":1,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(44, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":7,\"class_id\":1,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(45, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":7,\"class_id\":1,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(46, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":7,\"class_id\":1,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(47, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":8,\"class_id\":1,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(48, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":8,\"class_id\":1,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(49, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":8,\"class_id\":1,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(50, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":8,\"class_id\":1,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(51, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":8,\"class_id\":1,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:47'),
(52, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":9,\"class_id\":2,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(53, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":9,\"class_id\":2,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(54, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":9,\"class_id\":2,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(55, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":9,\"class_id\":2,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(56, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":9,\"class_id\":2,\"teacher_id\":2,\"subject_id\":1,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(57, 4, 'subject_assignments', '{\"action\":\"created\",\"assignment_id\":10,\"class_id\":2,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(58, 4, 'classes', '{\"action\":\"created\",\"assignment_id\":10,\"class_id\":2,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(59, 4, 'teachers', '{\"action\":\"created\",\"assignment_id\":10,\"class_id\":2,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(60, 4, 'scores', '{\"action\":\"created\",\"assignment_id\":10,\"class_id\":2,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(61, 4, 'compiled_results', '{\"action\":\"created\",\"assignment_id\":10,\"class_id\":2,\"teacher_id\":2,\"subject_id\":3,\"term\":\"First Term\",\"academic_year\":\"2026\\/2027\"}', '2026-07-10 04:43:59'),
(62, 4, 'students', '{\"action\":\"created\",\"student_id\":2,\"class_id\":2}', '2026-07-10 04:46:44'),
(63, 4, 'classes', '{\"action\":\"created\",\"student_id\":2,\"class_id\":2}', '2026-07-10 04:46:44'),
(64, 4, 'parents', '{\"action\":\"unlinked\",\"parent_id\":1,\"student_id\":2}', '2026-07-10 04:47:23'),
(65, 4, 'students', '{\"action\":\"unlinked\",\"parent_id\":1,\"student_id\":2}', '2026-07-10 04:47:23'),
(66, 4, 'notifications', '{\"action\":\"unlinked\",\"parent_id\":1,\"student_id\":2}', '2026-07-10 04:47:23'),
(67, 4, 'payments', '{\"action\":\"unlinked\",\"parent_id\":1,\"student_id\":2}', '2026-07-10 04:47:23'),
(68, 4, 'compiled_results', '{\"action\":\"unlinked\",\"parent_id\":1,\"student_id\":2}', '2026-07-10 04:47:23'),
(69, 4, 'parents', '{\"action\":\"linked\",\"parent_id\":2,\"student_id\":2}', '2026-07-10 13:28:04'),
(70, 4, 'students', '{\"action\":\"linked\",\"parent_id\":2,\"student_id\":2}', '2026-07-10 13:28:04'),
(71, 4, 'notifications', '{\"action\":\"linked\",\"parent_id\":2,\"student_id\":2}', '2026-07-10 13:28:04'),
(72, 4, 'payments', '{\"action\":\"linked\",\"parent_id\":2,\"student_id\":2}', '2026-07-10 13:28:04'),
(73, 4, 'compiled_results', '{\"action\":\"linked\",\"parent_id\":2,\"student_id\":2}', '2026-07-10 13:28:04'),
(74, 4, 'students', '{\"action\":\"updated\",\"student_id\":2}', '2026-07-10 13:28:04'),
(75, 4, 'classes', '{\"action\":\"updated\",\"student_id\":2}', '2026-07-10 13:28:04');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL,
  `role` enum('admin','teacher','accountant','parent') NOT NULL,
  `permission_id` int(11) NOT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `granted_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `scholarships`
--

CREATE TABLE `scholarships` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('Percentage','Fixed Amount') NOT NULL,
  `value` decimal(5,2) NOT NULL,
  `description` text DEFAULT NULL,
  `eligibility_criteria` text DEFAULT NULL,
  `max_beneficiaries` int(11) DEFAULT NULL,
  `current_beneficiaries` int(11) DEFAULT 0,
  `total_budget` decimal(10,2) DEFAULT NULL,
  `academic_year` varchar(20) NOT NULL,
  `status` enum('Active','Inactive','Expired') DEFAULT 'Active',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL COMMENT 'Assigned by Super Admin. e.g. "joy". Used as @suffix in logins.',
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'Nigeria',
  `school_type` enum('Primary','Secondary','Combined','Tertiary') DEFAULT 'Secondary',
  `logo_url` varchar(500) DEFAULT NULL,
  `primary_color` varchar(7) DEFAULT '#1E3A5F',
  `secondary_color` varchar(7) DEFAULT '#F4A300',
  `website` varchar(255) DEFAULT NULL,
  `plan` enum('trial','basic','standard','premium') DEFAULT 'trial' COMMENT 'Informational only. Super Admin sets manually. No automation.',
  `status` enum('pending','active','inactive','suspended','rejected') DEFAULT 'pending',
  `access_until` datetime DEFAULT NULL COMMENT 'If set and past, logins blocked. Super Admin extends this to renew access.',
  `suffix_locked` tinyint(1) DEFAULT 0 COMMENT 'TRUE after first user login. Suffix cannot be changed once locked.',
  `admin_credentials_shown` tinyint(1) DEFAULT 0 COMMENT 'TRUE after Super Admin views initial credentials. Cannot retrieve again.',
  `rejection_reason` text DEFAULT NULL,
  `deactivation_reason` text DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `deactivated_by` int(10) UNSIGNED DEFAULT NULL,
  `deactivated_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`id`, `name`, `suffix`, `email`, `phone`, `address`, `city`, `state`, `country`, `school_type`, `logo_url`, `primary_color`, `secondary_color`, `website`, `plan`, `status`, `access_until`, `suffix_locked`, `admin_credentials_shown`, `rejection_reason`, `deactivation_reason`, `approved_by`, `approved_at`, `deactivated_by`, `deactivated_at`, `created_at`, `updated_at`) VALUES
(1, 'Graceland Royal Academy', 'gra', 'info@gracelandroyalacademy.com.ng', NULL, NULL, NULL, NULL, 'Nigeria', 'Secondary', NULL, '#1E3A5F', '#F4A300', NULL, 'trial', 'active', '2026-10-02 10:45:46', 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-04 10:45:46', '2026-07-04 10:45:46'),
(4, 'ECWA SECONDARY SCHOOL BILLIRI', 'ecw', 'admin@ecwa', '+2349030031278', 'Near Old police station Billiri LGA, gombe State', 'Gombe', 'Gombe', 'Nigeria', 'Secondary', NULL, '#1E3A5F', '#F4A300', NULL, 'trial', 'active', '2026-10-02 13:41:16', 1, 0, NULL, NULL, 1, '2026-07-04 13:41:16', NULL, NULL, '2026-07-04 13:41:16', '2026-07-04 13:42:20');

-- --------------------------------------------------------

--
-- Table structure for table `school_calendar`
--

CREATE TABLE `school_calendar` (
  `id` int(11) NOT NULL,
  `academic_year_id` int(11) DEFAULT NULL,
  `term_id` int(11) DEFAULT NULL,
  `calendar_type` enum('academic','holiday','exam','event') DEFAULT 'academic',
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `school_modules`
--

CREATE TABLE `school_modules` (
  `id` int(10) UNSIGNED NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL,
  `module_name` varchar(50) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `disabled_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_modules`
--

INSERT INTO `school_modules` (`id`, `school_id`, `module_name`, `is_enabled`, `disabled_reason`, `created_at`, `updated_at`) VALUES
(1, 4, 'students', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(2, 4, 'teachers', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(3, 4, 'results', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(4, 4, 'cbt', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(5, 4, 'fees', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(6, 4, 'attendance', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(7, 4, 'assignments', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(8, 4, 'notifications', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(9, 4, 'reports', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(10, 4, 'accountant', 1, NULL, '2026-07-04 13:41:16', '2026-07-04 13:41:16'),
(11, 1, 'students', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(12, 1, 'teachers', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(13, 1, 'results', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(14, 1, 'cbt', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(15, 1, 'fees', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(16, 1, 'attendance', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(17, 1, 'assignments', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(18, 1, 'notifications', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(19, 1, 'reports', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05'),
(20, 1, 'accountant', 1, NULL, '2026-07-05 20:31:05', '2026-07-05 20:31:05');

-- --------------------------------------------------------

--
-- Table structure for table `school_plans`
--

CREATE TABLE `school_plans` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` enum('trial','basic','standard','premium') NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `max_students` int(11) DEFAULT NULL COMMENT 'NULL = unlimited',
  `max_teachers` int(11) DEFAULT NULL COMMENT 'NULL = unlimited',
  `trial_days` int(11) DEFAULT 90,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_plans`
--

INSERT INTO `school_plans` (`id`, `name`, `display_name`, `description`, `max_students`, `max_teachers`, `trial_days`, `notes`, `is_active`, `created_at`) VALUES
(1, 'trial', 'Free Trial', 'One academic term free. Full access to all features. No payment required.', NULL, NULL, 90, NULL, 1, '2026-07-04 10:45:46'),
(2, 'basic', 'Basic', 'For small schools up to 200 students.', 200, 30, 0, NULL, 1, '2026-07-04 10:45:46'),
(3, 'standard', 'Standard', 'For medium schools up to 500 students.', 500, 80, 0, NULL, 1, '2026-07-04 10:45:46'),
(4, 'premium', 'Premium', 'Unlimited students and teachers for large schools.', NULL, NULL, 0, NULL, 1, '2026-07-04 10:45:46');

-- --------------------------------------------------------

--
-- Table structure for table `school_settings`
--

CREATE TABLE `school_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` varchar(50) DEFAULT 'string',
  `description` text DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `school_settings`
--

INSERT INTO `school_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `description`, `school_id`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'current_academic_year', '2026/2027', 'string', '', 4, NULL, '2026-07-05 20:37:28', '2026-07-05 20:37:28'),
(2, 'current_term', 'First Term', 'string', '', 4, NULL, '2026-07-05 20:37:28', '2026-07-05 20:37:28');

-- --------------------------------------------------------

--
-- Table structure for table `scores`
--

CREATE TABLE `scores` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `subject_assignment_id` int(11) NOT NULL,
  `ca1` decimal(5,2) DEFAULT 0.00,
  `ca2` decimal(5,2) DEFAULT 0.00,
  `exam` decimal(5,2) DEFAULT 0.00,
  `cbt_exam_id` int(11) DEFAULT NULL,
  `total` decimal(5,2) GENERATED ALWAYS AS (`ca1` + `ca2` + `exam`) STORED,
  `grade` varchar(2) DEFAULT NULL,
  `remark` varchar(50) DEFAULT NULL,
  `class_average` decimal(5,2) DEFAULT NULL,
  `class_min` decimal(5,2) DEFAULT NULL,
  `class_max` decimal(5,2) DEFAULT NULL,
  `entered_by` int(11) NOT NULL,
  `entered_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Draft','Submitted','Rejected','Approved') DEFAULT 'Draft',
  `academic_year` varchar(20) DEFAULT NULL,
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL,
  `rejected_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `security_events_summary`
--

CREATE TABLE `security_events_summary` (
  `username` varchar(100) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `reason` longtext DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `security_logs`
--

CREATE TABLE `security_logs` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `signature_settings`
--

CREATE TABLE `signature_settings` (
  `id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` varchar(20) NOT NULL,
  `principal_name` varchar(255) NOT NULL DEFAULT '',
  `principal_signature` longtext DEFAULT NULL,
  `principal_comment` text NOT NULL,
  `head_teacher_name` varchar(255) NOT NULL DEFAULT '',
  `head_teacher_signature` longtext DEFAULT NULL,
  `head_teacher_comment` text NOT NULL,
  `resumption_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `other_name` varchar(50) DEFAULT NULL,
  `admission_number` varchar(50) NOT NULL,
  `class_id` int(11) NOT NULL,
  `level` varchar(50) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `passport_photo` text DEFAULT NULL,
  `status` enum('Active','Inactive','Graduated','Transferred') DEFAULT 'Active',
  `academic_year` varchar(20) NOT NULL,
  `admission_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `school_id`, `first_name`, `last_name`, `other_name`, `admission_number`, `class_id`, `level`, `parent_id`, `date_of_birth`, `gender`, `photo_url`, `passport_photo`, `status`, `academic_year`, `admission_date`, `created_at`, `updated_at`) VALUES
(1, 4, 'Mark', 'Micheal', '', 'ECW/2026/0001', 1, 'JSS 1', NULL, '2017-07-08', 'Male', NULL, NULL, 'Active', '2026/2027', '2026-07-08', '2026-07-08 13:17:49', '2026-07-08 13:17:49'),
(2, 4, 'MOSES', 'LOT', '', 'ECW/2026/0002', 2, 'JSS 2', 2, '2020-06-10', 'Male', NULL, NULL, 'Active', '2026/2027', '2026-07-10', '2026-07-10 04:46:44', '2026-07-10 13:28:04');

-- --------------------------------------------------------

--
-- Table structure for table `student_domains`
--

CREATE TABLE `student_domains` (
  `domain_type` varchar(11) DEFAULT NULL,
  `domain_name` varchar(24) DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `comment` mediumtext DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `class_id` int(11) DEFAULT NULL,
  `term` varchar(11) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_fee_balances`
--

CREATE TABLE `student_fee_balances` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `total_fee_required` decimal(10,2) NOT NULL,
  `total_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(10,2) GENERATED ALWAYS AS (`total_fee_required` - `total_paid`) STORED,
  `status` enum('Paid','Partial','Unpaid') DEFAULT 'Unpaid',
  `last_payment_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_promotions`
--

CREATE TABLE `student_promotions` (
  `id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `from_class_id` int(11) NOT NULL,
  `to_class_id` int(11) NOT NULL,
  `from_academic_year` varchar(20) NOT NULL,
  `to_academic_year` varchar(20) NOT NULL,
  `promotion_status` enum('Promoted','Repeated','Transferred','On Hold','Withdrawn','Pending Approval','Conditional','Manual') NOT NULL,
  `promoted_by` int(11) NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `promotion_date` date NOT NULL,
  `approved_date` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `parent_notified` tinyint(1) DEFAULT 0,
  `parent_notification_date` datetime DEFAULT NULL,
  `manual_override` tinyint(1) DEFAULT 0,
  `override_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_scholarships`
--

CREATE TABLE `student_scholarships` (
  `id` int(11) NOT NULL,
  `scholarship_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `academic_year` varchar(20) NOT NULL,
  `status` enum('Active','Inactive','Revoked') DEFAULT 'Active',
  `awarded_by` int(11) NOT NULL,
  `awarded_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_summary`
--

CREATE TABLE `student_summary` (
  `id` int(11) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `admission_number` varchar(50) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `level` varchar(50) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `status` enum('Active','Inactive','Graduated','Transferred') DEFAULT NULL,
  `parent_name` varchar(101) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `parent_phone` varchar(20) DEFAULT NULL,
  `fee_balance` decimal(10,2) DEFAULT NULL,
  `fee_status` enum('Paid','Partial','Unpaid') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_term_invoices`
--

CREATE TABLE `student_term_invoices` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `student_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `term` varchar(20) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `fee_structure_id` int(11) DEFAULT NULL,
  `fee_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `brought_forward` decimal(12,2) NOT NULL DEFAULT 0.00,
  `invoice_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `version` int(11) NOT NULL DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL,
  `category` enum('Creche','Nursery','Primary','JSS','SS','General') DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_core` tinyint(1) DEFAULT 0,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `school_id`, `name`, `code`, `category`, `department`, `description`, `is_core`, `status`, `created_at`, `updated_at`) VALUES
(1, 4, 'MATHEMATICS', 'MATH', 'General', 'General', '', 0, 'Active', '2026-07-09 19:42:28', '2026-07-09 19:42:28'),
(2, 4, 'ENGLISH LANGUAGE', 'ENG', 'General', 'General', '', 1, 'Active', '2026-07-10 03:03:58', '2026-07-10 03:03:58'),
(3, 4, 'PHYSICAL HEALTH EDUCATION', 'PHE', 'General', 'General', '', 0, 'Active', '2026-07-10 03:08:34', '2026-07-10 03:08:34'),
(4, 4, 'COMPUTER STUDIES', 'COMP', 'General', 'General', '', 0, 'Active', '2026-07-10 03:16:28', '2026-07-10 03:16:28');

-- --------------------------------------------------------

--
-- Table structure for table `subject_assignments`
--

CREATE TABLE `subject_assignments` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `subject_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subject_assignments`
--

INSERT INTO `subject_assignments` (`id`, `school_id`, `subject_id`, `class_id`, `teacher_id`, `academic_year`, `term`, `status`, `created_at`, `updated_at`) VALUES
(2, 4, 2, 1, 1, '2026/2027', 'First Term', 'Active', '2026-07-10 04:08:15', '2026-07-10 04:08:15'),
(4, 4, 4, 1, 1, '2026/2027', 'First Term', 'Active', '2026-07-10 04:08:16', '2026-07-10 04:08:16'),
(5, 4, 2, 2, 1, '2026/2027', 'First Term', 'Active', '2026-07-10 04:42:56', '2026-07-10 04:42:56'),
(6, 4, 4, 2, 1, '2026/2027', 'First Term', 'Active', '2026-07-10 04:43:32', '2026-07-10 04:43:32'),
(7, 4, 1, 1, 2, '2026/2027', 'First Term', 'Active', '2026-07-10 04:43:47', '2026-07-10 04:43:47'),
(8, 4, 3, 1, 2, '2026/2027', 'First Term', 'Active', '2026-07-10 04:43:47', '2026-07-10 04:43:47'),
(9, 4, 1, 2, 2, '2026/2027', 'First Term', 'Active', '2026-07-10 04:43:59', '2026-07-10 04:43:59'),
(10, 4, 3, 2, 2, '2026/2027', 'First Term', 'Active', '2026-07-10 04:43:59', '2026-07-10 04:43:59');

-- --------------------------------------------------------

--
-- Table structure for table `subject_registrations`
--

CREATE TABLE `subject_registrations` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `subject_id` int(11) NOT NULL,
  `class_id` int(11) NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `term` enum('First Term','Second Term','Third Term') NOT NULL,
  `is_compulsory` tinyint(1) DEFAULT 1,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subject_registrations`
--

INSERT INTO `subject_registrations` (`id`, `school_id`, `subject_id`, `class_id`, `academic_year`, `term`, `is_compulsory`, `status`, `created_at`, `updated_at`) VALUES
(17, 4, 1, 1, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:02:34', '2026-07-10 04:02:34'),
(22, 4, 2, 1, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:07:02', '2026-07-10 04:07:02'),
(23, 4, 3, 1, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:07:03', '2026-07-10 04:07:03'),
(24, 4, 4, 1, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:07:05', '2026-07-10 04:07:05'),
(25, 4, 1, 2, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:42:04', '2026-07-10 04:42:04'),
(26, 4, 2, 2, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:42:06', '2026-07-10 04:42:06'),
(27, 4, 3, 2, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:42:07', '2026-07-10 04:42:07'),
(28, 4, 4, 2, '2026/2027', 'First Term', 1, 'Active', '2026-07-10 04:42:08', '2026-07-10 04:42:08');

-- --------------------------------------------------------

--
-- Table structure for table `super_admins`
--

CREATE TABLE `super_admins` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_login` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `super_admins`
--

INSERT INTO `super_admins` (`id`, `username`, `email`, `password_hash`, `first_name`, `last_name`, `status`, `last_login`, `last_login_ip`, `created_at`, `updated_at`) VALUES
(1, 'superadmin', 'admin@smugflex.com', '$2y$12$2YwkQnhYP9RukMdl6wdCmOJAYkQW.SsZKjUMhFQsSd91WQYgggonO', 'SMugFlex', 'Admin', 'active', '2026-07-10 05:48:03', '102.91.77.121', '2026-07-04 10:45:46', '2026-07-10 05:48:03');

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `other_name` varchar(50) DEFAULT NULL,
  `employee_id` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `specialization` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specialization`)),
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `is_class_teacher` tinyint(1) DEFAULT 0,
  `department_id` int(11) DEFAULT NULL,
  `signature` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `school_id`, `first_name`, `last_name`, `other_name`, `employee_id`, `email`, `phone`, `gender`, `qualification`, `specialization`, `status`, `is_class_teacher`, `department_id`, `signature`, `created_at`, `updated_at`) VALUES
(1, 4, 'HOSEA', 'URBANUS', NULL, 'TCH2026001', 'hoseaurbanusaudu1@gmail.com', '09030031278', NULL, 'B.Sc', '[]', 'Active', 1, NULL, NULL, '2026-07-04 15:02:56', '2026-07-05 19:36:27'),
(2, 4, 'JET', 'GOF', NULL, 'TCH2026002', 'get.gof@school.local', '09080767565', NULL, '', '[]', 'Active', 1, NULL, NULL, '2026-07-10 04:40:06', '2026-07-10 04:41:36');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_assignments`
--

CREATE TABLE `teacher_assignments` (
  `id` int(11) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `subject_name` varchar(100) DEFAULT NULL,
  `subject_code` varchar(20) DEFAULT NULL,
  `class_name` varchar(50) DEFAULT NULL,
  `level` varchar(50) DEFAULT NULL,
  `academic_year` varchar(20) DEFAULT NULL,
  `term` enum('First Term','Second Term','Third Term') DEFAULT NULL,
  `assignment_status` enum('Active','Inactive') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `terms`
--

CREATE TABLE `terms` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `name` varchar(50) NOT NULL,
  `academic_year_id` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `token_blacklist`
--

CREATE TABLE `token_blacklist` (
  `jti` varchar(64) NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `school_id` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `role` enum('admin','teacher','student','accountant','parent') NOT NULL DEFAULT 'teacher',
  `linked_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'TRUE = user must change password on next login',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `school_id`, `username`, `password_hash`, `password_reset_token`, `password_reset_expires`, `role`, `linked_id`, `email`, `status`, `must_change_password`, `last_login`, `created_at`, `updated_at`) VALUES
(3, 4, 'admin', '$2y$12$YOPVUoQ10smUW28ONr5vpeYJD3p/ikUUPugXGs4mhOwo7C3ZnUMeS', NULL, NULL, 'admin', 0, 'admin@ecwa', 'Active', 0, '2026-07-10 12:46:28', '2026-07-04 13:41:16', '2026-07-10 12:46:28'),
(4, 4, 'Urbanus.audu', '$2y$10$lpqGdwwSlyyh6TEDA7QCH.m/mcrHnQEEC3V/rnXTvHp76nlHLgqV.', NULL, NULL, 'teacher', 1, 'hoseaurbanusaudu1@gmail.com', 'Active', 0, '2026-07-10 04:21:38', '2026-07-04 15:02:56', '2026-07-10 04:21:38'),
(5, 4, 'Jacob.nesai', '$2y$10$l.3YKjWtLuXTpkLuRSsyvu6OZbj0kr5Z0.NzqGrat4nzJeQ9J71oe', NULL, NULL, 'parent', 1, 'hoseaurbanusaudu2@gmail.com', 'Active', 0, '2026-07-05 07:30:17', '2026-07-05 07:29:41', '2026-07-05 07:30:17'),
(11, 4, 'get.gof', '$2y$10$sGsjKKqzULUQBNPr0UrsSON2A8sV3Kx3bP1cupsMlpKzyrWJTukbi', NULL, NULL, 'teacher', 2, 'get.gof@school.local', 'Active', 0, NULL, '2026-07-10 04:40:06', '2026-07-10 04:40:06'),
(13, 4, 'john.daniel', '$2y$10$AMJ2BhFbzh0WBukz/CPH2e5cIxRTKJyfXKq1GiXjK3RM87MQLr8VK', NULL, NULL, 'parent', 2, 'john.daniel@school.local', 'Active', 0, '2026-07-10 12:45:41', '2026-07-10 12:42:09', '2026-07-10 12:45:41');

-- --------------------------------------------------------

--
-- Table structure for table `user_dashboard_responsibilities`
--

CREATE TABLE `user_dashboard_responsibilities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `responsibility_type` enum('academic','administrative','financial','pastoral') NOT NULL,
  `responsibility_title` varchar(200) NOT NULL,
  `responsibility_description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `assigned_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_notifications`
--

CREATE TABLE `user_notifications` (
  `user_id` int(11) NOT NULL,
  `notification_id` int(11) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `login_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `logout_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `academic_years`
--
ALTER TABLE `academic_years`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `year` (`year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `accountants`
--
ALTER TABLE `accountants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `affective_domains`
--
ALTER TABLE `affective_domains`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_affective` (`student_id`,`class_id`,`term`,`academic_year`),
  ADD KEY `entered_by` (`entered_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_class_term` (`class_id`,`term`,`academic_year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `assignments`
--
ALTER TABLE `assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_teacher` (`teacher_id`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_submission` (`assignment_id`,`student_id`),
  ADD KEY `graded_by` (`graded_by`),
  ADD KEY `idx_assignment` (`assignment_id`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`student_id`,`date`),
  ADD KEY `marked_by` (`marked_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_class_date` (`class_id`,`date`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `attendance_backup`
--
ALTER TABLE `attendance_backup`
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `attendance_summary`
--
ALTER TABLE `attendance_summary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`student_id`,`class_id`,`term`,`academic_year`),
  ADD KEY `idx_student_term` (`student_id`,`term`,`academic_year`),
  ADD KEY `idx_class_term` (`class_id`,`term`,`academic_year`),
  ADD KEY `idx_marked_by` (`marked_by`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `bank_account_settings`
--
ALTER TABLE `bank_account_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cbt_answers`
--
ALTER TABLE `cbt_answers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_cbt_answer_attempt_question` (`attempt_id`,`question_id`),
  ADD KEY `idx_cbt_answers_attempt` (`attempt_id`),
  ADD KEY `idx_cbt_answers_question` (`question_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cbt_attempts`
--
ALTER TABLE `cbt_attempts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_cbt_attempt_exam_student_term` (`exam_id`,`student_id`,`academic_year`,`term`),
  ADD KEY `idx_cbt_attempts_student` (`student_id`),
  ADD KEY `idx_cbt_attempts_exam` (`exam_id`),
  ADD KEY `idx_cbt_attempts_term_year` (`academic_year`,`term`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cbt_exams`
--
ALTER TABLE `cbt_exams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cbt_exams_class` (`class_id`),
  ADD KEY `idx_cbt_exams_subject` (`subject_id`),
  ADD KEY `idx_cbt_exams_teacher` (`teacher_id`),
  ADD KEY `idx_cbt_exams_term_year` (`academic_year`,`term`),
  ADD KEY `idx_cbt_exams_published` (`published`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cbt_questions`
--
ALTER TABLE `cbt_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cbt_questions_exam` (`exam_id`),
  ADD KEY `idx_cbt_questions_sort` (`exam_id`,`sort_order`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cbt_question_bank`
--
ALTER TABLE `cbt_question_bank`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cbt_qb_teacher` (`teacher_id`),
  ADD KEY `idx_cbt_qb_subject` (`subject_id`),
  ADD KEY `idx_cbt_qb_class` (`class_id`),
  ADD KEY `idx_cbt_qb_difficulty` (`difficulty`),
  ADD KEY `idx_cbt_qb_topic` (`topic`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `classes`
--
ALTER TABLE `classes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_class_per_school` (`name`,`school_id`),
  ADD KEY `idx_level` (`level`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_class_teacher` (`class_teacher_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `class_progression_rules`
--
ALTER TABLE `class_progression_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_progression` (`from_class_id`,`to_class_id`,`academic_year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `class_teacher_assignments`
--
ALTER TABLE `class_teacher_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment` (`teacher_id`,`class_id`,`academic_year`,`term`,`school_id`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `idx_teacher_class` (`teacher_id`,`class_id`),
  ADD KEY `idx_term_year` (`academic_year`,`term`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `class_timetable`
--
ALTER TABLE `class_timetable`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_timetable_slot` (`class_id`,`day_of_week`,`period`,`academic_year`,`term`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_teacher` (`teacher_id`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_day_period` (`day_of_week`,`period`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `class_whatsapp_groups`
--
ALTER TABLE `class_whatsapp_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_class_active` (`class_id`,`is_active`),
  ADD KEY `idx_class_active` (`class_id`,`is_active`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `compiled_results`
--
ALTER TABLE `compiled_results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_result` (`student_id`,`class_id`,`term`,`academic_year`),
  ADD KEY `compiled_by` (`compiled_by`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_term_year` (`academic_year`,`term`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `cumulative_results`
--
ALTER TABLE `cumulative_results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_session` (`student_id`,`class_id`,`academic_year`),
  ADD KEY `idx_class_year` (`class_id`,`academic_year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `data_change_logs`
--
ALTER TABLE `data_change_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_table_record` (`table_name`,`record_id`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `exam_timetable`
--
ALTER TABLE `exam_timetable`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_class_date` (`class_id`,`exam_date`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_date` (`exam_date`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `fee_structures`
--
ALTER TABLE `fee_structures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_fee_structure` (`class_id`,`term`,`academic_year`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_term_year` (`academic_year`,`term`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_entity` (`entity_id`,`upload_type`),
  ADD KEY `idx_upload_type` (`upload_type`),
  ADD KEY `idx_uploaded_by` (`uploaded_by`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `manual_class_changes`
--
ALTER TABLE `manual_class_changes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `filename` (`filename`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sent_by` (`sent_by`),
  ADD KEY `idx_target` (`target_audience`),
  ADD KEY `idx_sent_date` (`sent_date`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `parents`
--
ALTER TABLE `parents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `parent_student_links`
--
ALTER TABLE `parent_student_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_parent_student_school` (`parent_id`,`student_id`,`school_id`),
  ADD KEY `idx_parent` (`parent_id`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `password_reset_log`
--
ALTER TABLE `password_reset_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `reset_by` (`reset_by`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD UNIQUE KEY `uq_payments_receipt_number` (`receipt_number`),
  ADD UNIQUE KEY `uq_payments_transaction_reference` (`transaction_reference`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `verified_by` (`verified_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_receipt` (`receipt_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_date` (`recorded_date`),
  ADD KEY `idx_term_year` (`academic_year`,`term`),
  ADD KEY `idx_payments_invoice_id` (`invoice_id`),
  ADD KEY `idx_payments_reversed_from` (`reversed_from_payment_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `performance_logs`
--
ALTER TABLE `performance_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_endpoint` (`endpoint`),
  ADD KEY `idx_response_time` (`response_time_ms`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_module` (`module`),
  ADD KEY `idx_action` (`action`);

--
-- Indexes for table `platform_activity_logs`
--
ALTER TABLE `platform_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_super_admin` (`super_admin_id`),
  ADD KEY `idx_school` (`school_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `psychomotor_domains`
--
ALTER TABLE `psychomotor_domains`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_psychomotor` (`student_id`,`class_id`,`term`,`academic_year`),
  ADD KEY `entered_by` (`entered_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_class_term` (`class_id`,`term`,`academic_year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `realtime_events`
--
ALTER TABLE `realtime_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `topic` (`topic`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `idx_realtime_events_school_id` (`school_id`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_permission` (`role`,`permission_id`),
  ADD KEY `granted_by` (`granted_by`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_permission` (`permission_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `scholarships`
--
ALTER TABLE `scholarships`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `suffix` (`suffix`),
  ADD UNIQUE KEY `uq_suffix` (`suffix`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_access_until` (`access_until`);

--
-- Indexes for table `school_calendar`
--
ALTER TABLE `school_calendar`
  ADD PRIMARY KEY (`id`),
  ADD KEY `academic_year_id` (`academic_year_id`),
  ADD KEY `term_id` (`term_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `school_modules`
--
ALTER TABLE `school_modules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_school_module` (`school_id`,`module_name`);

--
-- Indexes for table `school_plans`
--
ALTER TABLE `school_plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `school_settings`
--
ALTER TABLE `school_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_setting_school` (`setting_key`,`school_id`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `scores`
--
ALTER TABLE `scores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `entered_by` (`entered_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_assignment` (`subject_assignment_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_term_year` (`academic_year`,`term`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `security_logs`
--
ALTER TABLE `security_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `signature_settings`
--
ALTER TABLE `signature_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_signature_settings_scope` (`academic_year`,`term`),
  ADD KEY `idx_signature_settings_updated_at` (`updated_at`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `admission_number` (`admission_number`),
  ADD KEY `idx_admission_number` (`admission_number`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_parent` (`parent_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `student_fee_balances`
--
ALTER TABLE `student_fee_balances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_balance` (`student_id`,`term`,`academic_year`),
  ADD KEY `class_id` (`class_id`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_balance` (`balance`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `student_promotions`
--
ALTER TABLE `student_promotions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_promotion` (`student_id`,`from_academic_year`),
  ADD KEY `promoted_by` (`promoted_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_from_class` (`from_class_id`),
  ADD KEY `idx_to_class` (`to_class_id`),
  ADD KEY `idx_promotion_date` (`promotion_date`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `student_scholarships`
--
ALTER TABLE `student_scholarships`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_scholarship` (`scholarship_id`,`student_id`,`term`,`academic_year`),
  ADD KEY `awarded_by` (`awarded_by`),
  ADD KEY `idx_student` (`student_id`),
  ADD KEY `idx_scholarship` (`scholarship_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `student_term_invoices`
--
ALTER TABLE `student_term_invoices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_student_term` (`student_id`,`academic_year`,`term`),
  ADD KEY `idx_invoice_class_term` (`class_id`,`academic_year`,`term`),
  ADD KEY `idx_invoice_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_code_per_school` (`code`,`school_id`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `subject_assignments`
--
ALTER TABLE `subject_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_assignment` (`subject_id`,`class_id`,`academic_year`,`term`,`school_id`),
  ADD KEY `idx_teacher` (`teacher_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `subject_registrations`
--
ALTER TABLE `subject_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_registration` (`subject_id`,`class_id`,`academic_year`,`term`),
  ADD UNIQUE KEY `unique_registration_per_school` (`subject_id`,`class_id`,`academic_year`,`term`,`school_id`),
  ADD KEY `idx_class` (`class_id`),
  ADD KEY `idx_subject` (`subject_id`),
  ADD KEY `idx_academic_year` (`academic_year`),
  ADD KEY `idx_term` (`term`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `super_admins`
--
ALTER TABLE `super_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_department` (`department_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `terms`
--
ALTER TABLE `terms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `academic_year_id` (`academic_year_id`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`jti`),
  ADD KEY `expires_at` (`expires_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_linked_id` (`linked_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_school_id` (`school_id`);

--
-- Indexes for table `user_dashboard_responsibilities`
--
ALTER TABLE `user_dashboard_responsibilities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_responsibilities` (`user_id`,`responsibility_type`);

--
-- Indexes for table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD PRIMARY KEY (`user_id`,`notification_id`),
  ADD KEY `idx_notification_id` (`notification_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_token` (`session_token`),
  ADD KEY `idx_expires` (`expires_at`),
  ADD KEY `idx_active` (`is_active`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `academic_years`
--
ALTER TABLE `academic_years`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accountants`
--
ALTER TABLE `accountants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `affective_domains`
--
ALTER TABLE `affective_domains`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignments`
--
ALTER TABLE `assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance_summary`
--
ALTER TABLE `attendance_summary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_account_settings`
--
ALTER TABLE `bank_account_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cbt_answers`
--
ALTER TABLE `cbt_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cbt_attempts`
--
ALTER TABLE `cbt_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cbt_exams`
--
ALTER TABLE `cbt_exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cbt_questions`
--
ALTER TABLE `cbt_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cbt_question_bank`
--
ALTER TABLE `cbt_question_bank`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `classes`
--
ALTER TABLE `classes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `class_progression_rules`
--
ALTER TABLE `class_progression_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_teacher_assignments`
--
ALTER TABLE `class_teacher_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `class_timetable`
--
ALTER TABLE `class_timetable`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `class_whatsapp_groups`
--
ALTER TABLE `class_whatsapp_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compiled_results`
--
ALTER TABLE `compiled_results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cumulative_results`
--
ALTER TABLE `cumulative_results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `data_change_logs`
--
ALTER TABLE `data_change_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exam_timetable`
--
ALTER TABLE `exam_timetable`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fee_structures`
--
ALTER TABLE `fee_structures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `manual_class_changes`
--
ALTER TABLE `manual_class_changes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `parents`
--
ALTER TABLE `parents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `parent_student_links`
--
ALTER TABLE `parent_student_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `password_reset_log`
--
ALTER TABLE `password_reset_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `performance_logs`
--
ALTER TABLE `performance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `platform_activity_logs`
--
ALTER TABLE `platform_activity_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `psychomotor_domains`
--
ALTER TABLE `psychomotor_domains`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `realtime_events`
--
ALTER TABLE `realtime_events`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `scholarships`
--
ALTER TABLE `scholarships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `school_calendar`
--
ALTER TABLE `school_calendar`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `school_modules`
--
ALTER TABLE `school_modules`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `school_plans`
--
ALTER TABLE `school_plans`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `school_settings`
--
ALTER TABLE `school_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `scores`
--
ALTER TABLE `scores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `security_logs`
--
ALTER TABLE `security_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `signature_settings`
--
ALTER TABLE `signature_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `student_fee_balances`
--
ALTER TABLE `student_fee_balances`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_promotions`
--
ALTER TABLE `student_promotions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_scholarships`
--
ALTER TABLE `student_scholarships`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_term_invoices`
--
ALTER TABLE `student_term_invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `subject_assignments`
--
ALTER TABLE `subject_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `subject_registrations`
--
ALTER TABLE `subject_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `super_admins`
--
ALTER TABLE `super_admins`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `terms`
--
ALTER TABLE `terms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `user_dashboard_responsibilities`
--
ALTER TABLE `user_dashboard_responsibilities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `class_performance_summary`
--
DROP TABLE IF EXISTS `class_performance_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`mdpjhtua`@`localhost` SQL SECURITY INVOKER VIEW `class_performance_summary`  AS SELECT `c`.`school_id` AS `school_id`, `c`.`id` AS `class_id`, `c`.`name` AS `class_name`, `c`.`level` AS `level`, `cr`.`term` AS `term`, `cr`.`academic_year` AS `academic_year`, count(`cr`.`id`) AS `total_students`, round(avg(`cr`.`average_score`),2) AS `class_average`, max(`cr`.`average_score`) AS `highest_score`, min(`cr`.`average_score`) AS `lowest_score`, count(case when `cr`.`position` = 1 then 1 end) AS `first_position_count` FROM (`classes` `c` left join `compiled_results` `cr` on(`c`.`id` = `cr`.`class_id`)) WHERE `cr`.`status` = 'Approved' GROUP BY `c`.`school_id`, `c`.`id`, `c`.`name`, `c`.`level`, `cr`.`term`, `cr`.`academic_year` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `academic_years`
--
ALTER TABLE `academic_years`
  ADD CONSTRAINT `fk_academic_years_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `accountants`
--
ALTER TABLE `accountants`
  ADD CONSTRAINT `fk_accountants_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affective_domains`
--
ALTER TABLE `affective_domains`
  ADD CONSTRAINT `fk_affective_domains_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignments`
--
ALTER TABLE `assignments`
  ADD CONSTRAINT `fk_assignments_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `assignment_submissions`
--
ALTER TABLE `assignment_submissions`
  ADD CONSTRAINT `fk_assignment_submissions_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `fk_attendance_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_backup`
--
ALTER TABLE `attendance_backup`
  ADD CONSTRAINT `fk_attendance_backup_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance_summary`
--
ALTER TABLE `attendance_summary`
  ADD CONSTRAINT `fk_attendance_summary_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bank_account_settings`
--
ALTER TABLE `bank_account_settings`
  ADD CONSTRAINT `fk_bank_account_settings_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cbt_answers`
--
ALTER TABLE `cbt_answers`
  ADD CONSTRAINT `fk_cbt_answers_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cbt_attempts`
--
ALTER TABLE `cbt_attempts`
  ADD CONSTRAINT `fk_cbt_attempts_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cbt_exams`
--
ALTER TABLE `cbt_exams`
  ADD CONSTRAINT `fk_cbt_exams_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cbt_questions`
--
ALTER TABLE `cbt_questions`
  ADD CONSTRAINT `fk_cbt_questions_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cbt_question_bank`
--
ALTER TABLE `cbt_question_bank`
  ADD CONSTRAINT `fk_cbt_question_bank_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `classes`
--
ALTER TABLE `classes`
  ADD CONSTRAINT `fk_classes_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_progression_rules`
--
ALTER TABLE `class_progression_rules`
  ADD CONSTRAINT `fk_class_progression_rules_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_timetable`
--
ALTER TABLE `class_timetable`
  ADD CONSTRAINT `fk_class_timetable_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `class_whatsapp_groups`
--
ALTER TABLE `class_whatsapp_groups`
  ADD CONSTRAINT `fk_class_whatsapp_groups_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `compiled_results`
--
ALTER TABLE `compiled_results`
  ADD CONSTRAINT `fk_compiled_results_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cumulative_results`
--
ALTER TABLE `cumulative_results`
  ADD CONSTRAINT `fk_cumulative_results_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_timetable`
--
ALTER TABLE `exam_timetable`
  ADD CONSTRAINT `fk_exam_timetable_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `fee_structures`
--
ALTER TABLE `fee_structures`
  ADD CONSTRAINT `fk_fee_structures_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD CONSTRAINT `fk_file_uploads_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `manual_class_changes`
--
ALTER TABLE `manual_class_changes`
  ADD CONSTRAINT `fk_manual_class_changes_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `parents`
--
ALTER TABLE `parents`
  ADD CONSTRAINT `fk_parents_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `parent_student_links`
--
ALTER TABLE `parent_student_links`
  ADD CONSTRAINT `fk_parent_student_links_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `platform_activity_logs`
--
ALTER TABLE `platform_activity_logs`
  ADD CONSTRAINT `fk_pal_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`);

--
-- Constraints for table `psychomotor_domains`
--
ALTER TABLE `psychomotor_domains`
  ADD CONSTRAINT `fk_psychomotor_domains_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `realtime_events`
--
ALTER TABLE `realtime_events`
  ADD CONSTRAINT `fk_realtime_events_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scholarships`
--
ALTER TABLE `scholarships`
  ADD CONSTRAINT `fk_scholarships_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `school_calendar`
--
ALTER TABLE `school_calendar`
  ADD CONSTRAINT `fk_school_calendar_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `school_settings`
--
ALTER TABLE `school_settings`
  ADD CONSTRAINT `fk_school_settings_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scores`
--
ALTER TABLE `scores`
  ADD CONSTRAINT `fk_scores_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `signature_settings`
--
ALTER TABLE `signature_settings`
  ADD CONSTRAINT `fk_signature_settings_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_fee_balances`
--
ALTER TABLE `student_fee_balances`
  ADD CONSTRAINT `fk_student_fee_balances_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_promotions`
--
ALTER TABLE `student_promotions`
  ADD CONSTRAINT `fk_student_promotions_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_scholarships`
--
ALTER TABLE `student_scholarships`
  ADD CONSTRAINT `fk_student_scholarships_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_term_invoices`
--
ALTER TABLE `student_term_invoices`
  ADD CONSTRAINT `fk_student_term_invoices_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `fk_subjects_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subject_assignments`
--
ALTER TABLE `subject_assignments`
  ADD CONSTRAINT `fk_subject_assignments_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `fk_teachers_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `terms`
--
ALTER TABLE `terms`
  ADD CONSTRAINT `fk_terms_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
