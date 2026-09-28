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
requirePermission($conn, 'manage_subscribers');

requireCsrf();

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

// نجيب إيميل الحساب المرتبط بالسجل ده
$stmt = $conn->prepare("SELECT account_email FROM subscribers WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "السجل غير موجود."]);
    exit();
}
$accountEmail = $row['account_email'];

// أرشفة الحساب بالكامل (مش حذف نهائي) - كل تسجيلاته وكل صفحاته
$conn->begin_transaction();
try {
    $u = $conn->prepare("UPDATE users SET archived = 1, archived_at = NOW() WHERE username = ?");
    $u->bind_param("s", $accountEmail);
    $u->execute();
    $u->close();

    $s = $conn->prepare("UPDATE subscribers SET archived = 1 WHERE account_email = ?");
    $s->bind_param("s", $accountEmail);
    $s->execute();
    $s->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "تم نقل العميل للأرشيف."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
