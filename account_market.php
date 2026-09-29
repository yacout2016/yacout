<?php
/* =====================================================================
   GRIFFINE — account_market.php (الإصدار 96)
   GET ← سوق الحساب الحالي وعملته + الأسواق المفعّلة (شاشة التسجيل والواجهة بتستخدمهم)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_core.php';
$email = $_SESSION['user_email'] ?? null;
$isAdmin = !empty($_SESSION['is_admin']);
session_write_close();
$active = mc_active($conn);
$m = mc_account_market($conn, $email);
$markets = [];
foreach (MC_MARKETS as $name => $x) $markets[$name] = ['code' => $x['code'], 'ccy' => $x['ccy'], 'ccyAr' => $x['ccyAr'], 'short' => $x['short'], 'active' => in_array($name, $active, true)];
echo json_encode(["success" => true, "loggedIn" => (bool)$email, "isAdmin" => $isAdmin, "market" => $m, "currency" => mc_ccy($m), "ccyAr" => MC_MARKETS[$m]['ccyAr'],
    "active" => $active, "markets" => $markets, "payment" => $email ? mc_payment($conn, $m) : null], JSON_UNESCAPED_UNICODE);
?>
