<?php
/* =====================================================================
   GRIFFINE — renew_subscriptions.php (الإصدار 88) — التجديد التلقائي (Cron مرة يوميًا)
   https://griffine.store/renew_subscriptions.php?key=<CRON_KEY>
   بيجدّد الاشتراكات المدفوعة اللي فاضل عليها يوم أو خلصت، وصاحبها مفعّل "التجديد التلقائي" وعنده كارت محفوظ.
   كل اشتراك بيتحاول مرة واحدة كل 24 ساعة، ولو الخصم فشل بيوصل للعميل إيميل يجدّد يدويًا.
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

$key = defined('CRON_KEY') ? (string)CRON_KEY : '';
$okKey = $key !== '' && isset($_GET['key']) && hash_equals($key, (string)$_GET['key']);
$okAdmin = !empty($_SESSION['user_email']) && !empty($_SESSION['is_admin']);
if (!$okKey && !$okAdmin) { http_response_code(403); echo json_encode(["success" => false, "message" => "غير مصرح."]); exit(); }
session_write_close();
@set_time_limit(180);
$done = 0; $failed = 0; $skipped = 0;
try {
    if (!paymob_moto_ready($conn)) { echo json_encode(["success" => true, "message" => "التجديد التلقائي غير مفعّل (Integration MOTO)", "renewed" => 0]); exit(); }
    $res = $conn->query("SELECT s.* FROM subscribers s
        WHERE s.archived = 0 AND s.auto_renew = 1 AND s.amount > 0 AND s.end_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND NOT EXISTS (SELECT 1 FROM payment_orders o WHERE o.kind = 'renew' AND o.subscriber_id = s.id AND o.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR))
        ORDER BY s.end_date LIMIT 50");
    while ($sub = $res->fetch_assoc()) {
        $card = paymob_card_of($conn, $sub['account_email']);
        if (!$card) { $skipped++; continue; }
        [$ok, $msg] = paymob_charge_renewal($conn, $sub, $card);
        if ($ok) { $done++; continue; }
        $failed++;
        try { griffine_notify($conn, $sub['account_email'], 'تعذّر تجديد اشتراكك تلقائيًا', 'تعذّر التجديد التلقائي',
            ["حاولنا تجديد اشتراكك ({$sub['plan_name']}) من كارتك المحفوظ ولم تتم العملية: $msg.", 'يمكنك التجديد يدويًا من صفحة الاشتراك والباقات قبل انتهاء الاشتراك.'],
            ['label' => 'تجديد الاشتراك', 'url' => MAIL_SITE_URL . '/index.php'], 'renewal_failed'); } catch (Throwable $e) {}
    }
    echo json_encode(["success" => true, "renewed" => $done, "failed" => $failed, "skipped" => $skipped]);
} catch (Throwable $e) {
    error_log('GRIFFINE renew_subscriptions: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "حدث خطأ - تأكد من تشغيل ALL_SCHEMA_UPDATES.sql (الإصدار 88)."]);
}
?>
