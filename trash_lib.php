<?php
/* =====================================================================
   GRIFFINE — trash_lib.php (الإصدار 89) — سلة المحذوفات (زي ويندوز)
   ---------------------------------------------------------------------
   أي حاجة بتتمسح من الموقع (خطة، سهم من قائمة المتابعة، تنبيه سعر، موظف، مستند، مسمى وظيفي،
   سؤال للمساعد، مقال، رأي عميل، باقة، مقترح، محادثة شات، عميل مؤرشف...) بتتنسخ هنا الأول
   (نسخة كاملة من صفوفها في قاعدة البيانات) وبعدين تتمسح عادي.
   - كل شخص بيشوف اللي هو مسحه ويقدر يرجّعه (العميل / الموظف / الأدمن)
   - مدير الموقع (super admin) بيشوف كل المحذوفات
   - "حذف نهائي" أو "تفريغ السلة" ← بيتمسح للأبد (والملفات المرفوعة بتتمسح ساعتها بس)
   - اللي عدّى عليه 90 يوم في السلة بيتمسح تلقائيًا
   ===================================================================== */

// الجداول المسموح نسخها/استرجاعها (حماية: مفيش استرجاع لأي جدول تاني)
const TRASH_TABLES = ['user_plans', 'user_watchlist', 'custom_alerts', 'staff_members', 'staff_permissions', 'hr_employees', 'hr_documents',
    'hr_attendance', 'job_titles', 'chat_faq', 'articles', 'testimonials', 'blacklist', 'subscription_plans', 'suggestions',
    'chat_messages', 'chat_conversation_meta', 'subscribers', 'users', 'recommendations', 'user_alerts', 'opportunities', 'opportunity_hits', 'basira_reports', 'mizan_studies'];
const TRASH_KEEP_DAYS = 90;

function trash_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'trash_bin'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
// صفوف جدول بشرط (للنسخ قبل الحذف)
function trash_rows($conn, $table, $where, $types = '', $args = []){
    if (!in_array($table, TRASH_TABLES, true)) return [];
    $st = $conn->prepare("SELECT * FROM `$table` WHERE $where");
    if ($types !== '') $st->bind_param($types, ...$args);
    $st->execute(); $res = $st->get_result(); $out = [];
    while ($r = $res->fetch_assoc()) $out[] = $r;
    $st->close();
    return $out;
}
/* يحفظ عنصر في السلة. $snap = ['table' => [rows...], ...] ، $files = توكنات ملفات مرفوعة (بتتمسح عند الحذف النهائي بس)
   $owner = صاحب العنصر (عميل) - لو المحذوف بيخص عميل والأدمن هو اللي مسحه */
