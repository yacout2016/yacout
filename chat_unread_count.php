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
requirePermission($conn, 'view_chat');

// محادثة غير مقروءة = آخر رسالة فيها من العميل، وجاية بعد آخر مرة الأدمن فتحها (الإصدار 72)،
// والمحادثة مش مؤرشفة ولا محذوفة
$sql = "SELECT COUNT(*) AS cnt FROM (" . chat_conversations_sql($conn, "COALESCE(cm.archived, 0) = 0 AND COALESCE(cm.deleted, 0) = 0") . ") x WHERE x.unread = 1";
$res = $conn->query($sql);
$row = $res->fetch_assoc();

echo json_encode(["success" => true, "unreadCount" => (int)$row['cnt']]);
?>
