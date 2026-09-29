<?php
/* =====================================================================
   GRIFFINE — symbols_audit.php (الإصدار 98) — حذف الأسهم المكتوبة غلط نهائيًا
   ---------------------------------------------------------------------
   - clean (POST) : زرار مدير الموقع ← كل رمز مش موجود في البورصة بيتمسح نهائي هو وخططه (عند كل المستخدمين والأدمن)
                    وصفقاته وإشعاراته ومتابعته - مفيش سلة محذوفات
   - auto  (GET)  : بيتنادى تلقائي لما مدير الموقع يفتح لوحة التحكم (كل 6 ساعات بالكتير) - نفس شغل الـ Cron
   التفاصيل والحماية في symbols_lib.php. مدير الموقع فقط.
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/symbols_lib.php';

function sa_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
$email = $_SESSION['user_email'] ?? '';
if (!$email || empty($_SESSION['is_admin']) || strtolower($email) !== strtolower(ADMIN_EMAIL)) { http_response_code(403); sa_out(["success" => false, "message" => "لمدير الموقع فقط."]); }

$action = $_GET['action'] ?? $_POST['action'] ?? '';
if ($action === 'clean' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    session_write_close();
    sa_out(sym_clean($conn, 'now'));
}
if ($action === 'auto') {
    session_write_close();
    if (!sym_auto_due($conn)) sa_out(["success" => true, "skipped" => true]);
    // أول تشغيل بعد التحديث ← حذف فوري لكل الرموز الغلط الموجودة (زي زرار مدير الموقع) ، بعد كده القاعدة التلقائية
    $first = true; try { $first = !$conn->query("SELECT 1 FROM site_config WHERE config_key = 'symbols_clean_at'")->fetch_assoc(); } catch (Throwable $e) {}
    sa_out(sym_clean($conn, $first ? 'now' : 'auto'));
}
sa_out(["success" => false, "message" => "طلب غير معروف."]);
?>
