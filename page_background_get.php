<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

$key = $_GET['key'] ?? '';

if ($key !== '') {
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
        echo json_encode(["success" => false, "message" => "مفتاح غير صحيح."]);
        exit();
    }
    $stmt = $conn->prepare("SELECT image_data FROM page_backgrounds WHERE page_key = ?");
    $stmt->bind_param("s", $key);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    echo json_encode(["success" => true, "image" => upl_url($row['image_data'] ?? null)]);
    exit();
}

// بدون مفتاح = رجّع كل الخلفيات مرة واحدة (بيستخدمها كل زائر لتحميل خلفيات الشاشات، والأدمن في شاشة التعديل)
$images = [];
$res = $conn->query("SELECT page_key, image_data FROM page_backgrounds WHERE image_data IS NOT NULL AND image_data <> ''");
while ($r = $res->fetch_assoc()) $images[$r['page_key']] = upl_url($r['image_data']);

echo json_encode(["success" => true, "images" => $images]);
?>
