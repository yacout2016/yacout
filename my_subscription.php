<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "يرجى تسجيل الدخول."]);
    exit();
}

$email = $_SESSION['user_email'];

// أول حاجة: لو معاد الاشتراك انتهى وفيه باقة جديدة مجدولة، فعّلها دلوقتي (تحديث كسول بدل Cron Job)
$stmt = $conn->prepare("SELECT * FROM subscribers WHERE account_email = ? AND archived = 0 ORDER BY id DESC LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($row) {
    $today = date('Y-m-d');
    if ($row['end_date'] < $today && !empty($row['pending_plan_id'])) {
        $newPlanId = $row['pending_plan_id'];
        $newPlanName = $row['pending_plan_name'];
        $newAmount = $row['pending_amount'];
        $newPayMethod = $row['pending_payment_method'];
        $newPayRef = $row['pending_payment_ref'];
        $newPayProof = $row['pending_payment_proof'];
        $newStart = $today;
        // نستخدم مدة الباقة المحفوظة وقت الطلب (مش شيك ثابت على "yearly") - ولو مش محفوظة (طلبات قديمة) نرجع للافتراضي
        $durationDays = !empty($row['pending_duration_days']) ? (int)$row['pending_duration_days'] : (($newPlanId === 'yearly') ? 365 : 30);
        $newEnd = date('Y-m-d', strtotime($today . " +$durationDays days"));

        // لو الباقة الجديدة مدفوعة ومراجعة السداد يدويًا مفعّلة، الاشتراك يفضل موقوف
        // حتى ما الأدمن يراجع ويفعّله بنفسه (نفس منطق أول اشتراك) - مش بيتفعّل تلقائيًا من غير مراجعة
        $requireManualActivation = getAdminSetting($conn, 'require_manual_activation', true);
        $newActive = ((float)$newAmount == 0 || !$requireManualActivation) ? 1 : 0;
        // الإصدار 84: الباقة المؤجلة المدفوعة أونلاين عن طريق Paymob اتأكد دفعها من البوابة نفسها ← تتفعّل تلقائي
        if ($newPayMethod === 'paymob' && strpos((string)$newPayRef, 'Paymob #') === 0) $newActive = 1;

        $upd = $conn->prepare("UPDATE subscribers SET plan_id=?, plan_name=?, amount=?, start_date=?, end_date=?, payment_method=?, payment_ref=?, payment_proof=?, active=?, pending_plan_id=NULL, pending_plan_name=NULL, pending_amount=NULL, pending_duration_days=NULL, pending_payment_method=NULL, pending_payment_ref=NULL, pending_payment_proof=NULL WHERE id=?");
        $upd->bind_param("ssdsssssii", $newPlanId, $newPlanName, $newAmount, $newStart, $newEnd, $newPayMethod, $newPayRef, $newPayProof, $newActive, $row['id']);
        $upd->execute();
        $upd->close();
        logSubscriptionEvent($conn, $email, 'renewal', $newPlanId, $newPlanName, (float)$newAmount);

        // إعادة القراءة بعد التحديث
        $stmt2 = $conn->prepare("SELECT * FROM subscribers WHERE id = ?");
        $stmt2->bind_param("i", $row['id']);
        $stmt2->execute();
        $row = $stmt2->get_result()->fetch_assoc();
        $stmt2->close();
    }
}

if (!$row) {
    echo json_encode(["success" => true, "subscription" => null]);
    exit();
}

echo json_encode(["success" => true, "subscription" => [
    "id" => (string)$row['id'],
    "name" => $row['name'],
    "phone" => $row['phone'],
    "contactEmail" => $row['contact_email'],
    "nationalId" => $row['national_id'],
    "address" => $row['address'],
    "planId" => $row['plan_id'],
    "planName" => $row['plan_name'],
    "amount" => (float)$row['amount'],
    "currency" => $row['currency'],
    "market" => $row['market'],
    "startDate" => $row['start_date'],
    "endDate" => $row['end_date'],
    "active" => (bool)$row['active'],
    "pendingPlanId" => $row['pending_plan_id'],
    "pendingPlanName" => $row['pending_plan_name'],
    "pendingAmount" => $row['pending_amount'] !== null ? (float)$row['pending_amount'] : null,
]]);
?>
