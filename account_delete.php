<?php
/* حذف الحساب نهائيًا بطلب العميل (متطلب Google Play + حق العميل)
   - لازم يكون مسجّل دخول + يأكد بكلمة المرور + كلمة "حذف"
   - بيتمسح: الحساب، الخطط، الصورة الشخصية، المقترحات، محادثات الدردشة، طلبات تغيير الإيميل/كلمة المرور، الإحالات
   - سجل الاشتراكات والمدفوعات بيتحفظ بدون بيانات شخصية (مطلوب محاسبيًا)، وسجل موافقة إخلاء المسؤولية بيتحفظ (مطلوب قانونيًا)
     وده مذكور في سياسة الخصوصية */
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email'])) { http_response_code(401); echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(["success" => false]); exit(); }
requireCsrf();

$email = $_SESSION['user_email'];
if (strtolower($email) === strtolower(ADMIN_EMAIL)) {
    echo json_encode(["success" => false, "message" => "حساب مدير الموقع الأصلي مينفعش يتحذف من هنا."]);
    exit();
}
if (trim($_POST['confirm'] ?? '') !== 'حذف') {
    echo json_encode(["success" => false, "message" => "اكتب كلمة «حذف» للتأكيد."]);
    exit();
}
$st = $conn->prepare("SELECT id, password, avatar_data FROM users WHERE username = ? LIMIT 1");
$st->bind_param("s", $email); $st->execute();
$user = $st->get_result()->fetch_assoc(); $st->close();
if (!$user || !password_verify($_POST['password'] ?? '', $user['password'])) {
    echo json_encode(["success" => false, "message" => "كلمة المرور غير صحيحة."]);
    exit();
}

// الملفات المرتبطة بالحساب
$files = [$user['avatar_data']];
$q = $conn->prepare("SELECT payment_proof, pending_payment_proof FROM subscribers WHERE account_email = ?");
$q->bind_param("s", $email); $q->execute(); $res = $q->get_result();
while ($r = $res->fetch_assoc()) { $files[] = $r['payment_proof']; $files[] = $r['pending_payment_proof']; }
$q->close();
$q = @$conn->prepare("SELECT attachment_data FROM suggestions WHERE account_email = ?");
if ($q) { $q->bind_param("s", $email); $q->execute(); $res = $q->get_result(); while ($r = $res->fetch_assoc()) $files[] = $r['attachment_data']; $q->close(); }
$q = @$conn->prepare("SELECT attachment FROM chat_messages WHERE visitor_email = ?");
if ($q) { $q->bind_param("s", $email); $q->execute(); $res = $q->get_result(); while ($r = $res->fetch_assoc()) $files[] = $r['attachment']; $q->close(); }

$run = function($sql) use ($conn, $email) {
    $s = @$conn->prepare($sql);
    if (!$s) return;
    $s->bind_param("s", $email); $s->execute(); $s->close();
};
$conn->begin_transaction();
try {
    $run("DELETE FROM user_plans WHERE account_email = ?");
    $run("DELETE FROM user_data_store WHERE account_email = ?");
    $run("DELETE FROM suggestions WHERE account_email = ?");
    $run("DELETE FROM chat_messages WHERE visitor_email = ?");
    $run("DELETE FROM email_change_requests WHERE current_email = ?");
    $run("DELETE FROM email_verifications WHERE email = ?");
    $run("DELETE FROM password_resets WHERE email = ?");
    $run("DELETE FROM referrals WHERE referred_email = ?");
    $run("DELETE FROM login_attempts WHERE email = ?");
    // الاشتراكات: بتفضل كسجل مالي بدون أي بيانات شخصية
    $run("UPDATE subscribers SET name = 'حساب محذوف', phone = '', contact_email = '', national_id = '', address = '',
          payment_proof = NULL, pending_payment_proof = NULL, archived = 1, active = 0, reminder_enabled = 0 WHERE account_email = ?");
    $run("DELETE FROM users WHERE username = ?");
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    error_log('account_delete: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "حصل خطأ أثناء الحذف. تواصل معنا."]);
    exit();
}
foreach ($files as $f) upl_delete($f);

$_SESSION = [];
if (ini_get('session.use_cookies')) { $p = session_get_cookie_params(); setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']); }
session_destroy();
echo json_encode(["success" => true, "message" => "تم حذف حسابك وبياناتك نهائيًا."]);
