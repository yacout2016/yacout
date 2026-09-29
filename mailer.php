<?php
/* =====================================================================
   GRIFFINE — mailer.php (الإصدار 72) — إرسال كل إيميلات الموقع من مكان واحد
   ---------------------------------------------------------------------
   ليه ملف موحّد؟
     قبل كده كل ملف كان بيبعت بـ mail() لوحده ومن عنوان no-reply@www.griffine.store
     (عنوان غير موجود) ومن غير تشفير للعنوان العربي - فالإيميلات كانت بتتحجز أو تروح Spam.
   دلوقتي:
     1) المرسل دايمًا info@griffine.store (صندوق حقيقي على الدومين) + Return-Path صحيح
     2) لو كلمة سر الصندوق متحطة في db.php (MAIL_SMTP_PASS) ← الإرسال عن طريق SMTP هوستنجر
        (أضمن طريقة للوصول لـ Gmail/Outlook) - غير كده ← mail() العادية كاحتياطي
     3) العنوان العربي متشفّر (UTF-8)، والرسالة فيها نسخة نص + نسخة HTML منسّقة
     4) مرفقات (صور/PDF) - زي صور محادثات الشات
     5) كل إيميل بيتسجّل في جدول email_log (أُرسلت/فشل + السبب) ويظهر في "مركز الإيميلات"

   الاستخدام:
     require_once __DIR__ . '/mailer.php';
     griffine_notify($conn, $to, 'العنوان', 'عنوان داخل الرسالة', ['فقرة 1', 'فقرة 2'], ['label'=>'افتح الموقع','url'=>'https://...'], 'type');
     griffine_mail($conn, $to, $subject, ['text'=>..., 'html'=>..., 'attachments'=>[...], 'reply_to'=>..., 'type'=>...]);

   فهرس:
     01. الإعدادات (بتتكتب في db.php)
     02. أدوات مساعدة
     03. قالب الرسالة (HTML + نص)
     04. بناء الرسالة (MIME)
     05. الإرسال عبر SMTP
     06. الدالة الرئيسية griffine_mail + التسجيل
     07. إيميلات جاهزة للتحديثات (اشتراك / تفعيل / تمديد / ...)
   ===================================================================== */

// ---------------------------------------------------------------------
// 01. الإعدادات - القيم الافتراضية (أي قيمة متعرّفة في db.php بتغلبها)
// ---------------------------------------------------------------------
defined('MAIL_FROM')        || define('MAIL_FROM', 'info@griffine.store');
defined('MAIL_FROM_NAME')   || define('MAIL_FROM_NAME', 'GRIFFINE');
defined('MAIL_ADMIN_TO')    || define('MAIL_ADMIN_TO', 'info@griffine.store');   // تنبيهات الإدارة ونسخ الشات
defined('MAIL_SITE_URL')    || define('MAIL_SITE_URL', 'https://griffine.store');
defined('MAIL_SMTP_HOST')   || define('MAIL_SMTP_HOST', 'smtp.hostinger.com');
defined('MAIL_SMTP_PORT')   || define('MAIL_SMTP_PORT', 465);                    // 465 = SSL ، 587 = STARTTLS
defined('MAIL_SMTP_USER')   || define('MAIL_SMTP_USER', 'info@griffine.store');
defined('MAIL_SMTP_PASS')   || define('MAIL_SMTP_PASS', '');                     // ← كلمة سر info@griffine.store (في db.php)
defined('MAIL_MAX_ATTACH')  || define('MAIL_MAX_ATTACH', 18 * 1024 * 1024);     // أقصى حجم مرفقات في الإيميل الواحد

// ---------------------------------------------------------------------
// 02. أدوات مساعدة
// ---------------------------------------------------------------------
function gm_smtp_enabled(){ return MAIL_SMTP_PASS !== ''; }

// عنوان عربي/أي لغة ← صيغة آمنة للهيدر
function gm_encode_header($text){ return '=?UTF-8?B?' . base64_encode($text) . '?='; }

