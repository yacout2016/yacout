<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 89: سلة المحذوفات

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

$conn->begin_transaction();
try {
    $__m = trash_rows($conn, 'chat_messages', 'COALESCE(visitor_id, visitor_email) = ?', 's', [$visitorKey]);
    $__em = ''; foreach ($__m as $__x) if (!empty($__x['visitor_email'])) { $__em = $__x['visitor_email']; break; }
    trash_put($conn, 'chat', 'محادثة شات' . ($__em ? ': ' . $__em : '') . ' (' . count($__m) . ' رسالة)', ['chat_messages' => $__m, 'chat_conversation_meta' => trash_rows($conn, 'chat_conversation_meta', 'visitor_key = ?', 's', [$visitorKey])]);
    $stmt = $conn->prepare("DELETE FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) = ?");
    $stmt->bind_param("s", $visitorKey);
    $stmt->execute();
    $stmt->close();

    $stmt2 = $conn->prepare("DELETE FROM chat_conversation_meta WHERE visitor_key = ?");
    $stmt2->bind_param("s", $visitorKey);
    $stmt2->execute();
    $stmt2->close();

    $conn->commit();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
