<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/chat_read_state.php';
require_once __DIR__ . '/uploads.php';

$visitorId = trim($_GET['visitorId'] ?? '');
if (empty($visitorId)) {
    echo json_encode(["success" => false, "message" => "معرّف زائر مفقود."]);
    exit();
}

$isAdmin = isset($_SESSION['user_email']) && !empty($_SESSION['is_admin']);
// الزائر يقدر يقرأ محادثته هو بس (بالمعرّف العشوائي بتاعه) - مش محادثة أي إيميل
if (!$isAdmin && !preg_match('/^[a-zA-Z0-9_-]{20,64}$/', $visitorId)) {
    echo json_encode(["success" => false, "message" => "معرّف زائر غير صالح."]);
    exit();
}

$stmt = $conn->prepare("SELECT * FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) = ? ORDER BY id ASC");
$stmt->bind_param("s", $visitorId);
$stmt->execute();
$result = $stmt->get_result();

$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "sender" => $r['sender'],
        "message" => $r['message'],
        "attachment" => upl_url($r['attachment']),
        "attachmentName" => $r['attachment_name'],
        "createdAt" => $r['created_at'],
    ];
}
$stmt->close();
// الإصدار 82: حالة المحادثة (رفع الملفات مسموح؟ + آخر مرة الإدارة قرت - عشان "✓✓ اتشافت")
$state = chat_conversation_state($conn, $visitorId);
echo json_encode(["success" => true, "messages" => $rows, "allowUpload" => $state['allowUpload'], "adminReadAt" => $state['adminReadAt']]);
?>
