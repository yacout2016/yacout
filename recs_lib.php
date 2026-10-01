<?php
/* =====================================================================
   GRIFFINE — recs_lib.php (الإصدار 128 / 129) — «توصية شراء / بيع» للمحللين
   ---------------------------------------------------------------------
   - المستويات حسب المدة (يومي / أسبوعي / شهري / 3 / 6 شهور / سنة): المحوري الكلاسيكي + 3 دعم + 3 مقاومة + ATR + اقتراح أهداف ووقف
   - التوصية: شراء (منطقة شراء + 3 أهداف بنسب بيع + وقف على مرحلة أو مرحلتين)
              بيع (منطقة بيع + نسبة البيع + مستويات هبوط متوقعة + سعر «التوصية فشلت» لو السعر عدّاه لفوق)
   - الإرسال: إشعار على المنصة فوري لكل مشتركين السوق + الإيميل والواتساب في طابور بيتبعت على دفعات (مناسب لـ 1000+ مشترك)
   - رسائل متابعة لنفس التوصية (تحقق هدف / تعديل وقف / إغلاق / ملاحظة)
   الإصدار 129:
   - الصلاحية من ساعة لحد 12 شهر + «توصية طويلة المدى» من أسبوعين + إشعار «انتهت صلاحية التوصية» مرة واحدة
   - وقف الخسارة على 3 مراحل (S1 / S2 / S3) + شموع للرسم البياني + صور الرسم وفيبوناتشي برابط سري (rec_img.php)
   - رأي بصيرة AI + المؤشرات المختارة في الرسالة + إيميل احترافي + صورة في إشعار الموبايل + الواتساب بسيط ومعاه لينك
   - اسم المحلل من حسابه (HR ← اسم الحساب) — وتغييره بصلاحية rec_custom_analyst_name بس
   - كل نصوص الشاشة وأزرارها وافتراضياتها من لوحة التحكم (site_config: recs_cfg)
   ===================================================================== */
require_once __DIR__ . '/basira_lib.php';
require_once __DIR__ . '/markets_core.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/notify_lib.php';
@include_once __DIR__ . '/mailer.php';

const RC_TF = ['day' => ['يومي', 1, 0.5], 'week' => ['أسبوعي', 5, 1.0], 'month' => ['شهري', 21, 1.5], '3m' => ['3 شهور', 63, 2.0], '6m' => ['6 شهور', 126, 2.5], 'year' => ['سنة', 252, 3.0]];
const RC_VALID = [1, 3, 6, 9, 12, 24, 48, 72, 168, 336, 504, 720, 2160, 4320, 8760];
const RC_VALID_L = [1 => 'ساعة', 3 => '3 ساعات', 6 => '6 ساعات', 9 => '9 ساعات', 12 => '12 ساعة', 24 => '24 ساعة', 48 => '48 ساعة', 72 => '3 أيام', 168 => 'أسبوع', 336 => 'أسبوعين', 504 => '3 أسابيع', 720 => 'شهر', 2160 => '3 شهور', 4320 => '6 شهور', 8760 => '12 شهر'];
const RC_KINDS = ['target' => '🎯 تحقق هدف', 'stop' => '🛑 تعديل وقف الخسارة', 'close' => '✅ إغلاق التوصية', 'note' => '📝 ملاحظة'];
const RC_IND = ['sma20' => 'SMA 20', 'sma50' => 'SMA 50', 'sma200' => 'SMA 200', 'ema20' => 'EMA 20', 'bb' => 'بولينجر', 'rsi' => 'RSI', 'macd' => 'MACD', 'stoch' => 'ستوكاستك', 'fib' => 'فيبوناتشي'];

