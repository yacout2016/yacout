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
requirePermission($conn, 'manage_recommendations');
requireCsrf();

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("SELECT created_by FROM recommendations WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "التوصية غير موجودة."]);
    exit();
}

$currentEmail = $_SESSION['user_email'];
$isSuperAdmin = strtolower($currentEmail) === strtolower(ADMIN_EMAIL);
$isSender = strtolower($row['created_by']) === strtolower($currentEmail);

// مسموح بس لمرسل التوصية نفسه، أو السوبر أدمن الأصلي
if (!$isSuperAdmin && !$isSender) {
    echo json_encode(["success" => false, "message" => "مسموح فقط لمرسل التوصية أو مدير الموقع الأصلي بحذفها."]);
    exit();
}

$upd = $conn->prepare("UPDATE recommendations SET archived = 1, archived_at = NOW(), status = 'cancelled' WHERE id = ?");
$upd->bind_param("i", $id);
if ($upd->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$upd->close();
?>