// إيميل صالح ومن غير أي أسطر (يمنع حقن هيدرز)
function gm_clean_email($e){
    $e = trim((string)$e);
    if ($e === '' || preg_match('/[\r\n,;<>]/', $e) || !filter_var($e, FILTER_VALIDATE_EMAIL)) return null;
    return $e;
}

// الإيميل اللي العميل عايز يتواصل عليه (إيميل التواصل في الاشتراك، أو إيميل الحساب)
function gm_customer_email($conn, $accountEmail){
    $st = $conn->prepare("SELECT contact_email FROM subscribers WHERE account_email = ? ORDER BY id DESC LIMIT 1");
    if ($st) {
        $st->bind_param("s", $accountEmail); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if ($r && gm_clean_email($r['contact_email'])) return $r['contact_email'];
    }
    return $accountEmail;
}

// ---------------------------------------------------------------------
// 03. قالب الرسالة: فقرات ← نص عادي + HTML منسّق باتجاه عربي
// ---------------------------------------------------------------------
function gm_template($title, $paragraphs, $button = null){
    $esc = function($s){ return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); };

    // نسخة النص
    $text = $title . "\r\n\r\n" . implode("\r\n\r\n", array_map('strval', $paragraphs));
    if ($button) $text .= "\r\n\r\n" . $button['label'] . ": " . $button['url'];
    $text .= "\r\n\r\n—\r\nفريق GRIFFINE\r\n" . MAIL_SITE_URL;

    // نسخة HTML
    $ps = '';
    foreach ($paragraphs as $p) $ps .= '<p style="margin:0 0 14px;line-height:1.9;font-size:15px;color:#1F2937;">' . nl2br($esc($p)) . '</p>';
    $btn = $button ? '<p style="margin:22px 0 6px;"><a href="' . $esc($button['url']) . '" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:12px;font-size:15px;">' . $esc($button['label']) . '</a></p>' : '';
    $html = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:#F3F4F6;font-family:IBM Plex Sans Arabic,Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 12px;"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">'
        . '<tr><td style="background:#0F172A;padding:18px 24px;border-bottom:3px solid #C9A227;"><span style="color:#C9A227;font-weight:800;letter-spacing:3px;font-size:18px;font-family:Arial,sans-serif;">GRIFFINE</span></td></tr>'
        . '<tr><td style="padding:26px 24px 10px;"><h1 style="margin:0 0 16px;font-size:20px;color:#0F172A;">' . $esc($title) . '</h1>' . $ps . $btn . '</td></tr>'
        . '<tr><td style="padding:14px 24px 22px;color:#6B7280;font-size:12px;border-top:1px solid #F1F5F9;">فريق GRIFFINE · <a href="' . $esc(MAIL_SITE_URL) . '" style="color:#A6811E;">' . $esc(preg_replace('#^https?://#', '', MAIL_SITE_URL)) . '</a><br>للتواصل: ' . $esc(MAIL_FROM) . '</td></tr>'
        . '</table></td></tr></table></body></html>';
    return ['text' => $text, 'html' => $html];
}

