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
requirePermission($conn, 'manage_subscribers');

requireCsrf();

$id = intval($_POST['id'] ?? 0);
$enabled = intval($_POST['enabled'] ?? 1);
$interval = intval($_POST['intervalDays'] ?? 2);
if ($id <= 0 || $interval <= 0) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$stmt = $conn->prepare("UPDATE subscribers SET reminder_enabled = ?, reminder_interval_days = ? WHERE id = ?");
$stmt->bind_param("iii", $enabled, $interval, $id);
$stmt->execute();
echo json_encode(["success" => true]);
$stmt->close();
?>
