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

$email = $_SESSION['user_email'];
requireCsrf();
$ok = sendVerificationEmail($conn, $email);
echo json_encode(["success" => true, "message" => "تم إرسال رابط تفعيل جديد على إيميلك."]);
?>
