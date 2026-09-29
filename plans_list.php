<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

// الإصدار 96: باقات بورصة الحساب بس (الزائر ← ?market= من الأسواق المفعّلة أو أول سوق مفعّل)
require_once __DIR__ . '/markets_core.php';
$email = $_SESSION['user_email'] ?? null; session_write_close();
$mkt = $email ? mc_account_market($conn, $email) : (in_array($_GET['market'] ?? '', mc_active($conn), true) ? $_GET['market'] : mc_active($conn)[0]);
$hasMkt = false; try { $c = $conn->query("SHOW COLUMNS FROM subscription_plans LIKE 'market'"); $hasMkt = $c && $c->num_rows > 0; } catch (Throwable $e) {}
if ($hasMkt) { $st = $conn->prepare("SELECT * FROM subscription_plans WHERE is_active = 1 AND market = ? ORDER BY sort_order ASC, id ASC"); $st->bind_param("s", $mkt); $st->execute(); $result = $st->get_result(); }
else $result = $conn->query("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
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
        "market" => $r['market'] ?? 'مصر',
        "currency" => mc_ccy($r['market'] ?? 'مصر'),
        "ccyAr" => MC_MARKETS[$r['market'] ?? 'مصر']['ccyAr'] ?? '',
    ];
}
echo json_encode(["success" => true, "market" => $mkt, "currency" => mc_ccy($mkt), "ccyAr" => MC_MARKETS[$mkt]["ccyAr"], "plans" => $plans], JSON_UNESCAPED_UNICODE);
?>
