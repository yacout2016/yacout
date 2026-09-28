<?php
header('Content-Type: application/json');
include 'db.php';

$result = $conn->query("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
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
    ];
}
echo json_encode(["success" => true, "plans" => $plans]);
?>
