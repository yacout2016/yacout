<?php
/* GRIFFINE — periods_api.php (الإصدار 144) — التحكم في قوائم المدد (يوم / أسبوع / شهر …) في كل شاشات الموقع
   GET  ?action=get   ← (عام - حتى صفحة الموقع قبل الدخول) لكل قائمة: الاختيارات المخفية + الافتراضي
   POST action=save   ← (manage_admin_settings) id + h (JSON: الاختيارات المخفية) + d (الافتراضي)
   POST action=reset  ← رجوع القائمة لأصلها
   التخزين: site_config ← periods_cfg = { "<id>": { "h": [..], "d": ".." } } */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
function per_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
function per_cfg($conn){
    $v = null;
    try { $r = $conn->query("SELECT config_value FROM site_config WHERE config_key = 'periods_cfg'"); if ($r && ($row = $r->fetch_row())) $v = json_decode((string)$row[0], true); } catch (Throwable $e) {}
    return is_array($v) ? $v : [];
}
function per_save($conn, $cfg, $by){
    $v = json_encode((object)$cfg, JSON_UNESCAPED_UNICODE);
    $st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES ('periods_cfg', ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
    $st->bind_param("ss", $v, $by); $st->execute(); $st->close();
}
$action = $_GET['action'] ?? $_POST['action'] ?? 'get';
if ($action === 'get') { session_write_close(); per_out(["success" => true, "cfg" => (object)per_cfg($conn)]); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') per_out(["success" => false, "message" => "طلب غير معروف."]);
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); per_out(["success" => false, "message" => "غير مصرح لك."]); }
requirePermission($conn, 'manage_admin_settings');
requireCsrf();
$id = (string)($_POST['id'] ?? '');
if (!preg_match('/^[a-z][a-z0-9_]{1,29}$/', $id)) per_out(["success" => false, "message" => "قائمة غير معروفة."]);
$cfg = per_cfg($conn);
if ($action === 'reset') { unset($cfg[$id]); per_save($conn, $cfg, $_SESSION['user_email']); per_out(["success" => true, "cfg" => (object)$cfg, "message" => "رجعت القائمة لأصلها."]); }
if ($action !== 'save') per_out(["success" => false, "message" => "طلب غير معروف."]);
$h = json_decode((string)($_POST['h'] ?? '[]'), true); if (!is_array($h)) $h = [];
$h = array_values(array_unique(array_filter(array_map('strval', $h), fn($k) => preg_match('/^[A-Za-z0-9_]{1,12}$/', $k))));
if (count($h) > 30) per_out(["success" => false, "message" => "بيانات غير صحيحة."]);
$d = (string)($_POST['d'] ?? '');
if ($d !== '' && (!preg_match('/^[A-Za-z0-9_]{1,12}$/', $d) || in_array($d, $h, true))) per_out(["success" => false, "message" => "الافتراضي لازم يكون من الاختيارات الظاهرة."]);
$cfg[$id] = ['h' => $h, 'd' => $d];
per_save($conn, $cfg, $_SESSION['user_email']);
per_out(["success" => true, "cfg" => (object)$cfg, "message" => "✅ اتحفظت — التغيير ظاهر لكل المستخدمين."]);
?>
