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

$hours = intval($_POST['retentionHours'] ?? 0);
if ($hours < 1 || $hours > 720) {
    echo json_encode(["success" => false, "message" => "المدة لازم تكون بين ساعة و720 ساعة (30 يوم)."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO recommendation_settings (setting_key, setting_value) VALUES ('retention_hours', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
$stmt->bind_param("s", $hours);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
