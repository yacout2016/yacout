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
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("UPDATE subscribers SET active = NOT active WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$stmt->close();

$check = $conn->prepare("SELECT account_email, name, phone, active, plan_name, end_date FROM subscribers WHERE id = ? LIMIT 1");
$check->bind_param("i", $id);
$check->execute();
$row = $check->get_result()->fetch_assoc();
$check->close();
if ($row && (int)$row['active'] === 1) {
    maybeRewardReferral($conn, $row['account_email']);
}
// الإصدار 72: إيميل للعميل بالتفعيل أو الإيقاف
if ($row) mail_subscription_toggled($conn, $row['account_email'], $row['name'], $row['plan_name'], (int)$row['active'] === 1, $row['end_date']);

echo json_encode(["success" => true]);
?>
