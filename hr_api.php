<?php
/* =====================================================================
   GRIFFINE — hr_api.php (الإصدار 85) — شؤون الموظفين (HR)
   ---------------------------------------------------------------------
   الصلاحية: manage_hr (الأدمن بيديها لأي مدير/مسؤول/موظف من "الفريق والصلاحيات")
   المسميات الوظيفية: manage_hr أو manage_staff

   GET  action=employees                        ← كل الموظفين + عدد مستنداتهم + إجمالي الرواتب
   GET  action=employee&id=                     ← موظف واحد + مستنداته + سجل حضوره (تقرير الموظف)
   GET  action=attendance&month=YYYY-MM         ← حضور الشهر لكل الموظفين النشطين + حساب الراتب
   GET  action=titles                           ← المسميات الوظيفية
   POST action=save_employee                    ← إضافة / تعديل
   POST action=delete_employee  id              ← حذف نهائي (بمستنداته وحضوره)
   POST action=upload_doc  employee_id + file   ← رفع مستند (صورة / PDF / Word / Excel / ZIP حتى 15 ميجا)
   POST action=delete_doc  id
   POST action=save_attendance  month + rows(JSON)
   POST action=save_title / delete_title        ← المسميات الوظيفية

   الراتب المستحق = الراتب الأساسي × (أيام الحضور ÷ أيام العمل) + المكافأة − الخصم
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 89: سلة المحذوفات
require_once __DIR__ . '/uploads.php';

function hr_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
function hr_fail($m){ hr_out(["success" => false, "message" => $m]); }

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); hr_fail("غير مصرح لك."); }
$perms = getCurrentUserPermissions($conn);
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$titleActions = ['titles', 'save_title', 'delete_title'];
$canHr = in_array('manage_hr', $perms, true);
$canTitles = $canHr || in_array('manage_staff', $perms, true);
if (in_array($action, $titleActions, true) ? !$canTitles : !$canHr) { http_response_code(403); hr_fail("لا توجد صلاحية كافية (شؤون الموظفين)."); }
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$by = $_SESSION['user_email'];

// الراتب المستحق لشهر
function hr_net($base, $work, $present, $bonus, $ded){
    $work = (float)$work; $present = (float)$present;
    $ratio = $work > 0 ? min(1.0, max(0.0, $present / $work)) : 0;
    return round((float)$base * $ratio + (float)$bonus - (float)$ded, 2);
}
function hr_valid_month($m){ return is_string($m) && preg_match('/^20\d{2}-(0[1-9]|1[0-2])$/', $m); }
function hr_emp_row($r){
    return [
        "id" => (int)$r['id'], "name" => $r['full_name'], "jobTitle" => $r['job_title'], "phone" => $r['phone'],
        "email" => $r['email'], "nationalId" => $r['national_id'], "salary" => (float)$r['salary'],
        "startDate" => $r['start_date'], "endDate" => $r['end_date'], "status" => $r['status'], "notes" => $r['notes'],
        "docs" => isset($r['docs']) ? (int)$r['docs'] : null,
    ];
}

try {
    // ------------------------------------------------------------------ المسميات الوظيفية
    if ($action === 'titles') {
        $out = [];
        foreach (jobTitlesTable() as $k => $v) $out[] = ["key" => $k, "label" => $v[0], "perms" => $v[1]];
        hr_out(["success" => true, "titles" => $out, "permissionKeys" => getAllPermissionKeys()]);
    }
    if ($action === 'save_title' && $isPost) {
        $label = trim(mb_substr((string)($_POST['label'] ?? ''), 0, 100));
        $key = trim((string)($_POST['key'] ?? ''));
        if ($label === '') hr_fail("اكتب اسم المسمى الوظيفي.");
        $valid = array_keys(getAllPermissionKeys());
        $pp = json_decode((string)($_POST['perms'] ?? '[]'), true);
        $pp = array_values(array_intersect(is_array($pp) ? $pp : [], $valid));
        $pj = json_encode($pp);
        if ($key === '') {   // جديد: مفتاح داخلي ثابت عشوائي (الاسم يتغيّر براحتك من غير ما يأثر على الموظفين)
            $key = 't_' . bin2hex(random_bytes(5));
            $st = $conn->prepare("INSERT INTO job_titles (title_key, label, default_perms, sort_order) VALUES (?, ?, ?, 100)");
            $st->bind_param("sss", $key, $label, $pj);
        } else {
            if (!preg_match('/^[a-z0-9_]{2,40}$/', $key)) hr_fail("مسمى غير صالح.");
            $st = $conn->prepare("INSERT INTO job_titles (title_key, label, default_perms) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE label = VALUES(label), default_perms = VALUES(default_perms)");
            $st->bind_param("sss", $key, $label, $pj);
        }
        $st->execute(); $st->close();
        hr_out(["success" => true, "key" => $key]);
    }
    if ($action === 'delete_title' && $isPost) {
        $key = (string)($_POST['key'] ?? '');
        $u = $conn->prepare("SELECT (SELECT COUNT(*) FROM staff_members WHERE job_title = ?) + (SELECT COUNT(*) FROM hr_employees WHERE job_title = ?) AS c");
        $u->bind_param("ss", $key, $key); $u->execute();
        $inUse = (int)$u->get_result()->fetch_assoc()['c']; $u->close();
        if ($inUse > 0) hr_fail("هذا المسمى مستخدم لـ $inUse شخص - غيّر مسماهم الأول.");
        $__t = trash_rows($conn, 'job_titles', 'title_key = ?', 's', [$key]); trash_put($conn, 'job_title', 'مسمى وظيفي: ' . ($__t[0]['label'] ?? $key), ['job_titles' => $__t]);
        $d = $conn->prepare("DELETE FROM job_titles WHERE title_key = ?"); $d->bind_param("s", $key); $d->execute(); $d->close();
        hr_out(["success" => true]);
    }

    // ------------------------------------------------------------------ الموظفين
    if ($action === 'employees') {
        $res = $conn->query("SELECT e.*, (SELECT COUNT(*) FROM hr_documents d WHERE d.employee_id = e.id) AS docs FROM hr_employees e ORDER BY e.status = 'active' DESC, e.full_name");
        $list = []; $total = 0; $active = 0;
        while ($r = $res->fetch_assoc()) { $list[] = hr_emp_row($r); if ($r['status'] === 'active') { $total += (float)$r['salary']; $active++; } }
        hr_out(["success" => true, "employees" => $list, "activeCount" => $active, "totalSalaries" => round($total, 2), "titles" => getAllJobTitles()]);
    }
    if ($action === 'employee') {
        $id = (int)($_GET['id'] ?? 0);
        $st = $conn->prepare("SELECT * FROM hr_employees WHERE id = ?"); $st->bind_param("i", $id); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) hr_fail("الموظف غير موجود.");
        $docs = [];
        $d = $conn->prepare("SELECT id, file_token, file_name, uploaded_by, created_at FROM hr_documents WHERE employee_id = ? ORDER BY id DESC");
        $d->bind_param("i", $id); $d->execute(); $dr = $d->get_result();
        while ($x = $dr->fetch_assoc()) $docs[] = ["id" => (int)$x['id'], "name" => $x['file_name'], "url" => upl_url($x['file_token']), "by" => $x['uploaded_by'], "at" => $x['created_at']];
        $d->close();
        $att = [];
        $a = $conn->prepare("SELECT * FROM hr_attendance WHERE employee_id = ? ORDER BY month DESC LIMIT 24");
        $a->bind_param("i", $id); $a->execute(); $ar = $a->get_result();
        while ($x = $ar->fetch_assoc()) $att[] = ["month" => $x['month'], "workDays" => (float)$x['work_days'], "presentDays" => (float)$x['present_days'],
            "bonus" => (float)$x['bonus'], "deductions" => (float)$x['deductions'], "baseSalary" => (float)$x['base_salary'],
            "net" => hr_net($x['base_salary'], $x['work_days'], $x['present_days'], $x['bonus'], $x['deductions']), "note" => $x['note']];
        $a->close();
        hr_out(["success" => true, "employee" => hr_emp_row($r), "documents" => $docs, "attendance" => $att, "titles" => getAllJobTitles()]);
    }
    if ($action === 'save_employee' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $name = trim(mb_substr((string)($_POST['name'] ?? ''), 0, 150));
        $title = trim((string)($_POST['jobTitle'] ?? ''));
        $phone = trim(mb_substr((string)($_POST['phone'] ?? ''), 0, 30));
        $email = strtolower(trim(mb_substr((string)($_POST['email'] ?? ''), 0, 190)));
        $nid = preg_replace('/\D/', '', (string)($_POST['nationalId'] ?? ''));
        $salary = round((float)($_POST['salary'] ?? 0), 2);
        $start = trim((string)($_POST['startDate'] ?? '')) ?: null;
        $end = trim((string)($_POST['endDate'] ?? '')) ?: null;
        $status = ($_POST['status'] ?? 'active') === 'left' ? 'left' : 'active';
        $notes = trim(mb_substr((string)($_POST['notes'] ?? ''), 0, 2000));
        if ($name === '') hr_fail("اكتب اسم الموظف.");
        if ($title !== '' && !array_key_exists($title, getAllJobTitles())) hr_fail("المسمى الوظيفي غير موجود.");
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) hr_fail("الإيميل غير صحيح.");
        if ($nid !== '' && strlen($nid) !== 14) hr_fail("يجب أن يتكون الرقم القومي من 14 رقمًا.");
        if ($salary < 0) hr_fail("الراتب غير صالح.");
        foreach ([$start, $end] as $dt) if ($dt !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dt)) hr_fail("تاريخ غير صالح.");
        if ($id > 0) {
            $st = $conn->prepare("UPDATE hr_employees SET full_name=?, job_title=?, phone=?, email=?, national_id=?, salary=?, start_date=?, end_date=?, status=?, notes=? WHERE id=?");
            $st->bind_param("sssssdssssi", $name, $title, $phone, $email, $nid, $salary, $start, $end, $status, $notes, $id);
        } else {
            $st = $conn->prepare("INSERT INTO hr_employees (full_name, job_title, phone, email, national_id, salary, start_date, end_date, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            $st->bind_param("sssssdsssss", $name, $title, $phone, $email, $nid, $salary, $start, $end, $status, $notes, $by);
        }
        $st->execute(); if (!$id) $id = $conn->insert_id; $st->close();
        hr_out(["success" => true, "id" => $id]);
    }
    if ($action === 'delete_employee' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        // الإصدار 89: سلة المحذوفات - الملفات بتفضل لحد الحذف النهائي من السلة
        $__e = trash_rows($conn, 'hr_employees', 'id = ?', 'i', [$id]); $__d = trash_rows($conn, 'hr_documents', 'employee_id = ?', 'i', [$id]);
        trash_put($conn, 'hr_employee', 'موظف شؤون الموظفين: ' . ($__e[0]['full_name'] ?? '#' . $id), ['hr_employees' => $__e, 'hr_documents' => $__d, 'hr_attendance' => trash_rows($conn, 'hr_attendance', 'employee_id = ?', 'i', [$id])], array_column($__d, 'file_token'));
        foreach (["DELETE FROM hr_documents WHERE employee_id = ?", "DELETE FROM hr_attendance WHERE employee_id = ?", "DELETE FROM hr_employees WHERE id = ?"] as $q) {
            $x = $conn->prepare($q); $x->bind_param("i", $id); $x->execute(); $x->close();
        }
        hr_out(["success" => true]);
    }

    // ------------------------------------------------------------------ المستندات
    if ($action === 'upload_doc' && $isPost) {
        $emp = (int)($_POST['employee_id'] ?? 0);
        $chk = $conn->prepare("SELECT id FROM hr_employees WHERE id = ?"); $chk->bind_param("i", $emp); $chk->execute();
        if (!$chk->get_result()->fetch_assoc()) hr_fail("الموظف غير موجود."); $chk->close();
        $f = $_FILES['file'] ?? null;
        if (!$f || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) hr_fail("لم يصل الملف - حاول مرة أخرى (أقصى حجم 15 ميجا).");
        if ($f['size'] > 15 * 1024 * 1024) hr_fail("الملف كبير - أقصى حجم 15 ميجا.");
        $origName = trim(mb_substr(preg_replace('/[\\\\\/:*?"<>|\r\n]/', '', (string)$f['name']), 0, 150)) ?: 'مستند';
        $ext = upl_detect_file($f['tmp_name'], $origName);
        if (!$ext || in_array($ext, ['mp4', 'webm', 'mov'], true)) hr_fail("نوع الملف غير مدعوم. المسموح: صور، PDF، Word، Excel، PowerPoint، ZIP.");
        $dir = upl_dir(); if (!$dir) hr_fail("لا يوجد مكان لحفظ الملفات على السيرفر.");
        $fname = 'hr_' . bin2hex(random_bytes(16)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $fname)) hr_fail("تعذّر حفظ الملف.");
        $tok = 'file:' . $fname;
        $st = $conn->prepare("INSERT INTO hr_documents (employee_id, file_token, file_name, uploaded_by) VALUES (?, ?, ?, ?)");
        $st->bind_param("isss", $emp, $tok, $origName, $by); $st->execute(); $st->close();
        hr_out(["success" => true]);
    }
    if ($action === 'delete_doc' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $d = $conn->prepare("SELECT file_token FROM hr_documents WHERE id = ?"); $d->bind_param("i", $id); $d->execute();
        $x = $d->get_result()->fetch_assoc(); $d->close();
        if ($x) { $__d = trash_rows($conn, 'hr_documents', 'id = ?', 'i', [$id]); trash_put($conn, 'hr_document', 'مستند موظف: ' . ($__d[0]['file_name'] ?? '#' . $id), ['hr_documents' => $__d], [$x['file_token']]);
            $q = $conn->prepare("DELETE FROM hr_documents WHERE id = ?"); $q->bind_param("i", $id); $q->execute(); $q->close(); }
        hr_out(["success" => true]);
    }

    // ------------------------------------------------------------------ الحضور والرواتب
    if ($action === 'attendance') {
        $month = (string)($_GET['month'] ?? date('Y-m'));
        if (!hr_valid_month($month)) hr_fail("الشهر غير صالح.");
        $st = $conn->prepare("SELECT e.id, e.full_name, e.job_title, e.salary, e.status, a.work_days, a.present_days, a.bonus, a.deductions, a.base_salary, a.note
            FROM hr_employees e LEFT JOIN hr_attendance a ON a.employee_id = e.id AND a.month = ?
            WHERE e.status = 'active' OR a.employee_id IS NOT NULL ORDER BY e.full_name");
        $st->bind_param("s", $month); $st->execute(); $res = $st->get_result();
        $rows = []; $totBase = 0; $totNet = 0;
        while ($r = $res->fetch_assoc()) {
            $saved = $r['work_days'] !== null;
            $base = $saved ? (float)$r['base_salary'] : (float)$r['salary'];
            $work = $saved ? (float)$r['work_days'] : 26; $present = $saved ? (float)$r['present_days'] : 0;
            $net = hr_net($base, $work, $present, $r['bonus'] ?? 0, $r['deductions'] ?? 0);
            $rows[] = ["id" => (int)$r['id'], "name" => $r['full_name'], "jobTitle" => $r['job_title'], "baseSalary" => $base,
                "workDays" => $work, "presentDays" => $present, "bonus" => (float)($r['bonus'] ?? 0), "deductions" => (float)($r['deductions'] ?? 0),
                "note" => $r['note'], "saved" => $saved, "net" => $net];
            $totBase += $base; $totNet += $saved ? $net : 0;
        }
        $st->close();
        hr_out(["success" => true, "month" => $month, "rows" => $rows, "totalBase" => round($totBase, 2), "totalNet" => round($totNet, 2), "titles" => getAllJobTitles()]);
    }
    if ($action === 'save_attendance' && $isPost) {
        $month = (string)($_POST['month'] ?? '');
        if (!hr_valid_month($month)) hr_fail("الشهر غير صالح.");
        $rows = json_decode((string)($_POST['rows'] ?? '[]'), true);
        if (!is_array($rows)) hr_fail("بيانات غير صالحة.");
        $st = $conn->prepare("INSERT INTO hr_attendance (employee_id, month, work_days, present_days, bonus, deductions, base_salary, note, updated_by)
            SELECT id, ?, ?, ?, ?, ?, salary, ?, ? FROM hr_employees WHERE id = ?
            ON DUPLICATE KEY UPDATE work_days = VALUES(work_days), present_days = VALUES(present_days), bonus = VALUES(bonus),
                deductions = VALUES(deductions), note = VALUES(note), updated_by = VALUES(updated_by)");
        $n = 0;
        foreach ($rows as $r) {
            $id = (int)($r['id'] ?? 0); $work = (float)($r['workDays'] ?? 26); $present = (float)($r['presentDays'] ?? 0);
            $bonus = max(0, round((float)($r['bonus'] ?? 0), 2)); $ded = max(0, round((float)($r['deductions'] ?? 0), 2));
            $note = mb_substr(trim((string)($r['note'] ?? '')), 0, 255);
            if ($id <= 0 || $work <= 0 || $work > 31 || $present < 0 || $present > $work) hr_fail("راجع أيام الحضور (يجب أن تكون بين 0 وعدد أيام العمل) للموظف رقم $id.");
            $st->bind_param("sddddssi", $month, $work, $present, $bonus, $ded, $note, $by, $id);
            $st->execute(); $n++;
        }
        $st->close();
        hr_out(["success" => true, "saved" => $n]);
    }
    hr_fail("طلب غير معروف.");
} catch (Throwable $e) {
    error_log('GRIFFINE hr_api: ' . $e->getMessage());
    hr_fail("حدث خطأ - تأكد أن ملف ALL_SCHEMA_UPDATES.sql (الإصدار 85) اتشغّل.");
}
?>