// ---------------------------------------------------------------------
// 04. بناء الرسالة (MIME): نص + HTML + مرفقات
// ---------------------------------------------------------------------
function gm_build($to, $subject, $opts){
    $text = (string)($opts['text'] ?? '');
    $html = $opts['html'] ?? null;
    $atts = $opts['attachments'] ?? [];
    $eol = "\r\n";
    $domain = substr(strrchr(MAIL_FROM, '@'), 1);

    $headers = [
        'Date: ' . date('r'),
        'From: ' . gm_encode_header(MAIL_FROM_NAME) . ' <' . MAIL_FROM . '>',
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'X-Mailer: GRIFFINE',
    ];
    $reply = gm_clean_email($opts['reply_to'] ?? '');
    $headers[] = 'Reply-To: ' . ($reply ?: MAIL_FROM);

    $part = function($type, $content) use ($eol){
        return 'Content-Type: ' . $type . '; charset=UTF-8' . $eol . 'Content-Transfer-Encoding: base64' . $eol . $eol . chunk_split(base64_encode($content)) ;
    };

    // الجزء النصي (نص فقط، أو نص + HTML)
    if ($html) {
        $alt = 'alt_' . bin2hex(random_bytes(8));
        $bodyPart = 'Content-Type: multipart/alternative; boundary="' . $alt . '"' . $eol . $eol
            . '--' . $alt . $eol . $part('text/plain', $text)
            . '--' . $alt . $eol . $part('text/html', $html)
            . '--' . $alt . '--' . $eol;
    } else {
        $bodyPart = $part('text/plain', $text);
    }

    if (!$atts) {
        // من غير مرفقات: جزء الجسم نفسه هو الرسالة
        list($ctHeaders, $body) = explode($eol . $eol, $bodyPart, 2);
        foreach (explode($eol, $ctHeaders) as $h) $headers[] = $h;
        return [$headers, $body];
    }

    $mix = 'mix_' . bin2hex(random_bytes(8));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $mix . '"';
    $body = 'This is a multi-part message in MIME format.' . $eol . $eol . '--' . $mix . $eol . $bodyPart;
    foreach ($atts as $a) {
        $name = gm_encode_header(preg_replace('/[\r\n"]/', '', $a['name']));
        $body .= '--' . $mix . $eol
            . 'Content-Type: ' . $a['mime'] . '; name="' . $name . '"' . $eol
            . 'Content-Transfer-Encoding: base64' . $eol
            . 'Content-Disposition: attachment; filename="' . $name . '"' . $eol . $eol
            . chunk_split(base64_encode($a['data']));
    }
    $body .= '--' . $mix . '--' . $eol;
    return [$headers, $body];
}

// ---------------------------------------------------------------------
// 05. الإرسال عبر SMTP (هوستنجر) - SSL على 465 أو STARTTLS على 587
// ---------------------------------------------------------------------
function gm_smtp_send($to, $subject, $headers, $body, &$err){
    $port = (int)MAIL_SMTP_PORT;
    $target = ($port === 465 ? 'ssl://' : 'tcp://') . MAIL_SMTP_HOST . ':' . $port;
    $fp = @stream_socket_client($target, $errno, $errstr, 15);
    if (!$fp) { $err = "تعذّر الاتصال بسيرفر البريد: $errstr"; return false; }
    stream_set_timeout($fp, 25);

    $read = function() use ($fp){
        $data = '';
        while (($line = fgets($fp, 515)) !== false) { $data .= $line; if (strlen($line) < 4 || $line[3] === ' ') break; }
        return $data;
    };
    $cmd = function($c, $expect) use ($fp, $read, &$err){
        if ($c !== null) fwrite($fp, $c . "\r\n");
        $r = $read();
        foreach ((array)$expect as $code) if (strpos($r, (string)$code) === 0) return true;
        $err = 'SMTP: ' . trim($r ?: 'لا يوجد رد من السيرفر');
        return false;
    };
    $domain = substr(strrchr(MAIL_FROM, '@'), 1);

    $ok = $cmd(null, 220) && $cmd('EHLO ' . $domain, 250);
    if ($ok && $port !== 465) {
        $ok = $cmd('STARTTLS', 220) && @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd('EHLO ' . $domain, 250);
        if (!$ok && !$err) $err = 'تعذّر تشغيل التشفير TLS';
    }
    $ok = $ok && $cmd('AUTH LOGIN', 334) && $cmd(base64_encode(MAIL_SMTP_USER), 334) && $cmd(base64_encode(MAIL_SMTP_PASS), 235);
    if (!$ok && strpos((string)$err, '535') !== false) $err = 'كلمة سر الإيميل (MAIL_SMTP_PASS) غلط - ' . $err;
    $ok = $ok && $cmd('MAIL FROM:<' . MAIL_FROM . '>', 250) && $cmd('RCPT TO:<' . $to . '>', [250, 251]) && $cmd('DATA', 354);
    if ($ok) {
        $data = implode("\r\n", array_merge(['To: <' . $to . '>', 'Subject: ' . gm_encode_header($subject)], $headers)) . "\r\n\r\n" . $body;
        $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $data));   // dot-stuffing
        fwrite($fp, $data . "\r\n.\r\n");
        $ok = $cmd(null, 250);
    }
    @fwrite($fp, "QUIT\r\n");
    fclose($fp);
    return $ok;
}

