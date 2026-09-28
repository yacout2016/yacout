<?php
/* =====================================================================
   GRIFFINE — otp_verify.php (الإصدار 84)
   الخطوة التانية من تسجيل الدخول: التحقق من الكود اللي أُرسلت بالإيميل أو SMS
   POST code=6 أرقام | resend=1 (إعادة إرسال الكود)
   ===================================================================== */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]); exit(); }
requireCsrf();

$p = $_SESSION['otp_pending'] ?? null;
if (!$p) { echo json_encode(["success" => false, "message" => "ابدأ تسجيل الدخول من الأول.", "restart" => true]); exit(); }

// إعادة إرسال (بحد أدنى 45 ثانية بين كل إرسال)
if (!empty($_POST['resend'])) {
    if (time() - (int)$p['at'] < 45) { echo json_encode(["success" => false, "message" => "انتظر قليلًا قبل طلب كود جديد."]); exit(); }
    [$ok, $channel, $to, $err] = otp_start($conn, $p['email'], (int)$p['is_admin']);
    echo json_encode($ok ? ["success" => false, "resent" => true, "message" => "تم إرسال كود جديد على $to"] : ["success" => false, "message" => "تعذّر الإرسال: $err"]);
    exit();
}

[$ok, $msg] = otp_verify($conn, $_POST['code'] ?? '');
if (!$ok) { echo json_encode(["success" => false, "message" => $msg, "restart" => !isset($_SESSION['otp_pending'])]); exit(); }
clearLoginFailures($conn, $_SESSION['user_email']);
echo json_encode(["success" => true, "is_admin" => !empty($_SESSION['is_admin']), "csrfToken" => csrf_token()]);
?>