function trash_put($conn, $type, $label, $snap, $files = [], $owner = null){
    if (!trash_ready($conn)) return 0;
    $snap = array_filter($snap, fn($rows) => !empty($rows));
    if (!$snap) return 0;
    $by = $_SESSION['user_email'] ?? ($owner ?? 'system');
    $scope = !empty($_SESSION['is_admin']) && $owner === null ? 'admin' : 'user';
    $payload = json_encode(['tables' => $snap, 'files' => array_values($files)], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $label = function_exists('gm_bidi') ? gm_bidi(mb_substr((string)$label, 0, 240)) : mb_substr((string)$label, 0, 250);
    $st = $conn->prepare("INSERT INTO trash_bin (deleted_by, owner_email, scope, item_type, item_label, payload) VALUES (?, ?, ?, ?, ?, ?)");
    $st->bind_param("ssssss", $by, $owner, $scope, $type, $label, $payload); $st->execute(); $id = $conn->insert_id; $st->close();
    return $id;
}
function trash_can_touch($row, $email, $isSuper){
    return $isSuper || $row['deleted_by'] === $email || ($row['owner_email'] !== null && $row['owner_email'] === $email && $row['scope'] === 'user');
}
// أعمدة الجدول الحقيقية (عشان منبنيش SQL من أسماء جاية من برا)
function trash_columns($conn, $table){
    static $cache = [];
    if (isset($cache[$table])) return $cache[$table];
    $cols = []; $res = $conn->query("SHOW COLUMNS FROM `$table`");
    while ($r = $res->fetch_assoc()) $cols[] = $r['Field'];
    return $cache[$table] = $cols;
}
function trash_restore($conn, $id, $email, $isSuper){
    $st = $conn->prepare("SELECT * FROM trash_bin WHERE id = ? AND restored_at IS NULL"); $st->bind_param("i", $id); $st->execute();
    $row = $st->get_result()->fetch_assoc(); $st->close();
    if (!$row) return [false, 'العنصر غير موجود في السلة.'];
    if (!trash_can_touch($row, $email, $isSuper)) return [false, 'لا يمكنك استرجاع هذا العنصر.'];
    if ($row['scope'] === 'admin' && empty($_SESSION['is_admin'])) return [false, 'لا يمكنك استرجاع هذا العنصر.'];
    $p = json_decode($row['payload'], true);
    // الإصدار 99: خطة اتعمل بدالها خطة جديدة لنفس السهم ← منكتبش فوقها (المستخدم يحذف الجديدة الأول أو يسيبها)
    foreach (($p['tables']['user_plans'] ?? []) as $r) {
        $c = $conn->prepare("SELECT 1 FROM user_plans WHERE account_email = ? AND plan_type = ? AND symbol = ? AND deleted = 0"); $c->bind_param("sss", $r['account_email'], $r['plan_type'], $r['symbol']); $c->execute();
        $busy = (bool)$c->get_result()->fetch_assoc(); $c->close();
        if ($busy) return [false, 'توجد خطة حالية لنفس السهم (' . $r['symbol'] . ') — احذفها أو غيّر اسمها أولًا ثم استرجع القديمة.'];
    }
    $conn->begin_transaction();
    try {
        foreach (($p['tables'] ?? []) as $table => $rows) {
            if (!in_array($table, TRASH_TABLES, true)) continue;
            $real = trash_columns($conn, $table);
            foreach ($rows as $r) {
                $cols = array_values(array_filter(array_keys($r), fn($c) => in_array($c, $real, true)));
                if (!$cols) continue;
                $upd = [];
                foreach ($cols as $c) {
                    if ($c === 'id' || ($table === 'user_plans' && $c === 'version')) continue;
                    $upd[] = "`$c` = VALUES(`$c`)";
                }
                if ($table === 'user_plans') { $upd[] = "`version` = `version` + 1"; $r['deleted'] = 0; }
                $sql = "INSERT INTO `$table` (`" . implode('`, `', $cols) . "`) VALUES (" . implode(', ', array_fill(0, count($cols), '?')) . ")"
                     . ($upd ? " ON DUPLICATE KEY UPDATE " . implode(', ', $upd) : '');
                $vals = array_map(fn($c) => $r[$c], $cols);
                $ins = $conn->prepare($sql); $ins->bind_param(str_repeat('s', count($vals)), ...$vals); $ins->execute(); $ins->close();
            }
        }
        $u = $conn->prepare("UPDATE trash_bin SET restored_at = NOW(), restored_by = ? WHERE id = ?"); $u->bind_param("si", $email, $id); $u->execute(); $u->close();
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback(); error_log('GRIFFINE trash_restore: ' . $e->getMessage());
        return [false, 'تعذّر الاسترجاع - ربما أُضيف عنصر بنفس البيانات بعد الحذف.'];
    }
    // بعد استرجاع خطة: إعادة بناء جدول الصفقات
    if (isset($p['tables']['user_plans'])) {
        try { require_once __DIR__ . '/plans_store.php'; require_once __DIR__ . '/trades_lib.php';
            $done = []; foreach ($p['tables']['user_plans'] as $r) { $k = $r['account_email'] . '|' . $r['plan_type']; if (isset($done[$k])) continue; $done[$k] = 1; trades_rebuild($conn, $r['account_email'], $r['plan_type']); } } catch (Throwable $e) {}
    }
    return [true, $row];
}
function trash_purge_row($conn, $row){
    $p = json_decode($row['payload'], true);
    if (!empty($p['files'])) { require_once __DIR__ . '/uploads.php'; foreach ($p['files'] as $f) { try { upl_delete($f); } catch (Throwable $e) {} } }
    $d = $conn->prepare("DELETE FROM trash_bin WHERE id = ?"); $d->bind_param("i", $row['id']); $d->execute(); $d->close();
}
// تنظيف تلقائي: اللي عدّى عليه 90 يوم + سجل المسترجَع بعد 7 أيام
function trash_auto_clean($conn){
    if (!trash_ready($conn) || mt_rand(1, 20) !== 1) return;
    try {
        $res = $conn->query("SELECT id, payload FROM trash_bin WHERE restored_at IS NULL AND deleted_at < NOW() - INTERVAL " . TRASH_KEEP_DAYS . " DAY LIMIT 200");
        while ($r = $res->fetch_assoc()) trash_purge_row($conn, $r);
        $conn->query("DELETE FROM trash_bin WHERE restored_at IS NOT NULL AND restored_at < NOW() - INTERVAL 7 DAY");
    } catch (Throwable $e) {}
}
?>
