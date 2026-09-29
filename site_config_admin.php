<?php
/* =====================================================================
   GRIFFINE — site_config_admin.php (الإصدار 84) — لوحة التحكم ← الدخول والأمان + الدفع ورقم الخدمة
   GET  ← كل الإعدادات (الأسرار بترجع "متسجّلة ✓" بس، عمرها ما بترجع قيمتها)
   POST action=save   + أي مفاتيح من site_config (القيمة الفاضية لسرّ = سيبه كما هو)
        action=gate_new   ← توليد رابط دخول إدارة سري جديد (القديم بيبطل فورًا)
        action=gate_off   ← إيقاف الرابط السري (الدخول العادي زي الأول)
        action=sms_test   + phone ← رسالة تجريبية من مزود الرسائل
   الصلاحية: manage_admin_settings
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_admin_settings');

function emg_txt($v, $n){ return mb_substr(trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F<>]/u', '', (string)$v)), 0, $n); }
function emg_clean($d){
    $out = [];
    foreach (['maint', 'offline', 'down', 'slow'] as $k) {
        $x = is_array($d[$k] ?? null) ? $d[$k] : [];
        $o = ['on' => !isset($x['on']) || !empty($x['on']), 'title' => emg_txt($x['title'] ?? '', 80), 'body' => emg_txt($x['body'] ?? '', 400)];
        if ($k === 'slow') { $o['after'] = max(1, min(30, (int)($x['after'] ?? 4))); $o['count'] = max(3, min(120, (int)($x['count'] ?? 10))); $o['logo'] = !isset($x['logo']) || !empty($x['logo']); }
        if ($o['title'] === '') unset($o['title']); if ($o['body'] === '') unset($o['body']);
        $out[$k] = $o;
    }
    return $out;
}
function ads_clean($d){
    $list = [];
    foreach (array_slice(is_array($d['items'] ?? null) ? $d['items'] : [], 0, 30) as $x) {
        if (!is_array($x)) continue;
        $type = in_array($x['type'] ?? '', ['banner', 'popup', 'marquee'], true) ? $x['type'] : 'banner';
        $aud = in_array($x['audience'] ?? '', ['all', 'visitors', 'no_sub', 'subscribers', 'upsell', 'downsell', 'expiring'], true) ? $x['audience'] : 'all';
        $cta = in_array($x['cta'] ?? '', ['none', 'plans', 'plan', 'url', 'register'], true) ? $x['cta'] : 'none';
        $url = trim((string)($x['url'] ?? '')); if ($cta === 'url' && !preg_match('#^https://#i', $url)) $url = '';
        $list[] = [
            'id' => preg_match('/^[a-z0-9]{4,20}$/', $x['id'] ?? '') ? $x['id'] : substr(md5(uniqid('', true)), 0, 10),
            'on' => !empty($x['on']), 'type' => $type, 'audience' => $aud,
            'title' => emg_txt($x['title'] ?? '', 90), 'body' => emg_txt($x['body'] ?? '', 300),
            'ctaLabel' => emg_txt($x['ctaLabel'] ?? '', 40), 'cta' => $cta, 'plan' => preg_match('/^[a-zA-Z0-9_]{0,40}$/', $x['plan'] ?? '') ? ($x['plan'] ?? '') : '', 'url' => mb_substr($url, 0, 300),
            'every' => max(0, min(10080, (int)($x['every'] ?? 0))),          // الإعلان المنبثق: يظهر مرة كل كام دقيقة (0 = مرة واحدة بس)
            'from' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $x['from'] ?? '') ? $x['from'] : '', 'to' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $x['to'] ?? '') ? $x['to'] : '',
            'color' => preg_match('/^#[0-9a-fA-F]{6}$/', $x['color'] ?? '') ? $x['color'] : '',
        ];
    }
    return ['items' => $list];
}
function cfg_out($conn){
    $all = site_config_all($conn, true);
    foreach (site_config_secret_keys() as $k) { $all[$k . '_set'] = $all[$k] !== ''; $all[$k] = ''; }
    $all['admin_gate_url'] = admin_gate_url($conn);
    $all['paymob_callback_url'] = rtrim(MAIL_SITE_URL, '/') . '/paymob_callback.php';
    $all['paymob_ready'] = paymob_ready($conn);
    $all['wa_ready'] = wa_ready($conn);
    $all['smtp_ready'] = defined('MAIL_SMTP_PASS') && MAIL_SMTP_PASS !== '';
    unset($all['admin_gate_key']);
    return $all;
}
try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(["success" => true, "config" => cfg_out($conn)], JSON_UNESCAPED_UNICODE); exit(); }
    requireCsrf();
    $by = $_SESSION['user_email'];
    $action = $_POST['action'] ?? 'save';

    if ($action === 'gate_new') {
        site_config_set($conn, 'admin_gate_key', bin2hex(random_bytes(12)), $by);
        admin_gate_try_open($conn, site_config_get($conn, 'admin_gate_key'));   // اللي فعّله ميتقفلش برّه في الجلسة دي
    } elseif ($action === 'gate_off') {
        site_config_set($conn, 'admin_gate_key', '', $by);
    } elseif ($action === 'wa_test') {
        $r = wa_send_code($conn, trim($_POST['phone'] ?? ''), '123456');
        echo json_encode(["success" => $r['ok'], "message" => $r['ok'] ? 'تم إرسال رسالة واتساب تجريبية ✓ (الكود 123456)' : $r['error']], JSON_UNESCAPED_UNICODE);
        exit();
    } elseif ($action === 'sms_test') {
        $r = sms_send($conn, trim($_POST['phone'] ?? ''), 'رسالة تجريبية من GRIFFINE ✓');
        echo json_encode(["success" => $r['ok'], "message" => $r['ok'] ? 'تم إرسال الرسالة ✓ (رد المزود: ' . ($r['response'] ?? '') . ')' : $r['error']], JSON_UNESCAPED_UNICODE);
        exit();
    } else {
        $bools = ['pay_vodafone', 'pay_instapay', 'pay_paymob', 'admin_otp', 'otp_login', 'maint_on'];
        // الإصدار 100: الشاشات الطارئة والدعاية (JSON منضّف)
        foreach (['emergency_cfg' => 'emg_clean', 'ads_cfg' => 'ads_clean'] as $jk => $fn) if (isset($_POST[$jk])) {
            $d = json_decode((string)$_POST[$jk], true);
            if (!is_array($d)) { echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]); exit(); }
            site_config_set($conn, $jk, json_encode($fn($d), JSON_UNESCAPED_UNICODE), $by);
        }
        // الإصدار 96: طرق الدفع لكل سوق
        foreach (['eg', 'sa', 'ae', 'qa', 'kw'] as $mc) { $bools[] = "bank_on_$mc"; $bools[] = "extra_on_$mc"; }
        $texts = ['service_phone', 'instapay_address', 'paymob_integration', 'paymob_iframe', 'otp_channel', 'sms_method', 'wa_phone_id', 'wa_template', 'wa_lang', 'paymob_moto_integration', 'app_version_label', 'active_markets'];
        foreach (['eg', 'sa', 'ae', 'qa', 'kw'] as $mc) foreach (['bank_name', 'bank_holder', 'bank_iban', 'bank_note', 'extra_label', 'extra_details'] as $f) $texts[] = "{$f}_$mc";
        $secrets = site_config_secret_keys();
        foreach ($bools as $k) if (isset($_POST[$k])) site_config_set($conn, $k, $_POST[$k] === '1' ? '1' : '0', $by);
        foreach ($texts as $k) if (isset($_POST[$k])) {
            $v = trim((string)$_POST[$k]);
            if ($k === 'service_phone' && !preg_match('/^\+?[0-9 ]{8,16}$/', $v)) { echo json_encode(["success" => false, "message" => "رقم الخدمة غير صالح (أرقام بس، مثال 01012345678)."]); exit(); }
            if ($k === 'otp_channel' && !in_array($v, ['email', 'sms', 'whatsapp'], true)) continue;
            if ($k === 'wa_phone_id' && $v !== '' && !ctype_digit($v)) { echo json_encode(["success" => false, "message" => "Phone Number ID أرقام فقط."]); exit(); }
            if ($k === 'wa_template' && $v !== '' && !preg_match('/^[a-z0-9_]{1,64}$/', $v)) { echo json_encode(["success" => false, "message" => "اسم القالب حروف إنجليزي صغيرة وأرقام و _ فقط."]); exit(); }
            if ($k === 'wa_lang' && !preg_match('/^[a-z]{2}(_[A-Z]{2})?$/', $v)) continue;
            if ($k === 'sms_method' && !in_array($v, ['GET', 'POST'], true)) continue;
            if ($k === 'active_markets') { require_once __DIR__ . '/markets_core.php'; $l = array_values(array_filter(array_map('trim', explode(',', $v)), 'mc_valid')); if (!$l) $l = ['مصر']; $v = implode(',', $l); }
            if (preg_match('/^(bank_note|extra_details)_/', $k)) { site_config_set($conn, $k, mb_substr($v, 0, 500), $by); continue; }
            if ($k === 'app_version_label') $v = mb_substr(preg_replace('/[<>"\']/u', '', $v), 0, 30);
            if (in_array($k, ['paymob_integration', 'paymob_iframe', 'paymob_moto_integration'], true) && $v !== '' && !ctype_digit($v)) { echo json_encode(["success" => false, "message" => "Integration ID و Iframe ID أرقام فقط."]); exit(); }
            site_config_set($conn, $k, mb_substr($v, 0, 120), $by);
        }
        foreach ($secrets as $k) if (isset($_POST[$k]) && trim($_POST[$k]) !== '') {
            $v = trim((string)$_POST[$k]);
            if ($k === 'sms_url' && !preg_match('#^https://#i', $v)) { echo json_encode(["success" => false, "message" => "يجب أن يبدأ رابط مزود الرسائل بـ https://"]); exit(); }
            site_config_set($conn, $k, $_POST[$k] === '-' ? '' : mb_substr($v, 0, 2000), $by);   // "-" = مسح
        }
        // Paymob متفعّل بس بياناته ناقصة ← تنبيه للأدمن (مش هيظهر للعملاء)
        if (site_config_on($conn, 'pay_paymob') && !paymob_ready($conn)) {
            echo json_encode(["success" => true, "warning" => "Paymob مفعّل لكن بياناته ناقصة - لن يظهر للعملاء حتى تكملها.", "config" => cfg_out($conn)], JSON_UNESCAPED_UNICODE); exit();
        }
    }
    echo json_encode(["success" => true, "config" => cfg_out($conn)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('GRIFFINE site_config_admin: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "تعذّر الحفظ - تأكد أن ملف ALL_SCHEMA_UPDATES.sql (الإصدار 84) اتشغّل."]);
}
?>
