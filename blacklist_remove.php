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

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("DELETE FROM blacklist WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
echo json_encode(["success" => true]);
$stmt->close();
?>
