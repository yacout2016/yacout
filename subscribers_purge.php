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

$accountEmail = trim($_POST['accountEmail'] ?? '');
if (empty($accountEmail)) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$conn->begin_transaction();
try {
    $s = $conn->prepare("DELETE FROM subscribers WHERE account_email = ?");
    $s->bind_param("s", $accountEmail);
    $s->execute();
    $s->close();

    $u = $conn->prepare("DELETE FROM users WHERE username = ?");
    $u->bind_param("s", $accountEmail);
    $u->execute();
    $u->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "تم حذف العميل نهائيًا."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