/* الإصدار 129: نصوص وأزرار وافتراضيات الشاشة — الأدمن بيعدّلها من لوحة التحكم */
function rc_defaults(){
    return [
        't_title' => '📢 توصية شراء / بيع', 't_buy_tab' => '📈 توصية شراء', 't_sell_tab' => '📉 توصية بيع',
        't_stock_panel' => '📊 السهم والسعر المحوري', 't_msg_panel' => '✉️ رسالة التوصية',
        't_btn_analyze' => '🔍 تحليل السهم', 't_btn_scan' => '📡 مسح السوق', 't_btn_transfer' => '⬇ انقل المستويات للتوصية',
        't_transfer_hint' => 'بيملا منطقة الدخول (فرق لا يزيد عن نسبة النطاق من المحوري) + 3 أهداف من المقاومات + وقف الخسارة من الدعوم — وكل خانة تتعدّل باليد',
        't_entry_buy' => '💰 منطقة الشراء', 't_entry_sell' => '💰 منطقة البيع', 't_targets_buy' => '🎯 نقاط جني الأرباح', 't_targets_sell' => '📉 مستويات الهبوط المتوقعة',
        't_stop_buy' => '🛑 وقف الخسارة', 't_stop_sell' => '⚠️ التوصية تعتبر فاشلة لو السعر عدّى لفوق',
        't_stop_one' => 'مرحلة واحدة (كسر أول دعم — بيع 100%)', 't_stop_three' => '3 مراحل (كل ما السعر ينزل دعم)',
        't_chart' => '📈 الرسم البياني والمؤشرات', 't_attach' => '📎 المرفقات',
        't_att_chart' => 'أرفق الرسم البياني', 't_att_ai' => 'أرفق رأي بصيرة AI', 't_att_ind' => 'أرفق المؤشرات المختارة', 't_att_fib' => 'أرفق رسم فيبوناتشي (الأهداف والوقف)',
        't_channels' => '📨 قنوات الإرسال', 't_preview' => '👁 معاينة الرسالة اللي هتوصل للمشترك',
        't_send_buy' => '📢 إرسال توصية الشراء', 't_send_sell' => '📢 إرسال توصية البيع', 't_analyst' => 'المحلل',
        't_long_term' => '🕰️ توصية طويلة المدى',
        't_expired_title' => '⏰ انتهت صلاحية التوصية', 't_expired_body' => 'انتهت مدة صلاحية التوصية دي، والمستويات اللي فيها مبقتش سارية.',
        't_disclaimer' => 'تحليل تعليمي وليس أمر شراء أو بيع — القرار قرارك.', 't_team' => 'فريق GRIFFINE',
        't_email_cta' => 'افتح التوصية في GRIFFINE', 't_email_foot' => 'الأسعار متأخرة حوالي 15 دقيقة. وصلك الإيميل ده عشان أنت مشترك في التوصيات، وتقدر توقفه من إعدادات الإشعارات.',
        't_wa_link' => '🔗 التفاصيل والرسم:',
        'entry_band' => 1, 'tp1' => 40, 'tp2' => 30, 'tp3' => 30, 'st1' => 50, 'st2' => 30, 'st3' => 20, 'long_hours' => 336,
        'att_chart' => true, 'att_ai' => true, 'att_ind' => true, 'att_fib' => false, 'ind_default' => 'sma20,sma50,rsi',
        // الإصدار 131: موافقة الأدمن قبل الإرسال (مقفولة افتراضيًا) + نصوص المعاينة
        'approval_on' => false, 't_btn_preview' => '👁 معاينة قبل الإرسال', 't_btn_draft' => '💾 حفظ مسودة', 't_send_review' => '📨 إرسال للمراجعة',
        't_pending_note' => 'موافقة الأدمن شغالة: التوصية هتروح للمراجعة الأول، وبعد الموافقة بتتبعت للمشتركين.',
    ];
}
function rc_cfg($conn = null){
    static $c = null; if ($c !== null) return $c;
    $d = rc_defaults(); if (!$conn) $conn = $GLOBALS['conn'] ?? null;
    if ($conn) { $j = json_decode((string)(site_config_get($conn, 'recs_cfg') ?: 'null'), true);
        if (is_array($j)) foreach ($d as $k => $v) if (array_key_exists($k, $j)) $d[$k] = is_bool($v) ? !empty($j[$k]) : (is_string($v) ? mb_substr(trim((string)$j[$k]), 0, 600) : max(0, min(10000, (float)$j[$k]))); }
    foreach ($d as $k => $v) if (is_string($v) && $v === '' && strpos($k, 't_') === 0) $d[$k] = rc_defaults()[$k];   // نص فاضي ← الافتراضي
    $d['entry_band'] = max(0.1, min(10, (float)$d['entry_band']));
    if (!in_array((int)$d['long_hours'], RC_VALID, true)) $d['long_hours'] = 336;
    $d['ind_default'] = implode(',', array_values(array_intersect(array_map('trim', explode(',', (string)$d['ind_default'])), array_keys(RC_IND))));
    return $c = $d;
}
function rc_is_long($conn, $hours){ return (int)$hours >= (int)rc_cfg($conn)['long_hours']; }
/* اسم المحلل المسجّل: ملف الموظف في شؤون الموظفين ← اسم الحساب ← فاضي («فريق GRIFFINE») */
function rc_registered_name($conn, $email){
    foreach (["SELECT full_name FROM hr_employees WHERE LOWER(email) = LOWER(?) AND status = 'active' ORDER BY id DESC LIMIT 1",
              "SELECT name FROM subscribers WHERE LOWER(account_email) = LOWER(?) AND name <> '' ORDER BY id DESC LIMIT 1"] as $sql) {
        try { $st = $conn->prepare($sql); $st->bind_param("s", $email); $st->execute(); $r = $st->get_result()->fetch_row(); $st->close(); if ($r && trim((string)$r[0]) !== '') return mb_substr(trim((string)$r[0]), 0, 120); } catch (Throwable $e) {}
    }
    return '';
}
/* الإصدار 131: موافقة الأدمن قبل الإرسال */
function rc_can_approve($conn){ return in_array('rec_approve', getCurrentUserPermissions($conn), true); }
function rc_need_approval($conn){ return !empty(rc_cfg($conn)['approval_on']) && !rc_can_approve($conn); }
function rc_row($conn, $id){ $st = $conn->prepare("SELECT * FROM recommendations WHERE id = ?"); $st->bind_param("i", $id); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close(); return $r ?: null; }
function rc_notify_users($conn, $emails, $title, $body, $sym = '', $mkt = 'مصر'){
    foreach (array_unique(array_filter(array_map('strtolower', $emails))) as $e) {
        try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)"); $i->bind_param("sssss", $e, $title, $body, $sym, $mkt); $i->execute(); $i->close(); } catch (Throwable $x) {}
    }
}
/* اللي يقدر يوافق: الأدمن الرئيسي + أي موظف معاه «مراجعة واعتماد التوصيات» */
function rc_approvers($conn){
    $out = [strtolower(ADMIN_EMAIL)];
    try { $res = $conn->query("SELECT LOWER(s.email) e FROM staff_members s JOIN staff_permissions p ON p.staff_id = s.id WHERE s.active = 1 AND p.permission_key = 'rec_approve'"); while ($x = $res->fetch_assoc()) $out[] = $x['e']; } catch (Throwable $e) {}
    return array_values(array_unique($out));
}
function rc_notify_approvers($conn, $r, $by){
    rc_notify_users($conn, array_diff(rc_approvers($conn), [strtolower($by)]), '⏳ توصية محتاجة موافقة — ' . $r['stock_name'] . ' (' . $r['symbol'] . ')',
        'من ' . ($r['analyst_name'] ?: $by) . ' — افتح «توصية شراء / بيع» وراجعها قبل ما تتبعت للمشتركين.', $r['symbol'], $r['market'] ?? 'مصر');
}
/* نشر توصية (بعد الموافقة أو من المسودة): الصلاحية بتبدأ من وقت النشر + الإرسال على القنوات اللي المحلل اختارها */
function rc_publish($conn, $id, $by){
    $u = $conn->prepare("UPDATE recommendations SET archived = 0, archived_at = NULL, status = 'active', created_at = NOW(), approved_by = ?, approved_at = NOW() WHERE id = ? AND status IN ('draft', 'pending')");
    $u->bind_param("si", $by, $id); $u->execute(); $ok = $u->affected_rows === 1; $u->close();
    if (!$ok) return null;
    $r = rc_row($conn, $id); $chs = explode(',', (string)$r['channels']);
    $ch = ['app' => in_array('app', $chs, true), 'email' => in_array('email', $chs, true), 'wa' => in_array('wa', $chs, true)];
    $mkt = mc_valid($r['market'] ?? '') ? $r['market'] : 'مصر';
    $d = rc_dispatch($conn, $id, null, $mkt, rc_title($r), array_merge(rc_lines($r), rc_extra_lines($r)), $ch, $r['symbol'], true, rc_img_url($r, 'chart'));
    if (strtolower((string)$r['created_by']) !== strtolower($by)) rc_notify_users($conn, [$r['created_by']], '✅ التوصية اتوافق عليها واتبعتت — ' . $r['stock_name'] . ' (' . $r['symbol'] . ')', 'وصلت لـ ' . $d['recipients'] . ' مشترك.', $r['symbol'], $mkt);
    return $d;
}
/* الإصدار 131: شكل التوصية في الإشعار + الإيميل + الواتساب (نفس اللي بيتبعت بالظبط) */
function rc_preview_payload($conn, $r){
    $C = rc_cfg($conn); $title = rc_title($r); $lines = array_merge(rc_lines($r), rc_extra_lines($r));
    $m = rc_email($conn, $r);
    return ['title' => $title, 'app' => $lines, 'email' => $m['html'], 'emailSubject' => $title,
        'wa' => $title . ' — ' . implode(' | ', rc_lines($r)) . ' | ' . $C['t_wa_link'] . ' ' . MAIL_SITE_URL,
        'push' => ['title' => $title, 'body' => mb_substr(implode("\n", $lines), 0, 400), 'image' => rc_img_url($r, 'chart')], 'channels' => (string)($r['channels'] ?? '')];
}
function rc_can_rename($conn){ return in_array('rec_custom_analyst_name', getCurrentUserPermissions($conn), true); }
/* صور الرسم البياني وفيبوناتشي: PNG من متصفح المحلل ← ملف على السيرفر باسم سري (بيتعرض من rec_img.php للإيميل والإشعار) */
function rc_img_dir(){
    require_once __DIR__ . '/uploads.php';
    $b = upl_dir(); if (!$b) return false;
    $d = $b . '/rec'; if (!is_dir($d)) @mkdir($d, 0755, true);
    return is_dir($d) && is_writable($d) ? $d : false;
}
function rc_store_img($key, $name, $data){
    if (!preg_match('/^[a-f0-9]{32}$/', $key) || !in_array($name, ['chart', 'fib'], true)) return false;
    if (!is_string($data) || strpos($data, 'data:image/png;base64,') !== 0 || strlen($data) > 3500000) return false;
    $bin = base64_decode(substr($data, 22), true);
    if ($bin === false || strncmp($bin, "\x89PNG", 4) !== 0 || @getimagesizefromstring($bin) === false) return false;
    $d = rc_img_dir(); if (!$d) return false;
    return @file_put_contents("$d/{$key}_{$name}.png", $bin) !== false;
}
function rc_img_url($r, $name){
    $a = explode(',', (string)($r['attach'] ?? ''));
    if (!empty($r['_img'][$name]) && in_array($name, $a, true)) return $r['_img'][$name];   // الإصدار 131: معاينة قبل الحفظ (صورة من المتصفح)
    if (empty($r['img_key']) || !in_array($name, $a, true)) return null;
    return MAIL_SITE_URL . '/rec_img.php?k=' . $r['img_key'] . '&n=' . $name;
}

