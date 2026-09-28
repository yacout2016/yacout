<?php
// إعداد كوكي الجلسة — لازم يتحمّل قبل session_start() في كل ملف (عشان كده مطلوب في أول سطر بعدها بالظبط).
//
// السبب: من غير الإعداد ده، الجلسة كانت أحيانًا بتتقطع (خصوصًا بين www.griffine.store
// وgriffine.store بدون www) فيظهر خطأ "انتهت صلاحية الجلسة" عند تسجيل الدخول لأول مرة،
// ولازم المستخدم يحاول عدة مرات حتى ما الجلسة "تثبت" بالصدفة على نفس الدومين.
// الإعداد ده بيخلي كوكي الجلسة شغالة على الدومين الرئيسي وكل الفروع الفرعية بتاعته مع بعض،
// يعني نفس الجلسة بتفضل شغالة سواء العميل داخل بـ www أو من غيرها.
if (session_status() === PHP_SESSION_NONE) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $host = preg_replace('/:\d+$/', '', $host); // شيل رقم البورت لو موجود (زي localhost:8080)
    $cookieDomain = '';
    // نحدد الدومين بس لو فعلاً على دومين griffine.store الحقيقي - عشان لو حد بيجرب
    // الملفات على دومين تاني أو سيرفر تجريبي، الإعداد ده ميعطلش الجلسة عنده
    if ($host === 'griffine.store' || substr($host, -strlen('.griffine.store')) === '.griffine.store') {
        $cookieDomain = '.griffine.store';
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => $cookieDomain,
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    /* الإصدار 87: المتصفح العادي (مش المتخفي) ممكن يكون شايل كوكي جلسة قديمة من إصدار قديم
       (كوكي على griffine.store بس، جنب الكوكي الجديد على .griffine.store) - فبيبعت الاتنين،
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
