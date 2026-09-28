<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح."]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["success" => false]); exit(); }
requireCsrf();

$id = intval($_POST['id'] ?? 0);
$action = $_POST['action'] ?? '';

if (!$id || !in_array($action, ['markReviewed', 'delete'], true)) {
    echo json_encode(["success" => false, "message" => "طلب غير صحيح."]);
    exit();
}

if ($action === 'delete') {
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
