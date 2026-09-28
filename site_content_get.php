<?php
header('Content-Type: application/json');
include 'db.php';

$result = $conn->query("SELECT content_key, content_value FROM site_content");
$content = [];
while ($r = $result->fetch_assoc()) {
    $content[$r['content_key']] = $r['content_value'];
}
echo json_encode(["success" => true, "content" => $content]);
?>
