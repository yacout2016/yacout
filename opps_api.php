<?php
/* =====================================================================
   GRIFFINE — opps_api.php (الإصدار 101) — البحث عن فرص حسب المؤشرات
   GET  action=list                     ← فرص المستخدم + الأسهم اللي الشرط اتحقق عليها
   POST action=save   (id اختياري)       ← إنشاء / تعديل (لحد 4 فرص مفتوحة)
   POST action=toggle id                 ← إيقاف / تشغيل البحث
   POST action=delete id                 ← سلة المحذوفات
   POST action=run    id                 ← تشغيل البحث الآن (أول دورة)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/opps_lib.php';
require_once __DIR__ . '/trash_lib.php';
function op_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$email = $_SESSION['user_email'] ?? '';
if (!$email) { http_response_code(401); op_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
if (!opp_ready($conn)) op_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 101) أولًا."]);
$isAdmin = !empty($_SESSION['is_admin']);
if (!$isAdmin && getAdminSetting($conn, 'hide_opps_screen', false)) op_out(["success" => false, "message" => "الشاشة غير متاحة حاليًا."]);
require_once __DIR__ . '/perks_lib.php';   // الإصدار 135: ميزة «فرصة» حسب الباقة
if (!$isAdmin && !perk_has($conn, $email, 'opps')) op_out(perk_denied($conn, $email, 'opps'));
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
require_once __DIR__ . '/markets_core.php';
$market = mc_account_market($conn, $email);
$own = function($id) use ($conn, $email){ $st = $conn->prepare("SELECT * FROM opportunities WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close(); return $r; };
$openCount = function() use ($conn, $email){ $st = $conn->prepare("SELECT COUNT(*) c FROM opportunities WHERE account_email = ? AND status IN ('active', 'paused')"); $st->bind_param("s", $email); $st->execute(); $c = (int)$st->get_result()->fetch_assoc()['c']; $st->close(); return $c; };

if ($action === 'list') {
    $conn->query("UPDATE opportunities SET status = 'expired' WHERE status IN ('active', 'paused') AND ends_at < UTC_TIMESTAMP()");
    $st = $conn->prepare("SELECT * FROM opportunities WHERE account_email = ? ORDER BY opp_no"); $st->bind_param("s", $email); $st->execute(); $res = $st->get_result(); $list = [];
    while ($o = $res->fetch_assoc()) {
        $h = $conn->prepare("SELECT symbol, name, price, hit_at, notified, sent_no, pass_no FROM opportunity_hits WHERE opp_id = ? ORDER BY hit_at DESC, symbol LIMIT 300"); $h->bind_param("i", $o['id']); $h->execute();
        $hits = $h->get_result()->fetch_all(MYSQLI_ASSOC); $h->close();
        $list[] = ['id' => (int)$o['id'], 'no' => (int)$o['opp_no'], 'side' => $o['side'], 'timeframe' => $o['timeframe'], 'indicators' => json_decode($o['indicators'], true), 'days' => (int)$o['days'],
            'chApp' => (int)$o['ch_app'] === 1, 'chEmail' => (int)$o['ch_email'] === 1, 'maxSends' => (int)$o['max_sends'], 'sendGap' => (int)$o['send_gap'], 'status' => $o['status'], 'market' => $o['market'],
            'startedAt' => $o['started_at'], 'endsAt' => $o['ends_at'], 'sends' => (int)$o['sends_count'], 'lastPassAt' => $o['last_pass_at'], 'scanning' => (int)$o['scan_pos'] > 0 || empty($o['last_pass_at']),
            'hits' => array_map(fn($x) => ['symbol' => $x['symbol'], 'name' => $x['name'], 'price' => (float)$x['price'], 'at' => $x['hit_at'], 'notified' => (int)$x['notified'] === 1, 'sentNo' => (int)$x['sent_no']], $hits)];
    }
    $st->close();
    op_out(["success" => true, "opps" => $list, "max" => OPP_MAX_OPEN, "market" => $market, "open" => $openCount()]);
}
if ($action === 'save' && $isPost) {
    $id = (int)($_POST['id'] ?? 0);
    $side = (string)($_POST['side'] ?? ''); $tf = (string)($_POST['timeframe'] ?? '1d');
    $inds = json_decode((string)($_POST['indicators'] ?? '[]'), true);
    $clean = [];
    foreach ((array)$inds as $x) {
        if (!is_array($x)) continue; $p = [];
        foreach ((array)($x['p'] ?? []) as $k => $v) if (preg_match('/^[a-z]{1,10}$/', (string)$k) && is_numeric($v)) $p[$k] = (float)$v;
        $clean[] = ['t' => (string)($x['t'] ?? ''), 'p' => $p, 'c' => (string)($x['c'] ?? '')];
    }
    if ($err = opp_validate($side, $tf, $clean)) op_out(["success" => false, "message" => $err]);
    $days = max(1, min(5, (int)($_POST['days'] ?? 1)));
    $chApp = ($_POST['chApp'] ?? '1') === '1' ? 1 : 0; $chEmail = ($_POST['chEmail'] ?? '1') === '1' ? 1 : 0;
    if (!$chApp && !$chEmail) op_out(["success" => false, "message" => "اختار استلام الإشعار على حسابك بالموقع أو على الإيميل أو الاتنين."]);
    $maxSends = max(1, min(3, (int)($_POST['maxSends'] ?? 1))); $gap = max(15, min(1440, (int)($_POST['sendGap'] ?? 60)));
    $json = json_encode($clean); $ends = opp_ends_at($market, $days);
    if ($id) {
        $o = $own($id); if (!$o) op_out(["success" => false, "message" => "الفرصة غير موجودة."]);
        if ($o['status'] === 'expired' && $openCount() >= OPP_MAX_OPEN) op_out(["success" => false, "message" => "الحد الأقصى " . OPP_MAX_OPEN . " فرص مفتوحة في نفس الوقت — أوقف أو احذف فرصة الأول."]);
        // تعديل الشروط ← بحث جديد من الأول (الأسهم القديمة بتتمسح)
        $u = $conn->prepare("UPDATE opportunities SET side = ?, timeframe = ?, indicators = ?, days = ?, ch_app = ?, ch_email = ?, max_sends = ?, send_gap = ?, status = 'active', started_at = UTC_TIMESTAMP(), ends_at = ?, sends_count = 0, last_sent_at = NULL, last_pass_at = NULL, scan_pos = 0, pass_no = 0, market = ? WHERE id = ?");
        $u->bind_param("sssiiiiissi", $side, $tf, $json, $days, $chApp, $chEmail, $maxSends, $gap, $ends, $market, $id); $u->execute(); $u->close();
        $d = $conn->prepare("DELETE FROM opportunity_hits WHERE opp_id = ?"); $d->bind_param("i", $id); $d->execute(); $d->close();
    } else {
        if ($openCount() >= OPP_MAX_OPEN) op_out(["success" => false, "message" => "الحد الأقصى " . OPP_MAX_OPEN . " فرص مفتوحة في نفس الوقت — أوقف أو احذف فرصة الأول."]);
        $st = $conn->prepare("SELECT COALESCE(MAX(opp_no), 0) + 1 n FROM opportunities WHERE account_email = ?"); $st->bind_param("s", $email); $st->execute(); $no = (int)$st->get_result()->fetch_assoc()['n']; $st->close();
        $i = $conn->prepare("INSERT INTO opportunities (account_email, opp_no, side, timeframe, indicators, days, ch_app, ch_email, max_sends, send_gap, status, market, started_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, UTC_TIMESTAMP(), ?)");
        $i->bind_param("sisssiiiiiss", $email, $no, $side, $tf, $json, $days, $chApp, $chEmail, $maxSends, $gap, $market, $ends); $i->execute(); $id = $conn->insert_id; $i->close();
    }
    op_out(["success" => true, "id" => $id]);
}
if ($action === 'toggle' && $isPost) {
    $o = $own((int)($_POST['id'] ?? 0)); if (!$o) op_out(["success" => false, "message" => "الفرصة غير موجودة."]);
    if ($o['status'] === 'expired') op_out(["success" => false, "message" => "مدة البحث انتهت — عدّل الفرصة لتبدأ بحث جديد."]);
    $new = $o['status'] === 'active' ? 'paused' : 'active';
    $u = $conn->prepare("UPDATE opportunities SET status = ? WHERE id = ?"); $u->bind_param("si", $new, $o['id']); $u->execute(); $u->close();
    op_out(["success" => true, "status" => $new]);
}
if ($action === 'delete' && $isPost) {
    $o = $own((int)($_POST['id'] ?? 0)); if (!$o) op_out(["success" => false, "message" => "الفرصة غير موجودة."]);
    trash_put($conn, 'opportunity', 'فرصة ' . (int)$o['opp_no'] . ' (' . ($o['side'] === 'buy' ? 'شراء' : 'بيع') . ')', ['opportunities' => [$o], 'opportunity_hits' => trash_rows($conn, 'opportunity_hits', 'opp_id = ?', 'i', [(int)$o['id']])], [], $email);
    $d = $conn->prepare("DELETE FROM opportunity_hits WHERE opp_id = ?"); $d->bind_param("i", $o['id']); $d->execute(); $d->close();
    $d = $conn->prepare("DELETE FROM opportunities WHERE id = ?"); $d->bind_param("i", $o['id']); $d->execute(); $d->close();
    op_out(["success" => true]);
}
if ($action === 'run' && $isPost) {
    $o = $own((int)($_POST['id'] ?? 0)); if (!$o) op_out(["success" => false, "message" => "الفرصة غير موجودة."]);
    session_write_close();
    $n = opp_run($conn, 25, (int)$o['id'], true);
    op_out(["success" => true, "sent" => $n]);
}
op_out(["success" => false, "message" => "طلب غير معروف."]);
?>
