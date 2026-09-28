<?php
/* =====================================================================
   GRIFFINE — email_center.php (الإصدار 72) — مركز الإيميلات في لوحة التحكم
   GET  ← حالة الإعداد (SMTP ولا mail) + آخر 150 إيميل (أُرسلت / فشل + السبب)
   POST action=test&to=...  ← إيميل تجربة للتأكد إن الإرسال شغال
   الإصدار 88: GET ?view=inbox|archive|trash + POST action=archive|unarchive|trash|restore|purge|empty_trash&ids=1,2,3
     الوارد ← الأرشيف ← سلة المحذوفات ← استرجاع من الأرشيف أو السلة ← حذف نهائي من السلة
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
$hasFlags = false;
try { $c = $conn->query("SHOW COLUMNS FROM email_log LIKE 'archived'"); $hasFlags = $c && $c->num_rows > 0; } catch (Throwable $e) {}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && in_array($_POST['action'] ?? '', ['archive', 'unarchive', 'trash', 'restore', 'purge', 'empty_trash'], true)) {
    requireCsrf();
    if (!$hasFlags) { echo json_encode(["success" => false, "message" => "شغّل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 88) الأول."]); exit(); }
    $action = $_POST['action'];
    if ($action === 'empty_trash') {
        $conn->query("DELETE FROM email_log WHERE deleted = 1");
        echo json_encode(["success" => true, "count" => $conn->affected_rows]); exit();
    }
    $ids = array_values(array_filter(array_map('intval', explode(',', (string)($_POST['ids'] ?? ''))), fn($x) => $x > 0));
    if (!$ids || count($ids) > 500) { echo json_encode(["success" => false, "message" => "اختر إيميلًا واحدًا على الأقل."]); exit(); }
    $in = implode(',', $ids);   // أرقام صحيحة فقط (intval)
    $sql = [
        'archive'   => "UPDATE email_log SET archived = 1, deleted = 0 WHERE id IN ($in)",
        'unarchive' => "UPDATE email_log SET archived = 0 WHERE id IN ($in)",
        'trash'     => "UPDATE email_log SET deleted = 1 WHERE id IN ($in)",
        'restore'   => "UPDATE email_log SET deleted = 0 WHERE id IN ($in)",
        'purge'     => "DELETE FROM email_log WHERE deleted = 1 AND id IN ($in)",
    ][$action];
    $conn->query($sql);
    echo json_encode(["success" => true, "count" => $conn->affected_rows]); exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $to = trim($_POST['to'] ?? '');
    if (!gm_clean_email($to)) { echo json_encode(["success" => false, "message" => "اكتب إيميل صحيح."]); exit(); }
    $r = griffine_notify($conn, $to, 'إيميل تجربة من GRIFFINE', 'الإيميلات شغالة ✅',
        ['إذا وصلتك هذه الرسالة فإن إرسال البريد من الموقع يعمل بشكل سليم.',
         'طريقة الإرسال: ' . (gm_smtp_enabled() ? 'SMTP (هوستنجر)' : 'mail() العادية'),
         'الوقت: ' . date('Y-m-d H:i:s')],
        ['label' => 'افتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'test');
    echo json_encode(["success" => $r['ok'], "message" => $r['ok'] ? "تم الإرسال لـ $to — افحص البريد الوارد (وكمان Spam أول مرة)." : ("فشل الإرسال: " . $r['error']), "transport" => $r['transport']]);
    exit();
}

// ---------------------------------------------------------------------
// الحالة + السجل
// ---------------------------------------------------------------------
$log = []; $hasLog = true; $stats = ["sent" => 0, "failed" => 0]; $counts = ["inbox" => 0, "archive" => 0, "trash" => 0];
$view = $_GET['view'] ?? 'inbox';
if (!in_array($view, ['inbox', 'archive', 'trash'], true)) $view = 'inbox';
$where = !$hasFlags ? '1' : ($view === 'trash' ? 'deleted = 1' : ($view === 'archive' ? 'archived = 1 AND deleted = 0' : 'archived = 0 AND deleted = 0'));
try {
    $res = $conn->query("SELECT id, to_email, subject, mail_type, status, transport, error_text, created_at FROM email_log WHERE $where ORDER BY id DESC LIMIT 500");
    if ($hasFlags) {
        $cr = $conn->query("SELECT SUM(archived = 0 AND deleted = 0) i, SUM(archived = 1 AND deleted = 0) a, SUM(deleted = 1) t FROM email_log")->fetch_assoc();
        $counts = ["inbox" => (int)$cr['i'], "archive" => (int)$cr['a'], "trash" => (int)$cr['t']];
    }
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
    "view" => $view,
    "counts" => $counts,
    "canOrganize" => $hasFlags,
], JSON_UNESCAPED_UNICODE);
?>
