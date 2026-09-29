<?php
/* =====================================================================
   GRIFFINE — markets_api.php (الإصدار 88) — للعميل المسجّل دخوله
   GET  action=watchlist                 ← قائمة المتابعة + آخر سعر لكل سهم
   POST action=watch_add   symbol, market
   POST action=watch_remove id
   GET  action=quote&symbol=&market=     ← سعر سهم واحد (صفحة السهم)
   POST action=sync_targets targets=JSON ← مستويات التنبيه من الخطط (بتستبدل القديمة) + فحص فوري
   GET  action=alerts                    ← آخر التنبيهات + عدد غير المقروء
   POST action=alerts_read
   POST action=snapshot  items=JSON [{currency, value, cost}] ← لقطة قيمة المحفظة النهارده
   GET  action=snapshots&days=90         ← منحنى أداء المحفظة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 89: سلة المحذوفات
require_once __DIR__ . '/markets_lib.php';

function mk_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (empty($_SESSION['user_email'])) { http_response_code(401); mk_out(["success" => false, "message" => "سجّل الدخول أولًا."]); }
$email = $_SESSION['user_email'];
session_write_close();   // لا يوجد كتابة في الجلسة - منقفلش باقي الطلبات أثناء جلب الأسعار
$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if ($isPost) requireCsrf();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    if ($action === 'watchlist') {
        $st = $conn->prepare("SELECT id, symbol, market FROM user_watchlist WHERE account_email = ? ORDER BY id");
        $st->bind_param("s", $email); $st->execute(); $res = $st->get_result();
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $q = mq_get_quote($r['symbol'], $r['market'], 'day');
            $items[] = ["id" => (int)$r['id'], "symbol" => $r['symbol'], "market" => $r['market'], "ok" => !empty($q['success']),
                "name" => $q['name'] ?? null, "last" => $q['last'] ?? null, "prevClose" => $q['prevClose'] ?? null,
                "high" => $q['high'] ?? null, "low" => $q['low'] ?? null, "currency" => $q['currency'] ?? null, "delayMinutes" => $q['delayMinutes'] ?? 15];
        }
        $st->close();
        mk_out(["success" => true, "items" => $items]);
    }
    if ($action === 'watch_add' && $isPost) {
        $sym = mk_clean_symbol($_POST['symbol'] ?? ''); $mkt = mk_clean_market($_POST['market'] ?? '');
        if (!$sym) mk_out(["success" => false, "message" => "اكتب رمز السهم بالإنجليزية (مثل COMI)."]);
        $c = $conn->prepare("SELECT COUNT(*) c FROM user_watchlist WHERE account_email = ?"); $c->bind_param("s", $email); $c->execute();
        if ((int)$c->get_result()->fetch_assoc()['c'] >= 50) mk_out(["success" => false, "message" => "الحد الأقصى 50 سهمًا في قائمة المتابعة."]); $c->close();
        $q = mq_get_quote($sym, $mkt, 'day');
        if (empty($q['success'])) mk_out(["success" => false, "message" => "لم نجد أسعارًا لهذا الرمز في السوق المختار."]);
        $st = $conn->prepare("INSERT IGNORE INTO user_watchlist (account_email, symbol, market) VALUES (?, ?, ?)");
        $st->bind_param("sss", $email, $sym, $mkt); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'watch_remove' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $__r = trash_rows($conn, 'user_watchlist', 'id = ? AND account_email = ?', 'is', [$id, $email]); if ($__r) trash_put($conn, 'watchlist', 'قائمة المتابعة: ' . $__r[0]['symbol'], ['user_watchlist' => $__r], [], $email);
        $st = $conn->prepare("DELETE FROM user_watchlist WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'quote') {
        $sym = mk_clean_symbol($_GET['symbol'] ?? '');
        if (!$sym) mk_out(["success" => false, "message" => "رمز غير صالح."]);
        $q = mq_get_quote($sym, mk_clean_market($_GET['market'] ?? ''), $_GET['period'] ?? 'day');
        $w = $conn->prepare("SELECT id FROM user_watchlist WHERE account_email = ? AND symbol = ?"); $w->bind_param("ss", $email, $sym); $w->execute();
        $q['watchId'] = ($x = $w->get_result()->fetch_assoc()) ? (int)$x['id'] : null; $w->close();
        mk_out($q);
    }
    if ($action === 'sync_targets' && $isPost) {
        $targets = json_decode((string)($_POST['targets'] ?? '[]'), true);
        if (!is_array($targets)) mk_out(["success" => false]);
        $keep = [];
        // الإصدار 97: meta = بيانات نص الإشعار (الكمية / متوسط التكلفة / النسبة) - لو السعر اتغيّر المستوى بيتسلّح من جديد
        $hasMeta = mk_targets_v97($conn);
        $up = $hasMeta
            ? $conn->prepare("INSERT INTO alert_targets (account_email, symbol, market, plan_kind, side, price, label, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE rearmed = IF(ABS(price - VALUES(price)) > 0.00001, 0, rearmed), triggered_at = IF(ABS(price - VALUES(price)) > 0.00001, NULL, triggered_at), price = VALUES(price), label = VALUES(label), meta = VALUES(meta)")
            : $conn->prepare("INSERT INTO alert_targets (account_email, symbol, market, plan_kind, side, price, label) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE triggered_at = IF(ABS(price - VALUES(price)) > 0.00001, NULL, triggered_at), price = VALUES(price), label = VALUES(label)");
        foreach (array_slice($targets, 0, 400) as $t) {
            $sym = mk_clean_symbol($t['symbol'] ?? ''); $mkt = mk_clean_market($t['market'] ?? '');
            $kind = ($t['kind'] ?? '') === 'Grid' ? 'Grid' : 'DCA'; $side = ($t['side'] ?? '') === 'sell' ? 'sell' : 'buy';
            $price = round((float)($t['price'] ?? 0), 4); $label = mb_substr((string)($t['label'] ?? ''), 0, 150);
            if (!$sym || $price <= 0) continue;
            if ($hasMeta) {
                $meta = [];
                foreach ((array)($t['meta'] ?? []) as $mk => $mv) if (in_array($mk, ['held', 'avg', 'qty', 'amount', 'level', 'pct', 'buy'], true) && (is_numeric($mv) || $mv === null)) $meta[$mk] = $mv === null ? null : (float)$mv;
                $metaJson = json_encode($meta);
                $up->bind_param("sssssdss", $email, $sym, $mkt, $kind, $side, $price, $label, $metaJson);
            } else $up->bind_param("sssssds", $email, $sym, $mkt, $kind, $side, $price, $label);
            $up->execute();
            $keep[] = "$sym|$mkt|$kind|$side";
        }
        $up->close();
        // حذف مستويات خطط اتقفلت أو اتمسحت
        $all = $conn->prepare("SELECT id, symbol, market, plan_kind, side FROM alert_targets WHERE account_email = ?"); $all->bind_param("s", $email); $all->execute(); $ar = $all->get_result();
        while ($r = $ar->fetch_assoc()) if (!in_array("{$r['symbol']}|{$r['market']}|{$r['plan_kind']}|{$r['side']}", $keep, true)) { $d = $conn->prepare("DELETE FROM alert_targets WHERE id = ?"); $d->bind_param("i", $r['id']); $d->execute(); $d->close(); }
        $all->close();
        $fired = mk_check_targets($conn, $email, 20);   // فحص فوري لخطط العميل ده
        mk_out(["success" => true, "targets" => count($keep), "fired" => $fired]);
    }
    if ($action === 'alerts') {
        // الإصدار 91: dismissed = اتقفل من كارت الرئيسية (بيفضل موجود في شاشة التنبيهات لحد ما يتحذف)
        $hasDis = false; try { $c = $conn->query("SHOW COLUMNS FROM user_alerts LIKE 'dismissed'"); $hasDis = $c && $c->num_rows > 0; } catch (Throwable $e) {}
        $st = $conn->prepare("SELECT id, title, body, symbol, market, is_read, " . ($hasDis ? "dismissed" : "0 AS dismissed") . ", created_at FROM user_alerts WHERE account_email = ? ORDER BY id DESC LIMIT 200");
        $st->bind_param("s", $email); $st->execute(); $res = $st->get_result();
        $list = []; $unread = 0;
        while ($r = $res->fetch_assoc()) { $r['id'] = (int)$r['id']; $r['is_read'] = (int)$r['is_read'] === 1; $r['dismissed'] = (int)$r['dismissed'] === 1; if (!$r['is_read']) $unread++; $list[] = $r; }
        $st->close();
        mk_out(["success" => true, "alerts" => $list, "unread" => $unread]);
    }
    if ($action === 'alert_dismiss' && $isPost) {   // الإصدار 91: إغلاق من كارت الرئيسية (id أو all=1)
        if (($_POST['all'] ?? '') === '1') { $st = $conn->prepare("UPDATE user_alerts SET dismissed = 1, is_read = 1 WHERE account_email = ?"); $st->bind_param("s", $email); }
        else { $id = (int)($_POST['id'] ?? 0); $st = $conn->prepare("UPDATE user_alerts SET dismissed = 1, is_read = 1 WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); }
        $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'alert_delete' && $isPost) {    // الإصدار 91: حذف من شاشة التنبيهات ← سلة المحذوفات
        $id = (int)($_POST['id'] ?? 0);
        $__r = trash_rows($conn, 'user_alerts', 'id = ? AND account_email = ?', 'is', [$id, $email]);
        if ($__r) trash_put($conn, 'notification', 'إشعار: ' . mb_substr((string)$__r[0]['title'], 0, 120), ['user_alerts' => $__r], [], $email);
        $st = $conn->prepare("DELETE FROM user_alerts WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'alerts_read' && $isPost) {
        $st = $conn->prepare("UPDATE user_alerts SET is_read = 1 WHERE account_email = ?"); $st->bind_param("s", $email); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'snapshot' && $isPost) {
        $items = json_decode((string)($_POST['items'] ?? '[]'), true);
        if (!is_array($items)) mk_out(["success" => false]);
        $st = $conn->prepare("INSERT INTO portfolio_snapshots (account_email, snap_date, currency, value, cost) VALUES (?, CURDATE(), ?, ?, ?)
            ON DUPLICATE KEY UPDATE value = VALUES(value), cost = VALUES(cost)");
        foreach (array_slice($items, 0, 6) as $it) {
            $ccy = preg_replace('/[^A-Z]/', '', strtoupper((string)($it['currency'] ?? ''))) ?: 'EGP';
            $v = round((float)($it['value'] ?? 0), 2); $c = round((float)($it['cost'] ?? 0), 2);
            if ($v < 0 || $v > 1e12) continue;
            $st->bind_param("ssdd", $email, $ccy, $v, $c); $st->execute();
        }
        $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'prices' && $isPost) {    // الإصدار 91: آخر سعر سوق لكل أسهم خطط العميل (قيمة المحفظة بسعر السوق)
        $items = json_decode((string)($_POST['items'] ?? '[]'), true);
        if (!is_array($items)) mk_out(["success" => false]);
        @set_time_limit(90);
        $out = [];
        foreach (array_slice($items, 0, 60) as $it) {
            $raw = strtoupper(trim((string)($it['symbol'] ?? ''))); $mkt = mk_clean_market($it['market'] ?? '');
            if ($raw === '' || isset($out["$raw|$mkt"])) continue;
            $cands = [$raw]; $base = preg_replace('/[\s\-_]*\d+$/', '', $raw); if ($base !== '' && $base !== $raw) $cands[] = $base;
            $res = null;
            foreach ($cands as $c) {
                if (!mk_clean_symbol($c)) continue;
                $q = mq_get_quote($c, $mkt, 'day');
                if (!empty($q['success']) && is_numeric($q['last'] ?? null) && (float)$q['last'] > 0) { $res = ["last" => (float)$q['last'], "ticker" => $c, "currency" => $q['currency'] ?? null]; break; }
            }
            $out["$raw|$mkt"] = $res;
        }
        mk_out(["success" => true, "prices" => $out, "at" => time()]);
    }
    if ($action === 'history' && $isPost) {   // الإصدار 91: أسعار إغلاق يومية لكل أسهم خطط العميل
        $items = json_decode((string)($_POST['items'] ?? '[]'), true);
        $range = (string)($_POST['range'] ?? '1y');
        if (!is_array($items)) mk_out(["success" => false]);
        @set_time_limit(90);
        $out = [];
        foreach (array_slice($items, 0, 40) as $it) {
            $sym = strtoupper(trim((string)($it['symbol'] ?? ''))); $mkt = mk_clean_market($it['market'] ?? '');
            if ($sym === '' || isset($out["$sym|$mkt"])) continue;
            $out["$sym|$mkt"] = mq_history($sym, $mkt, $range);
        }
        mk_out(["success" => true, "history" => $out]);
    }
    if ($action === 'snapshots') {
        $days = max(7, min(730, (int)($_GET['days'] ?? 90)));
        $st = $conn->prepare("SELECT snap_date, currency, value, cost FROM portfolio_snapshots WHERE account_email = ? AND snap_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY snap_date");
        $st->bind_param("si", $email, $days); $st->execute(); $res = $st->get_result();
        $out = [];
        while ($r = $res->fetch_assoc()) $out[$r['currency']][] = ["d" => $r['snap_date'], "v" => (float)$r['value'], "c" => (float)$r['cost']];
        $st->close();
        mk_out(["success" => true, "series" => $out]);
    }
    // ---- الإصدار 89: تنبيهات السعر المخصّصة ----
    if ($action === 'custom_list') {
        try { mk_check_custom($conn, $email, 20); } catch (Throwable $e) {}   // فحص فوري لتنبيهات العميل ده
        $st = $conn->prepare("SELECT id, symbol, market, currency, cond, target_price, max_repeats, repeat_minutes, sent_count, last_sent_at, last_price, last_checked_at, active, note, created_at
            FROM custom_alerts WHERE account_email = ? AND deleted_at IS NULL ORDER BY active DESC, id DESC LIMIT 100");
        $st->bind_param("s", $email); $st->execute(); $res = $st->get_result(); $list = [];
        while ($r = $res->fetch_assoc()) { foreach (['id','max_repeats','repeat_minutes','sent_count','active'] as $k) $r[$k] = (int)$r[$k];
            foreach (['target_price','last_price'] as $k) $r[$k] = $r[$k] === null ? null : (float)$r[$k]; $list[] = $r; }
        $st->close();
        mk_out(["success" => true, "alerts" => $list, "markets" => MK_CCY, "intervals" => MK_INTERVALS]);
    }
    if ($action === 'custom_add' && $isPost) {
        $sym = mk_clean_symbol($_POST['symbol'] ?? ''); $mkt = mk_clean_market($_POST['market'] ?? '');
        if (!$sym) mk_out(["success" => false, "message" => "اكتب رمز السهم بالإنجليزية (مثل COMI)."]);
        $ccy = preg_replace('/[^A-Z]/', '', strtoupper((string)($_POST['currency'] ?? ''))) ?: (MK_CCY[$mkt] ?? 'EGP');
        $cond = ($_POST['cond'] ?? '') === 'lte' ? 'lte' : 'gte';
        $price = round((float)($_POST['price'] ?? 0), 4);
        if ($price <= 0 || $price > 1e9) mk_out(["success" => false, "message" => "اكتب السعر المطلوب."]);
        $rep = max(1, min(3, (int)($_POST['repeats'] ?? 1)));
        $mins = (int)($_POST['interval'] ?? 60); if (!in_array($mins, MK_INTERVALS, true)) $mins = 60;
        $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 150);
        $c = $conn->prepare("SELECT COUNT(*) c FROM custom_alerts WHERE account_email = ? AND deleted_at IS NULL"); $c->bind_param("s", $email); $c->execute();
        if ((int)$c->get_result()->fetch_assoc()['c'] >= 50) mk_out(["success" => false, "message" => "الحد الأقصى 50 تنبيهًا."]); $c->close();
        $q = mq_get_quote($sym, $mkt, 'day');
        if (empty($q['success'])) mk_out(["success" => false, "message" => "لم نجد أسعارًا لهذا الرمز في البورصة المختارة."]);
        $last = is_numeric($q['last'] ?? null) ? (float)$q['last'] : null;
        $st = $conn->prepare("INSERT INTO custom_alerts (account_email, symbol, market, currency, cond, target_price, max_repeats, repeat_minutes, note, last_price, last_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $st->bind_param("sssssdiisd", $email, $sym, $mkt, $ccy, $cond, $price, $rep, $mins, $note, $last); $st->execute(); $id = $conn->insert_id; $st->close();
        $fired = mk_check_custom($conn, $email, 5);   // لو الشرط متحقق من دلوقتي ← أول تذكير فورًا
        mk_out(["success" => true, "id" => $id, "fired" => $fired]);
    }
    if ($action === 'custom_delete' && $isPost) {
        $id = (int)($_POST['id'] ?? 0);
        $__r = trash_rows($conn, 'custom_alerts', 'id = ? AND account_email = ?', 'is', [$id, $email]);
        if ($__r) { $a = $__r[0]; trash_put($conn, 'price_alert', 'تنبيه سعر: سهم ' . $a['symbol'] . ' عند ' . ($a['cond'] === 'lte' ? 'أقل من أو يساوي ' : 'أكبر من أو يساوي ') . (float)$a['target_price'] . ' ' . mk_ccy_ar($a['currency']), ['custom_alerts' => $__r], [], $email); }
        $st = $conn->prepare("DELETE FROM custom_alerts WHERE id = ? AND account_email = ?"); $st->bind_param("is", $id, $email); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    if ($action === 'custom_toggle' && $isPost) {
        $id = (int)($_POST['id'] ?? 0); $on = ($_POST['active'] ?? '') === '1' ? 1 : 0;
        // إعادة التشغيل بتبدأ العدّ من الأول
        $st = $conn->prepare("UPDATE custom_alerts SET active = ?, sent_count = IF(? = 1, 0, sent_count), last_sent_at = IF(? = 1, NULL, last_sent_at) WHERE id = ? AND account_email = ?");
        $st->bind_param("iiiis", $on, $on, $on, $id, $email); $st->execute(); $st->close();
        mk_out(["success" => true]);
    }
    mk_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) {
    error_log('GRIFFINE markets_api: ' . $e->getMessage());
    mk_out(["success" => false, "message" => "حدث خطأ - تأكد من تشغيل ملف ALL_SCHEMA_UPDATES.sql (الإصدار 88)."]);
}
?>
