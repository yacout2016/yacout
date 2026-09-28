<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'edit_site_design');
requireCsrf();

// كل مفاتيح الشاشات المسموح برفع خلفية لها - نفس المفاتيح المستخدمة في pageTitle() على الواجهة
// (بالإضافة لـ login وsplash: شاشتا الدخول والترحيب الأوليين)
$allowedKeys = [
    'login',
    'splash',
    'public_pricing',
    'testimonials',
    'articles_list',
    'article_detail',
    'privacy_page',
    'home',
    'my_subscription_history',
    'disclaimer_page',
    'disclaimer_gate',
    'about_page',
    'refund_policy_page',
    'suggestions_page',
    'contact_info',
    'admin_hub',
    'admin_subscribers',
    'archived_customers',
    'plans_management',
    'chat_admin',
    'admin_settings',
    'blacklist',
    'staff_management',
    'site_design',
    'admin_reports',
    'recommendations_admin',
    'recommendations_customer',
    'content_admin',
    'site_texts_admin',
    'suggestions_admin',
    'plans_list',
    'portfolio',
    'diversification_report',
    'referral',
    'profile',
    'grid_plans_list',
    'grid_plan_new',
    'plan_type_chooser',
    'screener',
    'register',
    'login_email',
    'forgot_password',
    'reset_password',
    'verify_email_prompt',
    'verify_email_result',
    'pending_activation',
    'access_expired',
    'public_plans_info',
    'subscription_plans',
    'plan_change_checkout',
    'checkout_form',
    'new_plan_form',
    'plan_detail',
    'edit_plan_settings',
    'grid_plan_detail',
    'grid_edit_plan_settings'
];

$key = trim($_POST['key'] ?? '');
if (!in_array($key, $allowedKeys, true)) {
    echo json_encode(["success" => false, "message" => "شاشة غير معروفة."]);
    exit();
}

function bg_old_value($conn, $key){
    $st = $conn->prepare("SELECT image_data FROM page_backgrounds WHERE page_key = ?");
    $st->bind_param("s", $key); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    return $r ? $r['image_data'] : null;
}
$image = $_POST['image'] ?? '';
$previous = bg_old_value($conn, $key);

// فاضي = حذف الخلفية المخصصة (رجوع للشكل الافتراضي)
if ($image === '') {
    $stmt = $conn->prepare("DELETE FROM page_backgrounds WHERE page_key = ?");
    $stmt->bind_param("s", $key);
    $stmt->execute();
    $stmt->close();
    upl_delete($previous);
    echo json_encode(["success" => true]);
    exit();
}

if (!preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,/', $image)) {
    echo json_encode(["success" => false, "message" => "صيغة الصورة غير مدعومة."]);
    exit();
}
if (strlen($image) > 1300000) {
    echo json_encode(["success" => false, "message" => "حجم الصورة كبير جدًا - جرّب صورة أصغر."]);
    exit();
}

// الخلفية بتتحفظ كملف (أخف بكتير على قاعدة البيانات وعلى فتح الموقع)
$image = upl_store($image, 'bg');
if ($image === false) {
    echo json_encode(["success" => false, "message" => "صيغة الصورة غير مدعومة."]);
    exit();
}

$by = $_SESSION['user_email'];
$stmt = $conn->prepare("INSERT INTO page_backgrounds (page_key, image_data, updated_by) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE image_data = VALUES(image_data), updated_by = VALUES(updated_by)");
$stmt->bind_param("sss", $key, $image, $by);
if ($stmt->execute()) {
    if ($previous !== $image) upl_delete($previous);
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
