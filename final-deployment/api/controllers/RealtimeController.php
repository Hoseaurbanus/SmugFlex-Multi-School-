<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Middleware.php';
require_once __DIR__ . '/../helpers/RealtimeEvents.php';

class RealtimeController {
    private $conn;

    public function __construct() {
        try {
            $database = new Database();
            $this->conn = $database->getConnection();
        } catch (Throwable $e) {
            $this->conn = null;
        }
    }

    public function stream() {
        // Allow auth via Authorization header (preferred) or token query param.
        $tokenData = RealtimeEvents::validateTokenFromRequest();
        if (!$tokenData) {
            http_response_code(401);
            header('Content-Type: text/plain');
            echo 'Unauthorized';
            exit;
        }

        // SSE headers
        header_remove();
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache, no-transform');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // nginx

        // CORS - reuse origin whitelist behavior from index.php as best effort
        $allowed_origins = [
            'https://gracelandroyalacademy.com.ng',
            'https://www.gracelandroyalacademy.com.ng',
            'http://localhost:3000',
        ];
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed_origins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }

        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', '1');
        }
        @ini_set('zlib.output_compression', '0');
        @ini_set('output_buffering', '0');
        @ini_set('implicit_flush', '1');
        while (ob_get_level() > 0) {
            @ob_end_flush();
        }
        @ob_implicit_flush(1);

        $lastId = 0;
        if (isset($_GET['lastEventId'])) {
            $lastId = intval($_GET['lastEventId']);
        } elseif (isset($_SERVER['HTTP_LAST_EVENT_ID'])) {
            $lastId = intval($_SERVER['HTTP_LAST_EVENT_ID']);
        }

        $start = time();
        $maxSeconds = 55; // keep under common proxy timeouts; client reconnects

        // Initial hello (lets client know it's connected)
        echo "event: hello\n";
        echo "data: {\"ok\":true}\n\n";
        @flush();

        if (!$this->conn) {
            echo "event: error\n";
            echo "data: {\"message\":\"Database unavailable\"}\n\n";
            @flush();
            exit;
        }

        while (true) {
            if (connection_aborted()) {
                break;
            }

            $events = RealtimeEvents::fetchSince($this->conn, $lastId, 50);
            if (!empty($events)) {
                foreach ($events as $ev) {
                    $id = intval($ev['id'] ?? 0);
                    $topic = (string)($ev['topic'] ?? 'unknown');
                    $payload = $ev['payload'];

                    // Ensure payload is a JSON string
                    if (is_array($payload) || is_object($payload)) {
                        $payloadJson = json_encode($payload);
                    } else {
                        $payloadJson = $payload === null ? '{}' : (string)$payload;
                    }

                    echo "id: {$id}\n";
                    echo "event: update\n";
                    echo 'data: ' . json_encode([
                        'id' => $id,
                        'topic' => $topic,
                        'payload' => json_decode($payloadJson, true),
                        'ts' => $ev['created_at'] ?? null,
                    ]) . "\n\n";

                    $lastId = $id;
                }
                @flush();
            } else {
                // heartbeat every ~15s
                echo ": ping\n\n";
                @flush();
            }

            if ((time() - $start) >= $maxSeconds) {
                break;
            }

            usleep(500000); // 0.5s
        }

        exit;
    }
}
