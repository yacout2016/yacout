<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/plans_store.php';
require_once __DIR__ . '/trades_lib.php';
require_once __DIR__ . '/trash_lib.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

requireCsrf();

$email = $_SESSION['user_email'];
$allowedKeys = ['plans', 'grid_plans'];
$key = trim($_POST['key'] ?? '');
$value = $_POST['value'] ?? '';

if (!in_array($key, $allowedKeys, true)) {
    echo json_encode(["success" => false, "message" => "مفتاح غير صحيح."]);
    exit();
}
// لازم تكون خريطة JSON (سهم ← بيانات خطته)
$map = json_decode($value);
if (json_last_error() !== JSON_ERROR_NONE || !is_object($map)) {
    echo json_encode(["success" => false, "message" => "البيانات المرسلة ليست JSON صحيحًا."]);
    exit();
}
// الأسهم اللي الجهاز كان شايفها وقت آخر قراءة - بتفرّق بين "مسحته" و"متضاف من جهاز تاني"
$base = null;
if (isset($_POST['base']) && $_POST['base'] !== '') {
    $base = json_decode($_POST['base']);
    if (!is_object($base)) $base = null;
}

// الإصدار 135: خطة الداك / الجريد ميزة في الباقة — من غيرها: يتابع خططه الحالية بس ومايضيفش سهم جديد
require_once __DIR__ . '/perks_lib.php';
$pk = $key === 'grid_plans' ? 'grid' : 'dca';
if (empty($_SESSION['is_admin']) && perk_has_col($conn) && !perk_has($conn, $email, $pk)) {
    $cur = plans_get($conn, $email, $key); $have = $cur['value'] ? array_keys((array)json_decode($cur['value'])) : [];
    $new = array_diff(array_map('strval', array_keys((array)$map)), array_map('strval', $have));
    if ($new) { echo json_encode(perk_denied($conn, $email, $pk), JSON_UNESCAPED_UNICODE); exit(); }
}
try {
    $r = plans_save($conn, $email, $key, $map, $base);
    try { trades_rebuild($conn, $email, $key); } catch (Throwable $e) {}   // جدول الصفقات لتقارير الإدارة (الإصدار 89)
    echo json_encode(["success" => true, "versions" => $r['versions'], "deleted" => $r['deleted'], "mode" => $r['mode']], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "خطأ في قاعدة البيانات."]);
}
?>
