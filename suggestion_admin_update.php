<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 89: سلة المحذوفات

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح."]);
    exit();
}
requirePermission($conn, 'manage_suggestions');   // الإصدار 84: صلاحية محددة (مش أي موظف)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["success" => false]); exit(); }
requireCsrf();

$id = intval($_POST['id'] ?? 0);
$action = $_POST['action'] ?? '';

if (!$id || !in_array($action, ['markReviewed', 'delete'], true)) {
    echo json_encode(["success" => false, "message" => "طلب غير صحيح."]);
    exit();
}

if ($action === 'delete') {
    $__r = trash_rows($conn, 'suggestions', 'id = ?', 'i', [$id]);
    if ($__r) trash_put($conn, 'suggestion', 'مقترح: ' . mb_substr((string)($__r[0]['message'] ?? $__r[0]['text'] ?? ('#' . $id)), 0, 60), ['suggestions' => $__r]);
    $stmt = $conn->prepare("DELETE FROM suggestions WHERE id = ?");
} else {
    $stmt = $conn->prepare("UPDATE suggestions SET status = 'reviewed' WHERE id = ?");
}
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "حصل خطأ."]);
    exit();
}
$stmt->bind_param("i", $id);
$ok = $stmt->execute();
$stmt->close();

echo json_encode(["success" => (bool)$ok]);
?>
