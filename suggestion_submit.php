<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];
$message = trim($_POST['message'] ?? '');
$attachment = isset($_POST['attachment']) && $_POST['attachment'] !== '' ? $_POST['attachment'] : null;
$attachmentName = trim($_POST['attachmentName'] ?? '') ?: null;

if ($message === '') {
    echo json_encode(["success" => false, "message" => "اكتب فكرتك أو اقتراحك الأول."]);
    exit();
}
if (mb_strlen($message) > 5000) {
    echo json_encode(["success" => false, "message" => "النص طويل جدًا — اختصره شوية."]);
    exit();
}

$attachmentType = null;
if ($attachment !== null) {
    if (!preg_match('/^data:(image\/(png|jpeg|jpg|webp|gif)|application\/pdf);base64,/', $attachment, $m)) {
        echo json_encode(["success" => false, "message" => "الملف المرفق لازم يكون صورة أو PDF بس."]);
        exit();
    }
    $attachmentType = $m[1];
    if (strlen($attachment) > 6000000) {
        echo json_encode(["success" => false, "message" => "حجم الملف كبير جدًا — جرّب ملف أصغر (أقل من ٤ ميجا تقريبًا)."]);
        exit();
    }
}

if ($attachment !== null) {
    $attachment = upl_store($attachment, 'sugg', true);
    if ($attachment === false) {
        echo json_encode(["success" => false, "message" => "نوع المرفق غير مدعوم."]);
        exit();
    }
}

$stmt = $conn->prepare("INSERT INTO suggestions (account_email, message, attachment_data, attachment_name, attachment_type, status) VALUES (?, ?, ?, ?, ?, 'new')");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "جدول المقترحات مش موجود لسه في قاعدة البيانات — شغّل ملف update_schema_25_suggestions.sql الأول."]);
    exit();
}
$stmt->bind_param("sssss", $email, $message, $attachment, $attachmentName, $attachmentType);
$ok = $stmt->execute();
$stmt->close();

echo json_encode(["success" => (bool)$ok]);
?>
