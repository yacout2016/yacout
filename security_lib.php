<?php
/* =====================================================================
   GRIFFINE — security_lib.php (الإصدار 84)
   ---------------------------------------------------------------------
   01. site_config: إعدادات نصية بيتحكم فيها الأدمن من لوحة التحكم
       (رقم الخدمة، طرق الدفع، بيانات Paymob، رابط دخول الإدارة، OTP، مزود الرسائل)
   02. رابط دخول الإدارة السري (حسابات الأدمن والموظفين مبتدخلش من صفحة الدخول العادية)
   03. كود التحقق OTP (بالإيميل أو SMS) - للأدمن و/أو العملاء حسب رغبة الأدمن
   04. إرسال SMS عن طريق أي مزود (رابط HTTP بقالب {phone} و {message})
   05. إتمام تسجيل الدخول (تجديد رقم الجلسة session_regenerate_id)
   ===================================================================== */

/* ---------------------------------------------------------------------
   01. site_config — مفتاح/قيمة نصية. لو الجدول بعد متعملش (ملف SQL متشغّلش) بترجع الافتراضي
   --------------------------------------------------------------------- */
function site_config_defaults(){
    return [
        // رقم الخدمة: رقم استقبال تحويلات فودافون كاش + بيظهر في رسائل الكود للتواصل
        'service_phone'      => '00201095125325',
        'instapay_address'   => '',          // فارغ = نفس رقم الخدمة
        // طرق الدفع
        'pay_vodafone'       => '1',
        'pay_instapay'       => '1',
        'pay_paymob'         => '0',
        'paymob_api_key'     => '',
        'paymob_integration' => '',          // Integration ID بتاع الكروت (Visa / Mastercard / Meeza)
        'paymob_iframe'      => '',
        'paymob_hmac'        => '',
        'paymob_moto_integration' => '',     // الإصدار 88: Integration ID للخصم التلقائي (MOTO) - التجديد التلقائي
        // الدخول والأمان
        'admin_gate_key'     => '',          // فارغ = رابط الإدارة السري مقفول (الدخول العادي زي الأول)
        'admin_otp'          => '0',         // كود تحقق لحسابات الإدارة
        'otp_login'          => '0',         // كود تحقق للعملاء عند الدخول
        'otp_channel'        => 'email',     // email | sms | whatsapp
        // الإصدار 88: واتساب من رقم الموقع (WhatsApp Business Cloud API من Meta)
        'wa_phone_id'        => '',          // Phone Number ID لرقم الموقع في Meta
        'wa_token'           => '',          // Access Token (سر)
        'wa_template'        => '',          // اسم قالب الكود (Authentication) المعتمد من Meta
        'wa_lang'            => 'ar',
        'sms_url'            => '',          // رابط مزود الرسائل بـ {phone} و {message}
        'sms_method'         => 'GET',       // GET | POST
    ];
}
// المفاتيح السرية اللي عمرها ما بتترجع للمتصفح (بيترجع بس إنها متسجّلة ولا لأ)
function site_config_secret_keys(){ return ['paymob_api_key', 'paymob_hmac', 'sms_url', 'wa_token']; }

function site_config_all($conn, $fresh = false){
    static $cache = null;
    if ($cache !== null && !$fresh) return $cache;
    $cache = site_config_defaults();
    try {
        $res = $conn->query("SELECT config_key, config_value FROM site_config");
        while ($res && ($r = $res->fetch_assoc())) {
            if (array_key_exists($r['config_key'], $cache)) $cache[$r['config_key']] = (string)$r['config_value'];
        }
    } catch (Throwable $e) { /* الجدول بعد متعملش */ }
    return $cache;
}
function site_config_get($conn, $key){ $all = site_config_all($conn); return $all[$key] ?? ''; }
function site_config_on($conn, $key){ return site_config_get($conn, $key) === '1'; }
function site_config_set($conn, $key, $value, $by = null){
    if (!array_key_exists($key, site_config_defaults())) return false;
    $v = (string)$value;
    $st = $conn->prepare("INSERT INTO site_config (config_key, config_value, updated_by) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by = VALUES(updated_by)");
    $st->bind_param("sss", $key, $v, $by); $st->execute(); $st->close();
    site_config_all($conn, true);
    return true;
}
function service_phone($conn){ return site_config_get($conn, 'service_phone') ?: site_config_defaults()['service_phone']; }

