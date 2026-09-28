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
requirePermission($conn, 'view_reports');

// الإيرادات شهريًا (آخر 12 شهر)
$revenueByMonth = [];
$res = $conn->query("SELECT DATE_FORMAT(event_date, '%Y-%m') AS ym, SUM(amount) AS total
    FROM subscription_events
    WHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY ym ORDER BY ym ASC");
while ($r = $res->fetch_assoc()) {
    $revenueByMonth[] = ["month" => $r['ym'], "total" => (float)$r['total']];
}

// اشتراكات جديدة شهريًا (آخر 12 شهر)
$signupsByMonth = [];
$res = $conn->query("SELECT DATE_FORMAT(event_date, '%Y-%m') AS ym, COUNT(*) AS cnt
    FROM subscription_events
    WHERE event_type = 'new_subscription' AND event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY ym ORDER BY ym ASC");
while ($r = $res->fetch_assoc()) {
    $signupsByMonth[] = ["month" => $r['ym'], "count" => (int)$r['cnt']];
}

// توزيع الإيرادات حسب الباقة (كل الأوقات)
$byPlan = [];
$res = $conn->query("SELECT plan_name, COUNT(*) AS cnt, SUM(amount) AS total
    FROM subscription_events GROUP BY plan_name ORDER BY total DESC");
while ($r = $res->fetch_assoc()) {
    $byPlan[] = ["planName" => $r['plan_name'], "count" => (int)$r['cnt'], "total" => (float)$r['total']];
}

// عدد المشتركين النشطين مقابل الموقوفين (اللقطة الحالية)
$activeCount = 0; $inactiveCount = 0;
$res = $conn->query("SELECT active, COUNT(*) AS cnt FROM subscribers WHERE archived = 0 GROUP BY active");
while ($r = $res->fetch_assoc()) {
    if ((int)$r['active'] === 1) $activeCount = (int)$r['cnt']; else $inactiveCount = (int)$r['cnt'];
}

echo json_encode([
    "success" => true,
    "revenueByMonth" => $revenueByMonth,
    "signupsByMonth" => $signupsByMonth,
    "byPlan" => $byPlan,
    "activeCount" => $activeCount,
    "inactiveCount" => $inactiveCount,
]);
?>