// ---------------------------------------------------------------------
// 06. الدالة الرئيسية + التسجيل في email_log
// ---------------------------------------------------------------------
function gm_log($conn, $to, $subject, $type, $ok, $transport, $error){
    if (!$conn) return;
    try {
        $st = @$conn->prepare("INSERT INTO email_log (to_email, subject, mail_type, status, transport, error_text) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$st) return;   // الجدول بعد متعملش (ملف SQL متشغّلش) - الإرسال نفسه مبيتأثرش
        $status = $ok ? 'sent' : 'failed';
        $subject = mb_substr($subject, 0, 250); $error = $error ? mb_substr($error, 0, 500) : null;
        $st->bind_param("ssssss", $to, $subject, $type, $status, $transport, $error);
        $st->execute(); $st->close();
    } catch (Throwable $e) { /* السجل مش أساسي */ }
}

/* بيرجّع ['ok'=>bool, 'error'=>string|null, 'transport'=>'smtp'|'mail']
   opts: text, html, attachments [[name, mime, data]], reply_to, type */
function griffine_mail($conn, $to, $subject, $opts = []){
    $to = gm_clean_email($to);
    $type = $opts['type'] ?? 'general';
    if (!$to) { gm_log($conn, (string)($opts['_raw_to'] ?? ''), $subject, $type, false, 'none', 'إيميل غير صالح'); return ['ok' => false, 'error' => 'إيميل غير صالح', 'transport' => 'none']; }
    $subject = str_replace(["\r", "\n"], ' ', $subject);

    // المرفقات: نشيل أي حاجة فوق الحد المسموح (ونكتب ده في آخر الرسالة)
    $atts = []; $total = 0; $skipped = 0;
    foreach (($opts['attachments'] ?? []) as $a) {
        $len = strlen($a['data'] ?? '');
        if (!$len || $total + $len > MAIL_MAX_ATTACH) { $skipped++; continue; }
        $total += $len; $atts[] = $a;
    }
    if ($skipped) $opts['text'] = ($opts['text'] ?? '') . "\r\n\r\n(ملحوظة: $skipped مرفق لم تُضَف لكبر حجمها - موجودة في لوحة الدردشة)";
    $opts['attachments'] = $atts;

    list($headers, $body) = gm_build($to, $subject, $opts);
    $err = null;

    if (gm_smtp_enabled()) {
        $ok = gm_smtp_send($to, $subject, $headers, $body, $err);
        $transport = 'smtp';
        if (!$ok) error_log('GRIFFINE mail SMTP failed to ' . $to . ': ' . $err);
    } else {
        // mail(): العنوان بيتبعت منفصل، والمرسل الحقيقي (Return-Path) بالباراميتر -f
        $ok = @mail($to, gm_encode_header($subject), $body, implode("\r\n", $headers), '-f' . MAIL_FROM);
        $transport = 'mail';
        if (!$ok) { $e = error_get_last(); $err = 'دالة mail() رفضت الإرسال' . ($e ? ': ' . $e['message'] : ''); }
    }
    gm_log($conn, $to, $subject, $type, $ok, $transport, $err);
    return ['ok' => (bool)$ok, 'error' => $err, 'transport' => $transport];
}

// إيميل بالقالب الموحّد
/* الإصدار 91: منع انعكاس النص المختلط (عربي + إنجليزي/أرقام) في الإيميلات والإشعارات والرسائل
   أي مقطع لاتيني أو رقمي جوه نص فيه عربي (رمز سهم، إيميل، رقم، اسم GRIFFINE...) بيتعزل بعلامات يونيكود
   (LRI … PDI) فبيفضل في مكانه من غير ما يقلب ترتيب الجملة. الدالة آمنة لو اتنادت أكتر من مرة. */
function gm_bidi($s){
    $s = (string)$s;
    if ($s === '' || !preg_match('/\p{Arabic}/u', $s)) return $s;
    $s = str_replace(["\u{2066}", "\u{2069}"], '', $s);
    // مقطع = يبدأ بحرف/رقم وينتهي بحرف/رقم (علامات الترقيم في الطرفين تفضل مع الجملة العربي)
    $tok = '[A-Za-z0-9@#$](?:[A-Za-z0-9@#$%&+=\/\\\\_.,:\'-]*[A-Za-z0-9%])?';
    return preg_replace('/' . $tok . '(?:[ ]+' . $tok . ')*/u', "\u{2066}$0\u{2069}", $s);
}
function griffine_notify($conn, $to, $subject, $title, $paragraphs, $button = null, $type = 'notify', $extra = []){
    $subject = gm_bidi($subject); $title = gm_bidi($title);
    $paragraphs = array_map(fn($x) => is_string($x) ? gm_bidi($x) : $x, (array)$paragraphs);
    $t = gm_template($title, $paragraphs, $button);
    return griffine_mail($conn, $to, $subject, array_merge(['text' => $t['text'], 'html' => $t['html'], 'type' => $type], $extra));
}

// ---------------------------------------------------------------------
// 07. إيميلات جاهزة للتحديثات (بتتنادى من ملفات الاشتراك)
//     أي فشل في الإيميل مبيوقفش العملية الأساسية (الإيميل إضافة، مش شرط)
// ---------------------------------------------------------------------
function gm_safe($fn){ try { return $fn(); } catch (Throwable $e) { error_log('GRIFFINE mail error: ' . $e->getMessage()); return null; } }

// طلب اشتراك جديد: رسالة للعميل + تنبيه للإدارة لو محتاج مراجعة سداد
function mail_subscription_created($conn, $accountEmail, $name, $planName, $amount, $active, $endDate){
    gm_safe(function() use ($conn, $accountEmail, $name, $planName, $amount, $active, $endDate){
        $to = gm_customer_email($conn, $accountEmail);
        if ($active) {
            griffine_notify($conn, $to, 'تم تفعيل اشتراكك في GRIFFINE', 'تم تفعيل اشتراكك ✅',
                ["أهلًا $name،", "تم تفعيل باقة «$planName» على حسابك، وسارية حتى $endDate.", 'يمكنك البدء الآن في إنشاء خططك ومتابعة محفظتك.'],
                ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'subscription_active');
        } else {
            griffine_notify($conn, $to, 'استلمنا طلب اشتراكك في GRIFFINE', 'طلبك وصلنا',
                ["أهلًا $name،", "استلمنا طلب اشتراكك في باقة «$planName» وبيانات السداد.", 'سيراجع فريقنا السداد ويفعّل حسابك في أقرب وقت، وستصلك رسالة بريد فور التفعيل.'],
                ['label' => 'متابعة حالة الاشتراك', 'url' => MAIL_SITE_URL . '/index.php'], 'subscription_pending');
            griffine_notify($conn, MAIL_ADMIN_TO, "طلب اشتراك جديد محتاج مراجعة - $name", 'طلب اشتراك جديد',
                ["العميل: $name", "الحساب: $accountEmail", "الباقة: $planName", 'المبلغ: ' . number_format((float)$amount, 2), 'راجع السداد وفعّل الحساب من لوحة التحكم ← المشتركين.'],
                ['label' => 'لوحة التحكم', 'url' => MAIL_SITE_URL . '/index.php'], 'admin_new_subscription');
        }
    });
}

// تفعيل / إيقاف الاشتراك من لوحة التحكم
function mail_subscription_toggled($conn, $accountEmail, $name, $planName, $active, $endDate){
    gm_safe(function() use ($conn, $accountEmail, $name, $planName, $active, $endDate){
        $to = gm_customer_email($conn, $accountEmail);
        if ($active) griffine_notify($conn, $to, 'تم تفعيل اشتراكك في GRIFFINE', 'تم تفعيل اشتراكك ✅',
            ["أهلًا $name،", "تمت مراجعة السداد وتفعيل باقة «$planName»، وسارية حتى $endDate.", 'شكرًا لثقتك في GRIFFINE.'],
            ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'subscription_active');
        else griffine_notify($conn, $to, 'تم إيقاف اشتراكك في GRIFFINE مؤقتًا', 'اشتراكك موقوف',
            ["أهلًا $name،", "تم إيقاف اشتراكك في باقة «$planName» مؤقتًا.", 'إذا كان لديك أي استفسار، رُدّ على هذه الرسالة أو تواصل معنا عبر الشات في الموقع.'],
            null, 'subscription_paused');
    });
}

// تمديد الاشتراك (أيام إضافية)
function mail_subscription_extended($conn, $subscriberId, $days, $newEnd){
    gm_safe(function() use ($conn, $subscriberId, $days, $newEnd){
        $st = $conn->prepare("SELECT account_email, name, plan_name FROM subscribers WHERE id = ?");
        $st->bind_param("i", $subscriberId); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r || $days <= 0) return;
        griffine_notify($conn, gm_customer_email($conn, $r['account_email']), 'تم تمديد اشتراكك في GRIFFINE', "هدية: $days يوم إضافي 🎁",
            ["أهلًا {$r['name']}،", "تم تمديد اشتراكك في باقة «{$r['plan_name']}» $days يوم إضافي.", "تاريخ الانتهاء الجديد: $newEnd"],
            ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'subscription_extended');
    });
}

