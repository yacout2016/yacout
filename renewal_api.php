<?php
/* =====================================================================
   GRIFFINE — renewal_api.php (الإصدار 88) — التجديد التلقائي للعميل
   GET  action=status        ← متاح؟ + الكارت المحفوظ (آخر 4 أرقام بس) + حالة التجديد
   POST action=toggle on=1|0 ← تشغيل / إيقاف التجديد التلقائي
   POST action=remove_card   ← مسح الكارت المحفوظ (وإيقاف التجديد)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

function rn_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (empty($_SESSION['user_email'])) { http_response_code(401); rn_out(["success" => false]); }
$email = $_SESSION['user_email'];
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$action = $_GET['action'] ?? $_POST['action'] ?? 'status';
try {
    $st = $conn->prepare("SELECT id, auto_renew, amount FROM subscribers WHERE account_email = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
    $st->bind_param("s", $email); $st->execute(); $sub = $st->get_result()->fetch_assoc(); $st->close();
    $card = paymob_card_of($conn, $email);
    if ($action === 'toggle' && $isPost) {
        if (!$sub) rn_out(["success" => false, "message" => "لا يوجد اشتراك."]);
        $on = ($_POST['on'] ?? '0') === '1' ? 1 : 0;
        if ($on && !$card) rn_out(["success" => false, "message" => "لا يوجد كارت محفوظ - ادفع مرة بالكارت (Paymob) مع اختيار حفظ الكارت أولًا."]);
        if ($on && !paymob_moto_ready($conn)) rn_out(["success" => false, "message" => "التجديد التلقائي غير متاح حاليًا."]);
        $u = $conn->prepare("UPDATE subscribers SET auto_renew = ? WHERE id = ?"); $u->bind_param("ii", $on, $sub['id']); $u->execute(); $u->close();
        rn_out(["success" => true, "autoRenew" => (bool)$on]);
    }
    if ($action === 'remove_card' && $isPost) {
        $d = $conn->prepare("DELETE FROM payment_cards WHERE account_email = ?"); $d->bind_param("s", $email); $d->execute(); $d->close();
        if ($sub) { $u = $conn->prepare("UPDATE subscribers SET auto_renew = 0 WHERE id = ?"); $u->bind_param("i", $sub['id']); $u->execute(); $u->close(); }
        rn_out(["success" => true]);
    }
    rn_out(["success" => true, "available" => paymob_moto_ready($conn), "hasSub" => (bool)$sub, "paid" => $sub && (float)$sub['amount'] > 0,
        "autoRenew" => $sub ? (int)$sub['auto_renew'] === 1 : false,
        "card" => $card ? ["masked" => $card['masked_pan'], "brand" => $card['brand']] : null]);
} catch (Throwable $e) {
    error_log('GRIFFINE renewal_api: ' . $e->getMessage());
    rn_out(["success" => false, "message" => "تأكد من تشغيل ALL_SCHEMA_UPDATES.sql (الإصدار 88)."]);
}
?>
