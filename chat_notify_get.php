<?php
/* =====================================================================
   GRIFFINE — chat_notify_get.php (الإصدار 83)
   إعدادات تنبيهات الشات اللي الأدمن حددها (لكل الزوار - من غير تسجيل دخول):
     icon      → صورة أيقونة الشات (فارغ = شعار GRIFFINE الافتراضي)
     sound     → صوت التنبيه الافتراضي (ding | pop | chime | bell | none)
     userIcon  → المشترك يقدر يغيّر صورة الأيقونة عنده؟
     userSound → المشترك يقدر يغيّر/يكتم صوت التنبيه عنده؟
   التنبيه نفسه = نقطة حمرا على أيقونة الشات + الصوت (لا يوجد إشعارات Push على الشاشة)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
include 'db.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/chat_notify_lib.php';

echo json_encode(["success" => true, "settings" => chat_notify_public(chat_notify_load($conn))], JSON_UNESCAPED_UNICODE);
?>
