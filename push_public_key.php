<?php
header('Content-Type: application/json');
include 'db.php';

$vapid = get_vapid_keys($conn);
echo json_encode(["success" => true, "publicKey" => $vapid['publicKey']]);
?>
