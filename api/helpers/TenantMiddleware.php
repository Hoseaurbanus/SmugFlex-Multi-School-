<?php

require_once __DIR__ . '/JWT.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/../config/database.php';

class TenantMiddleware {

    public static function resolveSchoolId(PDO $conn): int {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $tokenData = JWT::validateToken($headers, false);

        if (!$tokenData) {
            Response::unauthorized('Invalid or expired token.');
        }

        if (isset($tokenData['is_super_admin']) && $tokenData['is_super_admin']) {
            Response::forbidden('Super admin token cannot access school resources directly.');
        }

        $school_id = (int)($tokenData['school_id'] ?? 0);
        if ($school_id <= 0) {
            Response::forbidden('School context missing from token.');
        }

        static $verified = [];
        if (!isset($verified[$school_id])) {
            $stmt = $conn->prepare(
                "SELECT status, access_until FROM schools WHERE id = :id LIMIT 1"
            );
            $stmt->execute([':id' => $school_id]);
            $school = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$school) {
                Response::forbidden('School not found.');
            }
            $status = $school['status'] ?? '';
            if ($status === 'inactive') {
                Response::forbidden('School account is inactive. Contact SMugFlex support.', 'SCHOOL_INACTIVE');
            }
            if ($status === 'suspended') {
                Response::forbidden('School account has been suspended. Contact SMugFlex support.', 'SCHOOL_SUSPENDED');
            }
            if (!in_array($status, ['active'], true)) {
                Response::forbidden('School account is not active. Contact SMugFlex support.', 'SCHOOL_NOT_ACTIVE');
            }
            if ($school['access_until'] && strtotime($school['access_until']) < time()) {
                Response::forbidden('School access period has ended. Contact SMugFlex to renew.', 'ACCESS_EXPIRED');
            }
            $verified[$school_id] = true;
        }

        return $school_id;
    }

    public static function assertOwnership(PDO $conn, string $table, int $record_id, int $school_id): void {
        $allowedTables = [
            'students','teachers','parents','accountants','users','classes',
            'subjects','subject_assignments','scores','compiled_results',
            'payments','fee_structures','student_fee_balances','student_term_invoices',
            'attendance','notifications','user_notifications','assignments',
            'assignment_submissions','cbt_exams','cbt_questions','cbt_question_bank',
            'cbt_answers','cbt_attempts','academic_years','terms',
            'class_performance_summary','class_progression_rules','class_teacher_assignments',
            'class_timetable','class_whatsapp_groups','departments','exam_timetable',
            'file_uploads','manual_class_changes','parent_student_links','password_reset_log',
            'permissions','role_permissions','scholarships','school_calendar',
            'school_settings','security_logs','security_events_summary','signature_settings',
            'student_domains','student_promotions','student_scholarships','student_summary',
            'subject_registrations','teacher_assignments','token_blacklist',
            'user_dashboard_responsibilities','user_sessions','activity_logs',
            'data_changes_summary','data_change_logs','affective_domains',
            'psychomotor_domains','realtime_events','performance_logs','bank_account_settings',
        ];

        if (!in_array($table, $allowedTables, true)) {
            Response::serverError('Invalid table reference.');
        }

        $stmt = $conn->prepare("SELECT school_id FROM `{$table}` WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $record_id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record || (int)$record['school_id'] !== $school_id) {
            Response::notFound('Record not found.');
        }
    }

    public static function validateSuffixFormat(string $suffix): bool {
        return (bool)preg_match('/^[a-z0-9]{2,20}$/', $suffix);
    }

    public static function isSuffixAvailable(PDO $conn, string $suffix): bool {
        $stmt = $conn->prepare("SELECT 1 FROM schools WHERE suffix = :s LIMIT 1");
        $stmt->execute([':s' => $suffix]);
        return !$stmt->fetch();
    }

    public static function requireSuperAdminAuth(): array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $tokenData = JWT::validateToken($headers, true);

        if (!$tokenData) {
            Response::unauthorized('Invalid or expired super admin token.');
        }

        if (empty($tokenData['is_super_admin'])) {
            Response::forbidden('Access denied. Super admin privileges required.');
        }

        return $tokenData;
    }
}
