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
        "extra" => $s['plus'] ?? [], "removed" => $s['minus'] ?? [],
        "fullDays" => perk_cfg($conn)['full_days'], "catalog" => $isAdmin ? perk_catalog($conn) : perk_catalog_public($conn), "hidden" => perk_hidden($conn)]);
}

// ---- الإدارة
if (!$isAdmin) { http_response_code(403); pk_out(["success" => false, "message" => "غير مصرح لك."]); }
$SUB_ACTIONS = ['sub', 'sub_save', 'sub_reset', 'set_plan', 'plans_min'];   // الإصدار 138: شاشة المشتركين
requirePermission($conn, in_array($action, $SUB_ACTIONS, true) ? 'manage_subscribers' : 'manage_plans');
if ($isPost) requireCsrf();
if (!perk_has_col($conn)) pk_out(["success" => false, "message" => "شغّل ملف قاعدة البيانات ALL_SCHEMA_UPDATES.sql الأول (الإصدار 135)."]);

// ---- الإصدار 138: مشترك بعينه (الباقة من قائمة منسدلة + ميزات إضافية / متشالة)
if ($action === 'plans_min') {
    $out = []; $res = $conn->query("SELECT id, name, amount, duration_days, market, is_active FROM subscription_plans ORDER BY sort_order ASC, id ASC");
    while ($r = $res->fetch_assoc()) $out[] = ['id' => $r['id'], 'name' => $r['name'], 'amount' => (float)$r['amount'], 'durationDays' => (int)$r['duration_days'], 'market' => $r['market'] ?? 'مصر', 'isActive' => (bool)$r['is_active']];
    pk_out(["success" => true, "plans" => $out]);
}
if ($action === 'sub') {
    $e = strtolower(trim((string)($_GET['email'] ?? '')));
    if ($e === '') pk_out(["success" => false, "message" => "إيميل غير صحيح."]);
    $s = perk_state($conn, $e, false);
    pk_out(["success" => true, "phase" => $s['phase'], "planName" => $s['planName'], "base" => $s['base'] ?? [], "plus" => $s['plus'] ?? [], "minus" => $s['minus'] ?? [],
        "keys" => $s['keys'], "catalog" => perk_catalog($conn), "ovOk" => perk_ov_ready($conn)]);
}
if ($isPost && ($action === 'sub_save' || $action === 'sub_reset')) {
    if (!perk_ov_ready($conn)) pk_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql الأول (الإصدار 138)."]);
    $e = strtolower(trim((string)($_POST['email'] ?? '')));
    if ($e === '') pk_out(["success" => false, "message" => "إيميل غير صحيح."]);
    if ($action === 'sub_reset') { perk_user_ov_save($conn, $e, [], []); pk_out(["success" => true, "message" => "رجعت لمميزات الباقة."]); }
    $in = json_decode((string)($_POST['keys'] ?? '[]'), true); if (!is_array($in)) pk_out(["success" => false, "message" => "بيانات غير صحيحة."]);
    $keys = array_values(array_intersect(perk_keys_all($conn), array_map('strval', $in)));
    $base = perk_state($conn, $e, false)['base'] ?? [];
    $plus = array_values(array_diff($keys, $base)); $minus = array_values(array_diff($base, $keys));
    perk_user_ov_save($conn, $e, $plus, $minus);
    pk_out(["success" => true, "plus" => $plus, "minus" => $minus, "message" => "✅ اتحفظت مميزات المشترك" . ($plus ? " — إضافي: " . count($plus) : "") . ($minus ? " — متشال: " . count($minus) : "")]);
}
if ($isPost && $action === 'set_plan') {
    $id = (int)($_POST['subId'] ?? 0); $pid = trim((string)($_POST['planId'] ?? '')); $gift = ($_POST['mode'] ?? 'gift') === 'gift';
    $pl = perk_plan_row($conn, $pid); if (!$pl || $id <= 0) pk_out(["success" => false, "message" => "بيانات غير صحيحة."]);
    $g = $conn->prepare("SELECT account_email FROM subscribers WHERE id = ?"); $g->bind_param("i", $id); $g->execute(); $acc = ($g->get_result()->fetch_row() ?: [null])[0]; $g->close();
    if (!$acc) pk_out(["success" => false, "message" => "المشترك غير موجود."]);
    $start = date('Y-m-d'); $end = date('Y-m-d', strtotime($start . ' +' . max(1, (int)$pl['duration_days']) . ' days'));
    $amt = $gift ? 0.0 : (float)$pl['amount']; $comp = ($gift && (float)$pl['amount'] > 0) ? 1 : 0; $pn = $pl['name'];
    $st = $conn->prepare("UPDATE subscribers SET plan_id = ?, plan_name = ?, amount = ?, is_comp = ?, start_date = ?, end_date = ?, active = 1, pending_plan_id = NULL, pending_plan_name = NULL, pending_amount = NULL WHERE id = ?");
    $st->bind_param("ssdissi", $pid, $pn, $amt, $comp, $start, $end, $id); $st->execute(); $st->close();
    logSubscriptionEvent($conn, $acc, $gift ? 'gift' : 'admin_change', $pid, $pn, $amt);
    pk_out(["success" => true, "endDate" => $end, "message" => "✅ «" . $pn . "» اتفعّلت للمشترك من النهارده لحد " . $end . ($gift ? " (هدية)" : "")]);
}

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
