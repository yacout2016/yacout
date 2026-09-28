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
    $u = $conn->prepare("UPDATE users SET archived = 0, archived_at = NULL WHERE username = ?");
    $u->bind_param("s", $accountEmail);
    $u->execute();
    $u->close();

    $s = $conn->prepare("UPDATE subscribers SET archived = 0 WHERE account_email = ?");
    $s->bind_param("s", $accountEmail);
    $s->execute();
    $s->close();

    $conn->commit();
    echo json_encode(["success" => true, "message" => "تم استرجاع العميل من الأرشيف."]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