function rc_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW COLUMNS FROM recommendations LIKE 'approved_by'");   /* الإصدار 131 */ $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function rc_ccy($market){ return mc_ccy($market); }

/* المستويات للمدة المختارة — من شموع يومية: أعلى / أقل / إغلاق آخر N جلسة */
function rc_levels($conn, $sym, $market, $tf){
    $T = RC_TF[$tf] ?? RC_TF['day'];
    $q = mq_get_quote($sym, $market, 'day');
    $C = opp_candles($sym, $market, '1d');
    if ((!$C || count($C['c']) < 2) && empty($q['success'])) return ['ok' => false, 'message' => 'الرمز ده مش موجود في البورصة المختارة أو مفيش بيانات له.'];
    $last = !empty($q['success']) ? (float)$q['last'] : (float)end($C['c']);
    $cfg = bs_cfg($conn); $ar = bs_arname($cfg, $sym, $market);
    $out = ['ok' => true, 'symbol' => $sym, 'market' => $market, 'currency' => !empty($q['currency']) ? $q['currency'] : rc_ccy($market),
        'name' => $ar !== '' ? $ar : (string)($q['name'] ?? ''), 'nameEn' => (string)($q['name'] ?? ''), 'last' => $last,
        'chg' => (!empty($q['prevClose']) && (float)$q['prevClose'] > 0) ? ($last / (float)$q['prevClose'] - 1) * 100 : null,
        'delayed' => true, 'tf' => $tf, 'tfLabel' => $T[0]];
    $out['bars'] = rc_bars($sym, $market, $tf, $C);
    if (!$C || count($C['c']) < 3) return $out + ['levels' => null];
    $n = count($C['c']); $N = min($T[1], $n - 1);
    // الفترة المكتملة اللي فاتت (من غير جلسة النهارده)
    $hs = array_slice($C['h'], $n - 1 - $N, $N); $ls = array_slice($C['l'], $n - 1 - $N, $N);
    $H = max($hs); $L = min($ls); $Cl = (float)$C['c'][$n - 2];
    $P = ($H + $L + $Cl) / 3;
    $lv = ['p' => $P, 'r1' => 2 * $P - $L, 's1' => 2 * $P - $H, 'r2' => $P + ($H - $L), 's2' => $P - ($H - $L), 'r3' => $H + 2 * ($P - $L), 's3' => $L - 2 * ($H - $P), 'high' => $H, 'low' => $L];
    // ATR 14 يوم
    $tr = []; for ($i = max(1, $n - 15); $i < $n; $i++) $tr[] = max($C['h'][$i] - $C['l'][$i], abs($C['h'][$i] - $C['c'][$i - 1]), abs($C['l'][$i] - $C['c'][$i - 1]));
    $atr = $tr ? array_sum($tr) / count($tr) : 0; $k = $T[2];
    foreach ($lv as $kk => $v) $lv[$kk] = max(0, round($v, 4));
    $buy = ['from' => round(min($last, max($lv['s1'], $last - $atr * $k * 0.5)), 4), 'to' => round($last, 4),
        'targets' => [[$lv['r1'], 50], [$lv['r2'], 25], [$lv['r3'], 25]], 'stop' => round(max(0, min($lv['s1'], $last) - $atr * $k), 4)];
    $sell = ['from' => round($last, 4), 'to' => round(max($last, min($lv['r1'], $last + $atr * $k * 0.5)), 4),
        'targets' => [[$lv['s1'], null], [$lv['s2'], null], [$lv['s3'], null]], 'stop' => round(max($lv['r1'], $last) + $atr * $k, 4)];
    return $out + ['levels' => $lv, 'atr' => round($atr, 4), 'suggest' => ['buy' => $buy, 'sell' => $sell]];
}

