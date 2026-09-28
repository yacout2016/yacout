<?php
// إعداد كوكي الجلسة — لازم يتحمّل قبل session_start() في كل ملف (عشان كده مطلوب في أول سطر بعدها بالظبط).
//
// السبب: من غير الإعداد ده، الجلسة كانت أحيانًا بتتقطع (خصوصًا بين www.griffine.store
// وgriffine.store بدون www) فيظهر خطأ "انتهت صلاحية الجلسة" عند تسجيل الدخول لأول مرة،
// ولازم المستخدم يحاول عدة مرات لحد ما الجلسة "تثبت" بالصدفة على نفس الدومين.
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
}
?>
