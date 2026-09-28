<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'manage_staff');
requireCsrf();

$email = isset($_POST['email']) ? trim(strtolower($_POST['email'])) : '';
$jobTitle = trim($_POST['jobTitle'] ?? '');

$validJobTitles = array_keys(getAllJobTitles());
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || !in_array($jobTitle, $validJobTitles, true)) {
    echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]);
    exit();
}
if (strtolower($email) === strtolower(ADMIN_EMAIL)) {
    echo json_encode(["success" => false, "message" => "هذا البريد هو السوبر أدمن الأصلي بالفعل، ولديه كل الصلاحيات دائمًا."]);
    exit();
}

// لازم يكون عنده حساب مسجّل فعليًا في الموقع الأول (يسجّل حساب عادي، وبعدين تضيفه هنا كعضو فريق)
$userStmt = $conn->prepare("SELECT id FROM users WHERE username = ? AND archived = 0 LIMIT 1");
$userStmt->bind_param("s", $email);
$userStmt->execute();
$userExists = $userStmt->get_result()->num_rows > 0;
$userStmt->close();

if (!$userExists) {
    echo json_encode(["success" => false, "message" => "يجب أن ينشئ هذا الشخص حسابًا عاديًا على الموقع أولًا (يسجّل ببريده)، ثم يمكنك إضافته هنا كعضو فريق."]);
    exit();
}

$conn->begin_transaction();
try {
    // ترقية حسابه لعضو أدمن (يقدر يدخل لوحة التحكم، والصلاحيات الفعلية بتتحدد من staff_permissions)
    $upd = $conn->prepare("UPDATE users SET is_admin = 1 WHERE username = ?");
    $upd->bind_param("s", $email);
    $upd->execute();
    $upd->close();

    $stmt = $conn->prepare("INSERT INTO staff_members (email, job_title, active) VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE job_title = VALUES(job_title), active = 1");
    $stmt->bind_param("ss", $email, $jobTitle);
    $stmt->execute();
    $staffId = $conn->insert_id ?: null;
    $stmt->close();

    if (!$staffId) {
        $find = $conn->prepare("SELECT id FROM staff_members WHERE email = ?");
        $find->bind_param("s", $email);
        $find->execute();
        $staffId = (int)$find->get_result()->fetch_assoc()['id'];
        $find->close();
    }

    // إعادة ضبط الصلاحيات على افتراضي المسمى الوظيفي الجديد (نقطة بداية - يقدر الأدمن يعدّلها بعد كده)
    $del = $conn->prepare("DELETE FROM staff_permissions WHERE staff_id = ?");
    $del->bind_param("i", $staffId);
    $del->execute();
    $del->close();

    $defaults = getDefaultPermissionsForJobTitle($jobTitle);
    $ins = $conn->prepare("INSERT INTO staff_permissions (staff_id, permission_key) VALUES (?, ?)");
    foreach ($defaults as $key) {
        $ins->bind_param("is", $staffId, $key);
        $ins->execute();
    }
    $ins->close();

    $conn->commit();
    echo json_encode(["success" => true, "staffId" => (string)$staffId]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $e->getMessage()]);
}
?>
