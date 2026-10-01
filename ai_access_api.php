<?php
/* =====================================================================
   GRIFFINE — ai_access_api.php (الإصدار 127) — التحكم في الذكاء الاصطناعي (الأدمن بس)
   ---------------------------------------------------------------------
   GET  action=cfg                      ← حالة المدفوع (مفعّل / مقفول) + حساب Claude + المفتاح متسجّل ولا لأ (المفتاح نفسه مبيرجعش للمتصفح)
   POST action=cfg_save paid_on account key ← تفعيل / إيقاف المدفوع + اسم الحساب + المفتاح (key=__clear__ يمسحه)
   POST action=test                     ← اختبار المفتاح بطلب صغير جدًا
   GET  action=admin_all                ← صلاحيات كل المشتركين (الشاشات التلاتة + المدفوع + الحد اليومي + استخدام النهارده)
   POST action=admin_set email field value ← basira / mizan / mizanai (1/0) ، paid ('' حسب الباقة / 1 / 0) ، daily_limit ('' مفتوح / رقم)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/basira_lib.php';
function ai_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$email = $_SESSION['user_email'] ?? '';
if (!$email) { http_response_code(401); ai_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
if (empty($_SESSION['is_admin'])) { http_response_code(403); ai_out(["success" => false, "message" => "غير مصرح."]); }
$perms = function_exists('getCurrentUserPermissions') ? (array)getCurrentUserPermissions($conn) : [];
$isOwner = strtolower($email) === strtolower(ADMIN_EMAIL);
$canCfg = $isOwner || in_array('manage_admin_settings', $perms, true);
$canUsers = $isOwner || in_array('manage_subscribers', $perms, true);
session_write_close();
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();

$state = function() use ($conn) {
    $cfg = bs_cfg($conn); $keySet = site_config_get($conn, 'basira_ai_key') !== '';
    return ["paidOn" => ai_paid_on($conn), "account" => ai_account($conn), "keySet" => $keySet, "model" => $cfg['model'], "models" => BS_MODELS,
        "active" => ai_paid_on($conn) && $keySet, "ready" => ai_ready($conn), "siteToday" => bs_ai_counter(), "siteMax" => $cfg['ai_daily_max']];
};

if ($action === 'cfg') { if (!$canCfg) ai_out(["success" => false, "message" => "غير مصرح."]); ai_out(["success" => true] + $state()); }

if ($action === 'cfg_save' && $isPost) {
    if (!$canCfg) ai_out(["success" => false, "message" => "غير مصرح."]);
    if (isset($_POST['paid_on'])) site_config_set($conn, 'ai_paid_on', $_POST['paid_on'] === '1' ? '1' : '', $email);
    if (isset($_POST['account'])) { $a = trim((string)$_POST['account']); if ($a !== '' && !filter_var($a, FILTER_VALIDATE_EMAIL)) ai_out(["success" => false, "message" => "إيميل حساب Claude غير صحيح."]); site_config_set($conn, 'ai_account_email', $a, $email); }
    if (isset($_POST['key'])) {
        $k = trim((string)$_POST['key']);
        if ($k === '__clear__') site_config_set($conn, 'basira_ai_key', '', $email);
        elseif ($k !== '') { if (!preg_match('/^[A-Za-z0-9_\-]{20,300}$/', $k)) ai_out(["success" => false, "message" => "شكل المفتاح غير صحيح."]); site_config_set($conn, 'basira_ai_key', $k, $email); }
    }
    if (isset($_POST['model']) && isset(BS_MODELS[$_POST['model']])) { $raw = json_decode(site_config_get($conn, 'basira_cfg') ?: '{}', true) ?: []; $raw['model'] = $_POST['model']; site_config_set($conn, 'basira_cfg', json_encode($raw, JSON_UNESCAPED_UNICODE), $email); }
    ai_out(["success" => true] + $state());
}

if ($action === 'test' && $isPost) {
    if (!$canCfg) ai_out(["success" => false, "message" => "غير مصرح."]);
    $key = site_config_get($conn, 'basira_ai_key'); if ($key === '') ai_out(["success" => false, "message" => "مفيش مفتاح متسجّل."]);
    @set_time_limit(60);
    $sch = ['type' => 'object', 'additionalProperties' => false, 'required' => ['ok'], 'properties' => ['ok' => ['type' => 'string']]];
    $r = bs_ai_call($key, bs_cfg($conn)['model'], 'low', 'رد بكلمة واحدة.', 'اكتب: تمام', 300, $sch);
    ai_out($r[0] ? ["success" => true, "message" => "المفتاح شغال ✓ (" . ($r[2] ?? '') . ")"] : ["success" => false, "message" => "المفتاح مش شغال: " . $r[1]]);
}

if ($action === 'admin_all') {
    $map = [];
    if (ai_ready($conn)) { $res = $conn->query("SELECT account_email, basira, mizan, mizanai, paid, daily_limit, used_day, used_count FROM user_ai_access"); $today = gmdate('Y-m-d');
        while ($r = $res->fetch_assoc()) $map[strtolower($r['account_email'])] = ['basira' => (int)$r['basira'] === 1, 'mizan' => (int)$r['mizan'] === 1, 'mizanai' => (int)$r['mizanai'] === 1,
            'paid' => $r['paid'] === null ? null : (int)$r['paid'] === 1, 'limit' => $r['daily_limit'] === null ? null : (int)$r['daily_limit'], 'used' => $r['used_day'] === $today ? (int)$r['used_count'] : 0]; }
    $pro = [];
    try { $res = $conn->query("SELECT DISTINCT LOWER(s.account_email) e FROM subscribers s JOIN subscription_plans p ON p.id = s.plan_id WHERE s.active = 1 AND COALESCE(s.archived, 0) = 0 AND s.end_date >= CURDATE() AND p.includes_ai = 1");
        while ($r = $res->fetch_assoc()) $pro[$r['e']] = true; } catch (Throwable $e) {}
    ai_out(["success" => true, "access" => $map, "pro" => $pro, "canEdit" => $canUsers, "ready" => ai_ready($conn), "paidActive" => ai_paid_on($conn) && site_config_get($conn, 'basira_ai_key') !== '']);
}

if ($action === 'admin_set' && $isPost) {
    if (!$canUsers) ai_out(["success" => false, "message" => "غير مصرح."]);
    if (!ai_ready($conn)) ai_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 127) أولًا."]);
    $target = strtolower(trim((string)($_POST['email'] ?? ''))); $field = (string)($_POST['field'] ?? ''); $v = (string)($_POST['value'] ?? '');
    if (!filter_var($target, FILTER_VALIDATE_EMAIL) || !in_array($field, ['basira', 'mizan', 'mizanai', 'paid', 'daily_limit'], true)) ai_out(["success" => false, "message" => "بيانات غير صحيحة."]);
    if ($field === 'daily_limit' && $v !== '' && (!ctype_digit($v) || (int)$v > 1000)) ai_out(["success" => false, "message" => "الحد اليومي رقم من 0 لـ 1000 (أو فاضي = مفتوح)."]);
    ai_set($conn, $target, $field, ($field === 'paid' || $field === 'daily_limit') ? ($v === '' ? null : ($field === 'paid' ? $v === '1' : (int)$v)) : $v === '1');
    ai_out(["success" => true, "access" => ai_get($conn, $target)]);
}
ai_out(["success" => false, "message" => "طلب غير معروف."]);
?>
