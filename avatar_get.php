<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];
$stmt = $conn->prepare("SELECT avatar_data FROM users WHERE username = ? LIMIT 1");
if (!$stmt) {
    echo json_encode(["success" => true, "avatar" => null]);
    exit();
}
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

echo json_encode(["success" => true, "avatar" => $row ? upl_url($row['avatar_data']) : null]);
?>
