<?php
/* =====================================================================
   GRIFFINE — mizan_api.php (الإصدار 115) — «ميزان محفظتك AI» (تقرير توزيع التنوع)
   POST action=analyze  positions=[{s,m,q,avg,t}] , ccy , fresh=1 ← تحليل تنويع المحفظة الفعلية
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
    if (!$isAdmin && !hasActiveSubscription($conn, $email)) mz_out(["success" => false, "requiresSubscription" => true, "message" => "تقرير ميزان متاح للمشتركين فقط."]);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') mz_out(["success" => false, "message" => "طلب غير صحيح."]);
    requireCsrf();
    $action = $_POST['action'] ?? '';
    if ($action !== 'analyze') mz_out(["success" => false, "message" => "طلب غير معروف."]);
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
    $r = mz_analyze($conn, $email, $pos, $ccy, !empty($_POST['fresh']));
    if (empty($r['ok'])) mz_out(["success" => false, "message" => $r['message'] ?? 'تعذّر التحليل.']);
    mz_out(["success" => true, "report" => $r]);
} catch (Throwable $e) {
    error_log('mizan_api: ' . $e->getMessage());
    http_response_code(500);
    mz_out(["success" => false, "message" => "حصل خطأ في التحليل — حاول تاني."]);
}
