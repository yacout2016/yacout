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
requirePermission($conn, 'manage_reminders');

requireCsrf();

$start = intval($_POST['startBeforeDays'] ?? 6);
$interval = intval($_POST['intervalDays'] ?? 2);
$grace = intval($_POST['gracePeriodDays'] ?? 3);
if ($start <= 0 || $interval <= 0 || $grace < 0) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}

$stmt = $conn->prepare("UPDATE reminder_defaults SET start_before_days = ?, interval_days = ?, grace_period_days = ? WHERE id = 1");
$stmt->bind_param("iii", $start, $interval, $grace);
$stmt->execute();
echo json_encode(["success" => true]);
$stmt->close();
?>
