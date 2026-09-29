<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_plans');

$result = $conn->query("SELECT * FROM subscription_plans ORDER BY sort_order ASC, id ASC");
$plans = [];
while ($r = $result->fetch_assoc()) {
    $plans[] = [
        "id" => $r['id'],
        "name" => $r['name'],
        "amount" => (float)$r['amount'],
        "periodLabel" => $r['period_label'],
        "durationDays" => (int)$r['duration_days'],
        "badge" => $r['badge'],
        "saveNote" => $r['save_note'],
        "features" => json_decode($r['features'] ?: '[]'),
        "isActive" => (bool)$r['is_active'],
        "sortOrder" => (int)$r['sort_order'],
        "market" => $r['market'] ?? 'مصر',
    ];
}
echo json_encode(["success" => true, "plans" => $plans]);
?>
