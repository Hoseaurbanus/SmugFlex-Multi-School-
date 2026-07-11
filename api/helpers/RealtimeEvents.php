<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/JWT.php';

class RealtimeEvents {
    private static function getConnection(): PDO {
        $database = new Database();
        return $database->getConnection();
    }

    private static function ensureTable(PDO $conn): void {
        $sql = "CREATE TABLE IF NOT EXISTS realtime_events (\n"
            . "  id BIGINT AUTO_INCREMENT PRIMARY KEY,\n"
            . "  school_id INT(10) UNSIGNED NOT NULL DEFAULT 1,\n"
            . "  topic VARCHAR(64) NOT NULL,\n"
            . "  payload JSON NULL,\n"
            . "  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n"
            . "  INDEX (school_id),\n"
            . "  INDEX (topic),\n"
            . "  INDEX (created_at)\n"
            . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $conn->exec($sql);
    }

    public static function publish($topics, $payload = null): void {
        $list = is_array($topics) ? $topics : [$topics];
        if (count($list) === 0) {
            return;
        }

        // Resolve school_id from current request context
        $school_id = 0;
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $tokenData = JWT::validateToken($headers, false);
        if ($tokenData && !empty($tokenData['school_id'])) {
            $school_id = (int)$tokenData['school_id'];
        }

        try {
            $conn = self::getConnection();
            self::ensureTable($conn);

            $stmt = $conn->prepare("INSERT INTO realtime_events (topic, payload, school_id) VALUES (:topic, :payload, :school_id)");
            $json = $payload === null ? null : json_encode($payload);

            foreach ($list as $topic) {
                $t = trim((string)$topic);
                if ($t === '') {
                    continue;
                }
                $stmt->bindValue(':topic', $t);
                $stmt->bindValue(':payload', $json);
                $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
                $stmt->execute();
            }
        } catch (Throwable $e) {
            // Ignore publish failures; realtime is best-effort.
        }
    }

    public static function fetchSince(PDO $conn, int $lastId, int $limit = 50, int $school_id = 0): array {
        self::ensureTable($conn);
        $stmt = $conn->prepare("SELECT id, topic, payload, created_at FROM realtime_events WHERE id > :id AND school_id = :school_id ORDER BY id ASC LIMIT :lim");
        $stmt->bindValue(':id', $lastId, PDO::PARAM_INT);
        $stmt->bindValue(':school_id', $school_id, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public static function validateTokenFromRequest(): ?array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $tokenData = JWT::validateToken($headers);
        if ($tokenData) {
            return $tokenData;
        }

        $token = $_GET['token'] ?? '';
        if (!$token || !is_string($token)) {
            return null;
        }

        $decoded = JWT::decode($token);
        return $decoded ?: null;
    }
}
