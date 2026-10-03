<?php
/* GRIFFINE — perks_api.php (الإصدار 135) — مميزات الباقات
   GET  ?action=me      ← مميزات المشترك الحالي (المرحلة + الشغال + الأيام الباقية) + القائمة كاملة
   GET  ?action=admin   ← (manage_plans) القائمة + الباقات بمميزاتها + إعدادات الباقة المجانية
   POST save_plan / reset_plan / save_cfg / add_custom / del_custom */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/perks_lib.php';
function pk_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (!isset($_SESSION['user_email'])) { http_response_code(401); pk_out(["success" => false, "message" => "يرجى تسجيل الدخول."]); }
$email = $_SESSION['user_email']; $isAdmin = !empty($_SESSION['is_admin']);
$action = $_GET['action'] ?? $_POST['action'] ?? 'me';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';

if ($action === 'me') {
    session_write_close();
    $s = perk_state($conn, $email, $isAdmin);
    pk_out(["success" => true, "phase" => $s['phase'], "keys" => $s['keys'], "plan" => $s['plan'], "planName" => $s['planName'],
        "daysLeft" => $s['daysLeft'], "freeLeft" => $s['freeLeft'] ?? null, "reason" => $s['reason'] ?? null,
        "fullDays" => perk_cfg($conn)['full_days'], "catalog" => $isAdmin ? perk_catalog($conn) : perk_catalog_public($conn), "hidden" => perk_hidden($conn)]);
}

// ---- الإدارة
if (!$isAdmin) { http_response_code(403); pk_out(["success" => false, "message" => "غير مصرح لك."]); }
requirePermission($conn, 'manage_plans');
if ($isPost) requireCsrf();
if (!perk_has_col($conn)) pk_out(["success" => false, "message" => "شغّل ملف قاعدة البيانات ALL_SCHEMA_UPDATES.sql الأول (الإصدار 135)."]);

if ($action === 'admin') {
    $plans = [];
    $res = $conn->query("SELECT * FROM subscription_plans ORDER BY sort_order ASC, id ASC");
    while ($r = $res->fetch_assoc()) {
        $def = true; $keys = perk_plan_keys($conn, $r, $def);
        $plans[] = ['id' => $r['id'], 'name' => $r['name'], 'amount' => (float)$r['amount'], 'market' => $r['market'] ?? 'مصر', 'isActive' => (bool)$r['is_active'],
            'durationDays' => (int)$r['duration_days'], 'keys' => $keys, 'isDefault' => $def, 'isFree' => $r['id'] === PERK_FREE_PLAN];
    }
    $cfg = perk_cfg($conn);
    pk_out(["success" => true, "catalog" => perk_catalog($conn), "plans" => $plans, "fullDays" => $cfg['full_days'], "fullAi" => $cfg['full_ai'], "freePlan" => PERK_FREE_PLAN]);
}
if (!$isPost) pk_out(["success" => false, "message" => "طلب غير معروف."]);

$planId = trim((string)($_POST['planId'] ?? ''));
if ($action === 'save_plan' || $action === 'reset_plan') {
    if (!perk_plan_row($conn, $planId)) pk_out(["success" => false, "message" => "الباقة غير موجودة."]);
    if ($action === 'reset_plan') {
        $st = $conn->prepare("UPDATE subscription_plans SET perks = NULL WHERE id = ?"); $st->bind_param("s", $planId); $st->execute(); $st->close();
        pk_out(["success" => true, "message" => "رجعت للاختيارات الافتراضية."]);
    }
    $in = json_decode((string)($_POST['keys'] ?? '[]'), true);
    if (!is_array($in)) pk_out(["success" => false, "message" => "بيانات غير صحيحة."]);
    $keys = array_values(array_intersect(perk_keys_all($conn), array_map('strval', $in)));
    $j = json_encode($keys, JSON_UNESCAPED_UNICODE); $ai = in_array('ai_pro', $keys, true) ? 1 : 0;
    $st = $conn->prepare("UPDATE subscription_plans SET perks = ?, includes_ai = ? WHERE id = ?"); $st->bind_param("sis", $j, $ai, $planId); $st->execute(); $st->close();
    pk_out(["success" => true, "keys" => $keys, "message" => "✅ اتحفظت مميزات الباقة (" . count($keys) . " ميزة)."]);
}
$cfg = perk_cfg($conn);
if ($action === 'save_cfg') {
    $cfg['full_days'] = max(0, min(365, (int)($_POST['fullDays'] ?? 20)));
    $cfg['full_ai'] = ($_POST['fullAi'] ?? '0') === '1';
    perk_cfg_save($conn, $cfg, $email);
    pk_out(["success" => true, "message" => "✅ اتحفظت إعدادات الباقة المجانية."]);
}
if ($action === 'add_custom') {
    $l = trim(mb_substr((string)($_POST['label'] ?? ''), 0, 120));
    $screen = trim((string)($_POST['screen'] ?? ''));
    if ($l === '') pk_out(["success" => false, "message" => "اكتب اسم الميزة."]);
    if ($screen !== '' && !preg_match('/^render[A-Za-z0-9]{2,60}$/', $screen)) pk_out(["success" => false, "message" => "الشاشة غير صحيحة."]);
    if (count($cfg['custom']) >= 40) pk_out(["success" => false, "message" => "وصلت لأقصى عدد (40 ميزة إضافية)."]);
    $k = 'c_' . substr(bin2hex(random_bytes(4)), 0, 8);
    $cfg['custom'][] = ['k' => $k, 'l' => $l, 'screen' => $screen];
    perk_cfg_save($conn, $cfg, $email);
    pk_out(["success" => true, "k" => $k, "message" => "✅ اتضافت «{$l}» — علّم عليها في الباقات اللي فيها."]);
}
if ($action === 'toggle_hidden') {   // الإصدار 137: إخفاء ميزة عن كل المشتركين (ماتظهرش ولا تتطلب) أو إظهارها
    $k = (string)($_POST['k'] ?? '');
    if (!in_array($k, perk_keys_all($conn), true)) pk_out(["success" => false, "message" => "ميزة غير معروفة."]);
    $h = array_values(array_diff($cfg['hidden'], [$k]));
    if (($_POST['hidden'] ?? '0') === '1') $h[] = $k;
    $cfg['hidden'] = $h; perk_cfg_save($conn, $cfg, $email);
    pk_out(["success" => true, "hidden" => $h, "message" => (($_POST['hidden'] ?? '0') === '1' ? '🙈 «' . perk_label($conn, $k) . '» اتخفت عن كل المشتركين.' : '👁 «' . perk_label($conn, $k) . '» رجعت تظهر للمشتركين.')]);
}
if ($action === 'del_custom') {
    $k = (string)($_POST['k'] ?? '');
    $cfg['custom'] = array_values(array_filter($cfg['custom'], fn($x) => $x['k'] !== $k)); $cfg['hidden'] = array_values(array_diff($cfg['hidden'], [$k]));
    perk_cfg_save($conn, $cfg, $email);
    pk_out(["success" => true, "message" => "اتشالت الميزة من كل الباقات."]);
}
pk_out(["success" => false, "message" => "طلب غير معروف."]);
?>
