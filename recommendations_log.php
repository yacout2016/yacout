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
    ];
}
echo json_encode(["success" => true, "recommendations" => $rows]);
?>
