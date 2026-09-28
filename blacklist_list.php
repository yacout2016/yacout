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
requirePermission($conn, 'manage_blacklist');

$result = $conn->query("SELECT * FROM blacklist ORDER BY id DESC");
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "type" => $r['type'],
        "value" => $r['value'],
        "reason" => $r['reason'],
        "createdAt" => $r['created_at'],
    ];
}
echo json_encode(["success" => true, "items" => $rows]);
?>
