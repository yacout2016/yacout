<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';   // الإصدار 84: login_complete (رقم جلسة جديد)

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $refCode = isset($_POST['refCode']) ? trim($_POST['refCode']) : '';
    // الإصدار 96: سوق الحساب (من الأسواق المفعّلة بس - الافتراضي مصر) - مبيتغيّرش بعد التسجيل
    require_once __DIR__ . '/markets_core.php';
    $acctMarket = trim((string)($_POST['market'] ?? 'مصر'));
    if (!in_array($acctMarket, mc_active($conn), true)) $acctMarket = mc_active($conn)[0];

    if (empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "يرجى ملء جميع الحقول المطلوبة."]);
        exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(["success" => false, "message" => "صيغة البريد الإلكتروني غير صحيحة."]);
        exit();
    }
    if (!isStrongPassword($password)) {
        echo json_encode(["success" => false, "message" => "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف ورقم."]);
        exit();
    }
    if (($_POST['acceptDisclaimer'] ?? '') !== '1') {
        echo json_encode(["success" => false, "message" => "يجب الموافقة على إخلاء المسؤولية لإكمال التسجيل."]);
        exit();
    }
    if (getAdminSetting($conn, 'require_valid_email_domain', true) && !isEmailDomainValid($email)) {
        echo json_encode(["success" => false, "message" => "هذا البريد الإلكتروني غير موجود أو نطاقه غير صحيح. تأكد من كتابته بشكل صحيح."]);
        exit();
    }

    $email = strtolower($email);

    if (isBlacklisted($conn, 'email', $email)) {
        echo json_encode(["success" => false, "message" => "تعذّر إنشاء الحساب."]);
        exit();
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    // التسجيل عمره ما بيدي صلاحية أدمن (حساب المدير موجود بالفعل في قاعدة البيانات)
    $isAdmin = 0;
    $verifiedFlag = getAdminSetting($conn, 'require_email_verification', true) ? 0 : 1;

    // نتأكد هل الإيميل ده مستخدم فعليًا (حساب مش مؤرشف) - لو مؤرشف، نعتبره كأنه غير موجود ونعيد تفعيله من جديد
    $stmt = $conn->prepare("SELECT id, archived, is_admin FROM users WHERE username = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        // حسابات فريق الإدارة (حتى لو مؤرشفة) غير ممكن حد يعيد تسجيلها من صفحة التسجيل
        if ((int)$row['is_admin'] === 1 || strtolower($email) === strtolower(ADMIN_EMAIL)) {
            echo json_encode(["success" => false, "message" => "هذا البريد الإلكتروني مسجل بالفعل."]);
            $stmt->close();
            exit();
        }
        if ((int)$row['archived'] === 0) {
            echo json_encode(["success" => false, "message" => "هذا البريد الإلكتروني مسجل بالفعل."]);
            $stmt->close();
            exit();
        }
        $stmt->close();

        // الحساب كان مؤرشف (محذوف) - نعيد تفعيله كحساب جديد تمامًا (باسورد جديد، ولازم يفعّل إيميله تاني)
        $upd = $conn->prepare("UPDATE users SET password = ?, is_admin = ?, archived = 0, archived_at = NULL, email_verified = ? WHERE id = ?");
        $upd->bind_param("siii", $hashed, $isAdmin, $verifiedFlag, $row['id']);
        if ($upd->execute()) {
            login_complete($email, $isAdmin);
            recordDisclaimerAcceptance($conn, $email);
            generateReferralCode($conn, $email);
            recordReferral($conn, $refCode, $email);
            $needsVerify = getAdminSetting($conn, 'require_email_verification', true);
            if ($needsVerify) sendVerificationEmail($conn, $email);
            echo json_encode(["success" => true, "message" => $needsVerify ? "تم إنشاء الحساب بنجاح. أرسلنا إليك رابط تفعيل على بريدك." : "تم إنشاء الحساب بنجاح.", "is_admin" => (bool)$isAdmin]);
        } else {
            echo json_encode(["success" => false, "message" => "حدث خطأ أثناء حفظ البيانات."]);
        }
        $upd->close();
        exit();
    }
    $stmt->close();

    // لا يوجد حساب قديم خالص - تسجيل عادي
    $stmt2 = $conn->prepare("INSERT INTO users (username, password, is_admin, email_verified) VALUES (?, ?, ?, ?)");
    $stmt2->bind_param("ssii", $email, $hashed, $isAdmin, $verifiedFlag);

    if ($stmt2->execute()) {
        login_complete($email, $isAdmin);
        recordDisclaimerAcceptance($conn, $email);
        generateReferralCode($conn, $email);
        recordReferral($conn, $refCode, $email);
        try { require_once __DIR__ . '/codes_lib.php'; codes_assign_user($conn, $email); } catch (Throwable $e) {}   // الإصدار 96: كود العضو (INV-n) تلقائي
        if (mc_ready($conn)) { $mk = $conn->prepare("UPDATE users SET account_market = ? WHERE username = ?"); $mk->bind_param("ss", $acctMarket, $email); $mk->execute(); $mk->close(); }
        $needsVerify = getAdminSetting($conn, 'require_email_verification', true);
        if ($needsVerify) sendVerificationEmail($conn, $email);
        echo json_encode(["success" => true, "message" => $needsVerify ? "تم إنشاء الحساب بنجاح. أرسلنا إليك رابط تفعيل على بريدك." : "تم إنشاء الحساب بنجاح.", "is_admin" => (bool)$isAdmin]);
    } else {
        echo json_encode(["success" => false, "message" => "حدث خطأ أثناء حفظ البيانات."]);
    }
    $stmt2->close();
} else {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
}
?>
