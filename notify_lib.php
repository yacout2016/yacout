<?php
/* =====================================================================
   GRIFFINE — notify_lib.php (الإصدار 101) — قنوات الإشعارات لكل مستخدم
   ---------------------------------------------------------------------
   كل مشترك / موظف ليه 3 قنوات (الأدمن بيتحكم فيها من جدول المشتركين وجدول الموظفين):
     app   = إشعار جوه الموقع (الجرس + الشات)      ← الافتراضي شغّال
     email = إيميل                                  ← الافتراضي شغّال
     wa    = واتساب (من رقم الموقع - WhatsApp Business) ← الافتراضي مقفول
   - الواتساب كله (الخانات في لوحة التحكم + الإرسال) بيشتغل بس لما الأدمن يفعّل «إرسال الإشعارات على الواتساب»
     ويكون قالب الإشعار مضبوط (wa_notify_template) - لحد ربط الخط البزنس كل حاجة بتاعته مخفية
   - الخانات مبتظهرش للمشتركين غير لو الأدمن أظهرها (لكل المشتركين: notify_prefs_visible ، أو لمشترك بعينه: user_visible)
   - أي قناة مقفولة عند شخص ← إشعاراتها مبتوصلوش، وباقي المشتركين مبيتأثروش
   ===================================================================== */
require_once __DIR__ . '/security_lib.php';

