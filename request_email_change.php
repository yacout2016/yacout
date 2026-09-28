<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

requireCsrf();

$currentEmail = $_SESSION['user_email'];
$newEmail = trim($_POST['new_email'] ?? '');

if ($newEmail === '' || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "أدخل بريدًا إلكترونيًا صحيحًا."]);
    exit();
}
if (strtolower($newEmail) === strtolower($currentEmail)) {
    echo json_encode(["success" => false, "message" => "ده نفس بريدك الحالي."]);
    exit();
}

// نتأكد إن الإيميل الجديد مش مستخدم بالفعل لحساب تاني
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $newEmail);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    echo json_encode(["success" => false, "message" => "البريد الإلكتروني ده مستخدم بالفعل لحساب تاني."]);
    exit();
}
$stmt->close();

// لو عنده طلب معلّق بالفعل، منسمحش بطلب تاني لحد ما يتراجع
$stmt = $conn->prepare("SELECT id FROM email_change_requests WHERE current_email = ? AND status = 'pending'");
$stmt->bind_param("s", $currentEmail);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    echo json_encode(["success" => false, "message" => "عندك طلب تغيير إيميل قيد المراجعة بالفعل."]);
    exit();
}
$stmt->close();

$stmt = $conn->prepare("INSERT INTO email_change_requests (current_email, requested_email) VALUES (?, ?)");
$stmt->bind_param("ss", $currentEmail, $newEmail);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);
?>
