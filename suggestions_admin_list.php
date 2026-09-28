<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح."]);
    exit();
}

$result = $conn->query("SELECT id, account_email, message, attachment_data, attachment_name, attachment_type, status, created_at FROM suggestions ORDER BY id DESC");
if (!$result) {
    echo json_encode(["success" => true, "suggestions" => []]);
    exit();
}

$suggestions = [];
while ($row = $result->fetch_assoc()) {
    $suggestions[] = [
        "id" => (int)$row['id'],
        "email" => $row['account_email'],
        "message" => $row['message'],
        "attachment" => upl_url($row['attachment_data']),
        "attachmentName" => $row['attachment_name'],
        "attachmentType" => $row['attachment_type'],
        "status" => $row['status'],
        "createdAt" => $row['created_at'],
    ];
}

echo json_encode(["success" => true, "suggestions" => $suggestions]);
?>
