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
requirePermission($conn, 'manage_testimonials');   // الإصدار 85: صلاحية منفصلة عن المقالات
requireCsrf();

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$__r = trash_rows($conn, 'testimonials', 'id = ?', 'i', [$id]);
if ($__r) trash_put($conn, 'testimonial', 'رأي عميل: ' . mb_substr(($__r[0]['display_name'] ?? '') . ' - ' . ($__r[0]['comment_text'] ?? ''), 0, 60), ['testimonials' => $__r]);
$stmt = $conn->prepare("DELETE FROM testimonials WHERE id = ?");
$stmt->bind_param("i", $id);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
