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
requirePermission($conn, 'manage_testimonials');   // الإصدار 85: صلاحية منفصلة عن المقالات
requireCsrf();

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("DELETE FROM testimonials WHERE id = ?");
$stmt->bind_param("i", $id);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