function np_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'notify_prefs'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
// الواتساب مفعّل ومضبوط؟ (المفتاح العام + بيانات Meta + قالب الإشعارات)
function np_wa_on($conn){
    return site_config_on($conn, 'wa_notify_on') && site_config_get($conn, 'wa_phone_id') !== '' && site_config_get($conn, 'wa_token') !== '';
}
function np_wa_visible($conn){ return site_config_on($conn, 'wa_notify_on'); }
function np_get($conn, $email){
    $d = ['app' => true, 'email' => true, 'wa' => false, 'phone' => '', 'visible' => null];
    if (!$email || !np_ready($conn)) return $d;
    $st = $conn->prepare("SELECT app, email, wa, wa_phone, user_visible FROM notify_prefs WHERE account_email = ?"); $st->bind_param("s", $email); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) return $d;
    return ['app' => (int)$r['app'] === 1, 'email' => (int)$r['email'] === 1, 'wa' => (int)$r['wa'] === 1, 'phone' => (string)$r['wa_phone'], 'visible' => $r['user_visible'] === null ? null : (int)$r['user_visible'] === 1];
}
function np_set($conn, $email, $field, $value){
    if (!np_ready($conn) || !in_array($field, ['app', 'email', 'wa', 'wa_phone', 'user_visible'], true)) return false;
    $st = $conn->prepare("INSERT INTO notify_prefs (account_email) VALUES (?) ON DUPLICATE KEY UPDATE account_email = account_email"); $st->bind_param("s", $email); $st->execute(); $st->close();
    if ($field === 'wa_phone') { $v = preg_replace('/[^0-9+]/', '', (string)$value); $u = $conn->prepare("UPDATE notify_prefs SET wa_phone = ? WHERE account_email = ?"); $u->bind_param("ss", $v, $email); }
    elseif ($field === 'user_visible') { if ($value === null || $value === '') { $u = $conn->prepare("UPDATE notify_prefs SET user_visible = NULL WHERE account_email = ?"); $u->bind_param("s", $email); } else { $v = $value ? 1 : 0; $u = $conn->prepare("UPDATE notify_prefs SET user_visible = ? WHERE account_email = ?"); $u->bind_param("is", $v, $email); } }
    else { $v = $value ? 1 : 0; $u = $conn->prepare("UPDATE notify_prefs SET `$field` = ? WHERE account_email = ?"); $u->bind_param("is", $v, $email); }
    $u->execute(); $u->close();
    return true;
}
// إعدادات القنوات ظاهرة للمستخدم نفسه؟
function np_user_can_see($conn, $email){
    $p = np_get($conn, $email);
    if ($p['visible'] !== null) return $p['visible'];
    return site_config_on($conn, 'notify_prefs_visible');
}
// رقم الواتساب: المسجّل في الإعدادات ، ولو فاضي ← رقم آخر اشتراك
function np_phone($conn, $email, $p = null){
    $p = $p ?: np_get($conn, $email);
    if ($p['phone'] !== '') return $p['phone'];
    try { $st = $conn->prepare("SELECT phone FROM subscribers WHERE account_email = ? AND phone <> '' ORDER BY id DESC LIMIT 1"); $st->bind_param("s", $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close(); return $r ? (string)$r['phone'] : ''; } catch (Throwable $e) { return ''; }
}
/* رسالة واتساب بقالب الإشعارات المعتمد من Meta (متغيّر واحد {{1}} = نص الإشعار)
   قيود واتساب على المتغيّر: من غير سطور جديدة، ولحد 1024 حرف */
function wa_send_notify($conn, $phone, $text){
    if (!np_wa_on($conn)) return ['ok' => false, 'error' => 'الواتساب غير مفعّل'];
    $tpl = site_config_get($conn, 'wa_notify_template'); if ($tpl === '') return ['ok' => false, 'error' => 'قالب إشعارات الواتساب غير مضبوط'];
    $to = function_exists('sms_normalize_phone') ? sms_normalize_phone($phone) : preg_replace('/\D/', '', (string)$phone);
    if (strlen($to) < 10) return ['ok' => false, 'error' => 'رقم الواتساب غير صالح'];
    $txt = trim(preg_replace('/\s{4,}/u', '   ', preg_replace('/[\r\n\t]+/u', ' | ', str_replace(["\u{2066}", "\u{2069}"], '', (string)$text))));
    $txt = mb_substr($txt, 0, 1000);
    $payload = ['messaging_product' => 'whatsapp', 'to' => $to, 'type' => 'template',
        'template' => ['name' => $tpl, 'language' => ['code' => site_config_get($conn, 'wa_lang') ?: 'ar'],
            'components' => [['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $txt]]]]]];
    $ch = curl_init(rtrim(WA_GRAPH_BASE, '/') . '/' . rawurlencode(site_config_get($conn, 'wa_phone_id')) . '/messages');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . site_config_get($conn, 'wa_token')],
        CURLOPT_POSTFIELDS => json_encode($payload)]);
    $body = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    $j = json_decode((string)$body, true);
    if ($http >= 200 && $http < 300 && !empty($j['messages'][0]['id'])) return ['ok' => true, 'error' => ''];
    error_log('GRIFFINE wa_notify: HTTP ' . $http . ' ' . mb_substr((string)$body, 0, 300));
    return ['ok' => false, 'error' => 'واتساب رد بخطأ (HTTP ' . $http . ')'];
}
/* الإشعار الموحّد: جوه الموقع (الجرس [+ الشات]) + الإيميل + الواتساب حسب قنوات المستخدم
   $o: symbol, market, chat (نص رسالة الشات أو null), paragraphs (للإيميل), button, type */
function notify_user($conn, $email, $title, $body, $o = []){
    $p = np_get($conn, $email); $sent = ['app' => false, 'email' => false, 'wa' => false];
    if ($p['app']) {
        try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)");
            $sym = $o['symbol'] ?? null; $mkt = $o['market'] ?? null; $i->bind_param("sssss", $email, $title, $body, $sym, $mkt); $i->execute(); $i->close(); $sent['app'] = true; } catch (Throwable $e) {}
        if (!empty($o['chat']) && function_exists('mk_user_chat_id')) {
            try { $vid = mk_user_chat_id($conn, $email);
                if ($vid) { $c = $conn->prepare("INSERT INTO chat_messages (visitor_id, visitor_email, sender, message) VALUES (?, ?, 'admin', ?)"); $msg = $o['chat']; $c->bind_param("sss", $vid, $email, $msg); $c->execute(); $c->close(); } } catch (Throwable $e) {}
        }
    }
    if ($p['email'] && function_exists('griffine_notify')) {
        try { griffine_notify($conn, $email, $title, $title, $o['paragraphs'] ?? explode("\n", $body), $o['button'] ?? ['label' => 'فتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], $o['type'] ?? 'notify'); $sent['email'] = true; } catch (Throwable $e) {}
    }
    if ($p['wa'] && np_wa_on($conn)) {
        $ph = np_phone($conn, $email, $p);
        if ($ph !== '') { $r = wa_send_notify($conn, $ph, $title . ' — ' . $body); $sent['wa'] = $r['ok']; }
    }
    return $sent;
}
?>
