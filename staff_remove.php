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
requirePermission($conn, 'manage_staff');
requireCsrf();

$staffId = intval($_POST['staffId'] ?? 0);
if ($staffId <= 0) {
    echo json_encode(["success" => false, "message" => "معرّف غير صحيح."]);
    exit();
}

$stmt = $conn->prepare("SELECT email FROM staff_members WHERE id = ?");
$stmt->bind_param("i", $staffId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "عضو الفريق غير موجود."]);
    exit();
}

$conn->begin_transaction();
try {
    $upd = $conn->prepare("UPDATE staff_members SET active = 0 WHERE id = ?");
    $upd->bind_param("i", $staffId);
    $upd->execute();
    $upd->close();

    // بيرجع حساب عادي تاني (مش أدمن) - حسابه الأصلي كعميل يفضل موجود من غير أي مساس
    $u = $conn->prepare("UPDATE users SET is_admin = 0 WHERE username = ?");
    $u->bind_param("s", $row['email']);
    $u->execute();
    $u->close();

    $conn->commit();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
