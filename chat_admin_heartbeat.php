<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false]);
    exit();
}
requirePermission($conn, 'view_chat');

$conn->query("INSERT INTO admin_presence (id, last_seen) VALUES (1, NOW()) ON DUPLICATE KEY UPDATE last_seen = NOW()");
echo json_encode(["success" => true]);
?>
