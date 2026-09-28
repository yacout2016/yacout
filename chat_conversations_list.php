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

$view = trim($_GET['view'] ?? 'active'); // active | archived | trash

$filter = $view === 'trash' ? "COALESCE(cm.deleted, 0) = 1"
    : ($view === 'archived' ? "COALESCE(cm.archived, 0) = 1 AND COALESCE(cm.deleted, 0) = 0"
    : "COALESCE(cm.archived, 0) = 0 AND COALESCE(cm.deleted, 0) = 0");
$sql = chat_conversations_sql($conn, $filter) . " ORDER BY t.last_at DESC";

// الإصدار 77: أي خطأ في قاعدة البيانات بيرجع رسالة واضحة (مش صفحة خطأ فاضية) ويتسجّل في اللوج
try {
    $result = $conn->query($sql);
    $rows = [];
    while ($r = $result->fetch_assoc()) {
        $rows[] = [
            "visitorId" => $r['visitor_id'] ?: $r['conv_key'],
            "email" => $r['visitor_email'],
            "lastAt" => $r['last_at'],
            "lastMessage" => $r['last_message'],
            "lastSender" => $r['last_sender'],
            // الإصدار 72: غير مقروءة = رسالة من العميل بعد آخر مرة الأدمن فتح المحادثة
            "unread" => (int)$r['unread'] === 1,
        ];
    }
    echo json_encode(["success" => true, "conversations" => $rows]);
} catch (Throwable $e) {
    error_log('GRIFFINE chat_conversations_list: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "تعذّر تحميل المحادثات من قاعدة البيانات - شغّل ملف ALL_SCHEMA_UPDATES.sql ولو المشكلة فضلت ابعت الرسالة دي للدعم الفني."]);
}
?>
