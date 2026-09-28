<?php
header('Content-Type: application/json');
include 'db.php';

$slug = trim($_GET['slug'] ?? '');
if (empty($slug)) {
    echo json_encode(["success" => false, "message" => "مقال غير محدد."]);
    exit();
}

$stmt = $conn->prepare("SELECT title, slug, body, summary, created_at FROM articles WHERE slug = ? AND published = 1 LIMIT 1");
$stmt->bind_param("s", $slug);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "المقال غير موجود."]);
    exit();
}
echo json_encode(["success" => true, "article" => [
    "title" => $row['title'], "slug" => $row['slug'], "body" => $row['body'],
    "summary" => $row['summary'], "createdAt" => $row['created_at'],
]]);
?>
