<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}
requireCsrf();

$ownerKey = trim($_POST['ownerKey'] ?? '');
$endpoint = trim($_POST['endpoint'] ?? '');
$p256dh = trim($_POST['p256dh'] ?? '');
$auth = trim($_POST['auth'] ?? '');

// المدير بيسجل تحت مفتاح ثابت 'admin' بدل visitor_id عشوائي
if (isset($_SESSION['user_email']) && !empty($_SESSION['is_admin'])) {
    $ownerKey = 'admin';
}

if (empty($ownerKey) || empty($endpoint) || empty($p256dh) || empty($auth)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

$endpointHash = hash('sha256', $endpoint);

$accountEmail = $_SESSION['user_email'] ?? null;
$hasEmailCol = ($c = @$conn->query("SHOW COLUMNS FROM push_subscriptions LIKE 'account_email'")) && $c->num_rows > 0;
if ($hasEmailCol) {
    $stmt = $conn->prepare("INSERT INTO push_subscriptions (owner_key, endpoint, endpoint_hash, p256dh, auth, account_email) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), account_email = COALESCE(VALUES(account_email), account_email)");
    $stmt->bind_param("ssssss", $ownerKey, $endpoint, $endpointHash, $p256dh, $auth, $accountEmail);
} else {
    $stmt = $conn->prepare("INSERT INTO push_subscriptions (owner_key, endpoint, endpoint_hash, p256dh, auth) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)");
    $stmt->bind_param("sssss", $ownerKey, $endpoint, $endpointHash, $p256dh, $auth);
}

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ."]);
}
$stmt->close();
?>
