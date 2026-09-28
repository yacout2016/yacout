<?php
header('Content-Type: application/json');
include 'db.php';

$result = $conn->query("SELECT last_seen FROM admin_presence WHERE id = 1");
$row = $result ? $result->fetch_assoc() : null;

$online = false;
if ($row && $row['last_seen']) {
    $online = (time() - strtotime($row['last_seen'])) < 180; // آخر 3 دقائق
}

echo json_encode(["success" => true, "online" => $online]);
?>
