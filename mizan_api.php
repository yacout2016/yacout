<?php
/* =====================================================================
   GRIFFINE — mizan_api.php (الإصدار 115) — «ميزان محفظتك AI» (تقرير توزيع التنوع)
   POST action=analyze  positions=[{s,m,q,avg,t}] , ccy , fresh=1 ← تحليل تنويع المحفظة الفعلية
   POST action=limits   positions , ccy ← النسبة المقترحة لكل سهم (للرئيسية - من آخر تحليل أو بالقواعد) (الإصدار 117)
   المراكز جاية من خطط المستخدم نفسه (والتحليل ليه هو بس - مبيتشاركش ومبيتخزنش في قاعدة البيانات)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/mizan_lib.php';
function mz_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit(); }
try {
    $email = $_SESSION['user_email'] ?? '';
    if (!$email) { http_response_code(401); mz_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
    $isAdmin = !empty($_SESSION['is_admin']);
    session_write_close();
    // الإصدار 128: لوحة التحكم — إعدادات «ميزان محفظتك AI» (صلاحية تعديل تصميم الموقع)
    if ($isAdmin && in_array($_POST['action'] ?? $_GET['action'] ?? '', ['admin_get', 'admin_save'], true)) {
        if (!in_array('edit_site_design', getCurrentUserPermissions($conn), true)) mz_out(["success" => false, "message" => "غير مصرح — صلاحية تعديل تصميم الموقع مطلوبة."]);
        if (($_GET['action'] ?? '') === 'admin_get') mz_out(["success" => true, "config" => mz_cfg($conn), "defaults" => mz_defaults()]);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') mz_out(["success" => false, "message" => "طلب غير صحيح."]);
        requireCsrf();
        $raw = (string)($_POST['config'] ?? '');
        if ($raw === 'null') { site_config_set($conn, 'mizan_cfg', '', $email); mz_out(["success" => true, "config" => mz_cfg($conn)]); }
        $in = json_decode($raw, true); if (!is_array($in)) mz_out(["success" => false, "message" => "بيانات غير صحيحة."]);
        $out = []; foreach (mz_defaults() as $k => $v) if (array_key_exists($k, $in)) $out[$k] = $in[$k];
        site_config_set($conn, 'mizan_cfg', json_encode($out, JSON_UNESCAPED_UNICODE), $email);
        mz_out(["success" => true, "config" => mz_cfg($conn)]);
    }
    ai_set_user($email, $isAdmin);   // الإصدار 127
    if (!ai_screen_ok($conn, $email, 'mizan', $isAdmin)) mz_out(["success" => false, "hidden" => true, "message" => "الشاشة غير متاحة لحسابك."]);
    require_once __DIR__ . '/perks_lib.php';   // الإصدار 135
    if (!$isAdmin && !perk_has($conn, $email, 'mizan')) mz_out(perk_denied($conn, $email, 'mizan'));
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') mz_out(["success" => false, "message" => "طلب غير صحيح."]);
    requireCsrf();
    $action = $_POST['action'] ?? '';
    if ($action !== 'analyze' && $action !== 'limits') mz_out(["success" => false, "message" => "طلب غير معروف."]);
    $in = json_decode((string)($_POST['positions'] ?? ''), true);
    if (!is_array($in) || !$in) mz_out(["success" => false, "message" => "مفيش مراكز مفتوحة للتحليل."]);
    $pos = []; $seen = [];
    foreach (array_slice($in, 0, 40) as $p) {
        $s = strtoupper(trim((string)($p['s'] ?? ''))); $m = (string)($p['m'] ?? 'مصر');
        $q = (float)($p['q'] ?? 0); $avg = (float)($p['avg'] ?? 0); $t = ($p['t'] ?? '') === 'Grid' ? 'Grid' : 'DCA';
        if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $s) || !isset(MQ_MARKETS[$m]) || !($q > 0) || !($avg > 0) || $q > 1e9 || $avg > 1e7) continue;
        $k = "$s|$m";
        if (isset($seen[$k])) { $i = $seen[$k]; $tq = $pos[$i]['q'] + $q; $pos[$i]['avg'] = ($pos[$i]['avg'] * $pos[$i]['q'] + $avg * $q) / $tq; $pos[$i]['q'] = $tq; $pos[$i]['t'] = $pos[$i]['t'] === $t ? $t : 'DCA+Grid'; continue; }
        $seen[$k] = count($pos); $pos[] = ['s' => $s, 'm' => $m, 'q' => $q, 'avg' => $avg, 't' => $t];
    }
    if (!$pos) mz_out(["success" => false, "message" => "مفيش مراكز مفتوحة صالحة للتحليل."]);
    $ccy = mb_substr(strip_tags((string)($_POST['ccy'] ?? '')), 0, 30);
    if ($action === 'limits') mz_out(["success" => true] + mz_limits($conn, $email, $pos, $ccy));   // الإصدار 117: النسب المقترحة للرئيسية
    $r = mz_analyze($conn, $email, $pos, $ccy, !empty($_POST['fresh']));
    if (empty($r['ok'])) mz_out(["success" => false, "message" => $r['message'] ?? 'تعذّر التحليل.']);
    mz_out(["success" => true, "report" => $r]);
} catch (Throwable $e) {
    error_log('mizan_api: ' . $e->getMessage());
    http_response_code(500);
    mz_out(["success" => false, "message" => "حصل خطأ في التحليل — حاول تاني."]);
}
