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
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
    exit();
}
requireCsrf();

$email = $_SESSION['user_email'];
$planId = trim($_POST['planId'] ?? '');
$immediate = intval($_POST['immediate'] ?? 0);
$paymentMethod = trim($_POST['paymentMethod'] ?? '');
$paymentRef = trim($_POST['paymentRef'] ?? '');
$paymentProof = $_POST['paymentProof'] ?? null;

if (empty($planId)) {
    echo json_encode(["success" => false, "message" => "بيانات الباقة ناقصة."]);
    exit();
}
if (isBlacklisted($conn, 'email', $email)) {
    echo json_encode(["success" => false, "message" => "تعذّر إتمام الطلب."]);
    exit();
}

// الباقة والسعر والمدة بييجوا من قاعدة البيانات مباشرة - مش من الطلب
$planStmt = $conn->prepare("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1 LIMIT 1");
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
// الإصدار 96: تغيير الباقة لباقة من نفس بورصة الحساب بس
require_once __DIR__ . '/markets_core.php';
$acctMarket = mc_account_market($conn, $email);
if (isset($planRow['market']) && $planRow['market'] !== $acctMarket) { echo json_encode(["success" => false, "message" => "هذه الباقة ليست متاحة لبورصة حسابك (" . $acctMarket . ")."]); exit(); }
$durationDays = (int)$planRow['duration_days'];

// التجربة المجانية مرة واحدة بس - غير ممكن حد مشترك يرجع لها
if ($amount <= 0 && hasEverSubscribed($conn, $email)) {
    echo json_encode(["success" => false, "message" => "التجربة المجانية متاحة مرة واحدة فقط لكل حساب."]);
    exit();
}

// اشتراكات مدفوعة عن طريق تحويل لازم يكون معاها رقم عملية وصورة إثبات (حسب إعدادات الأدمن) - لا يوجد تحويل بدونهم
if ($amount > 0 && !mc_method_allowed($conn, $acctMarket, $paymentMethod)) {
    echo json_encode(["success" => false, "message" => "طريقة الدفع هذه غير متاحة الآن. اختر طريقة أخرى."]);
    exit();
}
if ($amount > 0 && is_transfer_method($paymentMethod)) {
    $needRef = getAdminSetting($conn, 'require_payment_ref', true);
    $needProof = getAdminSetting($conn, 'require_payment_proof', true);
    if (($needRef && empty($paymentRef)) || ($needProof && empty($paymentProof))) {
        echo json_encode(["success" => false, "message" => "يجب إدخال رقم عملية التحويل وإرفاق صورة إثبات التحويل قبل تأكيد تغيير الباقة."]);
        exit();
    }
}

// صورة إثبات الدفع بتتحفظ كملف
if (!empty($paymentProof)) {
    $paymentProof = upl_store($paymentProof, 'proof', true);
    if ($paymentProof === false) {
        echo json_encode(["success" => false, "message" => "صيغة ملف إثبات الدفع غير مدعومة. ارفع صورة (JPG/PNG) أو PDF."]);
        exit();
    }
}

$stmt = $conn->prepare("SELECT * FROM subscribers WHERE account_email = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "لا يوجد اشتراك حالي لتطبيق الترقية عليه."]);
    exit();
}

// الإصدار 84: الدفع بالبطاقة (Paymob) ← لا يوجد أي تغيير في الاشتراك حتى ما البوابة تأكد الدفع
if ($amount > 0 && $paymentMethod === 'paymob') {
    [$payUrl, $err] = paymob_start($conn, ['kind' => 'change', 'subscriber_id' => (int)$row['id'], 'account_email' => $email, 'plan_id' => $planId,
        'immediate' => $immediate, 'amount' => $amount, 'name' => $row['name'], 'phone' => $row['phone'], 'email' => $row['contact_email'] ?: $email]);
    echo json_encode($payUrl ? ["success" => true, "redirect" => $payUrl, "message" => "جاري تحويلك لصفحة الدفع الآمنة..."] : ["success" => false, "message" => $err]);
    exit();
}

if ($immediate) {
    // الانتقال فورًا للباقة الجديدة - بيفقد العميل باقي أيام باقته الحالية
    // الحساب يفضل موقوف حتى ما المدير يراجع السداد الجديد (إلا لو الباقة الجديدة مجانية)
    $newStart = date('Y-m-d');
    $newEnd = date('Y-m-d', strtotime($newStart . " +$durationDays days"));
    $requireManualActivation = getAdminSetting($conn, 'require_manual_activation', true);
    $newActive = ($amount == 0 || !$requireManualActivation) ? 1 : 0;
    if ($amount > 0 && $paymentMethod === 'card') $newActive = 0; // لا يوجد بوابة دفع حقيقية بعد

    $upd = $conn->prepare("UPDATE subscribers SET
        plan_id=?, plan_name=?, amount=?, start_date=?, end_date=?,
        payment_method=?, payment_ref=?, payment_proof=?, active=?,
        pending_plan_id=NULL, pending_plan_name=NULL, pending_amount=NULL, pending_duration_days=NULL,
        pending_payment_method=NULL, pending_payment_ref=NULL, pending_payment_proof=NULL
        WHERE id=?");
    $upd->bind_param("ssdsssssii", $planId, $planName, $amount, $newStart, $newEnd, $paymentMethod, $paymentRef, $paymentProof, $newActive, $row['id']);
    if ($upd->execute()) {
        logSubscriptionEvent($conn, $email, 'plan_change', $planId, $planName, $amount);
        if ($newActive) maybeRewardReferral($conn, $email);
        $msg = $newActive
            ? "تم الانتقال فورًا للباقة الجديدة ($planName)، وسريانها حتى $newEnd."
            : "تم استلام طلب الانتقال الفوري وبيانات السداد — سيتم تفعيل الباقة الجديدة ($planName) فور مراجعة السداد من فريقنا.";
        mail_plan_change_requested($conn, $email, $planName, $msg); // الإصدار 72
        echo json_encode(["success" => true, "message" => $msg]);
    } else {
        echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
    }
    $upd->close();
} else {
    // السداد الآن، والانتقال هيتم تلقائيًا فور انتهاء الباقة الحالية (وبعد مراجعة المدير للسداد)
    $upd = $conn->prepare("UPDATE subscribers SET
        pending_plan_id=?, pending_plan_name=?, pending_amount=?, pending_duration_days=?,
        pending_payment_method=?, pending_payment_ref=?, pending_payment_proof=?
        WHERE id=?");
    $upd->bind_param("ssdisssi", $planId, $planName, $amount, $durationDays, $paymentMethod, $paymentRef, $paymentProof, $row['id']);
    if ($upd->execute()) {
        $msg = "تم استلام بيانات السداد — ستستمر في الاستفادة من مميزات باقتك الحالية حتى " . $row['end_date'] . "، وبعدها ستتفعّل الباقة الجديدة ($planName) تلقائيًا بعد مراجعة السداد.";
        mail_plan_change_requested($conn, $email, $planName, $msg); // الإصدار 72
        echo json_encode(["success" => true, "message" => $msg]);
    } else {
        echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
    }
    $upd->close();
}
?>
