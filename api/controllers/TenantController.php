<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/JWT.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/TenantMiddleware.php';

class TenantController {
    private $conn;

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    public function register() {
        $data = json_decode(file_get_contents('php://input'), true);

        Middleware::validateRequired($data, ['name', 'email', 'phone', 'address', 'city', 'state']);

        $name  = Middleware::sanitizeString($data['name']);
        $email = strtolower(trim($data['email']));
        $phone = Middleware::sanitizeString($data['phone']);
        $address = Middleware::sanitizeString($data['address']);
        $city    = Middleware::sanitizeString($data['city']);
        $state   = Middleware::sanitizeString($data['state']);

        $stmt = $this->conn->prepare("SELECT 1 FROM schools WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            Response::badRequest('A school with this email is already registered.');
        }

        $stmt = $this->conn->prepare("SELECT 1 FROM schools WHERE name = :name AND status != 'rejected' LIMIT 1");
        $stmt->execute([':name' => $name]);
        if ($stmt->fetch()) {
            Response::badRequest('A school with this name is already registered.');
        }

        $stmt = $this->conn->prepare(
            "INSERT INTO schools (name, email, phone, address, city, state, country, school_type, status, created_at)
             VALUES (:n, :e, :p, :a, :c, :s, :co, :st, 'pending', NOW())"
        );
        $stmt->execute([
            ':n'  => $name,
            ':e'  => $email,
            ':p'  => $phone,
            ':a'  => $address,
            ':c'  => $city,
            ':s'  => $state,
            ':co' => $data['country'] ?? 'Nigeria',
            ':st' => $data['school_type'] ?? 'Secondary',
        ]);

        Response::success([
            'message' => 'Your registration has been received. The SMugFlex team will review and contact you at ' . $email . ' within 24 hours.',
            'whatsapp_url' => $this->buildWhatsAppUrl($name, $email, $phone, $address, $city, $state),
        ], 'Registration submitted successfully', 201);
    }

    private function buildWhatsAppUrl(string $name, string $email, string $phone, string $address, string $city, string $state): string {
        $adminPhone = Config::get('SUPER_ADMIN_WHATSAPP', '2349030031278');
        $date = date('d M Y, g:i A');

        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'smug.site.gracelandroyalacademy.com.ng';
        $baseUrl = $scheme . '://' . $host;

        $message = "🏫 *NEW SCHOOL REGISTRATION*\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "📋 *School:* {$name}\n";
        $message .= "📧 *Email:* {$email}\n";
        $message .= "📞 *Phone:* {$phone}\n";
        $message .= "📍 *Address:* {$address}\n";
        $message .= "🏙️ *City:* {$city}\n";
        $message .= "🗺️ *State:* {$state}\n";
        $message .= "📅 *Date:* {$date}\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "👉 *Approve:* {$baseUrl}/super-admin";

        return "https://wa.me/{$adminPhone}?text=" . urlencode($message);
    }

    public function getPublicInfo() {
        $suffix = strtolower(trim($_GET['suffix'] ?? ''));

        if (empty($suffix)) {
            Response::badRequest('Suffix parameter is required.');
        }

        usleep(random_int(30000, 70000));

        $stmt = $this->conn->prepare(
            "SELECT name, logo_url, primary_color, secondary_color, status
             FROM schools WHERE suffix = :suffix LIMIT 1"
        );
        $stmt->execute([':suffix' => $suffix]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::success(['found' => false], '');
        }

        if ($school['status'] !== 'active') {
            Response::success([
                'found'  => true,
                'active' => false,
                'name'   => $school['name'],
            ], '');
        }

        Response::success([
            'found'            => true,
            'active'           => true,
            'name'             => $school['name'],
            'logo_url'         => $school['logo_url'],
            'primary_color'    => $school['primary_color'],
            'secondary_color'  => $school['secondary_color'],
        ], '');
    }

    public function getOwnProfile() {
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);

        $stmt = $this->conn->prepare(
            "SELECT id, name, suffix, email, phone, address, city, state, country,
                    logo_url, primary_color, secondary_color, website, plan, status,
                    access_until, created_at
             FROM schools WHERE id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $school_id]);
        $school = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$school) {
            Response::notFound('School not found.');
        }

        Response::success($school, 'Profile retrieved');
    }

    public function updateOwnProfile() {
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $token_data = Middleware::requireAuth();

        if (($token_data['role'] ?? '') !== 'admin') {
            Response::forbidden('Only school admins can update the school profile.');
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $allowedFields = ['name', 'phone', 'address', 'city', 'state', 'country',
                          'logo_url', 'primary_color', 'secondary_color', 'website'];

        $updates = [];
        $params = [':id' => $school_id];

        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "`{$field}` = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }

        if (empty($updates)) {
            Response::badRequest('No valid fields to update.');
        }

        $this->conn->prepare(
            "UPDATE schools SET " . implode(', ', $updates) . " WHERE id = :id"
        )->execute($params);

        Response::success(null, 'School profile updated.');
    }

    public function uploadLogo() {
        $school_id = TenantMiddleware::resolveSchoolId($this->conn);
        $token_data = Middleware::requireAuth();

        if (($token_data['role'] ?? '') !== 'admin') {
            Response::forbidden('Only school admins can upload logos.');
        }

        if (!isset($_FILES['logo'])) {
            Response::badRequest('No logo file uploaded.');
        }

        $file = $_FILES['logo'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        // Server-side MIME validation (never trust client-reported type)
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes, true)) {
            Response::badRequest('Invalid file type. Allowed: JPEG, PNG, GIF, WebP.');
        }

        if ($file['size'] > 5242880) {
            Response::badRequest('File too large. Maximum 5MB.');
        }

        // Validate extension against allowlist
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions, true)) {
            Response::badRequest('Invalid file extension. Allowed: jpg, jpeg, png, gif, webp.');
        }

        $uploadDir = dirname(__DIR__) . "/uploads/schools/{$school_id}/logo/";
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = "logo.{$ext}";
        $destPath = $uploadDir . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            Response::serverError('Failed to save file.');
        }

        $logoUrl = "/uploads/schools/{$school_id}/logo/{$filename}";

        $this->conn->prepare("UPDATE schools SET logo_url = :url WHERE id = :id")
             ->execute([':url' => $logoUrl, ':id' => $school_id]);

        Response::success(['logo_url' => $logoUrl], 'Logo uploaded successfully.');
    }
}
