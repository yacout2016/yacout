<?php
header('Content-Type: application/json');
include 'db.php';

$result = $conn->query("SELECT id, title, slug, summary, created_at FROM articles WHERE published = 1 ORDER BY created_at DESC LIMIT 100");
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "title" => $r['title'],
        "slug" => $r['slug'],
        "summary" => $r['summary'],
        "createdAt" => $r['created_at'],
    ];
}
echo json_encode(["success" => true, "articles" => $rows]);
?>
