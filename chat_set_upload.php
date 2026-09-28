<?php
/* =====================================================================
   GRIFFINE — chat_set_upload.php (الإصدار 82)
   الأدمن/الموظف بيفتح أو يقفل رفع الملفات والصور للعميل في محادثة معيّنة
   POST visitorId, allow = 1 | 0 (اختياري), maxMb = رقم بالميجا (اختياري - الإصدار 83)
   (بيتقفل تلقائيًا كمان مع إنهاء المحادثة / الأرشفة / الحذف)
   الإصدار 83: الأدمن بيكتب أقصى حجم للمرفق بالميجا جنب زرار الفتح (مثلًا 100 أو 500)
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
if ($visitorId === '') { echo json_encode(["success" => false, "message" => "بيانات ناقصة."]); exit(); }

// 1) فتح / قفل الرفع (لو أُرسلت)
if (isset($_POST['allow']) && $_POST['allow'] !== '') {
    $allow = $_POST['allow'] !== '0';
    if (!chat_set_upload($conn, $visitorId, $allow)) {
        echo json_encode(["success" => false, "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql الأول (عمود allow_upload)."]);
        exit();
    }
}
// 2) أقصى حجم للمرفق بالميجا (لو أُرسلت)
if (isset($_POST['maxMb']) && $_POST['maxMb'] !== '') {
    $mb = (int)$_POST['maxMb'];
    if ($mb < 1 || $mb > CHAT_MAX_UPLOAD_CAP_MB) {
        echo json_encode(["success" => false, "message" => "اكتب حجم من 1 لـ " . CHAT_MAX_UPLOAD_CAP_MB . " ميجا."]);
        exit();
    }
    if (!chat_set_max_upload($conn, $visitorId, $mb)) {
        echo json_encode(["success" => false, "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql الأول (عمود max_upload_mb - الإصدار 83)."]);
        exit();
    }
}
echo json_encode(["success" => true, "allowUpload" => chat_upload_allowed($conn, $visitorId), "maxUploadMb" => chat_max_upload_mb($conn, $visitorId)]);
?>
