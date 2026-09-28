<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'reply_chat');

requireCsrf();

$visitorId = trim($_POST['visitorId'] ?? '');
if (empty($visitorId)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) = ? ORDER BY id ASC");
$stmt->bind_param("s", $visitorId);
$stmt->execute();
$result = $stmt->get_result();

$visitorEmail = null;
$transcript = '';
while ($r = $result->fetch_assoc()) {
    if ($r['visitor_email']) $visitorEmail = $r['visitor_email'];
    $who = $r['sender'] === 'admin' ? 'أنت (الأدمن)' : 'العميل';
    $transcript .= "[$r[created_at]] $who: " . ($r['message'] ?: '(مرفق ملف)') . "\r\n";
}
$stmt->close();

if (empty($transcript)) {
    echo json_encode(["success" => false, "message" => "لا يوجد رسائل في هذه المحادثة."]);
    exit();
}

$host = $_SERVER['HTTP_HOST'] ?? 'www.griffine.store';
$subject = "Griffine.store - نسخة كاملة من محادثة شات" . ($visitorEmail ? " ($visitorEmail)" : " (زائر بدون إيميل)");
$body = "محادثة الشات كاملة" . ($visitorEmail ? " مع: $visitorEmail" : " مع زائر بدون إيميل") . "\r\n"
    . "معرّف المحادثة: $visitorId\r\n\r\n"
    . "-------------------------------\r\n"
    . $transcript
    . "-------------------------------\r\n";
$headers = "From: Griffine.store <no-reply@$host>" . ($visitorEmail ? "\r\nReply-To: $visitorEmail" : "") . "\r\nContent-Type: text/plain; charset=UTF-8";

$ok = @mail('info@griffine.store', $subject, $body, $headers);
echo json_encode(["success" => true, "mailed" => $ok]);
?>
