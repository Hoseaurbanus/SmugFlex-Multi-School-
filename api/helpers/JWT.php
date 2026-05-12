<?php
/**
 * Simple JWT Implementation for PHP
 * Graceland Royal Academy School Management System
 */

require_once __DIR__ . '/../config/database.php';

class JWT {
    private static $algorithm = 'HS256';
    
    /**
     * Get JWT Secret from Config
     */
    private static function getSecret() {
        return Config::getJwtSecret();
    }
    
    /**
     * Create JWT Token
     */
    public static function encode($payload) {
        $header = json_encode(['typ' => 'JWT', 'alg' => self::$algorithm]);
        $payload = json_encode($payload);
        
        $header_encoded = self::base64url_encode($header);
        $payload_encoded = self::base64url_encode($payload);
        
        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", self::getSecret(), true);
        $signature_encoded = self::base64url_encode($signature);
        
        return "$header_encoded.$payload_encoded.$signature_encoded";
    }
    
    /**
     * Decode JWT Token
     */
    public static function decode($jwt) {
        $parts = explode('.', $jwt);

        if (count($parts) !== 3) {
            return false;
        }

        list($header_encoded, $payload_encoded, $signature_encoded) = $parts;

        $header = json_decode(self::base64url_decode($header_encoded), true);
        $payload = json_decode(self::base64url_decode($payload_encoded), true);

        if (!$header || !$payload) {
            return false;
        }

        // Verify signature
        $signature = hash_hmac('sha256', "$header_encoded.$payload_encoded", self::getSecret(), true);
        $signature_check = self::base64url_decode($signature_encoded);

        if (!hash_equals($signature, $signature_check)) {
            // Security: Silent fail
            return false;
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        return $payload;
    }
    
    /**
     * Base64 URL Safe Encode
     */
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    /**
     * Base64 URL Safe Decode
     */
    private static function base64url_decode($data) {
        $data .= str_repeat('=', strlen($data) % 4);
        return base64_decode(strtr($data, '-_', '+/'));
    }
    
    /**
     * Validate token from request headers
     * Checks all possible locations for the Authorization header, since Apache/CGI/FastCGI
     * environments may place it in different $_SERVER or getallheaders() locations.
     */
    public static function validateToken($headers) {
        $auth_header = '';

        // Check getallheaders() output (works on mod_php)
        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $auth_header = $headers['authorization'];
        }

        // Additional header checks for different server configurations
        if (!$auth_header && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        }
        if (!$auth_header && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        if (!$auth_header) {
            $env_auth = getenv('HTTP_AUTHORIZATION');
            if ($env_auth) {
                $auth_header = $env_auth;
            }
        }

        if (!$auth_header) {
            return false;
        }

        if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
            $jwt = $matches[1];
            $result = self::decode($jwt);
            if (!$result) {
                return false;
            } else {
                return $result;
            }
        }

        return false;
    }
    
    /**
     * Generate token for user
     */
    public static function generateUserToken($user) {
        $payload = [
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'linked_id' => $user['linked_id'] ?? null,
            'iat' => time(),
            'exp' => time() + 86400 // 24 hours
        ];
        
        // Ensure linked_id is always set for parent role
        if ($payload['role'] === 'parent' && !isset($payload['linked_id'])) {
            $payload['linked_id'] = null; // Don't hardcode - let it be set from user data
        }
        
        return self::encode($payload);
    }
    
    /**
     * Refresh token
     */
    public static function refreshToken($token) {
        $decoded = self::decode($token);
        
        if (!$decoded) {
            return false;
        }
        
        // Check if token is expired but within grace period (48 hours)
        if (time() - $decoded['exp'] > 172800) { // 48 hours
            return false;
        }
        
        // Generate new token with same user data
        $payload = [
            'user_id' => $decoded['user_id'],
            'username' => $decoded['username'],
            'role' => $decoded['role'],
            'linked_id' => $decoded['linked_id'],
            'iat' => time(),
            'exp' => time() + 86400 // 24 hours
        ];
        
        return self::encode($payload);
    }
}
?>
