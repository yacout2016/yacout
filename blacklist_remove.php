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
requirePermission($conn, 'manage_blacklist');

requireCsrf();

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$__r = trash_rows($conn, 'blacklist', 'id = ?', 'i', [$id]);
if ($__r) trash_put($conn, 'blacklist', 'القائمة السوداء: ' . ($__r[0]['value'] ?? '#' . $id), ['blacklist' => $__r]);
$stmt = $conn->prepare("DELETE FROM blacklist WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
echo json_encode(["success" => true]);
$stmt->close();
?>
