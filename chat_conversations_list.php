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

$view = trim($_GET['view'] ?? 'active'); // active | archived | trash

$sql = "
    SELECT COALESCE(m1.visitor_id, m1.visitor_email) AS conv_key,
        MAX(m1.visitor_id) AS visitor_id, MAX(m1.visitor_email) AS visitor_email,
        MAX(m1.created_at) AS last_at,
        (SELECT message FROM chat_messages m2 WHERE COALESCE(m2.visitor_id, m2.visitor_email) = COALESCE(m1.visitor_id, m1.visitor_email) ORDER BY id DESC LIMIT 1) AS last_message,
        (SELECT sender FROM chat_messages m3 WHERE COALESCE(m3.visitor_id, m3.visitor_email) = COALESCE(m1.visitor_id, m1.visitor_email) ORDER BY id DESC LIMIT 1) AS last_sender,
        COALESCE(cm.archived, 0) AS archived,
        COALESCE(cm.deleted, 0) AS deleted
    FROM chat_messages m1
    LEFT JOIN chat_conversation_meta cm ON cm.visitor_key = COALESCE(m1.visitor_id, m1.visitor_email)
    GROUP BY conv_key
    HAVING " . (
        $view === 'trash' ? "deleted = 1" :
        ($view === 'archived' ? "archived = 1 AND deleted = 0" : "archived = 0 AND deleted = 0")
    ) . "
    ORDER BY last_at DESC
";

$result = $conn->query($sql);
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "visitorId" => $r['visitor_id'] ?: $r['conv_key'],
        "email" => $r['visitor_email'],
        "lastAt" => $r['last_at'],
        "lastMessage" => $r['last_message'],
        "lastSender" => $r['last_sender'],
    ];
}
echo json_encode(["success" => true, "conversations" => $rows]);
?>
