<?php

require_once __DIR__ . '/../config/database.php';

class JWT {
    private static $algorithm = 'HS256';

    private static function getSecret(bool $useSuperAdminSecret = false): string {
        if ($useSuperAdminSecret) {
            $secret = Config::get('SUPER_ADMIN_JWT_SECRET');
            if (!$secret) {
                throw new Exception('SUPER_ADMIN_JWT_SECRET environment variable is required.');
            }
            return $secret;
        }
        return Config::getJwtSecret();
    }

    public static function encode(array $payload, bool $useSuperAdminSecret = false): string {
        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        $payload = json_encode($payload);

        $header_encoded = self::base64url_encode($header);
        $payload_encoded = self::base64url_encode($payload);

        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", self::getSecret($useSuperAdminSecret), true);
        $signature_encoded = self::base64url_encode($signature);

        return "$header_encoded.$payload_encoded.$signature_encoded";
    }

    public static function decode(string $jwt, bool $useSuperAdminSecret = false, int $graceSeconds = 0) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return false;

        [$header_encoded, $payload_encoded, $signature_encoded] = $parts;

        $header = json_decode(self::base64url_decode($header_encoded), true);
        $payload = json_decode(self::base64url_decode($payload_encoded), true);

        if (!$header || !$payload) return false;

        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", self::getSecret($useSuperAdminSecret), true);
        $signature_check = self::base64url_decode($signature_encoded);

        if (!hash_equals($signature, $signature_check)) return false;
        if (isset($payload['exp']) && $payload['exp'] < time() - $graceSeconds) return false;

        return $payload;
    }

    public static function validateToken($headers, bool $expectSuperAdmin = false) {
        $auth_header = '';

        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $auth_header = $headers['authorization'];
        }

        if (!$auth_header && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (!$auth_header && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (!$auth_header) {
            $env_auth = getenv('HTTP_AUTHORIZATION');
            if ($env_auth) $auth_header = $env_auth;
        }

        if (!$auth_header) return false;

            if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
                $result = self::decode($matches[1], $expectSuperAdmin);
                if (!$result) return false;

                if (self::isBlacklisted($matches[1])) return false;

                if ($expectSuperAdmin) {
                if (empty($result['is_super_admin'])) return false;
            } else {
                if (!empty($result['is_super_admin'])) return false;
            }

            return $result;
        }

        return false;
    }

    public static function generateUserToken(array $user): string {
        $payload = [
            'user_id'       => (int)$user['id'],
            'username'      => $user['username'],
            'role'          => $user['role'],
            'linked_id'     => $user['linked_id'] ?? null,
            'school_id'     => (int)($user['school_id'] ?? 0),
            'school_suffix' => $user['school_suffix'] ?? '',
            'school_name'   => $user['school_name'] ?? '',
            'jti'           => bin2hex(random_bytes(16)),
            'iat'           => time(),
            'exp'           => time() + 86400,
        ];
        return self::encode($payload, false);
    }

    public static function refreshToken(string $token) {
        $decoded = self::decode($token, false, 900);
        if (!$decoded) return false;

        if (isset($decoded['exp']) && time() - $decoded['exp'] > 900) return false;

        self::blacklistToken($decoded);

        $payload = [
            'user_id'       => $decoded['user_id'],
            'username'      => $decoded['username'],
            'role'          => $decoded['role'],
            'linked_id'     => $decoded['linked_id'] ?? null,
            'school_id'     => (int)($decoded['school_id'] ?? 0),
            'school_suffix' => $decoded['school_suffix'] ?? '',
            'school_name'   => $decoded['school_name'] ?? '',
            'jti'           => bin2hex(random_bytes(16)),
            'iat'           => time(),
            'exp'           => time() + 86400,
        ];
        return self::encode($payload, false);
    }

    public static function blacklistToken(array $decoded) {
        if (empty($decoded['jti'])) return;
        try {
            $database = new Database();
            $conn = $database->getConnection();
            $expires = isset($decoded['exp']) ? date('Y-m-d H:i:s', $decoded['exp']) : date('Y-m-d H:i:s', time() + 86400);
            $schoolId = $decoded['school_id'] ?? null;
            $stmt = $conn->prepare(
                "INSERT IGNORE INTO token_blacklist (jti, expires_at, school_id) VALUES (:jti, :expires_at, :school_id)"
            );
            $stmt->execute([':jti' => $decoded['jti'], ':expires_at' => $expires, ':school_id' => $schoolId]);
        } catch (Exception $e) {
            error_log("Failed to blacklist token: " . $e->getMessage());
        }
    }

    public static function isBlacklisted(string $jwt): bool {
        $decoded = self::decode($jwt, false);
        if (!$decoded || empty($decoded['jti'])) return false;
        try {
            $database = new Database();
            $conn = $database->getConnection();
            $stmt = $conn->prepare("SELECT 1 FROM token_blacklist WHERE jti = :jti LIMIT 1");
            $stmt->execute([':jti' => $decoded['jti']]);
            return $stmt->fetch() !== false;
        } catch (Exception $e) {
            error_log("Failed to check token blacklist: " . $e->getMessage());
            return false;
        }
    }

    public static function cleanupBlacklist() {
        try {
            $database = new Database();
            $conn = $database->getConnection();
            $conn->exec("DELETE FROM token_blacklist WHERE expires_at < NOW()");
        } catch (Exception $e) {
            error_log("Failed to cleanup token blacklist: " . $e->getMessage());
        }
    }

    private static function base64url_encode($data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64url_decode($data) {
        $data .= str_repeat('=', strlen($data) % 4);
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function generateSuperAdminToken(array $admin): string {
        $payload = [
            'super_admin_id' => (int)$admin['id'],
            'username'       => $admin['username'],
            'is_super_admin' => true,
            'iat'            => time(),
            'exp'            => time() + 86400,
        ];
        return self::encode($payload, true);
    }
}
