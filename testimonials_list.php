<?php
header('Content-Type: application/json');
include 'db.php';

$result = $conn->query("SELECT id, display_name, rating, comment_text, created_at FROM testimonials ORDER BY created_at DESC LIMIT 100");
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "displayName" => $r['display_name'],
        "rating" => (int)$r['rating'],
        "comment" => $r['comment_text'],
        "createdAt" => $r['created_at'],
    ];
}
echo json_encode(["success" => true, "testimonials" => $rows]);
?>
