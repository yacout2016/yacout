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

$email = $_SESSION['user_email'];
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$nationalId = trim($_POST['national_id'] ?? '');
$address = trim($_POST['address'] ?? '');

if ($name === '' || $phone === '') {
    echo json_encode(["success" => false, "message" => "الاسم ورقم الهاتف مطلوبين."]);
    exit();
}

$nationalIdVal = $nationalId !== '' ? $nationalId : null;
$addressVal = $address !== '' ? $address : null;

// بنعدّل أحدث سجل اشتراك للحساب ده (لو موجود)
$stmt = $conn->prepare("SELECT id FROM subscribers WHERE account_email = ? ORDER BY id DESC LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "لا يوجد اشتراك مسجّل بعد لتحديث بياناته."]);
    exit();
}

$upd = $conn->prepare("UPDATE subscribers SET name = ?, phone = ?, national_id = ?, address = ? WHERE id = ?");
$upd->bind_param("ssssi", $name, $phone, $nationalIdVal, $addressVal, $row['id']);
$upd->execute();
$upd->close();

echo json_encode(["success" => true]);
?>
