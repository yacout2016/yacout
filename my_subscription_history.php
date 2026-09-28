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

$email = $_SESSION['user_email'];
$stmt = $conn->prepare("SELECT event_type, plan_name, amount, event_date FROM subscription_events WHERE account_email = ? ORDER BY event_date DESC, id DESC LIMIT 100");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "eventType" => $r['event_type'],
        "planName" => $r['plan_name'],
        "amount" => (float)$r['amount'],
        "eventDate" => $r['event_date'],
    ];
}
$stmt->close();
echo json_encode(["success" => true, "events" => $rows]);
?>
