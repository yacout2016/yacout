<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_content');
requireCsrf();

$id = intval($_POST['id'] ?? 0);
$title = trim($_POST['title'] ?? '');
$body = trim($_POST['body'] ?? '');
$summary = trim($_POST['summary'] ?? '');
$published = ($_POST['published'] ?? '1') === '1' ? 1 : 0;

if (empty($title) || empty($body)) {
    echo json_encode(["success" => false, "message" => "العنوان والمحتوى مطلوبين."]);
    exit();
}
$title = mb_substr($title, 0, 200);
$summary = mb_substr($summary, 0, 300);

// توليد slug عربي/إنجليزي مبسط من العنوان + رقم الوقت لضمان التفرد
function slugify($text){
    $slug = trim(preg_replace('/[^\p{L}\p{N}]+/u', '-', $text), '-');
    $slug = mb_substr($slug, 0, 150);
    return $slug ?: 'article';
}

$createdBy = $_SESSION['user_email'];

if ($id > 0) {
    $stmt = $conn->prepare("UPDATE articles SET title=?, body=?, summary=?, published=? WHERE id=?");
    $stmt->bind_param("sssii", $title, $body, $summary, $published, $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $id]);
    } else {
        echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
    }
    $stmt->close();
} else {
    $baseSlug = slugify($title);
    $slug = $baseSlug . '-' . substr(time(), -5);
    $stmt = $conn->prepare("INSERT INTO articles (title, slug, body, summary, published, created_by) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param("ssssis", $title, $slug, $body, $summary, $published, $createdBy);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "id" => $conn->insert_id, "slug" => $slug]);
    } else {
        echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
    }
    $stmt->close();
}
?>
