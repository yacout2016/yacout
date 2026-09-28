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
requirePermission($conn, 'manage_plans');

requireCsrf();

$id = trim($_POST['id'] ?? '');
if (empty($id)) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$__r = trash_rows($conn, 'subscription_plans', 'id = ?', 's', [$id]);
if ($__r) trash_put($conn, 'subscription_plan', 'باقة اشتراك: ' . ($__r[0]['name'] ?? $id), ['subscription_plans' => $__r]);
$stmt = $conn->prepare("DELETE FROM subscription_plans WHERE id = ?");
$stmt->bind_param("s", $id);
$stmt->execute();
echo json_encode(["success" => true]);
$stmt->close();
?>
