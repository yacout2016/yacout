<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_core.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_recommendations');

cleanupExpiredRecommendations($conn);

$result = $conn->query("SELECT * FROM recommendations ORDER BY created_at DESC LIMIT 300");
$hasRecMkt = mc_col($conn, 'recommendations', 'market');
$rows = [];
while ($r = $result->fetch_assoc()) {
    $rows[] = [
        "id" => (string)$r['id'],
        "symbol" => $r['symbol'],
        "stockName" => $r['stock_name'],
        "buyFrom" => (float)$r['buy_from'],
        "buyTo" => (float)$r['buy_to'],
        "validityHours" => (int)$r['validity_hours'],
        "status" => $r['status'],
        "createdBy" => $r['created_by'],
        "createdAt" => $r['created_at'],
        "archivedAt" => $r['archived_at'],
        "market" => ($hasRecMkt && mc_valid($r['market'] ?? '')) ? $r['market'] : 'مصر',
    ] + rc_extra($conn, $r);
}
echo json_encode(["success" => true, "recommendations" => $rows]);

// الإصدار 128: بيانات التوصية الجديدة (النوع / المدة / الوقف / الملاحظة) + رسائل المتابعة
function rc_extra($conn, $r){
    $f = fn($k) => isset($r[$k]) && $r[$k] !== null ? (float)$r[$k] : null;
    $o = ["type" => $r['rec_type'] ?? 'buy', "timeframe" => $r['timeframe'] ?? null, "currency" => $r['currency'] ?? null, "pivot" => $f('pivot'), "lastPrice" => $f('last_price'),
        "stop1" => $f('stop1'), "stop1Pct" => $f('stop1_pct'), "stop2" => $f('stop2'), "stop2Pct" => $f('stop2_pct'), "sellPct" => $f('sell_pct'),
        "note" => $r['note'] ?? '', "channels" => $r['channels'] ?? '', "analyst" => $r['analyst_name'] ?? '', "updates" => []];
    try { $st = $conn->prepare("SELECT id, kind, message, created_at FROM recommendation_updates WHERE rec_id = ? ORDER BY id"); $id = (int)$r['id']; $st->bind_param("i", $id); $st->execute();
        foreach ($st->get_result()->fetch_all(MYSQLI_ASSOC) as $u) $o['updates'][] = ['id' => (int)$u['id'], 'kind' => $u['kind'], 'message' => $u['message'], 'at' => $u['created_at']]; $st->close(); } catch (Throwable $e) {}
    return $o;
}
?>
