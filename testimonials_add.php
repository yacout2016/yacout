<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول لتتمكن من إضافة رأيك."]);
    exit();
}
requireCsrf();

$email = $_SESSION['user_email'];
$displayName = trim($_POST['displayName'] ?? '');
$rating = intval($_POST['rating'] ?? 5);
$comment = trim($_POST['comment'] ?? '');

if (empty($displayName) || empty($comment)) {
    echo json_encode(["success" => false, "message" => "الاسم والتعليق مطلوبين."]);
    exit();
}
if ($rating < 1 || $rating > 5) $rating = 5;
$displayName = mb_substr($displayName, 0, 100);
$comment = mb_substr($comment, 0, 500);

if (isBlacklisted($conn, 'email', $email)) {
    echo json_encode(["success" => false, "message" => "تعذّر إضافة الرأي حاليًا."]);
    exit();
}

$stmt = $conn->prepare("INSERT INTO testimonials (customer_email, display_name, rating, comment_text) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssis", $email, $displayName, $rating, $comment);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
