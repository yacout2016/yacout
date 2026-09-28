<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/uploads.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/paymob_lib.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول أولاً."]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}
requireCsrf();

$accountEmail   = $_SESSION['user_email'];
$name           = trim($_POST['name'] ?? '');
$phone          = trim($_POST['phone'] ?? '');
$contactEmail   = trim($_POST['contactEmail'] ?? '');
$planId         = trim($_POST['planId'] ?? '');
$currency       = trim($_POST['currency'] ?? '');
$market         = trim($_POST['market'] ?? '');
$paymentMethod  = trim($_POST['paymentMethod'] ?? '');
$paymentRef     = trim($_POST['paymentRef'] ?? '');
$paymentProof   = $_POST['paymentProof'] ?? null; // صورة Base64 (لاحقًا يُفضّل تُخزَّن كملف على السيرفر بدل قاعدة البيانات)
$startDate      = date('Y-m-d'); // تاريخ البداية بيحدده السيرفر (مش العميل)

if (empty($name) || empty($phone) || empty($contactEmail) || empty($planId)) {
    echo json_encode(["success" => false, "message" => "بيانات ناقصة."]);
    exit();
}

// صورة إثبات الدفع بتتحفظ كملف (مش Base64 جوه قاعدة البيانات)
if (!empty($paymentProof)) {
    $paymentProof = upl_store($paymentProof, 'proof', true);
    if ($paymentProof === false) {
        echo json_encode(["success" => false, "message" => "صيغة ملف إثبات الدفع غير مدعومة. ارفع صورة (JPG/PNG) أو PDF."]);
        exit();
    }
}

// الباقة والسعر والمدة بييجوا من قاعدة البيانات مباشرة - مش من الطلب - عشان محدش يقدر
// يبعت amount=0 أو planId وهمي ويفتح لنفسه اشتراك مجاني
$planStmt = $conn->prepare("SELECT id, name, amount, duration_days FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1");
$planStmt->bind_param("s", $planId);
$planStmt->execute();
$planRow = $planStmt->get_result()->fetch_assoc();
$planStmt->close();

if (!$planRow) {
    echo json_encode(["success" => false, "message" => "الباقة المختارة غير متاحة."]);
    exit();
}

$planName = $planRow['name'];
$amount = (float)$planRow['amount'];

// التجربة المجانية مرة واحدة بس لكل حساب
if ($amount <= 0 && hasEverSubscribed($conn, $accountEmail)) {
    echo json_encode(["success" => false, "message" => "التجربة المجانية متاحة مرة واحدة فقط لكل حساب. اختر باقة مدفوعة."]);
    exit();
}
$endDate = date('Y-m-d', strtotime($startDate . ' +' . (int)$planRow['duration_days'] . ' days'));

// الإصدار 84: التجربة المجانية مرة واحدة بس لكل رقم موبايل كمان (مش لكل حساب بس)
if ($amount <= 0 && phone_used_trial($conn, $phone)) {
    echo json_encode(["success" => false, "message" => "رقم الموبايل هذا استخدم التجربة المجانية من قبل. اختر باقة مدفوعة."]);
    exit();
}

// الإصدار 84: طرق الدفع المتاحة (الأدمن بيشغّلها ويقفلها من لوحة التحكم)
if ($amount > 0 && !payment_method_allowed($conn, $paymentMethod)) {
    echo json_encode(["success" => false, "message" => "طريقة الدفع هذه غير متاحة الآن. اختر طريقة أخرى."]);
    exit();
}

// القائمة السوداء - الاسم أو الهاتف أو الإيميل الموقوف مايقدرش يكمّل اشتراك خالص
if (isBlacklisted($conn, 'name', $name) || isBlacklisted($conn, 'phone', $phone)
    || isBlacklisted($conn, 'email', $contactEmail) || isBlacklisted($conn, 'email', $accountEmail)) {
    echo json_encode(["success" => false, "message" => "تعذّر إتمام الاشتراك."]);
    exit();
}

// اشتراكات مدفوعة عن طريق تحويل لازم يكون معاها رقم عملية وصورة إثبات (حسب إعدادات الأدمن) - لا يوجد تفعيل بدونهم
if ($amount > 0 && is_transfer_method($paymentMethod)) {
    $needRef = getAdminSetting($conn, 'require_payment_ref', true);
    $needProof = getAdminSetting($conn, 'require_payment_proof', true);
    if (($needRef && empty($paymentRef)) || ($needProof && empty($paymentProof))) {
        echo json_encode(["success" => false, "message" => "يجب إدخال رقم عملية التحويل وإرفاق صورة إثبات التحويل."]);
        exit();
    }
}

// التفعيل تلقائي بس للتجربة المجانية، أو لو الأدمن أوقف خاصية "مراجعة السداد يدويًا"
$requireManualActivation = getAdminSetting($conn, 'require_manual_activation', true);
$active = ($amount == 0 || !$requireManualActivation) ? 1 : 0;
// الدفع بالبطاقة بعد لا يوجد بوابة دفع حقيقية بتتحقق منه - فلازم مراجعة يدوية دايمًا
if ($amount > 0 && $paymentMethod === 'card') $active = 0;
// Paymob: الاشتراك بيتفعّل تلقائي بس بعد ما البوابة تأكد الدفع (paymob_callback.php)
if ($amount > 0 && $paymentMethod === 'paymob') { $active = 0; $paymentRef = 'بانتظار الدفع (Paymob)'; $paymentProof = null; }

$stmt = $conn->prepare("INSERT INTO subscribers
    (account_email, name, phone, contact_email, plan_id, plan_name, amount, currency, market, payment_method, payment_ref, payment_proof, start_date, end_date, active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
$stmt->bind_param(
    "ssssssdsssssssi",
    $accountEmail, $name, $phone, $contactEmail, $planId, $planName,
    $amount, $currency, $market, $paymentMethod, $paymentRef, $paymentProof, $startDate, $endDate, $active
);

if ($stmt->execute()) {
    $newId = $conn->insert_id;
    logSubscriptionEvent($conn, $accountEmail, 'new_subscription', $planId, $planName, $amount);
    if ((int)$active === 1) {
        maybeRewardReferral($conn, $accountEmail);
    }
    // الإصدار 84: الدفع بالبطاقة ← نحوّل العميل لصفحة الدفع الآمنة بتاعة Paymob
    if ($amount > 0 && $paymentMethod === 'paymob') {
        [$payUrl, $err] = paymob_start($conn, ['kind' => 'new', 'subscriber_id' => $newId, 'account_email' => $accountEmail, 'plan_id' => $planId,
            'amount' => $amount, 'name' => $name, 'phone' => $phone, 'email' => $contactEmail]);
        if (!$payUrl) {
            $d = $conn->prepare("DELETE FROM subscribers WHERE id = ? AND active = 0"); $d->bind_param("i", $newId); $d->execute(); $d->close();
            echo json_encode(["success" => false, "message" => $err]);
            exit();
        }
        echo json_encode(["success" => true, "id" => $newId, "active" => false, "redirect" => $payUrl]);
        exit();
    }
    // الإصدار 72: إيميل للعميل (تم التفعيل / استلمنا طلبك) + تنبيه للإدارة لو محتاج مراجعة سداد
    mail_subscription_created($conn, $accountEmail, $name, $planName, $amount, (int)$active === 1, $endDate);
    echo json_encode(["success" => true, "id" => $newId, "active" => (bool)$active]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ أثناء حفظ بيانات الاشتراك."]);
}
$stmt->close();
?>