/* الإصدار 129: شموع الرسم البياني — يومي للمدد القصيرة وأسبوعي للطويلة */
function rc_bars($sym, $market, $tf, $D){
    [$src, $n] = ['day' => ['1d', 120], 'week' => ['1d', 160], 'month' => ['1d', 250], '3m' => ['1wk', 110], '6m' => ['1wk', 160], 'year' => ['1wk', 260]][$tf] ?? ['1d', 120];
    $C = $src === '1d' ? $D : (opp_candles($sym, $market, '1wk') ?: $D);
    if (!$C || count($C['c']) < 2) return null;
    $k = max(0, count($C['c']) - $n); $o = [];
    foreach (['t', 'h', 'l', 'c', 'v'] as $f) $o[$f] = array_map(fn($v) => is_float($v) ? round($v, 4) : $v, array_slice($C[$f], $k));
    $o['o'] = isset($C['o']) && count($C['o']) === count($C['c']) ? array_map(fn($v) => round((float)$v, 4), array_slice($C['o'], $k)) : null;
    $o['iv'] = $src === '1d' ? 'يومي' : 'أسبوعي';
    return $o;
}

/* نص التوصية (الإشعار + الإيميل + الواتساب) — سطور منسّقة */
function rc_lines($r){
    $n = fn($v) => mk_num($v); $L = [];
    $buy = ($r['rec_type'] ?? 'buy') !== 'sell';
    $L[] = 'المدة: ' . (RC_TF[$r['timeframe'] ?? 'day'][0] ?? 'يومي') . ' — البورصة: ' . ($r['market'] ?? 'مصر') . ' (' . mk_ccy_ar($r['currency'] ?? rc_ccy($r['market'] ?? 'مصر')) . ')';
    if ($buy) {
        $L[] = '💰 الشراء من ' . $n($r['buy_from']) . ' إلى ' . $n($r['buy_to']);
        $t = []; foreach ([1, 2, 3] as $i) if ($r["resistance$i"] !== null && $r["resistance$i"] !== '') $t[] = "نقطة بيع $i: " . $n($r["resistance$i"]) . ($r["resistance{$i}_pct"] !== null && $r["resistance{$i}_pct"] !== '' ? ' — بيع ' . $n($r["resistance{$i}_pct"]) . '%' . ($i === 3 || ($i === 2 && empty($r['resistance3'])) ? ' (باقي الكمية)' : '') : '');
        if ($t) $L[] = "🎯 جني الأرباح:\n" . implode("\n", $t);
        $s = [];
        $multi = !empty($r['stop2']) || !empty($r['stop3']);
        foreach ([1, 2, 3] as $i) if (!empty($r["stop$i"])) $s[] = 'وقف الخسارة' . ($multi ? " $i" : '') . ': ' . $n($r["stop$i"]) . ' — بيع ' . $n($r["stop{$i}_pct"] ?? 100) . '%';
        if ($s) $L[] = "🛑 " . implode("\n🛑 ", $s);
    } else {
        $L[] = '💰 البيع من ' . $n($r['buy_from']) . ' إلى ' . $n($r['buy_to']) . ' — بيع ' . $n($r['sell_pct'] ?? 100) . '% من الكمية';
        $t = []; foreach ([1, 2, 3] as $i) if ($r["resistance$i"] !== null && $r["resistance$i"] !== '') $t[] = $n($r["resistance$i"]);
        if ($t) $L[] = '📉 مستويات الهبوط المتوقعة: ' . implode(' ← ', $t);
        if (!empty($r['stop1'])) $L[] = '⚠️ التوصية تعتبر فاشلة لو السعر عدّى ' . $n($r['stop1']) . ' لفوق';
    }
    if (!empty($r['note'])) $L[] = '📝 ملاحظة المحلل: ' . $r['note'];
    $C = rc_cfg();
    $L[] = $C['t_analyst'] . ': ' . ($r['analyst_name'] ?: $C['t_team']) . ' — صالحة ' . rc_valid_label((int)($r['validity_hours'] ?? 24)) . ((int)($r['validity_hours'] ?? 24) >= (int)$C['long_hours'] ? ' (' . $C['t_long_term'] . ')' : '');
    $L[] = $C['t_disclaimer'];
    return $L;
}
function rc_title($r){ return (($r['rec_type'] ?? 'buy') === 'sell' ? '📉 توصية بيع: ' : '📈 توصية شراء: ') . ($r['stock_name'] ?? '') . ' (' . ($r['symbol'] ?? '') . ')'; }
function rc_valid_label($h){ return RC_VALID_L[(int)$h] ?? ($h . ' ساعة'); }
/* المؤشرات والرأي الإضافي (للإشعار جوه التطبيق — الإيميل ليه شكل خاص) */
function rc_extra_lines($r){
    $L = []; $a = explode(',', (string)($r['attach'] ?? ''));
    if (in_array('ind', $a, true)) { $I = json_decode((string)($r['indicators'] ?? ''), true); if (is_array($I) && $I) $L[] = '📊 المؤشرات: ' . implode(' — ', array_map(fn($x) => $x['l'] . ($x['v'] !== '' ? ' ' . $x['v'] : '') . ($x['n'] !== '' ? ' (' . $x['n'] . ')' : ''), $I)); }
    if (in_array('ai', $a, true) && trim((string)($r['ai_text'] ?? '')) !== '') $L[] = '🤖 رأي بصيرة AI: ' . $r['ai_text'];
    return $L;
}
/* انتهاء الصلاحية: التوصية بتتقفل + رسالة متابعة «انتهت» + إشعار على المنصة لمشتركين السوق (مرة واحدة بس حتى لو طلبين في نفس الوقت) */
function rc_expire_sweep($conn){
    $res = $conn->query("SELECT * FROM recommendations WHERE archived = 0 AND created_at < DATE_SUB(NOW(), INTERVAL validity_hours HOUR) ORDER BY id LIMIT 30");
    if (!$res) return 0;
    $C = rc_cfg($conn); $n = 0;
    while ($r = $res->fetch_assoc()) {
        $id = (int)$r['id'];
        $u = $conn->prepare("UPDATE recommendations SET archived = 1, archived_at = NOW(), status = 'expired', expired_notified = 1 WHERE id = ? AND archived = 0");
        $u->bind_param("i", $id); $u->execute(); $hit = $u->affected_rows === 1; $u->close();
        if (!$hit) continue;
        $msg = $C['t_expired_body']; $by = 'system';
        $i = $conn->prepare("INSERT INTO recommendation_updates (rec_id, kind, message, created_by) VALUES (?, 'expired', ?, ?)"); $i->bind_param("iss", $id, $msg, $by); $i->execute(); $uid = (int)$conn->insert_id; $i->close();
        $mkt = mc_valid($r['market'] ?? '') ? $r['market'] : 'مصر';
        try { rc_dispatch($conn, $id, $uid, $mkt, rc_upd_title($r, 'expired'), [$msg, 'التوصية: ' . rc_title($r) . ' — كانت صالحة ' . rc_valid_label((int)$r['validity_hours'])], ['app' => true], $r['symbol'], false); } catch (Throwable $e) {}
        $n++;
    }
    return $n;
}