/* ---------------------------------------------------------------------
   02. رابط دخول الإدارة السري
   - الأدمن بيفعّله من لوحة التحكم ← بيتولّد مفتاح عشوائي والرابط يبقى https://griffine.store/?panel=<المفتاح>
   - فتح الرابط بيفتح "بوابة الإدارة" في الجلسة لمدة 30 دقيقة
   - حسابات الإدارة/الموظفين من غير البوابة ← "البريد أو كلمة المرور غير صحيحة" (من غير ما نكشف إن الحساب إداري)
   --------------------------------------------------------------------- */
const ADMIN_GATE_TTL = 1800;
function admin_gate_enabled($conn){ return site_config_get($conn, 'admin_gate_key') !== ''; }
function admin_gate_try_open($conn, $key){
    $real = site_config_get($conn, 'admin_gate_key');
    if ($real === '' || !is_string($key) || $key === '' || !hash_equals($real, $key)) return false;
    $_SESSION['admin_gate_at'] = time();
    return true;
}
function admin_gate_is_open(){ return !empty($_SESSION['admin_gate_at']) && (time() - (int)$_SESSION['admin_gate_at']) < ADMIN_GATE_TTL; }
function admin_gate_url($conn){
    $k = site_config_get($conn, 'admin_gate_key');
    return $k === '' ? '' : rtrim(MAIL_SITE_URL, '/') . '/?panel=' . rawurlencode($k);
}

/* ---------------------------------------------------------------------
   03. كود التحقق OTP
   الكود 6 أرقام، صالح 10 دقايق، 5 محاولات بحد أقصى، وبيتخزّن مشفّر (hash) في الجلسة بس
   --------------------------------------------------------------------- */
const OTP_TTL = 600;
const OTP_MAX_TRIES = 5;
function otp_required_for($conn, $isStaff){ return $isStaff ? site_config_on($conn, 'admin_otp') : site_config_on($conn, 'otp_login'); }

