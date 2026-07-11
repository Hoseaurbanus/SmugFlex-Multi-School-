<?php
header('Content-Type: text/plain');
echo "=== PHP Version ===\n";
echo phpversion() . "\n\n";

echo "=== getallheaders() ===\n";
if (function_exists('getallheaders')) {
    $h = getallheaders();
    foreach ($h as $k => $v) {
        echo "  $k: $v\n";
    }
} else {
    echo "  getallheaders() not available\n";
}
echo "\n";

echo "=== _SERVER auth-related keys ===\n";
$keys = preg_grep('/auth/i', array_keys($_SERVER));
foreach ($keys as $k) {
    echo "  $k: " . (isset($_SERVER[$k]) ? substr($_SERVER[$k], 0, 50) . '...' : 'NOT SET') . "\n";
}
echo "\n";

echo "=== REDIRECT_HTTP_AUTHORIZATION ===\n";
echo isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? 'SET: ' . substr($_SERVER['REDIRECT_HTTP_AUTHORIZATION'], 0, 50) : 'NOT SET';
echo "\n\n";

echo "=== All _SERVER keys (sample) ===\n";
foreach ($_SERVER as $k => $v) {
    if (strpos($k, 'HTTP_') === 0) {
        echo "  $k: " . (is_string($v) ? substr($v, 0, 80) : 'NOT STRING') . "\n";
    }
}
