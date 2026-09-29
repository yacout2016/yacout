<?php
/* =====================================================================
   GRIFFINE — notify_prefs_api.php (الإصدار 101) — قنوات الإشعارات (الموقع / الإيميل / الواتساب)
   ---------------------------------------------------------------------
   GET  action=mine                     ← قنوات المستخدم نفسه (لو الأدمن مظهرها له)
   POST action=save_mine                ← المستخدم بيغيّر قنواته (لو ظاهرة له)
   GET  action=admin_all                ← الأدمن: كل الإعدادات + المفاتيح العامة
   POST action=admin_set email field value ← الأدمن: قناة لمشترك/موظف (app / email / wa / wa_phone / user_visible)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/notify_lib.php';
function np_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$email = $_SESSION['user_email'] ?? '';
if (!$email) { http_response_code(401); np_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$waVis = np_wa_visible($conn);

if ($action === 'mine') {
    if (!np_user_can_see($conn, $email)) np_out(["success" => true, "visible" => false]);
    $p = np_get($conn, $email);
    np_out(["success" => true, "visible" => true, "app" => $p['app'], "email" => $p['email'], "wa" => $waVis ? $p['wa'] : null, "waAvailable" => $waVis, "phone" => $waVis ? np_phone($conn, $email, $p) : '']);
}
if ($action === 'save_mine' && $isPost) {
    if (!np_user_can_see($conn, $email)) np_out(["success" => false, "message" => "غير متاح."]);
    foreach (['app', 'email'] as $f) if (isset($_POST[$f])) np_set($conn, $email, $f, $_POST[$f] === '1');
    if ($waVis) { if (isset($_POST['wa'])) np_set($conn, $email, 'wa', $_POST['wa'] === '1'); if (isset($_POST['phone'])) np_set($conn, $email, 'wa_phone', mb_substr((string)$_POST['phone'], 0, 20)); }
    $p = np_get($conn, $email);
    if (!$p['app'] && !$p['email'] && !$p['wa']) { np_set($conn, $email, 'app', true); np_out(["success" => true, "message" => "لازم قناة واحدة على الأقل — فعّلنا إشعارات الموقع."]); }
    np_out(["success" => true]);
}

// ---- الأدمن ----
if (empty($_SESSION['is_admin'])) { http_response_code(403); np_out(["success" => false, "message" => "غير مصرح."]); }
$perms = function_exists('getCurrentUserPermissions') ? getCurrentUserPermissions($conn) : [];
$canEdit = strtolower($email) === strtolower(ADMIN_EMAIL) || in_array('manage_subscribers', (array)$perms, true) || in_array('manage_staff', (array)$perms, true);
if ($action === 'admin_all') {
    $map = [];
    if (np_ready($conn)) { $res = $conn->query("SELECT account_email, app, email, wa, wa_phone, user_visible FROM notify_prefs");
        while ($r = $res->fetch_assoc()) $map[strtolower($r['account_email'])] = ['app' => (int)$r['app'] === 1, 'email' => (int)$r['email'] === 1, 'wa' => (int)$r['wa'] === 1, 'phone' => (string)$r['wa_phone'], 'visible' => $r['user_visible'] === null ? null : (int)$r['user_visible'] === 1]; }
    np_out(["success" => true, "prefs" => $map, "waVisible" => $waVis, "waReady" => np_wa_on($conn) && site_config_get($conn, 'wa_notify_template') !== '', "visibleAll" => site_config_on($conn, 'notify_prefs_visible'), "canEdit" => $canEdit]);
}
if ($action === 'admin_set' && $isPost) {
    if (!$canEdit) np_out(["success" => false, "message" => "غير مصرح."]);
    $target = strtolower(trim((string)($_POST['email'] ?? '')));
    $field = (string)($_POST['field'] ?? '');
    if (!filter_var($target, FILTER_VALIDATE_EMAIL) || !in_array($field, ['app', 'email', 'wa', 'wa_phone', 'user_visible'], true)) np_out(["success" => false, "message" => "بيانات غير صحيحة."]);
    if (!np_ready($conn)) np_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 101) أولًا."]);
    $v = $_POST['value'] ?? '';
    np_set($conn, $target, $field, $field === 'wa_phone' ? mb_substr((string)$v, 0, 20) : ($field === 'user_visible' && $v === '' ? null : $v === '1'));
    np_out(["success" => true, "prefs" => np_get($conn, $target)]);
}
np_out(["success" => false, "message" => "طلب غير معروف."]);
?>
