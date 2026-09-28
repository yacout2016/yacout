<?php
header('Content-Type: application/json');
include 'db.php';

echo json_encode(["success" => true, "settings" => getScreenerSettings($conn)]);
?>
