<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}
requireCsrf();

$email = isset($_POST['email']) ? trim(strtolower($_POST['email'])) : '';
$genericMsg = "لو الإيميل ده مسجّل عندنا، هتوصلك رسالة فيها رابط إعادة تعيين كلمة المرور خلال دقائق.";

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    // نفس الرسالة العامة حتى لو الإيميل غلط في الصيغة - مبنكشفش تفاصيل
    echo json_encode(["success" => true, "message" => $genericMsg]);
    exit();
}

// الحسابات المؤرشفة (المحذوفة) تُعامل كأنها مش موجودة خالص
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND archived = 0 LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $ins = $conn->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
    $ins->bind_param("sss", $email, $token, $expiresAt);
    $ins->execute();
    $ins->close();

    $resetLink = "https://" . $_SERVER['HTTP_HOST'] . "/index.php?reset_token=" . $token;

    $subject = "إعادة تعيين كلمة المرور - GRIFFINE";
    $message = "مرحبًا،\r\n\r\nطلبت إعادة تعيين كلمة المرور لحسابك في GRIFFINE.\r\n"
        . "اضغط على الرابط ده لتعيين كلمة مرور جديدة (صالح لمدة ساعة):\r\n\r\n"
        . $resetLink . "\r\n\r\n"
        . "لو مطلبتش ده، تجاهل الرسالة دي.\r\n\r\nفريق GRIFFINE - Top7";
    $headers = "From: no-reply@" . $_SERVER['HTTP_HOST'] . "\r\nContent-Type: text/plain; charset=UTF-8";

    @mail($email, $subject, $message, $headers);
}
$stmt->close();

// دايمًا نرجع نفس الرسالة العامة، سواء الإيميل موجود أو لأ أو مؤرشف - عشان محدش يعرف يستكشف إيميلات مسجلة
echo json_encode(["success" => true, "message" => $genericMsg]);
?>
