<?php
/* =====================================================================
   GRIFFINE — chat_set_upload.php (الإصدار 82)
   الأدمن/الموظف بيفتح أو يقفل رفع الملفات والصور للعميل في محادثة معيّنة
   POST visitorId, allow = 1 | 0
   (بيتقفل تلقائيًا كمان مع إنهاء المحادثة / الأرشفة / الحذف)
   ===================================================================== */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/chat_read_state.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'reply_chat');
requireCsrf();

$visitorId = trim($_POST['visitorId'] ?? '');
$allow = !empty($_POST['allow']) && $_POST['allow'] !== '0';
if ($visitorId === '') { echo json_encode(["success" => false, "message" => "بيانات ناقصة."]); exit(); }

if (!chat_set_upload($conn, $visitorId, $allow)) {
    echo json_encode(["success" => false, "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql الأول (عمود allow_upload)."]);
    exit();
}
echo json_encode(["success" => true, "allowUpload" => $allow]);
?>
