<?php
/* =====================================================================
   GRIFFINE — codes_lib.php (الإصدار 96) — أكواد الأعضاء
   ---------------------------------------------------------------------
   - رقم تسلسل عام لكل حساب مسجّل (member_no) يبدأ من 1 = حساب الأدمن الرئيسي
   - كود الحساب: الأدمن الرئيسي = Top-7 ، أي مشترك = INV-1, INV-2 ... (عدّاد مستمر)
   - الموظف (حساب منفصل عن حسابه كمستثمر): كود حسب مسماه
       مدير موقع GM-n ، خدمة عملاء C-n ، مبيعات S-n ، محاسب / محلل مالي / حسابات AC-n ، أي مسمى تاني N-n
   - المستثمر اللي عنده دور موظف نشط ← بيظهر كوده INV-n-E (علامة إنه موظف كمان)
   - الأكواد عمرها ما بتتكرر (العدّاد مبيرجعش) ، وتغيير المسمى بيدي كود جديد والقديم بيتسجّل في السجل
   ===================================================================== */

function codes_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW COLUMNS FROM users LIKE 'inv_code'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
// عدّاد ذرّي (مفيش رقمين زي بعض حتى لو اتنين سجّلوا في نفس اللحظة)
function codes_next($conn, $prefix){
    $st = $conn->prepare("INSERT INTO code_counters (prefix, last_no) VALUES (?, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)");
    $st->bind_param("s", $prefix); $st->execute(); $st->close();
    return (int)$conn->insert_id;
}
function codes_prefix_for_title($conn, $titleKey){
    $key = (string)$titleKey; $label = '';
    try { $st = $conn->prepare("SELECT label FROM job_titles WHERE title_key = ?"); $st->bind_param("s", $key); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close(); $label = $r['label'] ?? ''; } catch (Throwable $e) {}
    $t = $key . ' ' . $label;
    if ($key === 'site_manager' || mb_strpos($label, 'مدير موقع') !== false || mb_strpos($label, 'مدير عام') !== false) return 'GM';
    if ($key === 'customer_service' || mb_strpos($label, 'خدمة عملاء') !== false || mb_strpos($label, 'خدمة العملاء') !== false) return 'C';
    if ($key === 'sales' || mb_strpos($label, 'مبيعات') !== false) return 'S';
    if ($key === 'accounts' || preg_match('/محاسب|حسابات|محلل مالي|مالي/u', $label)) return 'AC';
    return 'N';
}
function codes_log($conn, $email, $code, $kind){
    try { $st = $conn->prepare("INSERT INTO member_code_history (account_email, code, kind) VALUES (?, ?, ?)"); $st->bind_param("sss", $email, $code, $kind); $st->execute(); $st->close(); } catch (Throwable $e) {}
}
// كود حساب (مستثمر) - بيتنادى بعد التسجيل
function codes_assign_user($conn, $email){
    if (!codes_ready($conn)) return null;
    $st = $conn->prepare("SELECT member_no, inv_code FROM users WHERE username = ?"); $st->bind_param("s", $email); $st->execute();
    $u = $st->get_result()->fetch_assoc(); $st->close();
    if (!$u) return null;
    if (!empty($u['inv_code'])) return $u['inv_code'];
    $isOwner = strtolower($email) === strtolower(ADMIN_EMAIL);
    $no = codes_next($conn, 'ALL');   // الأدمن الرئيسي بياخد أول رقم (codes_ensure_all بتبدأ بيه) ← 1
    $code = $isOwner ? 'Top-7' : 'INV-' . codes_next($conn, 'INV');
    $up = $conn->prepare("UPDATE users SET member_no = ?, inv_code = ? WHERE username = ? AND inv_code IS NULL");
    $up->bind_param("iss", $no, $code, $email); $up->execute(); $up->close();
    codes_log($conn, $email, $code, 'member');
    return $code;
}
// كود موظف حسب مسماه - بيتنادى عند الإضافة أو تغيير المسمى (لو الحرف اتغيّر ← كود جديد)
function codes_assign_staff($conn, $staffId){
    if (!codes_ready($conn)) return null;
    $st = $conn->prepare("SELECT id, email, job_title, staff_code FROM staff_members WHERE id = ?"); $st->bind_param("i", $staffId); $st->execute();
    $s = $st->get_result()->fetch_assoc(); $st->close();
    if (!$s || strtolower($s['email']) === strtolower(ADMIN_EMAIL)) return null;
    $prefix = codes_prefix_for_title($conn, $s['job_title']);
    if (!empty($s['staff_code']) && strpos($s['staff_code'], $prefix . '-') === 0) return $s['staff_code'];
    $code = $prefix . '-' . codes_next($conn, $prefix);
    $up = $conn->prepare("UPDATE staff_members SET staff_code = ? WHERE id = ?"); $up->bind_param("si", $code, $staffId); $up->execute(); $up->close();
    codes_log($conn, $s['email'], $code, 'staff');
    return $code;
}
// أي حساب أو موظف ناقصه كود (الحسابات القديمة أول مرة بعد التحديث) ← بالترتيب حسب تاريخ التسجيل
function codes_ensure_all($conn){
    if (!codes_ready($conn)) return;
    try {
        $owner = ADMIN_EMAIL;
        $o = $conn->prepare("SELECT username FROM users WHERE username = ? AND inv_code IS NULL"); $o->bind_param("s", $owner); $o->execute();
        if ($o->get_result()->fetch_assoc()) codes_assign_user($conn, $owner); $o->close();
        $res = $conn->query("SELECT username FROM users WHERE inv_code IS NULL ORDER BY created_at, id LIMIT 5000");
        $list = []; while ($r = $res->fetch_assoc()) $list[] = $r['username'];
        foreach ($list as $e) codes_assign_user($conn, $e);
        $res = $conn->query("SELECT id FROM staff_members WHERE staff_code IS NULL ORDER BY created_at, id LIMIT 1000");
        $ids = []; while ($r = $res->fetch_assoc()) $ids[] = (int)$r['id'];
        foreach ($ids as $id) codes_assign_staff($conn, $id);
    } catch (Throwable $e) { error_log('GRIFFINE codes_ensure_all: ' . $e->getMessage()); }
}
// الكود المعروض لحساب: Top-7 / INV-n / INV-n-E (+ كود الموظف لوحده)
function codes_display($invCode, $staffCode, $staffActive){
    $c = (string)$invCode;
    if ($c !== '' && $c !== 'Top-7' && $staffCode && $staffActive) $c .= '-E';
    return $c;
}
?>
