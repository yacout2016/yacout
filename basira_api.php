<?php
/* =====================================================================
   GRIFFINE — basira_api.php (الإصدار 114) — «بصيرة GRIFFINE AI»
   GET  action=config                      ← إعدادات الشاشة (الاسم / التنويه / الفترات / الأسماء العربية المخصصة)
   GET  action=analyze&symbol=&market=[&fresh=1] ← تحليل كامل (مخزّن مؤقتًا لكل سهم)
   GET  action=watch                        ← تحليل سريع لكل أسهم قائمة المتابعة
   GET  action=scan&market=&sector=&offset=&limit= ← مسح السوق (الإصدار 118): كل أسهم البورصة أو قطاع + احتمال الصعود لكل فترة
   GET  action=list                         ← تحليلاتي المحفوظة
   GET  action=get&id=                      ← تحليل محفوظ
   POST action=save   symbol, market        ← حفظ آخر تحليل للسهم (من التخزين المؤقت على السيرفر - مش من المتصفح)
   POST action=delete id                    ← سلة المحذوفات
   POST action=share  id                    ← رابط مشاركة (للقراءة بس)
   GET  action=shared&t=                    ← عرض تحليل متشارك (من غير تسجيل دخول)
   GET  action=admin_get / POST admin_save / POST admin_test ← لوحة التحكم «تحليلات بصيرة AI» (صلاحية تعديل تصميم الموقع)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/basira_lib.php';
require_once __DIR__ . '/trash_lib.php';
function bs_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit(); }
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';

try {
    // عرض تحليل متشارك: للكل (الرابط فيه رمز عشوائي طويل)
    if ($action === 'shared') {
        session_write_close();
        $t = preg_replace('/[^a-f0-9]/', '', (string)($_GET['t'] ?? ''));
        if (strlen($t) < 20 || !bs_ready($conn)) bs_out(["success" => false, "message" => "الرابط غير صحيح."]);
        $st = $conn->prepare("SELECT symbol, market, data, created_at FROM basira_reports WHERE share_token = ?"); $st->bind_param("s", $t); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) bs_out(["success" => false, "message" => "التحليل ده اتحذف أو الرابط غير صحيح."]);
        $cfg = bs_cfg($conn);
        bs_out(["success" => true, "report" => json_decode($r['data'], true), "savedAt" => $r['created_at'], "config" => ['name' => $cfg['name'], 'disclaimer' => $cfg['disclaimer']]]);
    }

    $email = $_SESSION['user_email'] ?? '';
    if (!$email) { http_response_code(401); bs_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
    $isAdmin = !empty($_SESSION['is_admin']);
    $canEdit = $isAdmin && in_array('edit_site_design', getCurrentUserPermissions($conn), true);
    session_write_close();
    if ($isPost) requireCsrf();

    // ---- لوحة التحكم
    if (strpos($action, 'admin_') === 0) {
        if (!$canEdit) { http_response_code(403); bs_out(["success" => false, "message" => "غير مصرح — صلاحية تعديل تصميم الموقع مطلوبة."]); }
        if ($action === 'admin_get') {
            bs_out(["success" => true, "config" => bs_cfg($conn), "defaults" => bs_defaults(), "keySet" => site_config_get($conn, 'basira_ai_key') !== '',
                "models" => BS_MODELS, "aiToday" => bs_ai_counter(), "ready" => bs_ready($conn)]);
        }
        if ($action === 'admin_save' && $isPost) {
            $in = json_decode((string)($_POST['config'] ?? ''), true);
            if ($in === null && ($_POST['config'] ?? '') === 'null') { site_config_set($conn, 'basira_cfg', '', $email); bs_out(["success" => true, "config" => bs_cfg($conn)]); }
            if (!is_array($in)) bs_out(["success" => false, "message" => "بيانات غير صحيحة."]);
            $d = bs_defaults(); $out = [];
            foreach ($d as $k => $v) {
                if (!array_key_exists($k, $in)) continue;
                if (is_bool($v)) $out[$k] = !empty($in[$k]);
                elseif (is_int($v)) $out[$k] = (int)$in[$k];
                elseif (is_array($v)) { $out[$k] = []; foreach ($v as $hk => $hv) $out[$k][$hk] = !empty($in[$k][$hk]); }
                else $out[$k] = mb_substr(str_replace("\0", '', (string)$in[$k]), 0, $k === 'ar_names' ? 20000 : 1500);
            }
            site_config_set($conn, 'basira_cfg', json_encode($out, JSON_UNESCAPED_UNICODE), $email);
            if (isset($_POST['ai_key'])) {
                $k = trim((string)$_POST['ai_key']);
                if ($k === '__clear__') site_config_set($conn, 'basira_ai_key', '', $email);
                elseif ($k !== '') { if (!preg_match('/^[A-Za-z0-9_\-]{20,300}$/', $k)) bs_out(["success" => false, "message" => "شكل المفتاح غير صحيح."]); site_config_set($conn, 'basira_ai_key', $k, $email); }
            }
            bs_out(["success" => true, "config" => bs_cfg($conn), "keySet" => site_config_get($conn, 'basira_ai_key') !== '']);
        }
        if ($action === 'admin_test' && $isPost) {
            $key = site_config_get($conn, 'basira_ai_key');
            if ($key === '') bs_out(["success" => false, "message" => "سجّل مفتاح Claude API الأول."]);
            $cfg = bs_cfg($conn);
            $r = bs_ai_call($key, $cfg['model'], 'low', 'رد بـ JSON حسب الشكل المطلوب بقيم قصيرة جدًا للاختبار.', 'اختبار اتصال: اكتب opinion = "تمام" وباقي الحقول قيم قصيرة.', 2000);
            bs_out($r[0] ? ["success" => true, "message" => "الاتصال شغال ✅ (الموديل: " . ($r[2] ?? $cfg['model']) . ")"] : ["success" => false, "message" => $r[1]]);
        }
        bs_out(["success" => false, "message" => "طلب غير معروف."]);
    }

    // ---- المستخدم: الشاشة ممكن تتقفل من لوحة التحكم + للمشتركين بس
    ai_set_user($email, $isAdmin);   // الإصدار 127: المدفوع / المجاني حسب المشترك
    if (!ai_screen_ok($conn, $email, 'basira', $isAdmin)) bs_out(["success" => false, "hidden" => true, "message" => "الشاشة غير متاحة لحسابك."]);
    if (!$isAdmin && getAdminSetting($conn, 'hide_basira_screen', false)) bs_out(["success" => false, "hidden" => true, "message" => "الشاشة غير متاحة حاليًا."]);
    // الإصدار 135: مميزات الباقة — «تحليل سهم» (basira) و«مسح السوق» (basira_scan) كل واحدة لوحدها
    require_once __DIR__ . '/perks_lib.php';
    if (!$isAdmin) {
        $pkOk = $action === 'scan' ? perk_has($conn, $email, 'basira_scan') : ($action === 'config' ? (perk_has($conn, $email, 'basira') || perk_has($conn, $email, 'basira_scan')) : perk_has($conn, $email, 'basira'));
        if (!$pkOk) bs_out(perk_denied($conn, $email, $action === 'scan' ? 'basira_scan' : 'basira'));
    }
    $cfg = bs_cfg($conn);

    if ($action === 'config') {
        bs_out(["success" => true, "config" => ['name' => $cfg['name'], 'tagline' => $cfg['tagline'], 'disclaimer' => $cfg['disclaimer'], 'horizons' => $cfg['horizons'],
            'shareOn' => !empty($cfg['share_on']), 'plansOn' => !empty($cfg['plans_on']), 'newsOn' => !empty($cfg['news_on']), 'names' => bs_names($cfg),
            'scanOn' => !empty($cfg['scan_on']), 'scanMax' => $cfg['scan_max'],
            'aiReady' => !empty($cfg['ai_on']) && ai_paid_key($conn) !== ''], "ready" => bs_ready($conn)]);
    }
    if ($action === 'analyze') {
        @set_time_limit(150);
        $sym = mk_clean_symbol($_GET['symbol'] ?? ''); $mkt = mk_clean_market($_GET['market'] ?? '');
        if (!$sym) bs_out(["success" => false, "message" => "اكتب رمز السهم بالإنجليزي (مثل COMI)."]);
        $A = bs_analyze($conn, $sym, $mkt, bs_arname($cfg, $sym, $mkt), !empty($_GET['fresh']));
        if (empty($A['ok'])) bs_out(["success" => false, "message" => $A['message'] ?? 'تعذّر التحليل.']);
        bs_out(["success" => true, "report" => $A]);
    }
    if ($action === 'watch') {
        @set_time_limit(120);
        $st = $conn->prepare("SELECT symbol, market FROM user_watchlist WHERE account_email = ? ORDER BY id LIMIT ?"); $lim = $cfg['watch_max']; $st->bind_param("si", $email, $lim); $st->execute();
        $rows = $st->get_result()->fetch_all(MYSQLI_ASSOC); $st->close(); $items = [];
        foreach ($rows as $r) $items[] = ['symbol' => $r['symbol'], 'market' => $r['market']] + bs_quick($conn, $r['symbol'], $r['market']);
        bs_out(["success" => true, "items" => $items]);
    }
    // الإصدار 118: مسح السوق (كل البورصة أو قطاع) - بالدفعات: offset + limit (الأسهم اللي اتحللت قبل كده بترجع فورًا من التخزين المؤقت)
    if ($action === 'scan') {
        @set_time_limit(120);
        if (empty($cfg['scan_on'])) bs_out(["success" => false, "message" => "مسح السوق متوقف حاليًا من لوحة التحكم."]);
        $market = (string)($_GET['market'] ?? 'مصر'); if (!isset(MQ_MARKETS[$market])) $market = 'مصر';
        $sector = mb_substr((string)($_GET['sector'] ?? ''), 0, 60);
        $off = max(0, (int)($_GET['offset'] ?? 0)); $lim = max(0, min(15, (int)($_GET['limit'] ?? 10)));   // 0 = القطاعات والعدد بس
        $U = bs_universe($conn, $market); $names = bs_names($cfg);
        $secs = []; foreach ($U as $u) $secs[$u['sec']] = ($secs[$u['sec']] ?? 0) + 1; arsort($secs);
        $F = array_values(array_filter($U, fn($u) => $sector === '' || $u['sec'] === $sector));
        $F = array_slice($F, 0, $cfg['scan_max']);
        $items = [];
        foreach (array_slice($F, $off, $lim) as $u) {
            $ar = $names['*'][$u['s']] ?? ($names[$market][$u['s']] ?? '');
            $items[] = ['symbol' => $u['s'], 'name' => $u['n'], 'ar' => $ar, 'sector' => $u['sec']] + bs_scan_item($conn, $u['s'], $market);
        }
        bs_out(["success" => true, "market" => $market, "sector" => $sector, "total" => count($F), "offset" => $off, "items" => $items,
            "sectors" => array_map(fn($k, $v) => ['name' => $k, 'n' => $v], array_keys($secs), array_values($secs))]);
    }
    if (!bs_ready($conn)) bs_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 114) أولًا عشان الحفظ يشتغل."]);
    if ($action === 'list') {
        $st = $conn->prepare("SELECT id, symbol, market, score, verdict, share_token, created_at FROM basira_reports WHERE account_email = ? ORDER BY id DESC LIMIT 200"); $st->bind_param("s", $email); $st->execute();
        $items = array_map(fn($r) => ['id' => (int)$r['id'], 'symbol' => $r['symbol'], 'market' => $r['market'], 'score' => (int)$r['score'], 'verdict' => $r['verdict'], 'shared' => !empty($r['share_token']), 'at' => $r['created_at']], $st->get_result()->fetch_all(MYSQLI_ASSOC));
        $st->close(); bs_out(["success" => true, "items" => $items]);
    }
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $st = $conn->prepare("SELECT data, created_at, share_token FROM basira_reports WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) bs_out(["success" => false, "message" => "التحليل غير موجود."]);
        bs_out(["success" => true, "report" => json_decode($r['data'], true), "savedAt" => $r['created_at'], "id" => $id, "share" => $r['share_token'] ? ('index.php?basira=' . $r['share_token']) : null]);
    }
    if ($action === 'save' && $isPost) {
        $sym = mk_clean_symbol($_POST['symbol'] ?? ''); $mkt = mk_clean_market($_POST['market'] ?? '');
        if (!$sym) bs_out(["success" => false, "message" => "رمز غير صالح."]);
        $f = bs_cache_file($conn, $sym, $mkt);
        $A = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
        if (!is_array($A) || empty($A['ok'])) bs_out(["success" => false, "message" => "حلّل السهم الأول وبعدين احفظه."]);
        $c = $conn->prepare("SELECT COUNT(*) c FROM basira_reports WHERE account_email = ?"); $c->bind_param("s", $email); $c->execute(); $n = (int)$c->get_result()->fetch_assoc()['c']; $c->close();
        if ($n >= $cfg['save_max']) bs_out(["success" => false, "message" => "وصلت للحد الأقصى للتحليلات المحفوظة ({$cfg['save_max']}) — احذف تحليل قديم الأول."]);
        unset($A['cached']);
        $data = json_encode($A, JSON_UNESCAPED_UNICODE); $score = (int)$A['score']; $verdict = (string)$A['verdict'];
        $st = $conn->prepare("INSERT INTO basira_reports (account_email, symbol, market, score, verdict, data) VALUES (?, ?, ?, ?, ?, ?)");
        $st->bind_param("sssiss", $email, $sym, $mkt, $score, $verdict, $data); $st->execute(); $id = $conn->insert_id; $st->close();
        bs_out(["success" => true, "id" => $id]);
    }
    if ($action === 'delete' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $rows = trash_rows($conn, 'basira_reports', 'id = ? AND account_email = ?', 'is', [$id, $email]);
        if (!$rows) bs_out(["success" => false, "message" => "التحليل غير موجود."]);
        trash_put($conn, 'basira', 'تحليل بصيرة: ' . $rows[0]['symbol'] . ' (' . substr($rows[0]['created_at'], 0, 10) . ')', ['basira_reports' => $rows]);
        $st = $conn->prepare("DELETE FROM basira_reports WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $st->close();
        bs_out(["success" => true]);
    }
    if ($action === 'share' && $isPost) {
        if (empty($cfg['share_on'])) bs_out(["success" => false, "message" => "المشاركة مقفولة من الإدارة."]);
        $id = (int)($_POST['id'] ?? 0);
        $st = $conn->prepare("SELECT share_token FROM basira_reports WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) bs_out(["success" => false, "message" => "التحليل غير موجود."]);
        $t = $r['share_token'] ?: bin2hex(random_bytes(16));
        if (!$r['share_token']) { $u = $conn->prepare("UPDATE basira_reports SET share_token = ? WHERE id = ? AND account_email = ?"); $u->bind_param("sis", $t, $id, $email); $u->execute(); $u->close(); }
        bs_out(["success" => true, "url" => 'index.php?basira=' . $t]);
    }
    bs_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE basira_api: ' . $e->getMessage());
    bs_out(["success" => false, "message" => "حدث خطأ أثناء التحليل — حاول تاني."]);
}
?>
