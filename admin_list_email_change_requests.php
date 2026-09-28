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

$res = $conn->query("SELECT * FROM email_change_requests ORDER BY requested_at DESC");
$items = [];
while ($r = $res->fetch_assoc()) {
    $items[] = [
        "id" => (int)$r['id'],
        "currentEmail" => $r['current_email'],
        "requestedEmail" => $r['requested_email'],
        "status" => $r['status'],
        "requestedAt" => $r['requested_at'],
        "reviewedAt" => $r['reviewed_at'],
        "reviewedBy" => $r['reviewed_by'],
    ];
}

echo json_encode(["success" => true, "items" => $items]);
?>
