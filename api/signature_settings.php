<?php
require_once __DIR__ . '/helpers/Cors.php';
Cors::handle();
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Middleware.php';
require_once __DIR__ . '/helpers/TenantMiddleware.php';
require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            Middleware::requireAuth();
            $school_id = TenantMiddleware::resolveSchoolId($conn);

            $academic_year = isset($_GET['academic_year']) ? trim((string)$_GET['academic_year']) : '';
            $term = isset($_GET['term']) ? trim((string)$_GET['term']) : '';

            if ($academic_year === '' || $term === '') {
                Response::badRequest('academic_year and term are required');
                break;
            }

            $sql = "SELECT * FROM signature_settings WHERE academic_year = :academic_year AND term = :term AND school_id = :school_id ORDER BY updated_at DESC, id DESC LIMIT 1";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':academic_year', $academic_year);
            $stmt->bindParam(':term', $term);
            $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            Response::success($row ?: null, $row ? 'Signature settings loaded' : 'Signature settings not found');
            break;

        case 'POST':
            $token_data = Middleware::requireRole('admin');
            $school_id = TenantMiddleware::resolveSchoolId($conn);

            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                Response::badRequest('Invalid JSON payload');
                break;
            }

            $academic_year = trim((string)($data['academic_year'] ?? ''));
            $term = trim((string)($data['term'] ?? ''));

            if ($academic_year === '' || $term === '') {
                Response::badRequest('academic_year and term are required');
                break;
            }

            $principal_name = (string)($data['principal_name'] ?? '');
            $principal_signature = $data['principal_signature'] ?? null;
            $principal_comment = (string)($data['principal_comment'] ?? '');
            if ($principal_signature === '') {
                $principal_signature = null;
            }
            $head_teacher_name = (string)($data['head_teacher_name'] ?? '');
            $head_teacher_signature = $data['head_teacher_signature'] ?? null;
            if ($head_teacher_signature === '') {
                $head_teacher_signature = null;
            }
            $head_teacher_comment = (string)($data['head_teacher_comment'] ?? '');
            $resumption_date_raw = trim((string)($data['resumption_date'] ?? ''));
            // Normalize date formats so frontend <input type="date"> always round-trips.
            // Accepted:
            // - YYYY-MM-DD
            // - YYYY-MM-DD HH:MM:SS
            // - DD/MM/YYYY
            // Empty/zero-date becomes NULL.
            if ($resumption_date_raw === '' || $resumption_date_raw === '0000-00-00' || $resumption_date_raw === '0000-00-00 00:00:00') {
                $resumption_date = null;
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2}/', $resumption_date_raw)) {
                $resumption_date = substr($resumption_date_raw, 0, 10);
            } elseif (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $resumption_date_raw, $m)) {
                $resumption_date = $m[3] . '-' . $m[2] . '-' . $m[1];
            } else {
                // Unknown format - store NULL instead of a string that will break the UI.
                $resumption_date = null;
            }

            $check_sql = "SELECT id FROM signature_settings WHERE academic_year = :academic_year AND term = :term AND school_id = :school_id ORDER BY updated_at DESC, id DESC LIMIT 1";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bindParam(':academic_year', $academic_year);
            $check_stmt->bindParam(':term', $term);
            $check_stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
            $check_stmt->execute();
            $existing = $check_stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing && isset($existing['id'])) {
                $id = (int)$existing['id'];
                $sql = "UPDATE signature_settings SET principal_name = :principal_name, principal_signature = :principal_signature, principal_comment = :principal_comment, head_teacher_name = :head_teacher_name, head_teacher_signature = :head_teacher_signature, head_teacher_comment = :head_teacher_comment, resumption_date = :resumption_date, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND school_id = :school_id";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(':principal_name', $principal_name);
                $stmt->bindParam(':principal_signature', $principal_signature);
                $stmt->bindParam(':principal_comment', $principal_comment);
                $stmt->bindParam(':head_teacher_name', $head_teacher_name);
                $stmt->bindParam(':head_teacher_signature', $head_teacher_signature);
                $stmt->bindParam(':head_teacher_comment', $head_teacher_comment);
                $stmt->bindValue(':resumption_date', $resumption_date, $resumption_date === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $success = $stmt->execute();
                if (!$success) {
                    Response::serverError('Failed to update signature settings');
                    break;
                }

                $fetch_stmt = $conn->prepare('SELECT * FROM signature_settings WHERE id = :id LIMIT 1');
                $fetch_stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $fetch_stmt->execute();
                $saved_row = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

                Response::success($saved_row ?: ['id' => $id], 'Signature settings updated');
            } else {
                $sql = "INSERT INTO signature_settings (academic_year, term, school_id, principal_name, principal_signature, principal_comment, head_teacher_name, head_teacher_signature, head_teacher_comment, resumption_date, created_at, updated_at) VALUES (:academic_year, :term, :school_id, :principal_name, :principal_signature, :principal_comment, :head_teacher_name, :head_teacher_signature, :head_teacher_comment, :resumption_date, NOW(), NOW())";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(':academic_year', $academic_year);
                $stmt->bindParam(':term', $term);
                $stmt->bindParam(':principal_name', $principal_name);
                $stmt->bindParam(':principal_signature', $principal_signature);
                $stmt->bindParam(':principal_comment', $principal_comment);
                $stmt->bindParam(':head_teacher_name', $head_teacher_name);
                $stmt->bindParam(':head_teacher_signature', $head_teacher_signature);
                $stmt->bindParam(':head_teacher_comment', $head_teacher_comment);
                $stmt->bindValue(':resumption_date', $resumption_date, $resumption_date === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
                $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $success = $stmt->execute();
                if (!$success) {
                    Response::serverError('Failed to create signature settings');
                    break;
                }

                $new_id = (int)$conn->lastInsertId();
                $fetch_stmt = $conn->prepare('SELECT * FROM signature_settings WHERE id = :id LIMIT 1');
                $fetch_stmt->bindParam(':id', $new_id, PDO::PARAM_INT);
                $fetch_stmt->execute();
                $saved_row = $fetch_stmt->fetch(PDO::FETCH_ASSOC);

                Response::success($saved_row ?: ['id' => $new_id], 'Signature settings created');
            }

            break;

        default:
            Response::error('Method not allowed', 405);
            break;
    }
} catch (PDOException $e) {
    $msg = $e->getMessage();
    error_log('Signature settings error: ' . $msg);
    $lower = strtolower($msg);
    if (str_contains($lower, "doesn't exist") || str_contains($lower, 'does not exist') || str_contains($lower, 'unknown')) {
        Response::success(null, 'No signature settings found');
    } else {
        Response::serverError('Database error');
    }
} catch (Exception $e) {
    error_log('Signature settings error: ' . $e->getMessage());
    Response::serverError('Server error');
}