// باقة هدية من الإدارة
function mail_subscription_gift($conn, $accountEmail, $planName, $endDate){
    gm_safe(function() use ($conn, $accountEmail, $planName, $endDate){
        griffine_notify($conn, gm_customer_email($conn, $accountEmail), 'باقة هدية من GRIFFINE 🎁', 'عندك باقة هدية',
            ['أهلًا بك،', "فريق GRIFFINE منحك باقة «$planName» هدية، وسارية حتى $endDate.", 'استمتع بكل المميزات.'],
            ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'subscription_gift');
    });
}

// طلب تغيير الباقة من العميل
function mail_plan_change_requested($conn, $accountEmail, $planName, $message){
    gm_safe(function() use ($conn, $accountEmail, $planName, $message){
        griffine_notify($conn, gm_customer_email($conn, $accountEmail), 'استلمنا طلب تغيير باقتك - GRIFFINE', 'طلب تغيير الباقة',
            ['أهلًا بك،', $message], ['label' => 'متابعة الاشتراك', 'url' => MAIL_SITE_URL . '/index.php'], 'plan_change');
        griffine_notify($conn, MAIL_ADMIN_TO, "طلب تغيير باقة - $accountEmail", 'طلب تغيير باقة',
            ["الحساب: $accountEmail", "الباقة المطلوبة: $planName", 'راجع السداد من لوحة التحكم ← المشتركين.'],
            ['label' => 'لوحة التحكم', 'url' => MAIL_SITE_URL . '/index.php'], 'admin_plan_change');
    });
}

