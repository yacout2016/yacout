<?php
/* =====================================================================
   GRIFFINE — recs_api.php (الإصدار 128) — «توصية شراء / بيع» (صلاحية manage_recommendations)
   GET  action=levels symbol market tf     ← الاسم + آخر سعر (متأخر 15 دقيقة) + المحوري والدعم والمقاومة + اقتراح أهداف ووقف
   GET  action=meta                         ← الأسواق المفعّلة + الواتساب متاح؟ + مدد الصلاحية
   POST action=send ...                     ← حفظ التوصية + إشعار المنصة فورًا + الإيميل / الواتساب في الطابور
   POST action=update id kind message channels ← رسالة متابعة لنفس التوصية
   POST action=pump                         ← بيبعت دفعة من الطابور (الشاشة بتناديها لحد ما يخلص)
   الإصدار 129: GET admin_get / POST admin_save ← نصوص وأزرار وافتراضيات الشاشة (صلاحية تنسيق الموقع)
               send: وقف 3 مراحل + صور الرسم / فيبوناتشي + رأي بصيرة + المؤشرات + المرفقات + اسم المحلل (مقفول إلا بصلاحية)
   الإصدار 131: POST preview (نفس بيانات send) / GET preview_id&id ← شكل الإشعار + الإيميل + الواتساب قبل الإرسال
               send mode=draft ← مسودة — ولو «موافقة الأدمن» شغالة: التوصية بتروح «بانتظار الموافقة» (إلا لو المرسل معاه rec_approve)
               POST publish id / reject id reason / trash id (المسودة / المرفوضة / اللي بانتظار الموافقة ← سلة المحذوفات)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/recs_lib.php';
require_once __DIR__ . '/trash_lib.php';   // الإصدار 131
function rc_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit(); }
try {
    $email = $_SESSION['user_email'] ?? '';
    if (!$email || empty($_SESSION['is_admin'])) { http_response_code(403); rc_out(["success" => false, "message" => "غير مصرح لك."]); }
    requirePermission($conn, 'manage_recommendations');
    session_write_close();
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
    if ($isPost) requireCsrf();
    if (in_array($action, ['admin_get', 'admin_save'], true)) {
        if (!in_array('edit_site_design', getCurrentUserPermissions($conn), true)) rc_out(["success" => false, "message" => "غير مصرح — صلاحية تنسيق الموقع مطلوبة."]);
        if ($action === 'admin_get') rc_out(["success" => true, "config" => rc_cfg($conn), "defaults" => rc_defaults(), "valid" => array_map(fn($h) => ['h' => $h, 'l' => rc_valid_label($h)], RC_VALID), "ind" => RC_IND]);
        if (!$isPost) rc_out(["success" => false, "message" => "طلب غير صحيح."]);
        $raw = (string)($_POST['config'] ?? '');
        if ($raw === 'null') { site_config_set($conn, 'recs_cfg', '', $email); rc_out(["success" => true]); }
        $in = json_decode($raw, true); if (!is_array($in)) rc_out(["success" => false, "message" => "بيانات غير صحيحة."]);
        $out = []; foreach (rc_defaults() as $k => $v) if (array_key_exists($k, $in)) $out[$k] = is_bool($v) ? !empty($in[$k]) : (is_string($v) ? mb_substr(trim((string)$in[$k]), 0, 600) : (float)$in[$k]);
        // «موافقة الأدمن قبل الإرسال» بيغيّرها بس الأدمن الرئيسي أو صاحب صلاحية الإعدادات الإلزامية
        if (!in_array('manage_admin_settings', getCurrentUserPermissions($conn), true)) $out['approval_on'] = !empty(rc_cfg($conn)['approval_on']);
        foreach ([['tp1', 'tp2', 'tp3'], ['st1', 'st2', 'st3']] as $g) if (abs(array_sum(array_map(fn($k) => (float)($out[$k] ?? rc_defaults()[$k]), $g)) - 100) > 0.01) rc_out(["success" => false, "message" => "مجموع النسب الافتراضية (" . implode(' + ', $g) . ") لازم يبقى 100%."]);
        site_config_set($conn, 'recs_cfg', json_encode($out, JSON_UNESCAPED_UNICODE), $email);
        rc_out(["success" => true]);
    }
    if (!rc_ready($conn)) rc_out(["success" => false, "message" => "شغّل ALL_SCHEMA_UPDATES.sql (الإصدار 129) أولًا."]);

    if ($action === 'meta') {
        $mk = mc_active($conn) ?: ['مصر'];
        rc_out(["success" => true, "markets" => array_map(fn($m) => ['name' => $m, 'ccy' => rc_ccy($m)], $mk), "waOn" => np_wa_on($conn), "tf" => array_map(fn($k, $v) => ['k' => $k, 'l' => $v[0]], array_keys(RC_TF), RC_TF),
            "valid" => array_map(fn($h) => ['h' => $h, 'l' => rc_valid_label($h), 'long' => rc_is_long($conn, $h)], RC_VALID), "kinds" => array_map(fn($k, $v) => ['k' => $k, 'l' => $v], array_keys(RC_KINDS), RC_KINDS), "queue" => (int)$conn->query("SELECT COUNT(*) FROM rec_outbox WHERE status = 0")->fetch_row()[0],
            "cfg" => rc_cfg($conn), "ind" => RC_IND, "analystName" => rc_registered_name($conn, $email), "canRename" => rc_can_rename($conn),
            "approvalOn" => rc_need_approval($conn), "canApprove" => rc_can_approve($conn)]);   // الإصدار 132: approvalOn = توصيات المستخدم ده محتاجة موافقة
    }
    if ($action === 'levels') {
        @set_time_limit(60);
        $sym = mk_clean_symbol($_GET['symbol'] ?? ''); $mkt = mk_clean_market($_GET['market'] ?? ''); $tf = isset(RC_TF[$_GET['tf'] ?? '']) ? $_GET['tf'] : 'day';
        if (!$sym) rc_out(["success" => false, "message" => "اكتب كود السهم بالإنجليزي (مثل COMI)."]);
        $L = rc_levels($conn, $sym, $mkt, $tf);
        rc_out(!empty($L['ok']) ? ["success" => true] + $L : ["success" => false, "message" => $L['message'] ?? 'تعذّر جلب بيانات السهم.']);
    }
    if (in_array($action, ['send', 'preview'], true) && $isPost) {
        $preview = $action === 'preview'; $mode = ($_POST['mode'] ?? '') === 'draft' ? 'draft' : 'send';
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
        $s3 = $type === 'buy' && $s2 ? $num('stop3') : null; $s3p = $s3 ? ($num('stop3pct') ?? 0) : null;
        if ($type === 'buy') {
            $sum = 0; foreach ([1, 2, 3] as $i) if ($t[$i] !== null) { if ($t[$i] <= $to) rc_out(["success" => false, "message" => "نقطة البيع $i لازم تبقى أعلى من منطقة الشراء."]); $sum += (float)($tp[$i] ?? 0); }
            if (array_filter($t) && abs($sum - 100) > 0.01) rc_out(["success" => false, "message" => "مجموع نسب البيع عند الأهداف لازم يبقى 100% (دلوقتي " . round($sum, 2) . "%)."]);
            if ($s1 !== null && $s1 >= $from) rc_out(["success" => false, "message" => "وقف الخسارة لازم يبقى أقل من منطقة الشراء."]);
            if ($s2 !== null && ($s1 === null || $s2 >= $s1 || ($s3 !== null && $s3 >= $s2) || abs($s1p + $s2p + ($s3p ?? 0) - 100) > 0.01)) rc_out(["success" => false, "message" => "مراحل وقف الخسارة لازم كل واحدة أقل من اللي قبلها، ومجموع نسبهم 100%."]);
        } else {
            foreach ([1, 2, 3] as $i) if ($t[$i] !== null && $t[$i] >= $from) rc_out(["success" => false, "message" => "مستوى الهبوط $i لازم يبقى أقل من منطقة البيع."]);
            if ($s1 !== null && $s1 <= $to) rc_out(["success" => false, "message" => "سعر «التوصية فشلت» لازم يبقى أعلى من منطقة البيع."]);
        }
        $sellPct = $type === 'sell' ? max(1, min(100, (float)($num('sellPct') ?? 100))) : null;
        $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 600);
        $ch = ['app' => ($_POST['chApp'] ?? '1') === '1', 'email' => ($_POST['chEmail'] ?? '0') === '1', 'wa' => ($_POST['chWa'] ?? '0') === '1'];
        if (!array_filter($ch)) rc_out(["success" => false, "message" => "اختار قناة إرسال واحدة على الأقل."]);
        // الإصدار 129: الاسم المسجّل للمحلل — وكتابة اسم تاني بصلاحية «تغيير اسم المحلل» بس (السيرفر بيتجاهل أي اسم من غيرها)
        $regName = rc_registered_name($conn, $email);
        $analyst = rc_can_rename($conn) ? mb_substr(trim((string)($_POST['analyst'] ?? '')), 0, 120) : '';
        if ($analyst === '') $analyst = $regName;
        $att = array_values(array_intersect(explode(',', (string)($_POST['attach'] ?? '')), ['chart', 'ai', 'ind', 'fib', 'ext']));
        if (empty(rc_cfg($conn)['allow_ext'])) $att = array_values(array_diff($att, ['ext']));   // الإصدار 148: الأدمن قافل رفع الملفات
        $aiText = in_array('ai', $att, true) ? mb_substr(trim((string)($_POST['aiText'] ?? '')), 0, 1200) : '';
        $ind = [];
        foreach ((array)json_decode((string)($_POST['indicators'] ?? '[]'), true) as $x) if (is_array($x) && count($ind) < 10)
            $ind[] = ['k' => preg_replace('/[^a-z0-9]/', '', (string)($x['k'] ?? '')), 'l' => mb_substr(trim((string)($x['l'] ?? '')), 0, 40), 'v' => mb_substr(trim((string)($x['v'] ?? '')), 0, 40), 'n' => mb_substr(trim((string)($x['n'] ?? '')), 0, 160)];
        $indJson = in_array('ind', $att, true) && $ind ? json_encode($ind, JSON_UNESCAPED_UNICODE) : null;
        $imgKey = bin2hex(random_bytes(16)); $imgOk = []; $imgData = [];
        foreach (['chart', 'fib'] as $nm) if (in_array($nm, $att, true)) {
            $du = (string)($_POST['img_' . $nm] ?? '');
            if ($preview) { if (strpos($du, 'data:image/png;base64,') === 0 && strlen($du) < 3500000) { $imgOk[] = $nm; $imgData[$nm] = $du; } }
            elseif (rc_store_img($imgKey, $nm, $du)) $imgOk[] = $nm;
        }
        $att = array_values(array_filter($att, fn($a) => !in_array($a, ['chart', 'fib'], true) || in_array($a, $imgOk, true)));
        $extPrev = null;   // الإصدار 148: صورة / PDF من جهاز المحلل
        if (in_array('ext', $att, true)) {
            $xd = (string)($_POST['ext_file'] ?? '');
            if ($preview) { $xx = rc_ext_decode($xd); if ($xx) $extPrev = ['url' => $xd, 'type' => $xx['t'] === 'pdf' ? 'pdf' : 'img']; else $att = array_values(array_diff($att, ['ext'])); }
            elseif (!rc_store_ext($imgKey, $xd)) { if ($xd !== '') rc_out(["success" => false, "message" => "الملف المرفق لازم يكون صورة (PNG / JPG / WEBP) أو PDF لحد 5 ميجا."]); $att = array_values(array_diff($att, ['ext'])); }
        }
        if ($aiText === '') $att = array_values(array_diff($att, ['ai']));
        if (!$indJson) $att = array_values(array_diff($att, ['ind']));
        $attS = implode(',', $att);
        $ccy = rc_ccy($mkt); $chs = implode(',', array_keys(array_filter($ch)));
        $L = ['s1' => $num('lv_s1'), 's2' => $num('lv_s2'), 's3' => $num('lv_s3'), 'p' => $num('lv_p'), 'last' => $num('last')];
        if ($preview) {   // الإصدار 131: نفس التوصية بالظبط من غير حفظ ولا إرسال ← شكل الإشعار + الإيميل + الواتساب
            $r = ['id' => 0, 'symbol' => $sym, 'stock_name' => $name, 'buy_from' => $from, 'buy_to' => $to, 'resistance1' => $t[1], 'resistance1_pct' => $tp[1], 'resistance2' => $t[2], 'resistance2_pct' => $tp[2],
                'resistance3' => $t[3], 'resistance3_pct' => $tp[3], 'support1' => $L['s1'], 'support2' => $L['s2'], 'support3' => $L['s3'], 'validity_hours' => $valid, 'created_by' => $email, 'market' => $mkt,
                'rec_type' => $type, 'timeframe' => $tf, 'currency' => $ccy, 'pivot' => $L['p'], 'last_price' => $L['last'], 'stop1' => $s1, 'stop1_pct' => $s1p, 'stop2' => $s2, 'stop2_pct' => $s2p, 'stop3' => $s3, 'stop3_pct' => $s3p,
                'sell_pct' => $sellPct, 'note' => $note, 'channels' => $chs, 'analyst_name' => $analyst, 'img_key' => null, 'attach' => $attS, 'ai_text' => $aiText, 'indicators' => $indJson, 'created_at' => date('Y-m-d H:i:s'), 'status' => 'preview', '_img' => $imgData, '_ext' => $extPrev];
            rc_out(["success" => true] + rc_preview_payload($conn, $r));
        }
        // الحالة: مسودة / بانتظار موافقة الأدمن / تتبعت على طول
        $status = $mode === 'draft' ? 'draft' : (rc_need_approval($conn) ? 'pending' : 'active'); $arch = $status === 'active' ? 0 : 1;
        $st = $conn->prepare("INSERT INTO recommendations (symbol, stock_name, buy_from, buy_to, resistance1, resistance1_pct, resistance2, resistance2_pct, resistance3, resistance3_pct, support1, support2, support3, validity_hours, created_by, market,
            rec_type, timeframe, currency, pivot, last_price, stop1, stop1_pct, stop2, stop2_pct, sell_pct, note, channels, analyst_name, stop3, stop3_pct, img_key, attach, ai_text, indicators, status, archived) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $st->bind_param("ssdddddddddddisssssdddddddsssddsssssi", $sym, $name, $from, $to, $t[1], $tp[1], $t[2], $tp[2], $t[3], $tp[3], $L['s1'], $L['s2'], $L['s3'], $valid, $email, $mkt,
            $type, $tf, $ccy, $L['p'], $L['last'], $s1, $s1p, $s2, $s2p, $sellPct, $note, $chs, $analyst, $s3, $s3p, $imgKey, $attS, $aiText, $indJson, $status, $arch);
        if (!$st->execute()) rc_out(["success" => false, "message" => "تعذّر الحفظ: " . $conn->error]);
        $id = (int)$conn->insert_id; $st->close();
        $r = $conn->query("SELECT * FROM recommendations WHERE id = $id")->fetch_assoc();
        if ($status === 'draft') rc_out(["success" => true, "id" => $id, "status" => 'draft']);
        if ($status === 'pending') { rc_notify_approvers($conn, $r, $email); rc_out(["success" => true, "id" => $id, "status" => 'pending']); }
        $d = rc_dispatch($conn, $id, null, $mkt, rc_title($r), array_merge(rc_lines($r), rc_extra_lines($r)), $ch, $sym, true, rc_img_url($r, 'chart'));
        rc_out(["success" => true, "id" => $id, "status" => 'active', "attach" => $attS, "analyst" => $analyst] + $d);
    }
    // الإصدار 131: معاينة توصية محفوظة (مسودة / بانتظار الموافقة / مرسلة)
    if ($action === 'preview_id') {
        $id = (int)($_GET['id'] ?? 0); $r = rc_row($conn, $id);
        if (!$r) rc_out(["success" => false, "message" => "التوصية مش موجودة."]);
        rc_out(["success" => true, "status" => $r['status']] + rc_preview_payload($conn, $r));
    }
    if (in_array($action, ['publish', 'reject', 'trash'], true) && $isPost) {
        $id = (int)($_POST['id'] ?? 0); $r = rc_row($conn, $id);
        if (!$r) rc_out(["success" => false, "message" => "التوصية مش موجودة."]);
        $mine = strtolower((string)$r['created_by']) === strtolower($email); $appr = rc_can_approve($conn);
        if ($action === 'publish') {
            if ($r['status'] === 'draft') {
                if (!$mine && !$appr) rc_out(["success" => false, "message" => "المسودة دي بتاعة محلل تاني."]);
                if (rc_need_approval($conn)) { $u = $conn->prepare("UPDATE recommendations SET status = 'pending' WHERE id = ? AND status = 'draft'"); $u->bind_param("i", $id); $u->execute(); $u->close();
                    rc_notify_approvers($conn, $r, $email); rc_out(["success" => true, "status" => 'pending']); }
            } elseif ($r['status'] === 'pending') { if (!$appr) rc_out(["success" => false, "message" => "الموافقة محتاجة صلاحية «مُراجِع التوصيات»."]);
                if ($mine && !rc_is_super()) rc_out(["success" => false, "message" => "مينفعش توافق على توصيتك بنفسك — لازم مُراجِع تاني أو الأدمن."]); }
            else rc_out(["success" => false, "message" => "التوصية دي اتبعتت أو اتقفلت قبل كده."]);
            $d = rc_publish($conn, $id, $email);
            if ($d === null) rc_out(["success" => false, "message" => "التوصية اتغيّرت حالتها — حدّث الصفحة."]);
            rc_out(["success" => true, "status" => 'active'] + $d);
        }
        if ($action === 'reject') {
            if (!$appr) rc_out(["success" => false, "message" => "الرفض محتاج صلاحية «مراجعة واعتماد التوصيات»."]);
            if ($r['status'] !== 'pending') rc_out(["success" => false, "message" => "التوصية مش بانتظار الموافقة."]);
            $why = mb_substr(trim((string)($_POST['reason'] ?? '')), 0, 300);
            $u = $conn->prepare("UPDATE recommendations SET status = 'rejected', reject_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'pending'"); $u->bind_param("ssi", $why, $email, $id); $u->execute(); $u->close();
            rc_notify_users($conn, [$r['created_by']], '❌ اترفضت — ' . rc_title($r), ($why !== '' ? 'سبب الرفض: ' . $why : 'راجعها وابعتها تاني.') . ' — رفضها ' . $email, $r['symbol'], $r['market'] ?? 'مصر', 'rec_no', $id, true);
            rc_out(["success" => true, "status" => 'rejected']);
        }
        // trash: المسودة / المرفوضة / اللي بانتظار الموافقة بس (المرسلة ليها «إلغاء» و«إغلاق»)
        if (!in_array($r['status'], ['draft', 'pending', 'rejected'], true)) rc_out(["success" => false, "message" => "التوصية المرسلة مش بتتحذف من هنا — استخدم «إلغاء» أو «إغلاق التوصية»."]);
        if (!$mine && !$appr) rc_out(["success" => false, "message" => "مسموح بس لصاحب التوصية أو اللي بيراجع التوصيات."]);
        $rows = trash_rows($conn, 'recommendations', 'id = ?', 'i', [$id]);
        trash_put($conn, 'recommendation', ($r['status'] === 'draft' ? 'مسودة توصية: ' : 'توصية: ') . $r['stock_name'] . ' (' . $r['symbol'] . ')', ['recommendations' => $rows]);
        $dl = $conn->prepare("DELETE FROM recommendations WHERE id = ?"); $dl->bind_param("i", $id); $dl->execute(); $dl->close();
        rc_out(["success" => true]);
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
