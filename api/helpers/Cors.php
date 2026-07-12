<?php
/**
 * CORS Helper
 * SMugFlex 2.0 Multi-School Platform
 * Centralized CORS handling — reads allowed origins from Config (api/.env)
 */

require_once __DIR__ . '/../config/database.php';

class Cors {
    public static function handle() {
        $allowed_origins_str = Config::get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173');
        $allowed_origins = array_map('trim', explode(',', $allowed_origins_str));

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } elseif (Config::get('APP_ENV') === 'development' && preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-School-ID');
        header('Access-Control-Max-Age: 3600');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}
