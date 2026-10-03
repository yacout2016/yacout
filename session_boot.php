<?php
// إعداد كوكي الجلسة — لازم يتحمّل قبل session_start() في كل ملف (عشان كده مطلوب في أول سطر بعدها بالظبط).
//
// السبب: من غير الإعداد ده، الجلسة كانت أحيانًا بتتقطع (خصوصًا بين www.griffine.app
// وgriffine.app بدون www) فيظهر خطأ "انتهت صلاحية الجلسة" عند تسجيل الدخول لأول مرة،
// ولازم المستخدم يحاول عدة مرات حتى ما الجلسة "تثبت" بالصدفة على نفس الدومين.
// الإعداد ده بيخلي كوكي الجلسة شغالة على الدومين الرئيسي وكل الفروع الفرعية بتاعته مع بعض،
// يعني نفس الجلسة بتفضل شغالة سواء العميل داخل بـ www أو من غيرها.
if (session_status() === PHP_SESSION_NONE) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $host = preg_replace('/:\d+$/', '', $host); // شيل رقم البورت لو موجود (زي localhost:8080)
    $cookieDomain = '';
    // نحدد الدومين بس لو فعلاً على دومين الموقع الحقيقي - عشان لو حد بيجرب
    // الملفات على دومين تاني أو سيرفر تجريبي، الإعداد ده ميعطلش الجلسة عنده
    // الإصدار 153: الموقع اتنقل لـ griffine.app (الدومين القديم اتقفل)
    if ($host === 'griffine.app' || substr($host, -strlen('.griffine.app')) === '.griffine.app') {
        $cookieDomain = '.griffine.app';
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    /* الإصدار 105: الريفريش مبيخرجش من الحساب - الخروج بس لما المستخدم يدوس «تسجيل الخروج» بنفسه
       - ملفات الجلسات في فولدر خاص بالموقع برا public_html (زي griffine_uploads) بدل فولدر السيرفر المشترك
         اللي ممكن يتمسح أو ميكونش قابل للكتابة ← الجلسة كانت بتضيع مع أول ريفريش
       - الجلسة والكوكي بيفضلوا 30 يوم (قبل كده الكوكي كان بيتمسح مع قفل المتصفح والملف بعد 24 دقيقة من غير نشاط) */
    $gsLife = 30 * 24 * 3600;
    $gsDir = dirname(__DIR__) . '/griffine_sessions';
    if (!((is_dir($gsDir) || @mkdir($gsDir, 0700, true)) && is_writable($gsDir))) {
        $gsDir = __DIR__ . '/griffine_sessions';
        if (!is_dir($gsDir)) @mkdir($gsDir, 0700, true);
        if (is_dir($gsDir) && !file_exists($gsDir . '/.htaccess')) @file_put_contents($gsDir . '/.htaccess', "Require all denied\nDeny from all\n");
        if (is_dir($gsDir) && !file_exists($gsDir . '/index.html')) @file_put_contents($gsDir . '/index.html', '');
    }
    if (is_dir($gsDir) && is_writable($gsDir)) {
        session_save_path($gsDir);
        @ini_set('session.gc_probability', '1');     // فولدرنا الخاص مبيتنضّفش لوحده ← PHP بينضّف الجلسات الأقدم من 30 يوم
        @ini_set('session.gc_divisor', '1000');
    }
    @ini_set('session.gc_maxlifetime', (string)$gsLife);

    session_set_cookie_params([
        'lifetime' => $gsLife,
        'path' => '/',
        'domain' => $cookieDomain,
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    /* الإصدار 87: المتصفح العادي (مش المتخفي) ممكن يكون شايل كوكي جلسة قديمة من إصدار قديم
       (كوكي على الدومين بس، جنب الكوكي الجديد على .griffine.app) - فبيبعت الاتنين،
       وPHP بياخد القديم ← الدخول بيفشل أو الجلسة بتضيع، والمتخفي شغال عادي لأن مفيهوش كوكيز قديمة.
       لو فيه أكتر من كوكي جلسة: بنمسح النسخ القديمة (من غير دومين) ونسيب الجديدة */
    $rawCookie = $_SERVER['HTTP_COOKIE'] ?? '';
    $sessName = session_name();
    if ($cookieDomain !== '' && substr_count($rawCookie, $sessName . '=') > 1 && !headers_sent()) {
        // من غير domain = الكوكي القديم بتاع الدومين ده بس (أي domain هنا كان هيمسح الكوكي الجديد كمان).
        // بيتضاف لحظة إرسال الرد (session_start بيشيل أي Set-Cookie بنفس الاسم لو أُرسلت قبله)
        $delHeader = 'Set-Cookie: ' . $sessName . '=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; path=/' . ($secure ? '; secure' : '') . '; HttpOnly; SameSite=Lax';
        header_register_callback(function () use ($delHeader) { header($delHeader, false); });
        // نكمّل بآخر قيمة (الكوكي الأحدث) بدل القديمة
        if (preg_match_all('/(?:^|;\s*)' . preg_quote($sessName, '/') . '=([^;]+)/', $rawCookie, $mm) && !empty($mm[1])) {
            $last = end($mm[1]);
            if (preg_match('/^[a-zA-Z0-9,-]{20,128}$/', $last)) session_id($last);
        }
    }
}
?>
