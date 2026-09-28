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
$planId = trim($_POST['planId'] ?? '');
if ($id <= 0 || empty($planId)) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$planStmt = $conn->prepare("SELECT name, duration_days FROM subscription_plans WHERE id = ? LIMIT 1");
$planStmt->bind_param("s", $planId);
$planStmt->execute();
$planRow = $planStmt->get_result()->fetch_assoc();
$planStmt->close();

if (!$planRow) {
    echo json_encode(["success" => false, "message" => "الباقة غير موجودة."]);
    exit();
}
$planName = $planRow['name'];

$emailStmt = $conn->prepare("SELECT account_email FROM subscribers WHERE id = ? LIMIT 1");
$emailStmt->bind_param("i", $id);
$emailStmt->execute();
$subRow = $emailStmt->get_result()->fetch_assoc();
$emailStmt->close();
$accountEmail = $subRow['account_email'] ?? null;

$startDate = date('Y-m-d');
$endDate = date('Y-m-d', strtotime($startDate . ' +' . (int)$planRow['duration_days'] . ' days'));

// amount = 0 لأنها هدية من الإدارة (مفيش رسوم)، وis_comp=1 لتوضيح إنها ممنوحة مش مدفوعة
$stmt = $conn->prepare("UPDATE subscribers SET plan_id=?, plan_name=?, amount=0, start_date=?, end_date=?, is_comp=1, pending_plan_id=NULL, pending_plan_name=NULL, pending_amount=NULL WHERE id=?");
$stmt->bind_param("ssssi", $planId, $planName, $startDate, $endDate, $id);
if ($stmt->execute()) {
    if ($accountEmail) logSubscriptionEvent($conn, $accountEmail, 'gift', $planId, $planName, 0);
    if ($accountEmail) mail_subscription_gift($conn, $accountEmail, $planName, $endDate); // الإصدار 72
    echo json_encode(["success" => true, "endDate" => $endDate]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
