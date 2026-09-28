<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/plans_store.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];
$allowedKeys = ['plans', 'grid_plans'];
$key = trim($_GET['key'] ?? '');

if (!in_array($key, $allowedKeys, true)) {
    echo json_encode(["success" => false, "message" => "مفتاح غير صحيح."]);
    exit();
}

try {
    $state = plans_get($conn, $email, $key);
    echo json_encode(["success" => true, "value" => $state['value'], "versions" => $state['versions'], "deleted" => $state['deleted'], "mode" => $state['mode']], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "خطأ في قاعدة البيانات."]);
}
?>
