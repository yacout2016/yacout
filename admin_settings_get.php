<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$settings = getAllAdminSettings($conn);
// الإصدار 127: شاشات الذكاء الاصطناعي المقفولة لمشترك بعينه بتتعامل عنده كأنها مخفية
if (empty($_SESSION['is_admin'])) { require_once __DIR__ . '/security_lib.php'; require_once __DIR__ . '/ai_access_lib.php'; $settings = ai_merge_hidden($conn, $_SESSION['user_email'], $settings); }
echo json_encode(["success" => true, "settings" => $settings]);
?>
