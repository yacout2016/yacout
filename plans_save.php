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
requirePermission($conn, 'manage_plans');

requireCsrf();

$id = trim($_POST['id'] ?? '');
$name = trim($_POST['name'] ?? '');
$amount = floatval($_POST['amount'] ?? 0);
$periodLabel = trim($_POST['periodLabel'] ?? '');
$durationDays = intval($_POST['durationDays'] ?? 30);
$badge = trim($_POST['badge'] ?? '');
$saveNote = trim($_POST['saveNote'] ?? '');
$featuresRaw = trim($_POST['features'] ?? ''); // نص، سطر لكل ميزة
$sortOrder = intval($_POST['sortOrder'] ?? 0);
// الإصدار 96: كل باقة لسوق (عملتها عملة السوق)
require_once __DIR__ . '/markets_core.php';
$planMarket = trim((string)($_POST['market'] ?? 'مصر')); if (!mc_valid($planMarket)) $planMarket = 'مصر';

if (empty($id) || empty($name) || empty($periodLabel) || $durationDays <= 0) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة أو غير صحيحة."]);
    exit();
}
// معرّف الباقة يُستخدم كمفتاح تقني - نقصره على حروف/أرقام/شرطة سفلية بس
if (!preg_match('/^[a-zA-Z0-9_]+$/', $id)) {
    echo json_encode(["success" => false, "message" => "يجب أن يتكون معرّف الباقة من حروف إنجليزية وأرقام فقط (بدون مسافات)."]);
    exit();
}

$featuresArr = array_values(array_filter(array_map('trim', explode("\n", $featuresRaw))));
$featuresJson = json_encode($featuresArr, JSON_UNESCAPED_UNICODE);

$badgeVal = $badge !== '' ? $badge : null;
$saveNoteVal = $saveNote !== '' ? $saveNote : null;

$stmt = $conn->prepare("INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE name=VALUES(name), amount=VALUES(amount), period_label=VALUES(period_label),
    duration_days=VALUES(duration_days), badge=VALUES(badge), save_note=VALUES(save_note), features=VALUES(features), sort_order=VALUES(sort_order)");
$stmt->bind_param("ssdsisssi", $id, $name, $amount, $periodLabel, $durationDays, $badgeVal, $saveNoteVal, $featuresJson, $sortOrder);

if ($stmt->execute()) {
    try { $m = $conn->prepare("UPDATE subscription_plans SET market = ? WHERE id = ?"); $m->bind_param("ss", $planMarket, $id); $m->execute(); $m->close(); } catch (Throwable $e) {}
    // الإصدار 127: باقة شاملة خدمات الذكاء الاصطناعي (برو)
    if (isset($_POST['includesAi'])) { try { $ai = $_POST['includesAi'] === '1' ? 1 : 0; $m = $conn->prepare("UPDATE subscription_plans SET includes_ai = ? WHERE id = ?"); $m->bind_param("is", $ai, $id); $m->execute(); $m->close(); } catch (Throwable $e) {} }
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
