<?php
/* =====================================================================
   GRIFFINE — site_public_config.php (الإصدار 84)
   الإعدادات العامة اللي صفحة الدفع محتاجاها (من غير أي أسرار):
   رقم الخدمة (فودافون كاش)، عنوان إنستاباي، وطرق الدفع المفعّلة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

$phone = service_phone($conn);
echo json_encode(["success" => true, "config" => [
    "servicePhone"    => $phone,
    "instapayAddress" => site_config_get($conn, 'instapay_address') ?: $phone,
    "payVodafone"     => site_config_on($conn, 'pay_vodafone'),
    "payInstapay"     => site_config_on($conn, 'pay_instapay'),
    "payPaymob"       => site_config_on($conn, 'pay_paymob') && paymob_ready($conn),
    "versionLabel"    => site_config_get($conn, 'app_version_label'),   // الإصدار 96
    // الإصدار 102: رقم بناء الملفات اللي على السيرفر - الجهاز اللي شغال بنسخة أقدم بيحدّث نفسه تلقائيًا
    "build"           => 145,
    // الإصدار 100: الشاشات الطارئة + وضع الصيانة + الدعاية (العروض والبانرات)
    "emergency"       => json_decode(site_config_get($conn, 'emergency_cfg') ?: 'null', true),
    "maintenance"     => site_config_on($conn, 'maint_on'),
    "ads"             => json_decode(site_config_get($conn, 'ads_cfg') ?: 'null', true),
]], JSON_UNESCAPED_UNICODE);
?>
