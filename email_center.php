<?php
/* =====================================================================
   GRIFFINE — email_center.php (الإصدار 72) — مركز الإيميلات في لوحة التحكم
   GET  ← حالة الإعداد (SMTP ولا mail) + آخر 150 إيميل (اتبعت / فشل + السبب)
   POST action=test&to=...  ← إيميل تجربة للتأكد إن الإرسال شغال
   الصلاحية: "الإعدادات الإلزامية" (manage_admin_settings)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_admin_settings');

// ---------------------------------------------------------------------
// إيميل تجربة
// ---------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $to = trim($_POST['to'] ?? '');
    if (!gm_clean_email($to)) { echo json_encode(["success" => false, "message" => "اكتب إيميل صحيح."]); exit(); }
    $r = griffine_notify($conn, $to, 'إيميل تجربة من GRIFFINE', 'الإيميلات شغالة ✅',
        ['لو الرسالة دي وصلتك يبقى إرسال الإيميلات من الموقع شغال تمام.',
         'طريقة الإرسال: ' . (gm_smtp_enabled() ? 'SMTP (هوستنجر)' : 'mail() العادية'),
         'الوقت: ' . date('Y-m-d H:i:s')],
        ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'test');
    echo json_encode(["success" => $r['ok'], "message" => $r['ok'] ? "تم الإرسال لـ $to — افحص البريد الوارد (وكمان Spam أول مرة)." : ("فشل الإرسال: " . $r['error']), "transport" => $r['transport']]);
    exit();
}

// ---------------------------------------------------------------------
// الحالة + السجل
// ---------------------------------------------------------------------
$log = []; $hasLog = true; $stats = ["sent" => 0, "failed" => 0];
try {
    $res = $conn->query("SELECT id, to_email, subject, mail_type, status, transport, error_text, created_at FROM email_log ORDER BY id DESC LIMIT 150");
    while ($r = $res->fetch_assoc()) $log[] = $r;
    $s = $conn->query("SELECT status, COUNT(*) c FROM email_log WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY status");
    while ($r = $s->fetch_assoc()) $stats[$r['status']] = (int)$r['c'];
} catch (Throwable $e) { $hasLog = false; }

echo json_encode([
    "success" => true,
    "from" => MAIL_FROM,
    "adminTo" => MAIL_ADMIN_TO,
    "smtp" => gm_smtp_enabled(),
    "smtpHost" => MAIL_SMTP_HOST . ':' . MAIL_SMTP_PORT,
    "hasLog" => $hasLog,
    "stats7d" => $stats,
    "log" => $log,
], JSON_UNESCAPED_UNICODE);
?>
