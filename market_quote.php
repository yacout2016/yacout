<?php
/* =====================================================================
   GRIFFINE — market_quote.php (الإصدار 77) — أسعار سهم تلقائيًا لأداة التحليل الفني
   ---------------------------------------------------------------------
   GET ?symbol=COMI&market=مصر&period=day|week|month|2months|3months|6months|year
   بيرجّع: أعلى سعر + أقل سعر خلال الفترة + آخر سعر + الإغلاق السابق + مدة التأخير

   المصادر (بالترتيب):
     1) TradingView (نفس مصدر الشارت في الشاشة - أسعار البورصة نفسها، متأخرة 15 دقيقة)
        ← آخر سعر + أعلى/أقل اليوم + الإغلاق السابق + أعلى/أقل شهر / 3 / 6 شهور / سنة
     2) Yahoo Finance (شموع يومية) ← للأسبوع والشهرين بس، وكاحتياطي لو TradingView وقع
        بشرط إن الشموع حديثة (آخر شمعة من أقل من 6 أيام) ومتطابقة مع سعر TradingView
        (الإصدار 76 كان بياخد "آخر سعر" من Yahoo، وده كان قديم من 2024 للتجاري الدولي
         ← أقل سعر وآخر سعر طلعوا 81.20 بدل ~128)

   - النتيجة بتتخزن 5 دقايق · للمشتركين المسجلين بس · الخانات في الشاشة بتفضل قابلة للتعديل

   فهرس:
     01. الإعدادات (الأسواق + الفترات)
     02. التحقق من الطلب + التخزين المؤقت
     03. أدوات الطلب من النت
     04. المصدر 1: TradingView
     05. المصدر 2: Yahoo (شموع يومية)
     06. تجميع النتيجة حسب الفترة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/quote_lib.php';   // الإصدار 88: المنطق كله بقى في دالة mq_get_quote()

if (!isset($_SESSION['user_email'])) { http_response_code(403); echo json_encode(["success" => false, "message" => 'سجّل دخول الأول.'], JSON_UNESCAPED_UNICODE); exit(); }
session_write_close();
echo json_encode(mq_get_quote($_GET['symbol'] ?? '', $_GET['market'] ?? 'مصر', $_GET['period'] ?? 'month'), JSON_UNESCAPED_UNICODE);
?>
