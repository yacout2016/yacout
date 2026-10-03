<?php
/* صيانة ما بعد التحديث - لمدير الموقع الأصلي بس:
   1) تحويل الصور القديمة (Base64 جوه قاعدة البيانات) لملفات
   2) مسح الملفات القديمة والحساسة من السيرفر
   افتح الرابط ده وإنت مسجّل دخول: https://www.griffine.app/migrate_uploads.php
   كل مرة بيحوّل حتى 100 صورة من كل جدول - كرر فتح الصفحة حتى ما يقولك "خلاص". آمن تشغّله أكتر من مرة. */
header('Content-Type: text/html; charset=UTF-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email']) || strtolower($_SESSION['user_email']) !== strtolower(ADMIN_EMAIL)) {
    http_response_code(403);
    echo "غير مصرح. هذه الصفحة لمدير الموقع الأصلي فقط.";
    exit();
}
if (!upl_dir()) { echo "لا توجد صلاحية كتابة لإنشاء مجلد الملفات على السيرفر."; exit(); }

$jobs = [
    ['subscribers', 'id', 'payment_proof', 'proof', true],
    ['subscribers', 'id', 'pending_payment_proof', 'proof', true],
    ['users', 'id', 'avatar_data', 'avatar', false],
    ['chat_messages', 'id', 'attachment', 'chat', true],
    ['suggestions', 'id', 'attachment_data', 'sugg', true],
];
$bg = @$conn->query("SHOW TABLES LIKE 'page_backgrounds'");
$report = [];
$remaining = 0;
foreach ($jobs as [$table, $pk, $col, $cat, $pdf]) {
    $res = @$conn->query("SELECT `$pk` AS id, `$col` AS v FROM `$table` WHERE `$col` LIKE 'data:%' AND `$col` NOT LIKE 'data:image/svg%' LIMIT 100");
    if (!$res) { $report[] = "$table.$col: الجدول/العمود غير موجود - تم التخطي"; continue; }
    $done = 0; $failed = 0;
    while ($r = $res->fetch_assoc()) {
        $new = upl_store($r['v'], $cat, $pdf);
        if (!$new || strpos($new, 'file:') !== 0) { $failed++; continue; }
        $st = $conn->prepare("UPDATE `$table` SET `$col` = ? WHERE `$pk` = ?");
        $st->bind_param("si", $new, $r['id']); $st->execute(); $st->close();
        $done++;
    }
    $left = (int)$conn->query("SELECT COUNT(*) c FROM `$table` WHERE `$col` LIKE 'data:%' AND `$col` NOT LIKE 'data:image/svg%'")->fetch_assoc()['c'];
    $remaining += max(0, $left - $failed);
    $report[] = "$table.$col: تم التحويل $done" . ($failed ? " — تعذّر $failed" : "") . " — متبقي $left";
}
if ($bg && $bg->num_rows) {
    $res = $conn->query("SELECT page_key, image_data FROM page_backgrounds WHERE image_data LIKE 'data:%' LIMIT 100");
    $done = 0;
    while ($r = $res->fetch_assoc()) {
        $new = upl_store($r['image_data'], 'bg');
        if (!$new || strpos($new, 'file:') !== 0) continue;
        $st = $conn->prepare("UPDATE page_backgrounds SET image_data = ? WHERE page_key = ?");
        $st->bind_param("ss", $new, $r['page_key']); $st->execute(); $st->close();
        $done++;
    }
    $report[] = "page_backgrounds: تم التحويل $done";
}
// تنظيف ملفات قديمة/حساسة من السيرفر (كانت بتترفع مع الإصدارات القديمة ومفتوحة لأي حد يعرف اسمها)
$oldFiles = array_merge(
    ['GRIFFINE_سجل_الطلبات.xlsx', 'README_DEPLOY.md', 'diag_sync.php', 'schema.sql', 'CREATE_USER_DATA_STORE.sql', 'all.sql',
     'GRANDFATHER_OLD_ACCOUNTS_email_verified.sql', 'README_APP_UI.md', 'app/shell.css', 'app/shell.js',
     'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'],
    array_map('basename', glob(__DIR__ . '/update_schema_*.sql') ?: [])
);
$removed = 0;
foreach ($oldFiles as $of) {
    $path = __DIR__ . '/' . $of;
    if (is_file($path) && @unlink($path)) $removed++;
}
foreach (['app', 'icons'] as $d) { if (is_dir(__DIR__ . '/' . $d) && count(scandir(__DIR__ . '/' . $d)) <= 2) @rmdir(__DIR__ . '/' . $d); }
$report[] = "ملفات قديمة/حساسة حُذفت من السيرفر: $removed";

echo "<!doctype html><html lang='ar' dir='rtl'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><body style='font-family:Tahoma;padding:20px;line-height:2'>";
echo "<h2>صيانة ما بعد التحديث</h2><ul><li>" . implode('</li><li>', array_map('htmlspecialchars', $report)) . "</li></ul>";
echo $remaining > 0 ? "<p><b>ما زالت هناك صور - حدّث الصفحة مرة أخرى.</b></p>" : "<p><b>✅ تم - كل الصور القديمة تحولت إلى ملفات.</b></p>";
echo "</body></html>";