// رقم موبايل الحساب (من آخر اشتراك) - للإرسال بـ SMS
function account_phone($conn, $email){
    try {
        $st = $conn->prepare("SELECT phone FROM subscribers WHERE account_email = ? AND phone IS NOT NULL AND phone <> '' ORDER BY id DESC LIMIT 1");
        $st->bind_param("s", $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        return $r ? $r['phone'] : '';
    } catch (Throwable $e) { return ''; }
}
function mask_email($e){ $p = explode('@', $e); return mb_substr($p[0], 0, 2) . '•••@' . ($p[1] ?? ''); }
function mask_phone($p){ $d = preg_replace('/\D/', '', $p); return strlen($d) > 4 ? '•••••' . substr($d, -4) : $d; }

/* بيبدأ خطوة الكود: بيولّد الكود ويبعته ويخزّن "دخول معلّق" في الجلسة. بيرجّع [ok, channel, to, error] */
function otp_start($conn, $email, $isAdmin){
    $code = (string)random_int(100000, 999999);
    $channel = 'email'; $to = $email; $sent = false; $err = '';
    $service = service_phone($conn);
    $msg = "كود الدخول لـ GRIFFINE: $code (صالح 10 دقائق). لا تشاركه مع أحد. للاستفسار: $service";

    $ch = site_config_get($conn, 'otp_channel');
    if ($ch === 'sms' || $ch === 'whatsapp') {
        $phone = account_phone($conn, $email);
        if ($phone !== '') {
            $r = $ch === 'whatsapp' ? wa_send_code($conn, $phone, $code) : sms_send($conn, $phone, $msg);
            if ($r['ok']) { $channel = $ch; $to = $phone; $sent = true; }
            else $err = $r['error'];
        }
    }
    if (!$sent) {   // الإيميل: الأساس، واحتياطي لو لا يوجد رقم أو الرسالة فشلت
        // العنوان من غير الكود (العناوين بتتسجّل في سجل الإيميلات اللي بيشوفه فريق الإدارة) - الكود جوه الرسالة بس
        $res = griffine_notify($conn, $email, 'كود الدخول لـ GRIFFINE', 'كود التحقق لتسجيل الدخول', [
            "كود الدخول الخاص بك: $code",
            'الكود صالح لمدة 10 دقائق. إذا لم تكن أنت من يحاول الدخول، فغيّر كلمة المرور فورًا.',
            "للاستفسار: $service",
        ], null, 'otp');
        $sent = !empty($res['ok']);
        if (!$sent) $err = $res['error'] ?: $err;
    }
    if (!$sent) return [false, $channel, '', $err ?: 'تعذّر إرسال الكود'];

    $_SESSION['otp_pending'] = [
        'email' => $email, 'is_admin' => (int)$isAdmin,
        'hash' => password_hash($code, PASSWORD_DEFAULT), 'at' => time(), 'tries' => 0,
    ];
    return [true, $channel, $channel === 'email' ? mask_email($to) : mask_phone($to), ''];
}
/* بيتحقق من الكود: بيرجّع [ok, message] ولو صح بيكمّل الدخول */
function otp_verify($conn, $code){
    $p = $_SESSION['otp_pending'] ?? null;
    if (!$p) return [false, 'ابدأ تسجيل الدخول من الأول.'];
    if (time() - (int)$p['at'] > OTP_TTL) { unset($_SESSION['otp_pending']); return [false, 'انتهت صلاحية الكود - سجّل الدخول مرة أخرى.']; }
    if ((int)$p['tries'] >= OTP_MAX_TRIES) { unset($_SESSION['otp_pending']); return [false, 'محاولات كثيرة - سجّل الدخول مرة أخرى.']; }
    $_SESSION['otp_pending']['tries'] = (int)$p['tries'] + 1;
    $code = preg_replace('/\D/', '', (string)$code);
    if (strlen($code) !== 6 || !password_verify($code, $p['hash'])) {
        recordLoginFailure($conn, $p['email']);
        return [false, 'الكود غير صحيح.'];
    }
    unset($_SESSION['otp_pending']);
    login_complete($p['email'], (int)$p['is_admin']);
    return [true, ''];
}

/* ---------------------------------------------------------------------
   04. إرسال SMS — أي مزود رسائل مصري أو عالمي بيدّي رابط API
   مثال: https://مزود.com/api/send?user=XX&pass=YY&sender=GRIFFINE&to={phone}&msg={message}
   {phone} بيتحوّل لرقم دولي (2010xxxxxxxx) و {message} لنص الرسالة (مشفّرين للرابط)
   --------------------------------------------------------------------- */
function sms_normalize_phone($p){
    $d = preg_replace('/\D/', '', (string)$p);
    if (strpos($d, '00') === 0) $d = substr($d, 2);
    if (strlen($d) === 11 && $d[0] === '0') $d = '2' . $d;       // 010xxxxxxxx ← 2010xxxxxxxx
    return $d;
}
function sms_send($conn, $phone, $message){
    $tpl = trim(site_config_get($conn, 'sms_url'));
    if ($tpl === '' || !preg_match('#^https?://#i', $tpl)) return ['ok' => false, 'error' => 'مزود الرسائل غير مضبوط'];
    $num = sms_normalize_phone($phone);
    if (strlen($num) < 10) return ['ok' => false, 'error' => 'رقم الموبايل غير صالح'];
    $post = strtoupper(site_config_get($conn, 'sms_method')) === 'POST';
    $url = str_replace(['{phone}', '{message}'], [rawurlencode($num), rawurlencode($message)], $tpl);
    $ch = curl_init();
    if ($post) {
        $parts = explode('?', $url, 2);
        curl_setopt($ch, CURLOPT_URL, $parts[0]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $parts[1] ?? '');
    } else curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);
    if ($body === false || $code < 200 || $code >= 300) {
        error_log("GRIFFINE sms_send: HTTP $code $cerr " . mb_substr((string)$body, 0, 200));
        return ['ok' => false, 'error' => 'مزود الرسائل رد بخطأ (HTTP ' . $code . ')'];
    }
    return ['ok' => true, 'error' => '', 'response' => mb_substr((string)$body, 0, 300)];
}

/* ---------------------------------------------------------------------
   06. طرق الدفع (الإصدار 84)
   vodafone = فودافون كاش + صورة التحويل · instapay = إنستاباي + صورة التحويل · paymob = فيزا/ماستركارد/ميزة أونلاين
   (wallet / bank / card أسماء قديمة بتفضل مقبولة للطلبات القديمة وبتتعرض في لوحة التحكم)
   --------------------------------------------------------------------- */