// نتيجة مراجعة طلب تغيير الإيميل
function mail_email_change_reviewed($conn, $oldEmail, $newEmail, $approved, $note){
    gm_safe(function() use ($conn, $oldEmail, $newEmail, $approved, $note){
        if ($approved) {
            $p = ['أهلًا بك،', "تمت الموافقة على تغيير بريد حسابك في GRIFFINE من $oldEmail إلى $newEmail.", "من الآن سجّل الدخول بالبريد الجديد: $newEmail"];
            griffine_notify($conn, $newEmail, 'تم تغيير بريد حسابك في GRIFFINE', 'تم تغيير الإيميل ✅', $p, ['label' => 'تسجيل الدخول', 'url' => MAIL_SITE_URL . '/index.php'], 'email_change');
            griffine_notify($conn, $oldEmail, 'تنبيه: تم تغيير بريد حسابك في GRIFFINE', 'تم تغيير الإيميل', array_merge($p, ['إذا لم تطلب هذا التغيير، تواصل معنا فورًا على ' . MAIL_FROM]), null, 'email_change');
        } else {
            griffine_notify($conn, $oldEmail, 'بخصوص طلب تغيير بريد حسابك - GRIFFINE', 'طلب تغيير الإيميل',
                array_filter(['أهلًا بك،', "طلب تغيير بريد حسابك إلى $newEmail لم يُقبل.", $note ? "ملاحظة الإدارة: $note" : null, 'لو محتاج مساعدة كلّمنا من الشات في الموقع.']),
                null, 'email_change');
        }
    });
}
?>
