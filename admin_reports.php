<?php
/* =====================================================================
   GRIFFINE — admin_reports.php (الإصدار 96: حسب السوق)
   GET ?market=  (فاضي = كل الأسواق)
   - اختيار سوق ← كل الأرقام لحسابات السوق ده بس وبعملته
   - كل الأسواق ← الأرقام + جدول ملخص لكل سوق (المسجلين / النشطين / الإيراد بعملته) - مفيش جمع عملات مختلفة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_core.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'view_reports');
session_write_close();

$mkt = trim((string)($_GET['market'] ?? ''));
if (!mc_valid($mkt)) $mkt = '';
$hasMkt = mc_ready($conn);
// شرط السوق على الحساب (users.account_market) - الحسابات من غير سوق = مصر
$mJoin = $hasMkt ? "LEFT JOIN users u ON u.username = e.account_email" : "";
$mWhere = ($hasMkt && $mkt !== '') ? " AND COALESCE(u.account_market, 'مصر') = ?" : "";
$q = function($sql) use ($conn, $mWhere, $mkt) {
    $st = $conn->prepare($sql); if ($mWhere !== '') $st->bind_param("s", $mkt);
    $st->execute(); $res = $st->get_result(); $out = []; while ($r = $res->fetch_assoc()) $out[] = $r; $st->close(); return $out;
};

$revenueByMonth = array_map(fn($r) => ["month" => $r['ym'], "total" => (float)$r['total']], $q("SELECT DATE_FORMAT(e.event_date, '%Y-%m') AS ym, SUM(e.amount) AS total
    FROM subscription_events e $mJoin WHERE e.event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) $mWhere GROUP BY ym ORDER BY ym ASC"));
$signupsByMonth = array_map(fn($r) => ["month" => $r['ym'], "count" => (int)$r['cnt']], $q("SELECT DATE_FORMAT(e.event_date, '%Y-%m') AS ym, COUNT(*) AS cnt
    FROM subscription_events e $mJoin WHERE e.event_type = 'new_subscription' AND e.event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) $mWhere GROUP BY ym ORDER BY ym ASC"));
$byPlan = array_map(fn($r) => ["planName" => $r['plan_name'], "count" => (int)$r['cnt'], "total" => (float)$r['total']], $q("SELECT e.plan_name, COUNT(*) AS cnt, SUM(e.amount) AS total
    FROM subscription_events e $mJoin WHERE 1=1 $mWhere GROUP BY e.plan_name ORDER BY total DESC"));
$sJoin = $hasMkt ? "LEFT JOIN users u ON u.username = e.account_email" : "";
$activeCount = 0; $inactiveCount = 0;
foreach ($q("SELECT e.active, COUNT(*) AS cnt FROM subscribers e $sJoin WHERE e.archived = 0 $mWhere GROUP BY e.active") as $r) {
    if ((int)$r['active'] === 1) $activeCount = (int)$r['cnt']; else $inactiveCount = (int)$r['cnt'];
}

// ملخص لكل سوق (كل سوق بعملته)
$summary = [];
if ($hasMkt) {
    $active = mc_active($conn);
    $reg = []; $res = $conn->query("SELECT COALESCE(account_market, 'مصر') m, COUNT(*) c FROM users WHERE archived = 0 GROUP BY m"); while ($r = $res->fetch_assoc()) $reg[$r['m']] = (int)$r['c'];
    $act = []; $res = $conn->query("SELECT COALESCE(u.account_market, 'مصر') m, SUM(s.active = 1) a, COUNT(*) c FROM subscribers s LEFT JOIN users u ON u.username = s.account_email WHERE s.archived = 0 GROUP BY m"); while ($r = $res->fetch_assoc()) $act[$r['m']] = [(int)$r['a'], (int)$r['c']];
    $rev = []; $res = $conn->query("SELECT COALESCE(u.account_market, 'مصر') m, SUM(e.amount) t, SUM(CASE WHEN e.event_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN e.amount ELSE 0 END) mt FROM subscription_events e LEFT JOIN users u ON u.username = e.account_email GROUP BY m"); while ($r = $res->fetch_assoc()) $rev[$r['m']] = [(float)$r['t'], (float)$r['mt']];
    foreach (MC_MARKETS as $name => $x) {
        if (!in_array($name, $active, true) && empty($reg[$name]) && empty($rev[$name])) continue;   // سوق متقفل ومفيهوش حاجة
        $summary[] = ["market" => $name, "active" => in_array($name, $active, true), "ccy" => $x['ccy'], "ccyAr" => $x['ccyAr'],
            "registered" => $reg[$name] ?? 0, "activeSubs" => $act[$name][0] ?? 0, "subscribers" => $act[$name][1] ?? 0,
            "revenue" => $rev[$name][0] ?? 0, "revenueMonth" => $rev[$name][1] ?? 0];
    }
}
echo json_encode([
    "success" => true, "market" => $mkt, "currency" => $mkt ? mc_ccy($mkt) : null,
    "revenueByMonth" => $revenueByMonth, "signupsByMonth" => $signupsByMonth, "byPlan" => $byPlan,
    "activeCount" => $activeCount, "inactiveCount" => $inactiveCount, "summary" => $summary,
], JSON_UNESCAPED_UNICODE);
?>
