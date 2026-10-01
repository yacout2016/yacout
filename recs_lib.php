<?php
/* =====================================================================
   GRIFFINE — recs_lib.php (الإصدار 128) — «توصية شراء / بيع» للمحللين
   ---------------------------------------------------------------------
   - المستويات حسب المدة (يومي / أسبوعي / شهري / 3 / 6 شهور / سنة): المحوري الكلاسيكي + 3 دعم + 3 مقاومة + ATR + اقتراح أهداف ووقف
   - التوصية: شراء (منطقة شراء + 3 أهداف بنسب بيع + وقف على مرحلة أو مرحلتين)
              بيع (منطقة بيع + نسبة البيع + مستويات هبوط متوقعة + سعر «التوصية فشلت» لو السعر عدّاه لفوق)
   - الإرسال: إشعار على المنصة فوري لكل مشتركين السوق + الإيميل والواتساب في طابور بيتبعت على دفعات (مناسب لـ 1000+ مشترك)
   - رسائل متابعة لنفس التوصية (تحقق هدف / تعديل وقف / إغلاق / ملاحظة)
   ===================================================================== */
require_once __DIR__ . '/basira_lib.php';
require_once __DIR__ . '/markets_core.php';
require_once __DIR__ . '/markets_lib.php';
require_once __DIR__ . '/notify_lib.php';
@include_once __DIR__ . '/mailer.php';

const RC_TF = ['day' => ['يومي', 1, 0.5], 'week' => ['أسبوعي', 5, 1.0], 'month' => ['شهري', 21, 1.5], '3m' => ['3 شهور', 63, 2.0], '6m' => ['6 شهور', 126, 2.5], 'year' => ['سنة', 252, 3.0]];
const RC_VALID = [24, 48, 72, 168, 336, 720, 2160];
const RC_KINDS = ['target' => '🎯 تحقق هدف', 'stop' => '🛑 تعديل وقف الخسارة', 'close' => '✅ إغلاق التوصية', 'note' => '📝 ملاحظة'];

function rc_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW COLUMNS FROM recommendations LIKE 'rec_type'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
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
        foreach ([1, 2] as $i) if (!empty($r["stop$i"])) $s[] = 'وقف الخسارة' . ($i === 2 ? ' 2' : (empty($r['stop2']) ? '' : ' 1')) . ': ' . $n($r["stop$i"]) . ' — بيع ' . $n($r["stop{$i}_pct"] ?? 100) . '%';
        if ($s) $L[] = "🛑 " . implode("\n🛑 ", $s);
    } else {
        $L[] = '💰 البيع من ' . $n($r['buy_from']) . ' إلى ' . $n($r['buy_to']) . ' — بيع ' . $n($r['sell_pct'] ?? 100) . '% من الكمية';
        $t = []; foreach ([1, 2, 3] as $i) if ($r["resistance$i"] !== null && $r["resistance$i"] !== '') $t[] = $n($r["resistance$i"]);
        if ($t) $L[] = '📉 مستويات الهبوط المتوقعة: ' . implode(' ← ', $t);
        if (!empty($r['stop1'])) $L[] = '⚠️ التوصية تعتبر فاشلة لو السعر عدّى ' . $n($r['stop1']) . ' لفوق';
    }
    if (!empty($r['note'])) $L[] = '📝 ملاحظة المحلل: ' . $r['note'];
    $L[] = 'المحلل: ' . ($r['analyst_name'] ?: 'فريق GRIFFINE') . ' — صالحة ' . rc_valid_label((int)($r['validity_hours'] ?? 24));
    $L[] = 'تحليل تعليمي وليس أمر شراء أو بيع — القرار قرارك.';
    return $L;
}
function rc_title($r){ return (($r['rec_type'] ?? 'buy') === 'sell' ? '📉 توصية بيع: ' : '📈 توصية شراء: ') . ($r['stock_name'] ?? '') . ' (' . ($r['symbol'] ?? '') . ')'; }
function rc_valid_label($h){ return [24 => '24 ساعة', 48 => '48 ساعة', 72 => '3 أيام', 168 => 'أسبوع', 336 => 'أسبوعين', 720 => 'شهر', 2160 => '3 شهور'][$h] ?? ($h . ' ساعة'); }

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
function rc_dispatch($conn, $recId, $updId, $market, $title, $lines, $channels, $symbol){
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
    if (!empty($channels['app']) && function_exists('broadcast_web_push_to_customers')) { try { broadcast_web_push_to_customers($conn, $title, mb_substr($body, 0, 400), '/index.php', $market); } catch (Throwable $x) {} }
    return ['recipients' => count($rcpt), 'app' => $app, 'queued' => $queued];
}
/* الطابور: بيبعت لحد $max رسالة (إيميل / واتساب) في الطلب الواحد */
function rc_pump($conn, $max = 15){
    $res = $conn->query("SELECT o.id, o.rec_id, o.upd_id, o.account_email, o.channel FROM rec_outbox o WHERE o.status = 0 ORDER BY o.id LIMIT " . (int)$max);
    $done = 0; $cache = [];
    while ($o = $res->fetch_assoc()) {
        $key = $o['rec_id'] . '|' . $o['upd_id'];
        if (!isset($cache[$key])) $cache[$key] = rc_message($conn, (int)$o['rec_id'], $o['upd_id'] ? (int)$o['upd_id'] : null);
        [$title, $lines] = $cache[$key]; $ok = false; $err = '';
        if ($title === null) $err = 'التوصية اتحذفت';
        elseif ($o['channel'] === 'email' && function_exists('griffine_notify')) { try { $r = griffine_notify($conn, $o['account_email'], $title, $title, $lines, ['label' => 'فتح التوصيات', 'url' => MAIL_SITE_URL . '/index.php'], 'recommendation'); $ok = is_array($r) ? !empty($r['ok']) : (bool)$r; } catch (Throwable $x) { $err = $x->getMessage(); } }
        elseif ($o['channel'] === 'wa') { $ph = np_phone($conn, $o['account_email']); if ($ph !== '') { $r = wa_send_notify($conn, $ph, $title . ' — ' . implode(' | ', $lines)); $ok = $r['ok']; $err = $r['error'] ?? ''; } else $err = 'مفيش رقم واتساب'; }
        $st = $ok ? 1 : 2; $u = $conn->prepare("UPDATE rec_outbox SET status = ?, sent_at = NOW(), error = ? WHERE id = ?"); $er = mb_substr($err, 0, 250); $u->bind_param("isi", $st, $er, $o['id']); $u->execute(); $u->close();
        $done++;
    }
    $left = (int)$conn->query("SELECT COUNT(*) FROM rec_outbox WHERE status = 0")->fetch_row()[0];
    return ['done' => $done, 'left' => $left];
}
function rc_message($conn, $recId, $updId){
    $st = $conn->prepare("SELECT * FROM recommendations WHERE id = ?"); $st->bind_param("i", $recId); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
    if (!$r) return [null, []];
    if (!$updId) return [rc_title($r), rc_lines($r)];
    $st = $conn->prepare("SELECT * FROM recommendation_updates WHERE id = ?"); $st->bind_param("i", $updId); $st->execute(); $u = $st->get_result()->fetch_assoc(); $st->close();
    if (!$u) return [null, []];
    return [rc_upd_title($r, $u['kind']), [$u['message'], 'التوصية الأصلية: ' . strip_tags(rc_title($r))]];
}
function rc_upd_title($r, $kind){ return (RC_KINDS[$kind] ?? '📝 تحديث') . ' — ' . ($r['stock_name'] ?? '') . ' (' . ($r['symbol'] ?? '') . ')'; }
?>
