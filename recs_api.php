<?php
/* =====================================================================
   GRIFFINE — recs_api.php (الإصدار 128) — «توصية شراء / بيع» (صلاحية manage_recommendations)
   GET  action=levels symbol market tf     ← الاسم + آخر سعر (متأخر 15 دقيقة) + المحوري والدعم والمقاومة + اقتراح أهداف ووقف
   GET  action=meta                         ← الأسواق المفعّلة + الواتساب متاح؟ + مدد الصلاحية
   POST action=send ...                     ← حفظ التوصية + إشعار المنصة فورًا + الإيميل / الواتساب في الطابور
   POST action=update id kind message channels ← رسالة متابعة لنفس التوصية
   POST action=pump                         ← بيبعت دفعة من الطابور (الشاشة بتناديها لحد ما يخلص)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/recs_lib.php';
function rc_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit(); }
try {
    $email = $_SESSION['user_email'] ?? '';
    if (!$email || empty($_SESSION['is_admin'])) { http_response_code(403); rc_out(["success" => false, "message" => "غير مصرح لك."]); }
    requirePermission($conn, 'manage_recommendations');
    session_write_close();
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
    if ($isPost) requireCsrf();
    if (!rc_ready($conn)) rc_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 128) أولًا."]);

    if ($action === 'meta') {
        $mk = mc_active($conn) ?: ['مصر'];
        rc_out(["success" => true, "markets" => array_map(fn($m) => ['name' => $m, 'ccy' => rc_ccy($m)], $mk), "waOn" => np_wa_on($conn), "tf" => array_map(fn($k, $v) => ['k' => $k, 'l' => $v[0]], array_keys(RC_TF), RC_TF),
            "valid" => array_map(fn($h) => ['h' => $h, 'l' => rc_valid_label($h)], RC_VALID), "kinds" => array_map(fn($k, $v) => ['k' => $k, 'l' => $v], array_keys(RC_KINDS), RC_KINDS), "queue" => (int)$conn->query("SELECT COUNT(*) FROM rec_outbox WHERE status = 0")->fetch_row()[0]]);
    }
    if ($action === 'levels') {
        @set_time_limit(60);
        $sym = mk_clean_symbol($_GET['symbol'] ?? ''); $mkt = mk_clean_market($_GET['market'] ?? ''); $tf = isset(RC_TF[$_GET['tf'] ?? '']) ? $_GET['tf'] : 'day';
        if (!$sym) rc_out(["success" => false, "message" => "اكتب كود السهم بالإنجليزي (مثل COMI)."]);
        $L = rc_levels($conn, $sym, $mkt, $tf);
        rc_out(!empty($L['ok']) ? ["success" => true] + $L : ["success" => false, "message" => $L['message'] ?? 'تعذّر جلب بيانات السهم.']);
    }
    if ($action === 'send' && $isPost) {
        $num = fn($k) => (isset($_POST[$k]) && $_POST[$k] !== '' && is_numeric($_POST[$k])) ? round((float)$_POST[$k], 4) : null;
        $type = ($_POST['type'] ?? 'buy') === 'sell' ? 'sell' : 'buy';
        $sym = mk_clean_symbol($_POST['symbol'] ?? ''); $mkt = mk_clean_market($_POST['market'] ?? '');
        $name = mb_substr(trim((string)($_POST['stockName'] ?? '')), 0, 120);
        $tf = isset(RC_TF[$_POST['timeframe'] ?? '']) ? $_POST['timeframe'] : 'day';
        $from = $num('from'); $to = $num('to'); $valid = (int)($_POST['validityHours'] ?? 24);
        if (!$sym || $name === '' || !$from || !$to || $to < $from) rc_out(["success" => false, "message" => "بيانات السهم أو منطقة " . ($type === 'buy' ? 'الشراء' : 'البيع') . " ناقصة أو غير صحيحة."]);
        if (!in_array($valid, RC_VALID, true)) $valid = 24;
        $t = []; $tp = [];
        foreach ([1, 2, 3] as $i) { $t[$i] = $num("t$i"); $tp[$i] = $type === 'buy' ? $num("t{$i}pct") : null; }
        $s1 = $num('stop1'); $s1p = $num('stop1pct') ?? 100; $s2 = $type === 'buy' ? $num('stop2') : null; $s2p = $s2 ? ($num('stop2pct') ?? 0) : null;
        if ($type === 'buy') {
            $sum = 0; foreach ([1, 2, 3] as $i) if ($t[$i] !== null) { if ($t[$i] <= $to) rc_out(["success" => false, "message" => "نقطة البيع $i لازم تبقى أعلى من منطقة الشراء."]); $sum += (float)($tp[$i] ?? 0); }
            if (array_filter($t) && abs($sum - 100) > 0.01) rc_out(["success" => false, "message" => "مجموع نسب البيع عند الأهداف لازم يبقى 100% (دلوقتي " . round($sum, 2) . "%)."]);
            if ($s1 !== null && $s1 >= $from) rc_out(["success" => false, "message" => "وقف الخسارة لازم يبقى أقل من منطقة الشراء."]);
            if ($s2 !== null && ($s1 === null || $s2 >= $s1 || abs($s1p + $s2p - 100) > 0.01)) rc_out(["success" => false, "message" => "وقف الخسارة التاني لازم يبقى أقل من الأول، ومجموع نسبهم 100%."]);
        } else {
            foreach ([1, 2, 3] as $i) if ($t[$i] !== null && $t[$i] >= $from) rc_out(["success" => false, "message" => "مستوى الهبوط $i لازم يبقى أقل من منطقة البيع."]);
            if ($s1 !== null && $s1 <= $to) rc_out(["success" => false, "message" => "سعر «التوصية فشلت» لازم يبقى أعلى من منطقة البيع."]);
        }
        $sellPct = $type === 'sell' ? max(1, min(100, (float)($num('sellPct') ?? 100))) : null;
        $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 600);
        $ch = ['app' => ($_POST['chApp'] ?? '1') === '1', 'email' => ($_POST['chEmail'] ?? '0') === '1', 'wa' => ($_POST['chWa'] ?? '0') === '1'];
        if (!array_filter($ch)) rc_out(["success" => false, "message" => "اختار قناة إرسال واحدة على الأقل."]);
        $analyst = mb_substr(trim((string)($_POST['analyst'] ?? '')), 0, 120);
        $ccy = rc_ccy($mkt); $chs = implode(',', array_keys(array_filter($ch)));
        $L = ['s1' => $num('lv_s1'), 's2' => $num('lv_s2'), 's3' => $num('lv_s3'), 'p' => $num('lv_p'), 'last' => $num('last')];
        $st = $conn->prepare("INSERT INTO recommendations (symbol, stock_name, buy_from, buy_to, resistance1, resistance1_pct, resistance2, resistance2_pct, resistance3, resistance3_pct, support1, support2, support3, validity_hours, created_by, market,
            rec_type, timeframe, currency, pivot, last_price, stop1, stop1_pct, stop2, stop2_pct, sell_pct, note, channels, analyst_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $st->bind_param("ssdddddddddddisssssdddddddsss", $sym, $name, $from, $to, $t[1], $tp[1], $t[2], $tp[2], $t[3], $tp[3], $L['s1'], $L['s2'], $L['s3'], $valid, $email, $mkt,
            $type, $tf, $ccy, $L['p'], $L['last'], $s1, $s1p, $s2, $s2p, $sellPct, $note, $chs, $analyst);
        if (!$st->execute()) rc_out(["success" => false, "message" => "تعذّر الحفظ: " . $conn->error]);
        $id = (int)$conn->insert_id; $st->close();
        $r = $conn->query("SELECT * FROM recommendations WHERE id = $id")->fetch_assoc();
        $d = rc_dispatch($conn, $id, null, $mkt, rc_title($r), rc_lines($r), $ch, $sym);
        rc_out(["success" => true, "id" => $id] + $d);
    }
    if ($action === 'update' && $isPost) {
        $id = (int)($_POST['id'] ?? 0); $kind = isset(RC_KINDS[$_POST['kind'] ?? '']) ? $_POST['kind'] : 'note';
        $msg = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 800);
        if ($msg === '') rc_out(["success" => false, "message" => "اكتب نص التحديث."]);
        $st = $conn->prepare("SELECT * FROM recommendations WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
        if (!$r) rc_out(["success" => false, "message" => "التوصية مش موجودة."]);
        $ch = ['app' => ($_POST['chApp'] ?? '1') === '1', 'email' => ($_POST['chEmail'] ?? '0') === '1', 'wa' => ($_POST['chWa'] ?? '0') === '1'];
        if (!array_filter($ch)) rc_out(["success" => false, "message" => "اختار قناة إرسال واحدة على الأقل."]);
        $u = $conn->prepare("INSERT INTO recommendation_updates (rec_id, kind, message, created_by) VALUES (?, ?, ?, ?)"); $u->bind_param("isss", $id, $kind, $msg, $email); $u->execute(); $uid = (int)$conn->insert_id; $u->close();
        if ($kind === 'close') { $c = $conn->prepare("UPDATE recommendations SET archived = 1, archived_at = NOW(), status = 'closed' WHERE id = ?"); $c->bind_param("i", $id); $c->execute(); $c->close(); }
        $mkt = mc_valid($r['market'] ?? '') ? $r['market'] : 'مصر';
        $d = rc_dispatch($conn, $id, $uid, $mkt, rc_upd_title($r, $kind), [$msg], $ch, $r['symbol']);
        rc_out(["success" => true, "id" => $uid] + $d);
    }
    if ($action === 'pump' && $isPost) { @set_time_limit(120); rc_out(["success" => true] + rc_pump($conn, 15)); }
    rc_out(["success" => false, "message" => "طلب غير معروف."]);
} catch (Throwable $e) { rc_out(["success" => false, "message" => "حصل خطأ في السيرفر — حاول تاني."]); }
?>
