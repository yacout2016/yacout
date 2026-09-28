<?php
header('Content-Type: application/json');
include 'db.php';

echo json_encode([
    "success" => true,
    "version" => DISCLAIMER_VERSION,
    "text" => getDisclaimerText(),
]);
?>
