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
requirePermission($conn, 'manage_admin_settings');
requireCsrf();

$allowedKeys = ['rsi_period', 'rsi_oversold', 'rsi_overbought', 'ma_period', 'macd_fast', 'macd_slow', 'macd_signal', 'weight_rsi', 'weight_macd', 'weight_ma'];
$key = trim($_POST['key'] ?? '');
$value = trim($_POST['value'] ?? '');

if (!in_array($key, $allowedKeys, true)) {
    echo json_encode(["success" => false, "message" => "مفتاح غير معروف."]);
    exit();
}
if (!is_numeric($value) || (float)$value < 0 || (float)$value > 100) {
    echo json_encode(["success" => false, "message" => "يجب أن تكون القيمة رقمًا بين 0 و100."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO screener_settings (setting_key, setting_value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
$stmt->bind_param("ss", $key, $value);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
