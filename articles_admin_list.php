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
requirePermission($conn, 'manage_content');

$result = $conn->query("SELECT id, title, slug, summary, body, published, created_by, created_at FROM articles ORDER BY created_at DESC");
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'], "title" => $r['title'], "slug" => $r['slug'],
        "summary" => $r['summary'], "body" => $r['body'], "published" => (bool)$r['published'],
        "createdBy" => $r['created_by'], "createdAt" => $r['created_at'],
    ];
}
echo json_encode(["success" => true, "articles" => $rows]);
?>
