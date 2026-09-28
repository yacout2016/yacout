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

$visitorKey = trim($_POST['visitorId'] ?? '');
if (empty($visitorKey)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO chat_conversation_meta (visitor_key, deleted) VALUES (?, 1)
    ON DUPLICATE KEY UPDATE deleted = 1");
$stmt->bind_param("s", $visitorKey);
$stmt->execute();
$stmt->close();
echo json_encode(["success" => true]);
?>
