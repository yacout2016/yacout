<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    // الإصدار 146: الزائر قبل الدخول ← رد عادي (من غير 401) عشان مايظهرش خطأ في الكونسول
    echo json_encode(["success" => false, "guest" => true, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$settings = getAllAdminSettings($conn);
// الإصدار 127: شاشات الذكاء الاصطناعي المقفولة لمشترك بعينه بتتعامل عنده كأنها مخفية
if (empty($_SESSION['is_admin'])) { require_once __DIR__ . '/security_lib.php'; require_once __DIR__ . '/ai_access_lib.php'; $settings = ai_merge_hidden($conn, $_SESSION['user_email'], $settings); }
echo json_encode(["success" => true, "settings" => $settings]);
?>
