<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

// حماية الملف: يشتغل إما من زرار المدير (جلسة أدمن)، أو من Cron Job بمفتاح سري في الرابط
$secretKey = 'GRIFFINE_CRON_9f3a7b2c1e'; // غيّرها لأي قيمة سرية تانية لو حابب، وحدّث نفس القيمة في رابط الـ Cron Job
$hasAdminSession = isset($_SESSION['user_email']) && !empty($_SESSION['is_admin']);
$hasValidKey = isset($_GET['key']) && hash_equals($secretKey, $_GET['key']);

if (!$hasAdminSession && !$hasValidKey) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح."]);
    exit();
}

// الإعدادات الافتراضية (تتحدث من لوحة التحكم)
$defResult = $conn->query("SELECT start_before_days, interval_days FROM reminder_defaults WHERE id = 1");
$def = $defResult->fetch_assoc();
$defaultStartBefore = (int)($def['start_before_days'] ?? 6);
$defaultInterval = (int)($def['interval_days'] ?? 2);

$todayTs = strtotime(date('Y-m-d'));

// كل المشتركين النشطين وغير المؤرشفين - يشمل الباقة المجانية كمان
$result = $conn->query("SELECT * FROM subscribers WHERE archived = 0 AND active = 1");

$sentCount = 0;
$log = [];

while ($sub = $result->fetch_assoc()) {
    if ((int)$sub['reminder_enabled'] === 0) continue;

    $intervalDays = !empty($sub['reminder_interval_days']) ? (int)$sub['reminder_interval_days'] : $defaultInterval;
    $startBeforeDays = $defaultStartBefore;

    $endTs = strtotime($sub['end_date']);
    $daysLeft = (int)round(($endTs - $todayTs) / 86400);

    // برّه نافذة التذكير (فات ميعاد الانتهاء، أو لسه بدري قوي)
    if ($daysLeft < 0 || $daysLeft > $startBeforeDays) continue;

    $daysSinceWindowStart = $startBeforeDays - $daysLeft;
    if ($intervalDays <= 0 || $daysSinceWindowStart % $intervalDays !== 0) continue;

    // النهارده يوم إرسال فعلي حسب الفترة اللي حددها الأدمن
    $toEmail = !empty($sub['contact_email']) ? $sub['contact_email'] : $sub['account_email'];
    $name = $sub['name'];
    $planName = $sub['plan_name'];
    $endDateFormatted = date('d-m-Y', $endTs);
    $daysWord = ($daysLeft === 0) ? 'النهاردة' : ($daysLeft . ' يوم');

    // الإصدار 72: عن طريق mailer.php (من info@griffine.store + سجل الإيميلات)
    $res = griffine_notify($conn, $toEmail, 'تذكير بقرب انتهاء اشتراكك - GRIFFINE', 'اشتراكك قرب يخلص',
        ["مرحبًا $name،", "نذكّرك إن اشتراكك في باقة «$planName» هينتهي بتاريخ: $endDateFormatted", "الأيام المتبقية: $daysWord",
         'جدّد اشتراكك قبل انتهاء المدة عشان تفضل مستفيد من كل مميزات GRIFFINE بدون انقطاع.'],
        ['label' => 'تجديد الاشتراك', 'url' => MAIL_SITE_URL . '/index.php'], 'reminder');
    $ok = $res['ok'];
    if ($ok) $sentCount++;
    $log[] = ["email" => $toEmail, "name" => $name, "daysLeft" => $daysLeft, "sent" => $ok, "error" => $res['error']];
}

echo json_encode(["success" => true, "sentCount" => $sentCount, "checkedAt" => date('Y-m-d H:i:s'), "log" => $log]);
?>
