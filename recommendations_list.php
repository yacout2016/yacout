<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_core.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

// التوصيات محتوى مدفوع: بتتعرض بس لفريق الإدارة أو لعميل اشتراكه شغال (كانت متاحة لأي حساب)
if (empty($_SESSION['is_admin']) && !hasActiveSubscription($conn, $_SESSION['user_email'])) {
    echo json_encode(["success" => true, "recommendations" => [], "requiresSubscription" => true]);
    exit();
}

cleanupExpiredRecommendations($conn);

// العميل بيشوف توصيات سوق حسابه بس - الإدارة بتشوف الكل ومعاها عمود السوق
$hasRecMkt = mc_col($conn, 'recommendations', 'market');
if ($hasRecMkt && empty($_SESSION['is_admin'])) {
    $myMkt = mc_account_market($conn, $_SESSION['user_email']);
    $st = $conn->prepare("SELECT * FROM recommendations WHERE archived = 0 AND COALESCE(market, 'مصر') = ? ORDER BY created_at DESC");
    $st->bind_param("s", $myMkt); $st->execute(); $result = $st->get_result();
} else {
    $result = $conn->query("SELECT * FROM recommendations WHERE archived = 0 ORDER BY created_at DESC");
}
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "symbol" => $r['symbol'],
        "stockName" => $r['stock_name'],
        "buyFrom" => (float)$r['buy_from'],
        "buyTo" => (float)$r['buy_to'],
        "resistances" => [
            ["level" => $r['resistance1'] !== null ? (float)$r['resistance1'] : null, "pct" => $r['resistance1_pct'] !== null ? (float)$r['resistance1_pct'] : null],
            ["level" => $r['resistance2'] !== null ? (float)$r['resistance2'] : null, "pct" => $r['resistance2_pct'] !== null ? (float)$r['resistance2_pct'] : null],
            ["level" => $r['resistance3'] !== null ? (float)$r['resistance3'] : null, "pct" => $r['resistance3_pct'] !== null ? (float)$r['resistance3_pct'] : null],
        ],
        "supports" => [
            $r['support1'] !== null ? (float)$r['support1'] : null,
            $r['support2'] !== null ? (float)$r['support2'] : null,
            $r['support3'] !== null ? (float)$r['support3'] : null,
        ],
        "validityHours" => (int)$r['validity_hours'],
        "createdBy" => $r['created_by'],
        "createdAt" => $r['created_at'],
        "market" => ($hasRecMkt && mc_valid($r['market'] ?? '')) ? $r['market'] : 'مصر',
    ];
}
echo json_encode(["success" => true, "recommendations" => $rows]);
?>
