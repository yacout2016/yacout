<?php
/* =====================================================================
   GRIFFINE — chat_mark_read.php (الإصدار 72)
   تعليم محادثة كمقروءة (visitorId) أو كل المحادثات (all=1)
   بيتنادى تلقائيًا لما الأدمن يفتح محادثة، ومن زرار "تعليم الكل كمقروء"
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
requirePermission($conn, 'view_chat');
requireCsrf();

$all = !empty($_POST['all']);
$visitorId = trim($_POST['visitorId'] ?? '');
if (!$all && $visitorId === '') {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

$ok = chat_mark_read($conn, $all ? null : $visitorId);
echo json_encode(["success" => true, "tracked" => $ok]);
?>
