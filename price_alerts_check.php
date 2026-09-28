<?php
/* =====================================================================
   GRIFFINE — price_alerts_check.php (الإصدار 88)
   فحص تنبيهات الأسعار لكل العملاء (تنبيه جوه الموقع + إيميل لما السعر يوصل لمستوى في خطة العميل)
   الاستخدام: Cron Job في هوستنجر كل 15 دقيقة وقت التداول:
     https://griffine.store/price_alerts_check.php?key=<CRON_KEY من griffine_config.php>
   (العميل كمان بيتفحص فورًا أول ما يفتح الموقع - الـ Cron للي مفتحش الموقع)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_lib.php';

$key = defined('CRON_KEY') ? (string)CRON_KEY : '';
$okKey = $key !== '' && isset($_GET['key']) && hash_equals($key, (string)$_GET['key']);
$okAdmin = !empty($_SESSION['user_email']) && !empty($_SESSION['is_admin']);
if (!$okKey && !$okAdmin) { http_response_code(403); echo json_encode(["success" => false, "message" => "غير مصرح."]); exit(); }
session_write_close();
@set_time_limit(120);
try {
    $fired = mk_check_targets($conn, null, 80);
    echo json_encode(["success" => true, "fired" => $fired, "at" => date('c')]);
} catch (Throwable $e) {
    error_log('GRIFFINE price_alerts_check: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "حدث خطأ - تأكد من تشغيل ALL_SCHEMA_UPDATES.sql (الإصدار 88)."]);
}
?>
