<?php
/* =====================================================================
   GRIFFINE — price_alerts_check.php (الإصدار 88)
   فحص تنبيهات الأسعار لكل العملاء (تنبيه جوه الموقع + إيميل لما السعر يوصل لمستوى في خطة العميل)
   الاستخدام: Cron Job في هوستنجر كل 15 دقيقة وقت التداول:
     https://www.griffine.app/price_alerts_check.php?key=<CRON_KEY من griffine_config.php>
   (العميل كمان بيتفحص فورًا أول ما يفتح الموقع - الـ Cron للي مفتحش الموقع)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/symbols_lib.php';
require_once __DIR__ . '/opps_lib.php';

$key = defined('CRON_KEY') ? (string)CRON_KEY : '';
$okKey = $key !== '' && isset($_GET['key']) && hash_equals($key, (string)$_GET['key']);
$okAdmin = !empty($_SESSION['user_email']) && !empty($_SESSION['is_admin']);
if (!$okKey && !$okAdmin) { http_response_code(403); echo json_encode(["success" => false, "message" => "غير مصرح."]); exit(); }
session_write_close();
@set_time_limit(120);
try {
    $fired = mk_check_targets($conn, null, 80);
    $custom = 0; try { $custom = mk_check_custom($conn, null, 80); } catch (Throwable $e) { error_log('GRIFFINE custom alerts: ' . $e->getMessage()); }   // الإصدار 89
    // الإصدار 98: حذف الأسهم المكتوبة غلط نهائيًا (كل 6 ساعات بالكتير)
    $sym = null; try { if (sym_auto_due($conn)) { $first = !$conn->query("SELECT 1 FROM site_config WHERE config_key = 'symbols_clean_at'")->fetch_assoc(); $x = sym_clean($conn, $first ? 'now' : 'auto'); $sym = ["deleted" => count($x['deleted'] ?? []), "waiting" => count($x['waiting'] ?? [])]; } } catch (Throwable $e) { error_log('GRIFFINE symbols clean: ' . $e->getMessage()); }
    // الإصدار 101: البحث عن فرص (بيكمّل من مكانه في كل تشغيلة)
    $opps = 0; try { $opps = opp_run($conn, 50); } catch (Throwable $e) { error_log('GRIFFINE opps: ' . $e->getMessage()); }
    echo json_encode(["success" => true, "fired" => $fired, "custom" => $custom, "symbols" => $sym, "opps" => $opps, "at" => date('c')]);
} catch (Throwable $e) {
    error_log('GRIFFINE price_alerts_check: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "حدث خطأ - تأكد من تشغيل ALL_SCHEMA_UPDATES.sql (الإصدار 88)."]);
}
?>