function is_transfer_method($m){ return in_array($m, ['vodafone', 'instapay', 'wallet', 'bank'], true); }
function payment_method_allowed($conn, $m){
    if ($m === 'vodafone') return site_config_on($conn, 'pay_vodafone');
    if ($m === 'instapay') return site_config_on($conn, 'pay_instapay');
    if ($m === 'paymob')   return paymob_enabled($conn);
    return false;
}
// التجربة المجانية مرة واحدة لكل رقم موبايل (بنقارن آخر 10 أرقام عشان 010… و +2010… يبقوا نفس الرقم)
function phone_used_trial($conn, $phone){
    $d = preg_replace('/\D/', '', (string)$phone);
    if (strlen($d) < 8) return false;
    $tail = substr($d, -10);
    $res = $conn->query("SELECT phone FROM subscribers WHERE amount <= 0 AND phone IS NOT NULL AND phone <> ''");
    while ($res && ($r = $res->fetch_assoc())) { if (substr(preg_replace('/\D/', '', $r['phone']), -10) === $tail) return true; }
    return false;
}

/* ---------------------------------------------------------------------
   07. واتساب من رقم الموقع (الإصدار 88) — WhatsApp Business Cloud API
   رقم الموقع (رقم الخدمة) بيتسجّل مرة واحدة في Meta Business ← بياخد Phone Number ID و Access Token
   وقالب رسالة من نوع Authentication (فيه الكود). الرسالة بتوصل للعميل على واتساب من رقم الموقع نفسه.
   --------------------------------------------------------------------- */
if (!defined('WA_GRAPH_BASE')) define('WA_GRAPH_BASE', 'https://graph.facebook.com/v20.0');
function wa_ready($conn){ return site_config_get($conn, 'wa_phone_id') !== '' && site_config_get($conn, 'wa_token') !== '' && site_config_get($conn, 'wa_template') !== ''; }
function wa_send_code($conn, $phone, $code){
    if (!wa_ready($conn)) return ['ok' => false, 'error' => 'واتساب رقم الموقع غير مضبوط'];
    $to = sms_normalize_phone($phone);
    if (strlen($to) < 10) return ['ok' => false, 'error' => 'رقم الموبايل غير صالح'];
    $payload = [
        'messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template',
        'template' => [
            'name' => site_config_get($conn, 'wa_template'),
            'language' => ['code' => site_config_get($conn, 'wa_lang') ?: 'ar'],
            'components' => [
                ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => (string)$code]]],
                // قوالب Authentication فيها زرار "نسخ الكود" ومحتاج نفس الكود
                ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [['type' => 'text', 'text' => (string)$code]]],
            ],
        ],
    ];
    $ch = curl_init(rtrim(WA_GRAPH_BASE, '/') . '/' . rawurlencode(site_config_get($conn, 'wa_phone_id')) . '/messages');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . site_config_get($conn, 'wa_token')],
        CURLOPT_POSTFIELDS => json_encode($payload)]);
    $body = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string)$body, true);
    if ($http >= 200 && $http < 300 && !empty($j['messages'][0]['id'])) return ['ok' => true, 'error' => '', 'response' => $j['messages'][0]['id']];
    error_log('GRIFFINE wa_send: HTTP ' . $http . ' ' . mb_substr((string)$body, 0, 300));
    return ['ok' => false, 'error' => 'واتساب رد بخطأ' . (isset($j['error']['message']) ? ': ' . mb_substr($j['error']['message'], 0, 120) : ' (HTTP ' . $http . ')')];
}

/* ---------------------------------------------------------------------
   05. إتمام تسجيل الدخول — رقم جلسة جديد عشان محدش يثبّت جلسة مسبقًا (session fixation)
   --------------------------------------------------------------------- */
function login_complete($email, $isAdmin){
    // الإصدار 87: false = رقم جلسة جديد من غير ما نمسح القديمة فورًا (المسح الفوري كان بيضيّع الجلسة
    // في المتصفحات اللي شايلة كوكي قديم - والحماية من تثبيت الجلسة بعد شغالة لأن الرقم بيتغيّر)
    session_regenerate_id(false);
    $_SESSION['user_email'] = $email;
    $_SESSION['is_admin'] = (int)$isAdmin;
    $_SESSION['login_at'] = time();
    unset($_SESSION['otp_pending'], $_SESSION['admin_gate_at']);
}
?>
