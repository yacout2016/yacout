<?php
/* =====================================================================
   GRIFFINE — ui_custom_get.php (الإصدار 72)
   ---------------------------------------------------------------------
   بيرجّع تخصيصات استوديو التصميم لكل الزوار (من غير تسجيل دخول):
     theme      → الثيم المختار (ألوان / خط / حجم / حواف / شكل الأزرار)
     overrides  → تعديلات الشاشات (النصوص + تنسيق أي عنصر)
   لو جدول ui_customizations لسه متعملش (ملف SQL متشغّلش) بيرجّع فاضي من غير ما الموقع يقف.
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
include 'db.php';

$out = ["success" => true, "theme" => null, "overrides" => null, "updatedAt" => null];

// db.php مفعّل فيه رمي الأخطاء (STRICT) - فالاستعلام جوه try عشان الجدول لو مش موجود الموقع يكمّل عادي
try {
    $res = $conn->query("SELECT ui_key, data_value, updated_at FROM ui_customizations WHERE ui_key IN ('theme','overrides')");
    while ($res && ($r = $res->fetch_assoc())) {
        $decoded = json_decode($r['data_value'], true);
        if (is_array($decoded)) $out[$r['ui_key']] = $decoded;
        if ($out['updatedAt'] === null || $r['updated_at'] > $out['updatedAt']) $out['updatedAt'] = $r['updated_at'];
    }
} catch (Throwable $e) { /* الجدول لسه متعملش - الشكل الأصلي */ }

echo json_encode($out, JSON_UNESCAPED_UNICODE);
?>