/* المستلمين: مشتركين اشتراكهم شغال في سوق التوصية */
function rc_recipients($conn, $market){
    $out = [];
    $res = $conn->query("SELECT DISTINCT LOWER(account_email) e FROM subscribers WHERE archived = 0 AND active = 1");
    while ($r = $res->fetch_assoc()) {
        $e = $r['e']; if (!$e || !hasActiveSubscription($conn, $e)) continue;
        if (function_exists('mc_account_market') && mc_account_market($conn, $e) !== $market) continue;
        $out[] = $e;
    }
    return $out;
}
/* الإرسال: إشعار المنصة فورًا — والإيميل / الواتساب في الطابور (حسب اختيار المحلل + قنوات كل مشترك) */
function rc_dispatch($conn, $recId, $updId, $market, $title, $lines, $channels, $symbol, $push = true, $image = null){
    $body = implode("\n", $lines); $rcpt = rc_recipients($conn, $market); $app = 0; $queued = 0;
    $waOn = np_wa_on($conn);
    $ins = $conn->prepare("INSERT INTO rec_outbox (rec_id, upd_id, account_email, channel) VALUES (?, ?, ?, ?)");
    foreach ($rcpt as $e) {
        $p = np_get($conn, $e);
        if (!empty($channels['app']) && $p['app']) {
            try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)"); $i->bind_param("sssss", $e, $title, $body, $symbol, $market); $i->execute(); $i->close(); $app++; } catch (Throwable $x) {}
        }
        foreach (['email', 'wa'] as $ch) {
            if (empty($channels[$ch]) || !$p[$ch] || ($ch === 'wa' && !$waOn)) continue;
            $ins->bind_param("iiss", $recId, $updId, $e, $ch); $ins->execute(); $queued++;
        }
    }
    $ins->close();
    if ($push && !empty($channels['app']) && function_exists('broadcast_web_push_to_customers')) { try { broadcast_web_push_to_customers($conn, $title, mb_substr($body, 0, 400), '/index.php', $market, $image); } catch (Throwable $x) {} }
    return ['recipients' => count($rcpt), 'app' => $app, 'queued' => $queued];
}
/* الطابور: بيبعت لحد $max رسالة (إيميل / واتساب) في الطلب الواحد */
function rc_pump($conn, $max = 15){
    $res = $conn->query("SELECT o.id, o.rec_id, o.upd_id, o.account_email, o.channel FROM rec_outbox o WHERE o.status = 0 ORDER BY o.id LIMIT " . (int)$max);
    $done = 0; $cache = [];
    while ($o = $res->fetch_assoc()) {
        $key = $o['rec_id'] . '|' . $o['upd_id'];
        if (!isset($cache[$key])) $cache[$key] = rc_message($conn, (int)$o['rec_id'], $o['upd_id'] ? (int)$o['upd_id'] : null);
        [$title, $lines, $rec] = $cache[$key]; $ok = false; $err = '';
        if ($title === null) $err = 'التوصية اتحذفت';
        elseif ($o['channel'] === 'email' && $rec && !$o['upd_id'] && function_exists('griffine_mail')) {   // الإصدار 129: إيميل التوصية الاحترافي
            try { $m = rc_email($conn, $rec); $r = griffine_mail($conn, $o['account_email'], gm_bidi($title), ['text' => $m['text'], 'html' => $m['html'], 'type' => 'recommendation']); $ok = !empty($r['ok']); $err = $r['error'] ?? ''; } catch (Throwable $x) { $err = $x->getMessage(); } }
        elseif ($o['channel'] === 'email' && function_exists('griffine_notify')) { try { $r = griffine_notify($conn, $o['account_email'], $title, $title, $lines, ['label' => 'فتح التوصيات', 'url' => MAIL_SITE_URL . '/index.php'], 'recommendation'); $ok = is_array($r) ? !empty($r['ok']) : (bool)$r; } catch (Throwable $x) { $err = $x->getMessage(); } }
        elseif ($o['channel'] === 'wa') { $ph = np_phone($conn, $o['account_email']); if ($ph !== '') { $r = wa_send_notify($conn, $ph, $title . ' — ' . implode(' | ', $lines) . ' | ' . rc_cfg($conn)['t_wa_link'] . ' ' . MAIL_SITE_URL); $ok = $r['ok']; $err = $r['error'] ?? ''; } else $err = 'مفيش رقم واتساب'; }
        $st = $ok ? 1 : 2; $u = $conn->prepare("UPDATE rec_outbox SET status = ?, sent_at = NOW(), error = ? WHERE id = ?"); $er = mb_substr($err, 0, 250); $u->bind_param("isi", $st, $er, $o['id']); $u->execute(); $u->close();
        $done++;
    }
    $left = (int)$conn->query("SELECT COUNT(*) FROM rec_outbox WHERE status = 0")->fetch_row()[0];
    return ['done' => $done, 'left' => $left];
}
function rc_message($conn, $recId, $updId){
    $st = $conn->prepare("SELECT * FROM recommendations WHERE id = ?"); $st->bind_param("i", $recId); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) return [null, [], null];
    if (!$updId) return [rc_title($r), rc_lines($r), $r];
    $st = $conn->prepare("SELECT * FROM recommendation_updates WHERE id = ?"); $st->bind_param("i", $updId); $st->execute(); $u = $st->get_result()->fetch_assoc(); $st->close();
    if (!$u) return [null, [], null];
    return [rc_upd_title($r, $u['kind']), [$u['message'], 'التوصية الأصلية: ' . strip_tags(rc_title($r))], $r];
}
function rc_upd_title($r, $kind){ return ($kind === 'expired' ? rc_cfg()['t_expired_title'] : (RC_KINDS[$kind] ?? '📝 تحديث')) . ' — ' . ($r['stock_name'] ?? '') . ' (' . ($r['symbol'] ?? '') . ')'; }

