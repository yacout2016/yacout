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
$days = intval($_POST['days'] ?? 0);
if ($id <= 0 || $days === 0) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$stmt = $conn->prepare("SELECT end_date FROM subscribers WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "المشترك غير موجود."]);
    exit();
}

// نمدد من تاريخ الانتهاء الحالي (أو من النهاردة لو كان منتهي بالفعل)
$base = max($row['end_date'], date('Y-m-d'));
$newEnd = date('Y-m-d', strtotime($base . ($days >= 0 ? " +$days days" : " $days days")));

$upd = $conn->prepare("UPDATE subscribers SET end_date = ?, is_comp = 1 WHERE id = ?");
$upd->bind_param("si", $newEnd, $id);
$upd->execute();
echo json_encode(["success" => true, "newEndDate" => $newEnd]);
$upd->close();
?>
