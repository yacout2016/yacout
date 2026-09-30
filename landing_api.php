<?php
/* =====================================================================
   GRIFFINE — landing_api.php (الإصدار 108) — صفحة اللاندينج (واجهة الموقع قبل تسجيل الدخول)
   ---------------------------------------------------------------------
   GET  action=get[&visit=1]  ← للكل (من غير تسجيل دخول): إعدادات الصفحة + الأرقام الحقيقية المربوطة بالموقع
                                (الزوار / المستخدمين / الخطط / التنبيهات) + آراء العملاء المسموح بيها + الأسئلة الشائعة
   GET  action=markets        ← للكل: أسعار ومنحنيات حقيقية للأسهم المختارة في قسم الأسواق (كاش 6 ساعات)
   POST action=save           ← الأدمن (edit_site_design): حفظ كل إعدادات الصفحة (JSON واحد في ui_customizations.landing)
   GET  action=admin_reviews  ← الأدمن: كل آراء العملاء عشان يختار اللي يظهر في اللاندينج
   الصفحة نفسها بتترسم في المتصفح (landing.js) - أي نص بيتعرض بـ escapeHtml
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/security_lib.php';

function lp_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
const LP_MAX_BYTES = 6000000;   // الإعدادات كلها بالصور (الصور بتتصغّر في المتصفح قبل الرفع)

function lp_get_config($conn){
    try {
        $st = $conn->prepare("SELECT data_value FROM ui_customizations WHERE ui_key = 'landing'");
        $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
        $j = $r ? json_decode($r['data_value'], true) : null;
        return is_array($j) ? $j : null;
    } catch (Throwable $e) { return null; }
}
function lp_count($conn, $sql){ try { $r = $conn->query($sql); $row = $r ? $r->fetch_row() : null; return $row ? (int)$row[0] : 0; } catch (Throwable $e) { return 0; } }
function lp_is_editor($conn){
    return !empty($_SESSION['user_email']) && !empty($_SESSION['is_admin']) && in_array('edit_site_design', getCurrentUserPermissions($conn), true);
}

/* تنضيف الإعدادات: مفاتيح بسيطة + نصوص محدودة الطول + الصور data:image أو https أو اسم ملف من الموقع */
function lp_clean($v, $key = '', $depth = 0){
    if ($depth > 7) return null;
    if (is_array($v)) {
        $isList = array_keys($v) === range(0, count($v) - 1);
        $out = [];
        $i = 0;
        foreach ($v as $k => $x) {
            if (++$i > 400) break;
            if (!$isList && !preg_match('/^[A-Za-z0-9_]{1,40}$/', (string)$k)) continue;
            $c = lp_clean($x, $isList ? $key : (string)$k, $depth + 1);
            if ($c === null) continue;
            if ($isList) $out[] = $c; else $out[$k] = $c;
        }
        return $out;
    }
    if (is_bool($v) || is_int($v) || is_float($v)) return $v;
    if ($v === null) return null;
    $s = (string)$v;
    if (preg_match('/^(img|image|logo|bg_img)$/', $key)) {
        if ($s === '') return '';
        if (strlen($s) > 1500000) return null;
        if (preg_match('#^data:image/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$#', $s)) return $s;
        if (preg_match('#^https://[^\s"\'<>]{1,500}$#', $s)) return $s;
        if (preg_match('/^[A-Za-z0-9_\-]{1,80}\.(png|jpe?g|webp|gif|svg)$/', $s)) return $s;
        return null;
    }
    if (mb_strlen($s) > 4000) $s = mb_substr($s, 0, 4000);
    return str_replace("\0", '', $s);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
try {
    if ($action === 'get') {
        $cfg = lp_get_config($conn);
        // عداد الزوار: مرة لكل جلسة
        if (!empty($_GET['visit']) && empty($_SESSION['lp_seen'])) {
            $_SESSION['lp_seen'] = 1;
            try { $conn->query("INSERT INTO site_config (config_key, config_value) VALUES ('landing_visits', '1') ON DUPLICATE KEY UPDATE config_value = CAST(config_value AS UNSIGNED) + 1"); } catch (Throwable $e) {}
        }
        session_write_close();
        $live = [
            "stats" => [
                "visitors" => lp_count($conn, "SELECT CAST(config_value AS UNSIGNED) FROM site_config WHERE config_key = 'landing_visits'"),
                "users"    => lp_count($conn, "SELECT COUNT(*) FROM users WHERE COALESCE(archived, 0) = 0"),
                "plans"    => lp_count($conn, "SELECT COUNT(*) FROM user_plans WHERE deleted = 0"),
                "alerts"   => lp_count($conn, "SELECT COUNT(*) FROM user_alerts"),
            ],
            "reviews" => [], "faq" => [], "version" => 121,
        ];
        // آراء العملاء الحقيقية (من شاشة «آراء العملاء» في الموقع) - الأدمن بيخفي أي رأي من اللاندينج
        $rv = is_array($cfg['reviews'] ?? null) ? $cfg['reviews'] : [];
        $mode = $rv['mode'] ?? 'real';
        if ($mode === 'real' || $mode === 'both') {
            $min = max(1, min(5, (int)($rv['min'] ?? 4)));
            $hidden = array_map('intval', is_array($rv['hidden'] ?? null) ? $rv['hidden'] : []);
            try {
                $st = $conn->prepare("SELECT id, display_name, rating, comment_text, created_at FROM testimonials WHERE rating >= ? ORDER BY created_at DESC LIMIT 60");
                $st->bind_param("i", $min); $st->execute(); $res = $st->get_result();
                while ($r = $res->fetch_assoc()) {
                    if (in_array((int)$r['id'], $hidden, true)) continue;
                    $live['reviews'][] = ["id" => (int)$r['id'], "name" => $r['display_name'], "stars" => (int)$r['rating'], "text" => $r['comment_text'], "date" => substr((string)$r['created_at'], 0, 10)];
                }
                $st->close();
            } catch (Throwable $e) {}
        }
        // الأسئلة الشائعة (من أسئلة المساعد الذكي في الموقع)
        $fq = is_array($cfg['faq'] ?? null) ? $cfg['faq'] : [];
        $fmode = $fq['mode'] ?? 'site';
        if ($fmode === 'site' || $fmode === 'both') {
            try {
                $res = $conn->query("SELECT id, question, answer FROM chat_faq WHERE active = 1 ORDER BY sort_order ASC, id ASC LIMIT 40");
                while ($r = $res->fetch_assoc()) $live['faq'][] = ["id" => (int)$r['id'], "q" => $r['question'], "a" => $r['answer']];
            } catch (Throwable $e) {}
        }
        lp_out(["success" => true, "config" => $cfg, "live" => $live]);
    }

    if ($action === 'markets') {
        session_write_close();
        require_once __DIR__ . '/quote_lib.php';
        $cfg = lp_get_config($conn) ?: [];
        $tabs = $cfg['markets']['tabs'] ?? null;
        if (!is_array($tabs) || !$tabs) $tabs = [["label" => "مصر", "market" => "مصر", "symbols" => "COMI,TMGH,ABUK,ETEL,HRHO"]];
        $out = []; $budget = 24;
        foreach (array_slice($tabs, 0, 6) as $t) {
            $market = in_array($t['market'] ?? '', array_keys(MQ_MARKETS), true) ? $t['market'] : 'مصر';
            $items = [];
            foreach (array_slice(preg_split('/[\s,،]+/u', strtoupper((string)($t['symbols'] ?? '')), -1, PREG_SPLIT_NO_EMPTY), 0, 8) as $sym) {
                if (!preg_match('/^[A-Z0-9.\-]{1,20}$/', $sym) || $budget-- <= 0) continue;
                $h = mq_history($sym, $market, '1y');
                if (!$h || count($h['rows']) < 2) continue;
                $closes = array_map(fn($r) => (float)$r[1], $h['rows']);
                $items[] = ["symbol" => $sym, "market" => $market, "last" => end($closes), "series" => array_slice($closes, -260)];
            }
            $out[] = ["label" => mb_substr((string)($t['label'] ?? $market), 0, 30), "market" => $market, "items" => $items];
        }
        lp_out(["success" => true, "tabs" => $out]);
    }

    if ($action === 'admin_reviews') {
        if (!lp_is_editor($conn)) { http_response_code(403); lp_out(["success" => false, "message" => "غير مصرح."]); }
        session_write_close();
        $rows = [];
        $res = $conn->query("SELECT id, customer_email, display_name, rating, comment_text, created_at FROM testimonials ORDER BY created_at DESC LIMIT 300");
        while ($r = $res->fetch_assoc()) $rows[] = ["id" => (int)$r['id'], "email" => $r['customer_email'], "name" => $r['display_name'], "stars" => (int)$r['rating'], "text" => $r['comment_text'], "date" => substr((string)$r['created_at'], 0, 10)];
        lp_out(["success" => true, "reviews" => $rows]);
    }

    if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!lp_is_editor($conn)) { http_response_code(403); lp_out(["success" => false, "message" => "غير مصرح — صلاحية تعديل تصميم الموقع مطلوبة."]); }
        requireCsrf();
        $me = $_SESSION['user_email'];
        session_write_close();
        $raw = (string)($_POST['config'] ?? '');
        if (strlen($raw) > LP_MAX_BYTES) lp_out(["success" => false, "message" => "حجم الإعدادات كبير جدًا — صغّر الصور أو قلّل عددها."]);
        if ($raw === 'null') {   // رجوع للإعدادات الافتراضية
            $st = $conn->prepare("DELETE FROM ui_customizations WHERE ui_key = 'landing'"); $st->execute(); $st->close();
            lp_out(["success" => true]);
        }
        $cfg = json_decode($raw, true);
        if (!is_array($cfg)) lp_out(["success" => false, "message" => "بيانات غير صحيحة."]);
        $clean = lp_clean($cfg);
        $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
        $st = $conn->prepare("INSERT INTO ui_customizations (ui_key, data_value, updated_by) VALUES ('landing', ?, ?) ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_by = VALUES(updated_by)");
        $st->bind_param("ss", $json, $me); $st->execute(); $st->close();
        lp_out(["success" => true, "config" => $clean]);
    }
    lp_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE landing_api: ' . $e->getMessage());
    lp_out(["success" => false, "message" => "حدث خطأ في قاعدة البيانات."]);
}
?>
