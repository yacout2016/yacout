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
// الإصدار 129: شاشة التوصيات بتطلب expired=1 ← معاها المنتهية آخر 3 أيام (الجرس والرئيسية من غيرها)
$scope = ($_GET['expired'] ?? '') === '1' ? "(archived = 0 OR (status = 'expired' AND archived_at > DATE_SUB(NOW(), INTERVAL 3 DAY)))" : "archived = 0";

// العميل بيشوف توصيات سوق حسابه بس - الإدارة بتشوف الكل ومعاها عمود السوق
$hasRecMkt = mc_col($conn, 'recommendations', 'market');
if ($hasRecMkt && empty($_SESSION['is_admin'])) {
    $myMkt = mc_account_market($conn, $_SESSION['user_email']);
        $st = $conn->prepare("SELECT * FROM recommendations WHERE $scope AND COALESCE(market, 'مصر') = ? ORDER BY archived, created_at DESC");
    $st->bind_param("s", $myMkt); $st->execute(); $result = $st->get_result();
} else {
    $result = $conn->query("SELECT * FROM recommendations WHERE $scope ORDER BY archived, created_at DESC");
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
    ] + rc_extra($conn, $r);
}
// الإصدار 129: نصوص الكارت من لوحة التحكم (النصوص بس — مفيش أي إعداد حساس)
$cfg = function_exists('rc_cfg') ? array_filter(rc_cfg($conn), fn($k) => strpos($k, 't_') === 0, ARRAY_FILTER_USE_KEY) : null;
echo json_encode(["success" => true, "recommendations" => $rows] + ($cfg ? ["cfg" => $cfg] : []));

// الإصدار 128: بيانات التوصية الجديدة (النوع / المدة / الوقف / الملاحظة) + رسائل المتابعة
function rc_extra($conn, $r){
    $f = fn($k) => isset($r[$k]) && $r[$k] !== null ? (float)$r[$k] : null;
    $att = array_values(array_filter(explode(',', (string)($r['attach'] ?? ''))));
    $img = fn($n) => !empty($r['img_key']) && in_array($n, $att, true) ? '/rec_img.php?k=' . $r['img_key'] . '&n=' . $n : null;
    $o = ["type" => $r['rec_type'] ?? 'buy', "timeframe" => $r['timeframe'] ?? null, "currency" => $r['currency'] ?? null, "pivot" => $f('pivot'), "lastPrice" => $f('last_price'),
        "stop1" => $f('stop1'), "stop1Pct" => $f('stop1_pct'), "stop2" => $f('stop2'), "stop2Pct" => $f('stop2_pct'), "stop3" => $f('stop3'), "stop3Pct" => $f('stop3_pct'), "sellPct" => $f('sell_pct'),
        "note" => $r['note'] ?? '', "channels" => $r['channels'] ?? '', "analyst" => $r['analyst_name'] ?? '', "status" => $r['status'] ?? 'active',
        "approvedBy" => $r['approved_by'] ?? null, "approvedAt" => $r['approved_at'] ?? null, "rejectReason" => $r['reject_reason'] ?? '',   // الإصدار 131
        // الإصدار 129: المرفقات (الرسم / فيبوناتشي / رأي بصيرة / المؤشرات) + طويلة المدى + وقت الانتهاء
        "attach" => $att, "chartUrl" => $img('chart'), "fibUrl" => $img('fib'), "aiText" => in_array('ai', $att, true) ? (string)($r['ai_text'] ?? '') : '',
        "indicators" => in_array('ind', $att, true) ? (json_decode((string)($r['indicators'] ?? ''), true) ?: []) : [],
        "long" => function_exists('rc_is_long') ? rc_is_long($conn, (int)$r['validity_hours']) : (int)$r['validity_hours'] >= 336,
        "expiresAt" => date('Y-m-d H:i:s', strtotime($r['created_at']) + 3600 * (int)$r['validity_hours']), "updates" => []];
    try { $st = $conn->prepare("SELECT id, kind, message, created_at FROM recommendation_updates WHERE rec_id = ? ORDER BY id"); $id = (int)$r['id']; $st->bind_param("i", $id); $st->execute();
        foreach ($st->get_result()->fetch_all(MYSQLI_ASSOC) as $u) $o['updates'][] = ['id' => (int)$u['id'], 'kind' => $u['kind'], 'message' => $u['message'], 'at' => $u['created_at']]; $st->close(); } catch (Throwable $e) {}
    return $o;
}
?>
