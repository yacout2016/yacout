<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

$key = $_GET['key'] ?? '';
$allowed = ['about', 'refund_policy', 'contact', 'suggestions', 'privacy'];
// مفاتيح عناوين الشاشات (title__اسم_الشاشة) بتتوافق تلقائيًا مع أي شاشة، مش لازم تتضاف يدويًا هنا
$isTitleKey = static function($k){ return $k !== '' && preg_match('/^title__[a-zA-Z0-9_]+$/', $k) === 1; };

if ($key !== '' && !in_array($key, $allowed, true) && !$isTitleKey($key)) {
    echo json_encode(["success" => false, "message" => "صفحة غير معروفة."]);
    exit();
}

if ($key !== '') {
    $stmt = $conn->prepare("SELECT content FROM page_contents WHERE page_key = ?");
    $stmt->bind_param("s", $key);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    echo json_encode(["success" => true, "content" => $row['content'] ?? null]);
    exit();
}

// بدون مفتاح = رجّع كل الصفحات مرة واحدة (بيستخدمها الأدمن في شاشة التعديل)
$contents = [];
$res = $conn->query("SELECT page_key, content FROM page_contents");
while ($r = $res->fetch_assoc()) $contents[$r['page_key']] = $r['content'];

echo json_encode(["success" => true, "contents" => $contents]);
?>
