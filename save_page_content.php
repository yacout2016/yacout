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
requirePermission($conn, 'manage_site_content');

requireCsrf();

$key = $_POST['key'] ?? '';
$content = $_POST['content'] ?? '';
$allowed = ['about', 'refund_policy', 'contact', 'suggestions', 'privacy'];
// مفاتيح عناوين الشاشات (title__اسم_الشاشة) بتتوافق تلقائيًا مع أي شاشة، مش لازم تتضاف يدويًا هنا
$isTitleKey = static function($k){ return $k !== '' && preg_match('/^title__[a-zA-Z0-9_]+$/', $k) === 1; };

if (!in_array($key, $allowed, true) && !$isTitleKey($key)) {
    echo json_encode(["success" => false, "message" => "صفحة غير معروفة."]);
    exit();
}

$by = $_SESSION['user_email'];
$stmt = $conn->prepare("INSERT INTO page_contents (page_key, content, updated_by) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE content = VALUES(content), updated_by = VALUES(updated_by)");
$stmt->bind_param("sss", $key, $content, $by);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);
?>
