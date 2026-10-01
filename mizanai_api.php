<?php
/* =====================================================================
   GRIFFINE — mizanai_api.php (الإصدار 122) — «ميزان GRIFFINE AI» (مخطِّط توزيع الاستثمار)
   GET  action=config                ← الإعدادات (الاسم / التنويه / العوائد / نسب الأصول لكل مخاطرة / الأسواق)
   GET  action=sectors&market=       ← قطاعات البورصة بالأرقام الحقيقية + الشركات المرشحة (محرك بصيرة - مخزنة 60 دقيقة)
   POST action=opinion mode, summary ← رأي الذكاء الاصطناعي على الدراسة (ولو مش متاح: success=false والمتصفح بيكتب الرأي بالقواعد)
   GET  action=list / get&id=        ← دراساتي المحفوظة
   POST action=save mode, title, data / delete id (سلة المحذوفات) / share id
   GET  action=shared&t=             ← دراسة متشاركة (للقراءة بس - من غير تسجيل دخول)
   GET  action=admin_get / POST admin_save ← لوحة التحكم (صلاحية تعديل تصميم الموقع)
   الإصدار 130 — العوائد السنوية أونلاين (مجاني):
   GET  action=rates&market=&now=1   ← أرقام السوق (بتتحدث تلقائي كل شهر — now=1: «حدّث الآن» مرة في اليوم لكل سوق) + أرقام المستثمر المحفوظة
   POST action=user_rates market, mode (auto|manual), rates ← حفظ وضع / أرقام المستثمر على حسابه
   GET  action=admin_rates_get / POST admin_rates_save config / POST admin_rates_now market ← لوحة التحكم
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/mizanai_lib.php';
require_once __DIR__ . '/trash_lib.php';
require_once __DIR__ . '/mizanai_rates_lib.php';   // الإصدار 130
function mza_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit(); }
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
try {
    if ($action === 'shared') {
        session_write_close();
        $t = preg_replace('/[^a-f0-9]/', '', (string)($_GET['t'] ?? ''));
        if (strlen($t) < 20 || !mza_ready($conn)) mza_out(["success" => false, "message" => "الرابط غير صحيح."]);
        $st = $conn->prepare("SELECT mode, title, data, created_at FROM mizan_studies WHERE share_token = ?"); $st->bind_param("s", $t); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) mza_out(["success" => false, "message" => "الدراسة دي اتحذفت أو الرابط غير صحيح."]);
        $cfg = mza_cfg($conn);
        mza_out(["success" => true, "mode" => $r['mode'], "title" => $r['title'], "study" => json_decode($r['data'], true), "savedAt" => $r['created_at'], "config" => ['name' => $cfg['name'], 'disclaimer' => $cfg['disclaimer']]]);
    }
    $email = $_SESSION['user_email'] ?? '';
    if (!$email) { http_response_code(401); mza_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
    $isAdmin = !empty($_SESSION['is_admin']);
    $canEdit = $isAdmin && in_array('edit_site_design', getCurrentUserPermissions($conn), true);
    session_write_close();
    if ($isPost) requireCsrf();

    if (strpos($action, 'admin_') === 0) {
        if (!$canEdit) { http_response_code(403); mza_out(["success" => false, "message" => "غير مصرح — صلاحية تعديل تصميم الموقع مطلوبة."]); }
        if ($action === 'admin_get') mza_out(["success" => true, "config" => mza_cfg($conn), "defaults" => mza_defaults(), "ready" => mza_ready($conn), "aiKey" => site_config_get($conn, 'basira_ai_key') !== '']);
        if ($action === 'admin_save' && $isPost) {
            $raw = (string)($_POST['config'] ?? '');
            if ($raw === 'null') { site_config_set($conn, 'mizanai_cfg', '', $email); mza_out(["success" => true, "config" => mza_cfg($conn)]); }
            $in = json_decode($raw, true); if (!is_array($in)) mza_out(["success" => false, "message" => "بيانات غير صحيحة."]);
            $d = mza_defaults(); $out = [];
            foreach ($d as $k => $v) if (array_key_exists($k, $in)) $out[$k] = $in[$k];
            site_config_set($conn, 'mizanai_cfg', json_encode($out, JSON_UNESCAPED_UNICODE), $email);
            mza_out(["success" => true, "config" => mza_cfg($conn)]);
        }
        // الإصدار 130: العوائد أونلاين
        if ($action === 'admin_rates_get') {
            $log = []; try { $res = $conn->query("SELECT market, old_rates, new_rates, sources, trigger_kind, created_by, created_at FROM mizan_rates_log ORDER BY id DESC LIMIT 15");
                while ($r = $res->fetch_assoc()) $log[] = ['market' => $r['market'], 'old' => json_decode((string)$r['old_rates'], true), 'new' => json_decode((string)$r['new_rates'], true), 'trigger' => $r['trigger_kind'], 'by' => $r['created_by'], 'at' => $r['created_at']]; } catch (Throwable $e) {}
            $mk = mc_active($conn) ?: ['مصر']; $live = mr_live_all($conn); $L = [];
            foreach ($mk as $m) { $x = $live[$m] ?? null; $L[$m] = $x ? ['rates' => $x['rates'], 'src' => $x['src'], 'policy' => $x['policy'] ?? null, 'at' => date('Y-m-d H:i', (int)$x['at']), 'tried' => $x['tried'] ?? []] : null; }
            mza_out(["success" => true, "config" => mr_cfg($conn), "defaults" => mr_defaults(), "markets" => $mk, "live" => $L, "log" => $log, "ready" => mr_ready($conn)]);
        }
        if ($action === 'admin_rates_save' && $isPost) {
            $raw = (string)($_POST['config'] ?? '');
            if ($raw === 'null') { site_config_set($conn, 'mizanai_rates_cfg', '', $email); mza_out(["success" => true]); }
            $in = json_decode($raw, true); if (!is_array($in)) mza_out(["success" => false, "message" => "بيانات غير صحيحة."]);
            site_config_set($conn, 'mizanai_rates_cfg', json_encode($in, JSON_UNESCAPED_UNICODE), $email);
            mza_out(["success" => true, "config" => mr_cfg($conn)]);
        }
        if ($action === 'admin_rates_now' && $isPost) {
            $m = (string)($_POST['market'] ?? ''); if (!mc_valid($m)) mza_out(["success" => false, "message" => "سوق غير معروف."]);
            if (!mr_ready($conn)) mza_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 130) أولًا."]);
            mza_out(["success" => true] + mr_get($conn, $m, true, 'admin', $email));
        }
        mza_out(["success" => false, "message" => "طلب غير معروف."]);
    }

    ai_set_user($email, $isAdmin);   // الإصدار 127
    if (!ai_screen_ok($conn, $email, 'mizanai', $isAdmin)) mza_out(["success" => false, "hidden" => true, "message" => "الشاشة غير متاحة لحسابك."]);
    if (!$isAdmin && getAdminSetting($conn, 'hide_mizanai_screen', false)) mza_out(["success" => false, "hidden" => true, "message" => "الشاشة غير متاحة حاليًا."]);
    if (!$isAdmin && !hasActiveSubscription($conn, $email)) mza_out(["success" => false, "requiresSubscription" => true, "message" => "ميزان GRIFFINE AI متاح للمشتركين فقط."]);
    $cfg = mza_cfg($conn);

    if ($action === 'config') {
        mza_out(["success" => true, "config" => ['name' => $cfg['name'], 'disclaimer' => $cfg['disclaimer'], 'rates' => $cfg['rates'], 'profiles' => $cfg['profiles'], 'shareOn' => !empty($cfg['share_on']),
            'aiReady' => !empty($cfg['ai_on']) && ai_paid_key($conn) !== ''], "ready" => mza_ready($conn)]);
    }
    // الإصدار 130: العوائد السنوية أونلاين (مجاني لكل المشتركين) + أرقام المستثمر المحفوظة على حسابه
    if ($action === 'rates') {
        $m = (string)($_GET['market'] ?? 'مصر'); if (!mc_valid($m)) $m = 'مصر';
        if (!mr_ready($conn)) mza_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 130) أولًا."]);
        $now = ($_GET['now'] ?? '') === '1';
        mza_out(["success" => true, "market" => $m, "live" => mr_get($conn, $m, $now, $now ? 'now' : 'auto', $email), "user" => mr_user_get($conn, $email, $m)]);
    }
    if ($action === 'user_rates' && $isPost) {
        $m = (string)($_POST['market'] ?? ''); if (!mc_valid($m)) mza_out(["success" => false, "message" => "سوق غير معروف."]);
        if (!mr_ready($conn)) mza_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 130) أولًا."]);
        $in = json_decode((string)($_POST['rates'] ?? '{}'), true);
        mza_out(["success" => true, "user" => mr_user_save($conn, $email, $m, (string)($_POST['mode'] ?? 'auto'), is_array($in) ? $in : [])]);
    }
    if ($action === 'sectors') {
        @set_time_limit(180);
        $m = (string)($_GET['market'] ?? 'مصر'); if (!isset(MQ_MARKETS[$m])) $m = 'مصر';
        $r = mza_sectors($conn, $m);
        if (!$r['sectors']) mza_out(["success" => false, "message" => "تعذّر جلب قطاعات البورصة دلوقتي — حاول تاني بعد شوية."]);
        mza_out(["success" => true] + $r);
    }
    if ($action === 'opinion' && $isPost) {
        @set_time_limit(120);
        $mode = in_array($_POST['mode'] ?? '', ['stocks', 'assets', 'check'], true) ? $_POST['mode'] : 'stocks';
        $sum = json_decode((string)($_POST['summary'] ?? ''), true);
        if (!is_array($sum) || strlen((string)$_POST['summary']) > 12000) mza_out(["success" => false, "message" => "بيانات غير صحيحة."]);
        $o = mza_ai($conn, $mode, $sum);
        if (!$o || isset($o['error'])) mza_out(["success" => false, "message" => $isAdmin ? ($o['error'] ?? 'الذكاء الاصطناعي المدفوع مش متاح — الرأي بالمحرك المجاني.') : '']);   // الإصدار 127: المشترك مبيشوفش رسائل الحدود
        mza_out(["success" => true, "ai" => $o]);
    }
    if (!mza_ready($conn)) mza_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 122) أولًا عشان الحفظ يشتغل."]);
    if ($action === 'list') {
        $st = $conn->prepare("SELECT id, mode, title, share_token, created_at FROM mizan_studies WHERE account_email = ? ORDER BY id DESC LIMIT 200"); $st->bind_param("s", $email); $st->execute();
        $items = array_map(fn($r) => ['id' => (int)$r['id'], 'mode' => $r['mode'], 'title' => $r['title'], 'shared' => !empty($r['share_token']), 'at' => $r['created_at']], $st->get_result()->fetch_all(MYSQLI_ASSOC));
        $st->close(); mza_out(["success" => true, "items" => $items]);
    }
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $st = $conn->prepare("SELECT mode, title, data, share_token, created_at FROM mizan_studies WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) mza_out(["success" => false, "message" => "الدراسة غير موجودة."]);
        mza_out(["success" => true, "id" => $id, "mode" => $r['mode'], "title" => $r['title'], "study" => json_decode($r['data'], true), "savedAt" => $r['created_at'], "share" => $r['share_token'] ? ('index.php?mizan=' . $r['share_token']) : null]);
    }
    if ($action === 'save' && $isPost) {
        $mode = in_array($_POST['mode'] ?? '', ['stocks', 'assets', 'check'], true) ? $_POST['mode'] : '';
        $data = (string)($_POST['data'] ?? ''); $j = json_decode($data, true);
        if (!$mode || !is_array($j) || strlen($data) > 400000) mza_out(["success" => false, "message" => "بيانات الدراسة غير صحيحة."]);
        $title = mb_substr(trim(strip_tags((string)($_POST['title'] ?? ''))), 0, 190) ?: 'دراسة ميزان';
        $c = $conn->prepare("SELECT COUNT(*) c FROM mizan_studies WHERE account_email = ?"); $c->bind_param("s", $email); $c->execute(); $n = (int)$c->get_result()->fetch_assoc()['c']; $c->close();
        if ($n >= $cfg['save_max']) mza_out(["success" => false, "message" => "وصلت للحد الأقصى للدراسات المحفوظة ({$cfg['save_max']}) — احذف دراسة قديمة الأول."]);
        $data = json_encode($j, JSON_UNESCAPED_UNICODE);
        $st = $conn->prepare("INSERT INTO mizan_studies (account_email, mode, title, data) VALUES (?, ?, ?, ?)"); $st->bind_param("ssss", $email, $mode, $title, $data); $st->execute(); $id = $conn->insert_id; $st->close();
        mza_out(["success" => true, "id" => $id]);
    }
    if ($action === 'delete' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $rows = trash_rows($conn, 'mizan_studies', 'id = ? AND account_email = ?', 'is', [$id, $email]);
        if (!$rows) mza_out(["success" => false, "message" => "الدراسة غير موجودة."]);
        trash_put($conn, 'mizan', 'دراسة ميزان: ' . $rows[0]['title'] . ' (' . substr($rows[0]['created_at'], 0, 10) . ')', ['mizan_studies' => $rows]);
        $st = $conn->prepare("DELETE FROM mizan_studies WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $st->close();
        mza_out(["success" => true]);
    }
    if ($action === 'share' && $isPost) {
        if (empty($cfg['share_on'])) mza_out(["success" => false, "message" => "المشاركة مقفولة من الإدارة."]);
        $id = (int)($_POST['id'] ?? 0);
        $st = $conn->prepare("SELECT share_token FROM mizan_studies WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) mza_out(["success" => false, "message" => "الدراسة غير موجودة."]);
        $t = $r['share_token'] ?: bin2hex(random_bytes(16));
        if (!$r['share_token']) { $u = $conn->prepare("UPDATE mizan_studies SET share_token = ? WHERE id = ? AND account_email = ?"); $u->bind_param("sis", $t, $id, $email); $u->execute(); $u->close(); }
        mza_out(["success" => true, "url" => 'index.php?mizan=' . $t]);
    }
    mza_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE mizanai_api: ' . $e->getMessage());
    mza_out(["success" => false, "message" => "حدث خطأ — حاول تاني."]);
}
