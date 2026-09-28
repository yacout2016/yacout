<?php
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
$message = trim($_POST['message'] ?? '');

if (empty($visitorId) || empty($message)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'admin', ?)");
$stmt->bind_param("ss", $visitorId, $message);

if ($stmt->execute()) {
    // نحدّث "آخر ظهور" للأدمن عشان العميل يشوف إن فريق الدعم متصل
    $conn->query("INSERT INTO admin_presence (id, last_seen) VALUES (1, NOW()) ON DUPLICATE KEY UPDATE last_seen = NOW()");
    // الرد معناه إن الأدمن قرا المحادثة (الإصدار 72)
    try { chat_mark_read($conn, $visitorId); } catch (Throwable $e) {}
    // نبعت إشعار Push حقيقي للعميل (لو معاه اشتراك مسجّل)
    try {
        send_web_push($conn, $visitorId, '💬 رد جديد من GRIFFINE', mb_substr($message, 0, 80), '/index.php');
    } catch (Exception $e) { /* الإشعار مش أساسي - نتجاهل أي فشل فيه */ }
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