/* الإصدار 129: إيميل التوصية الاحترافي (جداول وستايل inline عشان يظهر صح في Gmail / Outlook) */
function rc_email($conn, $r){
    $C = rc_cfg($conn); $e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); $n = fn($v) => mk_num($v);
    $buy = ($r['rec_type'] ?? 'buy') !== 'sell'; $ccy = mk_ccy_ar($r['currency'] ?? rc_ccy($r['market'] ?? 'مصر'));
    $mid = ((float)$r['buy_from'] + (float)$r['buy_to']) / 2; $pc = fn($v) => $mid > 0 ? (($v / $mid - 1) * 100 >= 0 ? '+' : '') . number_format(($v / $mid - 1) * 100, 1) . '%' : '';
    $long = (int)$r['validity_hours'] >= (int)$C['long_hours'];
    $td = 'padding:9px 10px;border-bottom:1px solid #E5E7EB;font-size:14px;'; $th = 'padding:8px 10px;background:#F6F8FB;color:#6B7280;font-size:12px;font-weight:600;text-align:right;';
    $num = fn($v, $c = '#0F172A') => '<span dir="ltr" style="font-weight:700;color:' . $c . ';">' . $e($v) . '</span>';
    $rows = '<tr><td style="' . $td . '">' . $e($buy ? 'منطقة الشراء' : 'منطقة البيع') . '</td><td style="' . $td . '">' . $num($n($r['buy_from']) . ' – ' . $n($r['buy_to'])) . '</td><td style="' . $td . '">' . (!$buy && $r['sell_pct'] ? 'بيع ' . $n($r['sell_pct']) . '%' : '—') . '</td><td style="' . $td . '">—</td></tr>';
    foreach ([1, 2, 3] as $i) if ($r["resistance$i"] !== null && $r["resistance$i"] !== '') {
        $v = (float)$r["resistance$i"];
        $rows .= '<tr><td style="' . $td . '">' . ($buy ? "هدف $i" : "مستوى هبوط $i") . '</td><td style="' . $td . '">' . $num($n($v), $buy ? '#13895A' : '#C63B3B') . '</td><td style="' . $td . '">' . ($buy && $r["resistance{$i}_pct"] !== null ? 'بيع ' . $n($r["resistance{$i}_pct"]) . '%' : '—') . '</td><td style="' . $td . '">' . $num($pc($v), $buy ? '#13895A' : '#C63B3B') . '</td></tr>';
    }
    $multi = !empty($r['stop2']) || !empty($r['stop3']);
    foreach ([1, 2, 3] as $i) if (!empty($r["stop$i"])) {
        $v = (float)$r["stop$i"];
        $rows .= '<tr><td style="' . $td . '">' . ($buy ? 'وقف الخسارة' . ($multi ? " $i" : '') : 'التوصية فاشلة لو عدّى') . '</td><td style="' . $td . '">' . $num($n($v), '#C63B3B') . '</td><td style="' . $td . '">' . ($buy ? 'بيع ' . $n($r["stop{$i}_pct"] ?? 100) . '%' : '—') . '</td><td style="' . $td . '">' . $num($pc($v), '#C63B3B') . '</td></tr>';
    }
    $sec = fn($h, $b) => '<tr><td style="padding:16px 22px;border-top:1px solid #EEF1F5;"><div style="font-size:15px;font-weight:700;color:#0F3D6E;margin:0 0 10px;">' . $e($h) . '</div>' . $b . '</td></tr>';
    $img = fn($u, $alt) => $u ? '<img src="' . $e($u) . '" alt="' . $e($alt) . '" width="596" style="display:block;width:100%;max-width:596px;height:auto;border:1px solid #E5E7EB;border-radius:10px;">' : '';
    $body = $sec('خطة التوصية', '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><th style="' . $th . '">البند</th><th style="' . $th . '">السعر</th><th style="' . $th . '">النسبة من الكمية</th><th style="' . $th . '">من منطقة الدخول</th></tr>' . $rows . '</table>');
    $a = explode(',', (string)($r['attach'] ?? ''));
    $ind = ''; $I = in_array('ind', $a, true) ? json_decode((string)($r['indicators'] ?? ''), true) : null;
    if (is_array($I) && $I) { $cells = ''; foreach ($I as $x) $cells .= '<tr><td style="padding:7px 10px;border:1px solid #E5E7EB;font-size:13.5px;"><b>' . $e($x['l']) . ($x['v'] !== '' ? ' <span dir="ltr">' . $e($x['v']) . '</span>' : '') . '</b>' . ($x['n'] !== '' ? '<br><span style="color:#4B5563;">' . $e($x['n']) . '</span>' : '') . '</td></tr>'; $ind = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px;">' . $cells . '</table>'; }
    if (($u = rc_img_url($r, 'chart')) || $ind) $body .= $sec('الرسم البياني والمؤشرات', $img($u, 'الرسم البياني') . $ind);
    if ($u = rc_img_url($r, 'fib')) $body .= $sec('فيبوناتشي — الأهداف ووقف الخسارة', $img($u, 'فيبوناتشي'));
    if (in_array('ai', $a, true) && trim((string)$r['ai_text']) !== '') $body .= $sec('🤖 رأي بصيرة AI', '<div style="background:#F6F3FF;border:1px solid #E1D8FF;border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.9;color:#1F2937;">' . nl2br($e($r['ai_text'])) . '</div>');
    if (trim((string)$r['note']) !== '') $body .= $sec('📝 ملاحظة المحلل', '<div style="font-size:14px;line-height:1.9;">' . nl2br($e($r['note'])) . '</div>');
    $analyst = $r['analyst_name'] ?: $C['t_team'];
    $html = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:#E9EDF3;font-family:IBM Plex Sans Arabic,Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#0F172A;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EDF3;padding:22px 10px;"><tr><td align="center">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">'
        . '<tr><td style="background:#0F172A;padding:16px 22px;border-bottom:3px solid #C9A227;"><table role="presentation" width="100%"><tr><td style="color:#C9A227;font-weight:800;letter-spacing:3px;font-size:18px;font-family:Arial,sans-serif;" dir="ltr" align="left">GRIFFINE</td><td align="right" style="color:#ffffff;font-size:13px;">' . $e($buy ? 'توصية شراء جديدة' : 'توصية بيع جديدة') . '</td></tr></table></td></tr>'
        . '<tr><td style="padding:18px 22px;"><span style="display:inline-block;background:' . ($buy ? '#E5F5EE;color:#13895A' : '#FBEAEA;color:#C63B3B') . ';font-size:12px;font-weight:700;padding:2px 10px;border-radius:6px;">' . $e($buy ? '📈 توصية شراء' : '📉 توصية بيع') . '</span>'
        . ($long ? ' <span style="display:inline-block;background:#FFF4D6;color:#8A6D10;font-size:12px;font-weight:700;padding:2px 10px;border-radius:6px;">' . $e($C['t_long_term']) . '</span>' : '')
        . '<div style="font-size:21px;font-weight:700;margin:8px 0 2px;">' . $e($r['stock_name']) . ' <span dir="ltr" style="color:#6B7280;font-size:16px;">' . $e($r['symbol']) . '</span></div>'
        . '<div style="color:#6B7280;font-size:13px;">' . $e(($r['market'] ?? 'مصر') . ' · المدة: ' . (RC_TF[$r['timeframe'] ?? 'day'][0] ?? 'يومي') . ' · صالحة ' . rc_valid_label((int)$r['validity_hours'])) . ($r['last_price'] !== null ? ' · آخر سعر <b dir="ltr">' . $e($n($r['last_price'])) . '</b> ' . $e($ccy) : '') . '</div></td></tr>'
        . $body
        . '<tr><td style="padding:12px 22px;border-top:1px solid #EEF1F5;color:#4B5563;font-size:13px;">' . $e($C['t_analyst'] . ': ' . $analyst) . '</td></tr>'
        . '<tr><td align="center" style="padding:8px 22px 22px;"><a href="' . $e(MAIL_SITE_URL . '/index.php') . '" style="display:inline-block;background:#C9A227;color:#1B1B1B;text-decoration:none;font-weight:700;padding:11px 26px;border-radius:10px;font-size:15px;">' . $e($C['t_email_cta']) . '</a></td></tr>'
        . '<tr><td style="background:#F6F8FB;color:#6B7280;font-size:12px;line-height:1.8;padding:14px 22px;">' . $e($C['t_disclaimer']) . '<br>' . $e($C['t_email_foot']) . '</td></tr>'
        . '</table></td></tr></table></body></html>';
    $text = rc_title($r) . "\r\n\r\n" . implode("\r\n", array_merge(rc_lines($r), rc_extra_lines($r))) . "\r\n\r\n" . $C['t_email_cta'] . ': ' . MAIL_SITE_URL . '/index.php';
    return ['html' => $html, 'text' => $text];
}
?>
