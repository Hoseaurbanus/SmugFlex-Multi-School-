<?php
require_once 'helpers/JWT.php';

$token_data = [
    'user_id' => 1,
    'username' => 'admin',
    'role' => 'admin',
    'exp' => time() + 3600
];

$token = JWT::encode($token_data);
echo "Valid admin token: " . $token . "\n";
?>
