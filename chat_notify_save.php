<?php
/* =====================================================================
   GRIFFINE — chat_notify_save.php (الإصدار 83)
   الأدمن بيحدد: صورة أيقونة الشات، صوت التنبيه الافتراضي، ويسمح/يمنع المشتركين يغيّروهم عندهم
   POST: sound, userIcon (1|0), userSound (1|0), icon (data URI لصورة جديدة) أو clearIcon=1
   الصلاحية: manage_admin_settings (زي باقي إعدادات الموقع)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/chat_notify_lib.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_admin_settings');
requireCsrf();

try {
    $cfg = chat_notify_load($conn);
    if (isset($_POST['sound'])) {
        $sound = trim($_POST['sound']);
        if (!in_array($sound, CHAT_NOTIFY_SOUNDS, true)) { echo json_encode(["success" => false, "message" => "صوت غير معروف."]); exit(); }
        $cfg['sound'] = $sound;
    }
    if (isset($_POST['userIcon'])) $cfg['userIcon'] = $_POST['userIcon'] !== '0';
    if (isset($_POST['userSound'])) $cfg['userSound'] = $_POST['userSound'] !== '0';

    // صورة الأيقونة: صورة بس (PNG/JPG/WEBP/GIF) بحد أقصى ~2 ميجا
    if (!empty($_POST['clearIcon'])) {
        upl_delete($cfg['icon']); $cfg['icon'] = '';
    } elseif (!empty($_POST['icon'])) {
        if (strlen($_POST['icon']) > 2800000) { echo json_encode(["success" => false, "message" => "الصورة كبيرة - أقصى حجم 2 ميجا."]); exit(); }
        $stored = upl_store($_POST['icon'], 'bg', false);
        if ($stored === false || strpos((string)$stored, 'file:') !== 0) { echo json_encode(["success" => false, "message" => "ارفع صورة PNG أو JPG أو WEBP."]); exit(); }
        upl_delete($cfg['icon']);
        $cfg['icon'] = $stored;
    }
    chat_notify_save_cfg($conn, $cfg, $_SESSION['user_email']);
    echo json_encode(["success" => true, "settings" => chat_notify_public($cfg)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(["success" => false, "message" => "تعذّر الحفظ - تأكد أن ملف ALL_SCHEMA_UPDATES.sql اتشغّل (جدول ui_customizations)."]);
}
?>
