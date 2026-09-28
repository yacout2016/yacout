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
requirePermission($conn, 'manage_blacklist');

requireCsrf();

$type = trim($_POST['type'] ?? '');
$value = trim($_POST['value'] ?? '');
$reason = trim($_POST['reason'] ?? '');

if (!in_array($type, ['email', 'phone', 'name'], true) || empty($value)) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}
if ($type === 'email') $value = strtolower($value);

$stmt = $conn->prepare("INSERT INTO blacklist (type, value, reason) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $type, $value, $reason);
if ($stmt->execute()) {
    echo json_encode(["success" => true, "id" => $conn->insert_id]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
