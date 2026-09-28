<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/chat_read_state.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'reply_chat');

requireCsrf();

$visitorId = trim($_POST['visitorId'] ?? '');
$message = trim($_POST['message'] ?? '');
// الإصدار 82: الأدمن/الموظف يقدر يبعت صورة أو PDF للعميل
$attachment = $_POST['attachment'] ?? null;
$attachmentName = mb_substr(trim($_POST['attachmentName'] ?? ''), 0, 120);

if (empty($visitorId) || ($message === '' && empty($attachment))) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}
if (!empty($attachment)) {
    if (strlen($attachment) > 11000000) { echo json_encode(["success" => false, "message" => "حجم المرفق كبير جدًا."]); exit(); }
    $attachment = upl_store($attachment, 'chat', true);
    if ($attachment === false) { echo json_encode(["success" => false, "message" => "نوع المرفق غير مدعوم. ابعت صورة أو ملف PDF."]); exit(); }
} else { $attachment = null; $attachmentName = null; }

$stmt = $conn->prepare("INSERT INTO chat_messages (visitor_id, sender, message, attachment, attachment_name) VALUES (?, 'admin', ?, ?, ?)");
$stmt->bind_param("ssss", $visitorId, $message, $attachment, $attachmentName);

if ($stmt->execute()) {
    // نحدّث "آخر ظهور" للأدمن عشان العميل يشوف إن فريق الدعم متصل
    $conn->query("INSERT INTO admin_presence (id, last_seen) VALUES (1, NOW()) ON DUPLICATE KEY UPDATE last_seen = NOW()");
    // الرد معناه إن الأدمن قرا المحادثة (الإصدار 72)
    try { chat_mark_read($conn, $visitorId); } catch (Throwable $e) {}
    // نبعت إشعار Push حقيقي للعميل (لو معاه اشتراك مسجّل)
    try {
        send_web_push($conn, $visitorId, '💬 رد جديد من GRIFFINE', $message !== '' ? mb_substr($message, 0, 80) : '📎 أرسل لك مرفقًا', '/index.php');
    } catch (Exception $e) { /* الإشعار مش أساسي - نتجاهل أي فشل فيه */ }
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
