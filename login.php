<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
/* الإصدار 84:
   - حسابات الإدارة/الموظفين: لو "رابط دخول الإدارة السري" متفعّل، الدخول بيبقى من الرابط ده بس
   - كود تحقق OTP (إيميل/SMS) للإدارة و/أو العملاء حسب إعدادات لوحة التحكم ← otp_verify.php
   - رقم جلسة جديد بعد الدخول (session_regenerate_id) */

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireCsrf();
    $email = isset($_POST['email']) ? trim(strtolower($_POST['email'])) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "يرجى إدخال البريد الإلكتروني وكلمة المرور."]);
        exit();
    }
    $locked = loginLockedMinutes($conn, $email);
    if ($locked > 0) {
        http_response_code(429);
        echo json_encode(["success" => false, "message" => "محاولات دخول كثيرة. حاول مرة أخرى بعد $locked دقيقة، أو استخدم «نسيت كلمة المرور»."]);
        exit();
    }
    if (isBlacklisted($conn, 'email', $email)) {
        echo json_encode(["success" => false, "message" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
        exit();
    }

    $stmt = $conn->prepare("SELECT id, password, is_admin FROM users WHERE username = ? AND archived = 0 LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if (password_verify($password, $row['password'])) {
            clearLoginFailures($conn, $email);
            if (password_needs_rehash($row['password'], PASSWORD_DEFAULT)) {
                $nh = password_hash($password, PASSWORD_DEFAULT);
                $up = $conn->prepare("UPDATE users SET password = ? WHERE id = ?"); $up->bind_param("si", $nh, $row['id']); $up->execute(); $up->close();
            }
            $isStaff = (int)$row['is_admin'] === 1;
            // حساب إداري من غير فتح الرابط السري ← نفس رسالة الخطأ العادية (منكشفش إن الحساب إداري)
            if ($isStaff && admin_gate_enabled($conn) && !admin_gate_is_open()) {
                recordLoginFailure($conn, $email);
                echo json_encode(["success" => false, "message" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
                $stmt->close();
                exit();
            }
            if (otp_required_for($conn, $isStaff)) {
                [$ok, $channel, $to, $err] = otp_start($conn, $email, $isStaff);
                if (!$ok) {
                    echo json_encode(["success" => false, "message" => "تعذّر إرسال كود التحقق: $err. حاول مرة أخرى بعد قليل."]);
                } else {
                    echo json_encode(["success" => false, "otpRequired" => true, "channel" => $channel, "to" => $to,
                        "message" => $channel === 'whatsapp' ? "أرسلنا لك كودًا على واتساب $to" : ($channel === 'sms' ? "أرسلنا لك كودًا على الموبايل $to" : "أرسلنا لك كودًا على البريد $to")]);
                }
                $stmt->close();
                exit();
            }
            login_complete($email, (int)$row['is_admin']);
            echo json_encode(["success" => true, "is_admin" => (bool)$row['is_admin'], "csrfToken" => csrf_token()]);
        } else {
            recordLoginFailure($conn, $email);
            echo json_encode(["success" => false, "message" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
        }
    } else {
        recordLoginFailure($conn, $email);
        password_verify($password, '$2y$10$abcdefghijklmnopqrstuuT1bJ8qx7rS9cO2mB6Qm9x3dXv5wF1a'); // نفس زمن الرد سواء الحساب موجود أو لأ
        echo json_encode(["success" => false, "message" => "البريد الإلكتروني أو كلمة المرور غير صحيحة."]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "طريقة طلب غير صالحة."]);
}
?>
