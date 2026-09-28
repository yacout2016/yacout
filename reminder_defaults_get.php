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

$result = $conn->query("SELECT start_before_days, interval_days, grace_period_days FROM reminder_defaults WHERE id = 1");
$row = $result->fetch_assoc();
if ($row) {
    echo json_encode([
        "startBeforeDays" => (int)$row['start_before_days'],
        "intervalDays" => (int)$row['interval_days'],
        "gracePeriodDays" => (int)$row['grace_period_days'],
    ]);
} else {
    echo json_encode(["startBeforeDays" => 6, "intervalDays" => 2, "gracePeriodDays" => 3]);
}
?>
