<?php
/* =====================================================================
   GRIFFINE — trades_report.php (الإصدار 89 ← 105) — تقارير الصفقات للإدارة
   GET  action=live&market=  ← الإصدار 105: كل المشتركين + خططهم مباشرة من user_plans (الحساب في المتصفح بنفس دالة الرئيسية)
   الصلاحية: view_reports
   GET  action=report&from=YYYY-MM-DD&to=YYYY-MM-DD&kind=DCA|Grid|&symbol=&email=
        ← الإجماليات + ملخص حسب السهم + ملخص حسب العميل + آخر 300 عملية
   POST action=rebuild_all   ← إعادة بناء جدول الصفقات لكل العملاء من الخطط المحفوظة (أول مرة بعد التحديث)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/plans_store.php';
require_once __DIR__ . '/trades_lib.php';
require_once __DIR__ . '/markets_core.php';

function trr_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (!isset($_SESSION['user_email'])) { http_response_code(403); trr_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
// الإصدار 96: الإدارة (view_reports) بتشوف كل العملاء - العميل بيشوف صفقاته هو بس (لو الأدمن مظهر الشاشة)
$isStaffReport = !empty($_SESSION['is_admin']) && in_array('view_reports', getCurrentUserPermissions($conn), true);
$me = $_SESSION['user_email'];
if (!$isStaffReport && getAdminSetting($conn, 'hide_trades_screen', true)) { http_response_code(403); trr_out(["success" => false, "message" => "هذه الشاشة غير متاحة حاليًا."]); }
session_write_close();
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$action = $_GET['action'] ?? $_POST['action'] ?? '';
if (!trades_table_ready($conn)) trr_out(["success" => false, "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 89) أولًا."]);

try {
    if ($action === 'rebuild_all' && $isPost && !$isStaffReport) trr_out(["success" => false, "message" => "غير مصرح."]);
    if ($action === 'rebuild_all' && $isPost) {
        @set_time_limit(300);
        $res = $conn->query("SELECT DISTINCT account_email, plan_type FROM user_plans WHERE deleted = 0 AND plan_type IN ('plans','grid_plans')");
        $accounts = 0; $rows = 0;
        while ($r = $res->fetch_assoc()) { $rows += trades_rebuild($conn, $r['account_email'], $r['plan_type']); $accounts++; }
        trr_out(["success" => true, "accounts" => $accounts, "rows" => $rows]);
    }
    /* الإصدار 105: التقرير المباشر - من الخطط نفسها (user_plans) لحظة الطلب = نفس مصدر الشاشة الرئيسية والمحفظة بالظبط
       الإدارة: كل المشتركين (حتى اللي مالوش صفقات) + بيانات اشتراك كل واحد + خططه
       العميل: خططه هو بس */
    if ($action === 'live') {
        $accounts = [];
        if ($isStaffReport) {
            require_once __DIR__ . '/codes_lib.php';
            $hasCodes = codes_ready($conn);
            $mk = trim((string)($_GET['market'] ?? ''));
            $mkOk = $mk !== '' && function_exists('mc_valid') && mc_valid($mk) && mc_ready($conn);
            // كل المشتركين (غير المؤرشفين) + أي حساب عنده خطط - آخر اشتراك لكل حساب
            $sql = "SELECT a.email, u.inv_code, COALESCE(u.account_market, 'مصر') account_market, u.is_admin,
                       s.name, s.phone, s.plan_name, s.start_date, s.end_date, s.active, s.is_comp
                FROM (SELECT account_email email FROM subscribers WHERE archived = 0
                      UNION SELECT account_email FROM user_plans WHERE deleted = 0 AND plan_type IN ('plans','grid_plans')) a
                LEFT JOIN users u ON u.username = a.email
                LEFT JOIN subscribers s ON s.id = (SELECT s2.id FROM subscribers s2 WHERE s2.account_email = a.email AND s2.archived = 0 ORDER BY s2.end_date DESC, s2.id DESC LIMIT 1)";
            if (!$hasCodes) $sql = str_replace(['u.inv_code', "COALESCE(u.account_market, 'مصر')"], ["''", "'مصر'"], $sql);
            $res = $conn->query($sql);
            $today = gmdate('Y-m-d');
            while ($r = $res->fetch_assoc()) {
                if ($mkOk && $r['account_market'] !== $mk) continue;
                $sub = $r['end_date'] === null ? 'none' : (!$r['active'] ? 'stopped' : ($r['end_date'] < $today ? 'expired' : 'active'));
                $accounts[$r['email']] = ["email" => $r['email'], "code" => (string)($r['inv_code'] ?? ''), "name" => (string)($r['name'] ?? ''),
                    "phone" => (string)($r['phone'] ?? ''), "market" => $r['account_market'], "plan" => (string)($r['plan_name'] ?? ''),
                    "start" => $r['start_date'], "end" => $r['end_date'], "sub" => $sub, "comp" => !empty($r['is_comp'])];
            }
        } else {
            $accounts[$me] = ["email" => $me, "code" => '', "name" => '', "phone" => '', "market" => '', "plan" => '', "start" => null, "end" => null, "sub" => '', "comp" => false];
        }
        $plans = [];
        if ($accounts && plans_table_ready($conn)) {
            $emails = array_keys($accounts);
            foreach (array_chunk($emails, 500) as $chunk) {
                $in = implode(',', array_fill(0, count($chunk), '?'));
                $st = $conn->prepare("SELECT account_email, plan_type, symbol, data_value FROM user_plans WHERE deleted = 0 AND plan_type IN ('plans','grid_plans') AND account_email IN ($in)");
                $st->bind_param(str_repeat('s', count($chunk)), ...$chunk); $st->execute(); $res = $st->get_result();
                while ($r = $res->fetch_assoc()) {
                    $v = json_decode((string)$r['data_value'], true); if (!is_array($v)) continue;
                    $plans[] = ["e" => $r['account_email'], "k" => $r['plan_type'] === 'grid_plans' ? 'Grid' : 'DCA', "s" => $r['symbol'], "p" => $v];
                }
                $st->close();
            }
        }
        trr_out(["success" => true, "mine" => !$isStaffReport, "at" => gmdate('Y-m-d H:i:s'), "accounts" => array_values($accounts), "plans" => $plans]);
    }
    if ($action === 'report') {
        $where = []; $types = ''; $args = [];
        $from = tr_date($_GET['from'] ?? ''); $to = tr_date($_GET['to'] ?? '');
        if ($from) { $where[] = "trade_date >= ?"; $types .= 's'; $args[] = $from; }
        if ($to)   { $where[] = "trade_date <= ?"; $types .= 's'; $args[] = $to; }
        $kind = $_GET['kind'] ?? '';
        if ($kind === 'DCA' || $kind === 'Grid') { $where[] = "plan_kind = ?"; $types .= 's'; $args[] = $kind; }
        $sym = strtoupper(trim((string)($_GET['symbol'] ?? '')));
        if ($sym !== '') { $where[] = "symbol = ?"; $types .= 's'; $args[] = mb_substr($sym, 0, 64); }
        if ($isStaffReport) {
            $em = trim((string)($_GET['email'] ?? ''));
            if ($em !== '') { $where[] = "account_email LIKE ?"; $types .= 's'; $args[] = '%' . mb_substr($em, 0, 100) . '%'; }
            // فلتر السوق (سوق الحساب) - الحسابات القديمة من غير سوق = مصر
            $mk = trim((string)($_GET['market'] ?? ''));
            if ($mk !== '' && function_exists('mc_valid') && mc_valid($mk) && mc_ready($conn)) {
                $where[] = "account_email IN (SELECT username FROM users WHERE COALESCE(account_market, 'مصر') = ?)"; $types .= 's'; $args[] = $mk;
            }
        } else {
            // العميل: صفقاته هو بس - ولو جدوله فاضي وعنده خطط بيتبني أول مرة
            $c = $conn->prepare("SELECT COUNT(*) c FROM plan_trades WHERE account_email = ?"); $c->bind_param("s", $me); $c->execute();
            if ((int)$c->get_result()->fetch_assoc()['c'] === 0) { trades_rebuild($conn, $me, 'plans'); trades_rebuild($conn, $me, 'grid_plans'); }
            $c->close();
            $where[] = "account_email = ?"; $types .= 's'; $args[] = $me;
        }
        $w = $where ? ' WHERE ' . implode(' AND ', $where) : '';
        $q = function($sql) use ($conn, $types, $args) {
            $st = $conn->prepare($sql); if ($types !== '') $st->bind_param($types, ...$args);
            $st->execute(); $res = $st->get_result(); $out = [];
            while ($r = $res->fetch_assoc()) $out[] = $r; $st->close(); return $out;
        };
        $agg = "SUM(trade_type='buy') buys, SUM(trade_type='sell') sells, SUM(trade_type='closed') closed,
                COALESCE(SUM(CASE WHEN trade_type='buy' THEN qty*price END),0) buy_value,
                COALESCE(SUM(CASE WHEN trade_type='sell' THEN qty*price END),0) sell_value,
                COALESCE(SUM(CASE WHEN trade_type='closed' THEN profit END),0) profit,
                COALESCE(SUM(CASE WHEN trade_type='closed' THEN capital END),0) capital,
                SUM(trade_type='closed' AND profit > 0) wins";
        $totals = $q("SELECT COUNT(DISTINCT account_email) customers, COUNT(DISTINCT symbol) symbols, $agg FROM plan_trades $w")[0] ?? [];
        $bySymbol = $q("SELECT symbol, MAX(market) market, COUNT(DISTINCT account_email) customers, $agg FROM plan_trades $w GROUP BY symbol ORDER BY buy_value DESC LIMIT 100");
        $byCustomer = $q("SELECT account_email, COUNT(DISTINCT symbol) symbols, $agg FROM plan_trades $w GROUP BY account_email ORDER BY profit DESC LIMIT 100");
        $recent = $q("SELECT account_email, plan_kind, symbol, market, trade_type, qty, price, exit_price, profit, capital, trade_date, level FROM plan_trades $w ORDER BY trade_date DESC, id DESC LIMIT 2000");
        $num = function(&$rows){ foreach ($rows as &$r) foreach ($r as $k => $v) if (is_numeric($v) && !in_array($k, ['symbol','account_email','trade_date'], true)) $r[$k] = (float)$v; };
        $t = [$totals]; $num($t); $num($bySymbol); $num($byCustomer); $num($recent);
        trr_out(["success" => true, "mine" => !$isStaffReport, "totals" => $t[0], "bySymbol" => $bySymbol, "byCustomer" => $isStaffReport ? $byCustomer : [], "recent" => $recent]);
    }
    trr_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE trades_report: ' . $e->getMessage());
    trr_out(["success" => false, "message" => "حدث خطأ في قاعدة البيانات."]);
}
?>
