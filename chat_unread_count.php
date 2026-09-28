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
requirePermission($conn, 'view_chat');

// محادثة "محتاجة رد" = آخر رسالة فيها من الزائر، والمحادثة مش مؤرشفة ولا محذوفة
$sql = "
    SELECT COUNT(*) AS cnt FROM (
        SELECT COALESCE(m1.visitor_id, m1.visitor_email) AS conv_key,
            (SELECT sender FROM chat_messages m3 WHERE COALESCE(m3.visitor_id, m3.visitor_email) = COALESCE(m1.visitor_id, m1.visitor_email) ORDER BY id DESC LIMIT 1) AS last_sender,
            COALESCE(cm.archived, 0) AS archived, COALESCE(cm.deleted, 0) AS deleted
        FROM chat_messages m1
        LEFT JOIN chat_conversation_meta cm ON cm.visitor_key = COALESCE(m1.visitor_id, m1.visitor_email)
        GROUP BY conv_key
        HAVING archived = 0 AND deleted = 0 AND last_sender = 'visitor'
    ) t
";
$res = $conn->query($sql);
$row = $res->fetch_assoc();

echo json_encode(["success" => true, "unreadCount" => (int)$row['cnt']]);
?>
