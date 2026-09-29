<?php
/* =====================================================================
   GRIFFINE — markets_lib.php (الإصدار 88)
   قائمة المتابعة + تنبيهات وصول السعر لمستويات خطة العميل + لقطات قيمة المحفظة اليومية
   ---------------------------------------------------------------------
   فكرة التنبيهات: الخطط (DCA / Grid) بتتحسب في المتصفح، فالمتصفح بيبعت "مستويات التنبيه" لكل خطة
   (سعر الشراء الجاي + هدف البيع) ← alert_targets. السيرفر بيقارنها بآخر سعر (quote_lib) ولما السعر يوصل:
   تنبيه جوه الموقع (user_alerts) + إيميل. كل مستوى بيتنبّه مرة واحدة حتى ما سعره يتغيّر.
   ===================================================================== */
require_once __DIR__ . '/quote_lib.php';

/* الإصدار 91: نصوص الإشعارات من غير انعكاس - أي رمز سهم / رقم / كلمة إنجليزي جوه جملة عربي
   بيتعزل بعلامات اليونيكود (LRI … PDI) فمبيلفّش ولا يقلب ترتيب الجملة (في الموقع والإيميل والشات)،
   وأسماء الخطط والعملات بالعربي بدل DCA / Grid / EGP */
function mk_ltr($s){ return "\u{2066}" . $s . "\u{2069}"; }
function mk_num($v){ $v = (float)$v; return mk_ltr(rtrim(rtrim(number_format($v, 4, '.', ','), '0'), '.')); }
function mk_kind_ar($k){ return $k === 'Grid' ? 'خطة خطوط الشبكة' : 'خطة تعزيز المتوسط'; }
function mk_ccy_ar($c){ $m = ['EGP' => 'جنيه', 'SAR' => 'ريال سعودي', 'AED' => 'درهم إماراتي', 'QAR' => 'ريال قطري', 'KWD' => 'دينار كويتي', 'USD' => 'دولار']; return $m[strtoupper((string)$c)] ?? (string)$c; }

const MK_MARKETS = ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'];
function mk_clean_symbol($s){ $s = strtoupper(trim((string)$s)); return preg_match('/^[A-Z0-9.\-]{1,20}$/', $s) ? $s : null; }
function mk_clean_market($m){ $m = trim((string)$m); return in_array($m, MK_MARKETS, true) ? $m : 'مصر'; }

// الإصدار 97: أعمدة meta + rearmed في alert_targets (بعد تشغيل ALL_SCHEMA_UPDATES.sql)
function mk_targets_v97($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW COLUMNS FROM alert_targets LIKE 'rearmed'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
function mk_money($v){ return mk_ltr(number_format((float)$v, 2, '.', ',')); }

/* نص إشعار مستوى الخطة (الإصدار 97)
   DCA بيع  = الخطة رابحة: بيع كل الكمية على السعر الحالي بيغطي نسبة الربح المطلوبة أو أكتر ← الربح = (السعر − متوسط التكلفة) × الكمية
   DCA شراء = السعر وصل لسعر المستوى التالي: الكمية المطلوبة وقيمتها لتعزيز المتوسط
   Grid     = السعر وصل لحد الشراء / حد البيع */
function mk_target_text($t, $sym, $last, $ccy){
    $m = json_decode((string)($t['meta'] ?? ''), true); if (!is_array($m)) $m = [];
    $price = (float)$t['price']; $S = mk_ltr($sym); $delay = "(الأسعار متأخرة 15 دقيقة)";
    if ($t['plan_kind'] === 'DCA' && $t['side'] === 'sell' && !empty($m['held']) && !empty($m['avg'])) {
        $held = (float)$m['held']; $avg = (float)$m['avg']; $pct = (float)($m['pct'] ?? 0);
        $profit = ($last - $avg) * $held; $pp = $avg > 0 ? ($last - $avg) / $avg * 100 : 0;
        $title = "✅ سهم {$S}: خطة تعزيز المتوسط رابحة الآن";
        $body = "عندك " . mk_num($held) . " سهم من {$S} في خطة تعزيز المتوسط بمتوسط تكلفة " . mk_num($avg) . " {$ccy}.\n"
              . "نسبة الربح المطلوبة " . mk_num($pct) . "% ← سعر الخروج الكلي " . mk_num($price) . " {$ccy}.\n"
              . "السعر الآن " . mk_num($last) . " {$ccy} ← لو بعت كل الكمية: (" . mk_num($last) . " − " . mk_num($avg) . ") × " . mk_num($held) . " = ربح " . mk_money($profit) . " {$ccy} (" . mk_ltr(number_format($pp, 2)) . "%).\n" . $delay;
        return [$title, $body];
    }
    if ($t['plan_kind'] === 'DCA' && $t['side'] === 'buy' && isset($m['qty'])) {
        $held = (float)($m['held'] ?? 0); $qty = (float)$m['qty']; $amount = (float)($m['amount'] ?? $qty * $price);
        $title = "📉 سهم {$S}: وصل لسعر الشراء التالي في خطة تعزيز المتوسط";
        $body = ($held > 0 ? "عندك " . mk_num($held) . " سهم في الخطة" . (!empty($m['avg']) ? " بمتوسط تكلفة " . mk_num($m['avg']) . " {$ccy}" : '') . ".\n" : "لسه مفيش كمية مشتراة في الخطة.\n")
              . "المطلوب شراء " . mk_num($qty) . " سهم بسعر " . mk_num($price) . " {$ccy} بقيمة " . mk_money($amount) . " {$ccy} لتعزيز المتوسط" . (!empty($m['level']) ? " (المستوى " . mk_ltr((int)$m['level']) . ")" : '') . ".\n"
              . "السعر الآن " . mk_num($last) . " {$ccy} ← الشرط متحقق (أقل من أو يساوي سعر الشراء).\n" . $delay;
        return [$title, $body];
    }
    if ($t['plan_kind'] === 'Grid' && $t['side'] === 'buy') {
        $title = "🔲 سهم {$S}: السعر وصل لحد الشراء " . mk_num($price) . " {$ccy}";
        $body = "خطة خطوط الشبكة: السعر الآن " . mk_num($last) . " {$ccy} وصل لحد الشراء " . mk_num($price) . " {$ccy}"
              . (!empty($m['qty']) ? " — الكمية الإرشادية للمستوى " . mk_num($m['qty']) . " سهم" : '') . ".\n" . $delay;
        return [$title, $body];
    }
    if ($t['plan_kind'] === 'Grid' && $t['side'] === 'sell') {
        $title = "🔲 سهم {$S}: السعر وصل لحد البيع " . mk_num($price) . " {$ccy}";
        $body = "خطة خطوط الشبكة: السعر الآن " . mk_num($last) . " {$ccy} وصل لحد البيع " . mk_num($price) . " {$ccy}.\n"
              . (!empty($m['qty']) && !empty($m['buy']) ? "عندك " . mk_num($m['qty']) . " سهم مشتراة على هذا المستوى بسعر " . mk_num($m['buy']) . " ← ربح البيع الآن: (" . mk_num($last) . " − " . mk_num($m['buy']) . ") × " . mk_num($m['qty']) . " = " . mk_money(($last - (float)$m['buy']) * (float)$m['qty']) . " {$ccy}.\n" : '')
              . $delay;
        return [$title, $body];
    }
    // مستويات قديمة من غير بيانات
    $isBuy = $t['side'] === 'buy';
    $title = "🔔 سهم {$S}" . ($isBuy ? ": وصل إلى سعر الشراء التالي" : ": وصل إلى هدف البيع");
    $body = "السعر الحالي: " . mk_num($last) . " {$ccy}.\n" . ($isBuy ? "سعر الشراء" : "هدف البيع") . " في " . mk_kind_ar($t['plan_kind']) . ": " . mk_num($price) . " {$ccy}"
          . ($t['label'] ? " ({$t['label']})" : '') . ".\n" . $delay;
    return [$title, $body];
}

/* بيقارن مستويات تنبيه (لحساب واحد أو لكل الحسابات) بآخر سعر، ويرجّع عدد التنبيهات الجديدة
   الإصدار 97: الإشعار بيتبعت مرة لما الشرط يتحقق، وميتكررش غير لو السعر رجع عكس الشرط (rearmed) وبعدين اتحقق تاني
   وعدّى 24 ساعة على آخر إشعار لنفس المستوى */
function mk_check_targets($conn, $email = null, $maxSymbols = 60){
    $v97 = mk_targets_v97($conn);
    $sql = "SELECT * FROM alert_targets WHERE " . ($v97 ? "(triggered_at IS NULL OR rearmed = 0 OR triggered_at <= NOW() - INTERVAL 24 HOUR)" : "triggered_at IS NULL")
         . ($email !== null ? " AND account_email = ?" : "") . " ORDER BY symbol LIMIT 3000";
    $st = $conn->prepare($sql);
    if ($email !== null) $st->bind_param("s", $email);
    $st->execute(); $res = $st->get_result();
    $bySym = [];
    while ($r = $res->fetch_assoc()) $bySym[$r['symbol'] . '|' . $r['market']][] = $r;
    $st->close();
    $fired = 0; $n = 0;
    foreach ($bySym as $key => $targets) {
        if (++$n > $maxSymbols) break;
        [$sym, $mkt] = explode('|', $key, 2);
        $q = mq_get_quote($sym, $mkt, 'day');
        if (empty($q['success']) || !is_numeric($q['last'] ?? null)) continue;
        $last = (float)$q['last'];
        foreach ($targets as $t) {
            $price = (float)$t['price'];
            $hit = ($t['side'] === 'buy' && $last <= $price) || ($t['side'] === 'sell' && $last >= $price);
            if (!$hit) {
                // السعر رجع عكس الشرط بعد إشعار ← يتسلّح تاني
                if ($v97 && $t['triggered_at'] !== null && (int)$t['rearmed'] === 0) { $u = $conn->prepare("UPDATE alert_targets SET rearmed = 1 WHERE id = ?"); $u->bind_param("i", $t['id']); $u->execute(); $u->close(); }
                continue;
            }
            if ($t['triggered_at'] !== null) {
                if (!$v97 || (int)$t['rearmed'] !== 1 || strtotime($t['triggered_at'] . ' UTC') > time() - 86400) continue;
            }
            $u = $v97 ? $conn->prepare("UPDATE alert_targets SET triggered_at = NOW(), rearmed = 0 WHERE id = ? AND (triggered_at IS NULL OR triggered_at = ?)")
                      : $conn->prepare("UPDATE alert_targets SET triggered_at = NOW() WHERE id = ? AND (triggered_at IS NULL OR triggered_at = ?)");
            $prevT = $t['triggered_at'] ?? ''; $u->bind_param("is", $t['id'], $prevT); $u->execute(); $ok = $u->affected_rows === 1; $u->close();
            if (!$ok) continue;
            $ccy = mk_ccy_ar($q['currency'] ?? 'EGP');
            [$title, $body] = mk_target_text($t, $sym, $last, $ccy);
            $title = gm_bidi($title); $body = gm_bidi($body);
            $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)");
            $i->bind_param("sssss", $t['account_email'], $title, $body, $sym, $mkt); $i->execute(); $i->close();
            try { griffine_notify($conn, $t['account_email'], $title, $title, array_merge(explode("\n", $body), ['افتح ' . mk_ltr('GRIFFINE') . ' لمراجعة خطتك، وسجّل التنفيذ إذا نفّذت.']), ['label' => 'فتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'price_alert'); } catch (Throwable $e) {}
            $fired++;
        }
    }
    return $fired;
}
/* =====================================================================
   الإصدار 89: تنبيهات سعر مخصّصة (العميل بيختار البورصة + العملة + السهم + السعر المطلوب)
   الشرط: السعر ≥ المطلوب (gte) أو ≤ المطلوب (lte)
   التكرار: لحد 3 مرات، وبين كل مرة والتانية من 15 دقيقة لحد 24 ساعة (طول ما الشرط متحقق)
   الإشعار: إيميل + تنبيه في الجرس + رسالة في شات الموقع الخاص بالعميل
   ===================================================================== */
const MK_CCY = ['مصر' => 'EGP', 'السعودية' => 'SAR', 'الإمارات' => 'AED', 'قطر' => 'QAR', 'الكويت' => 'KWD'];
const MK_CHAT_PREFIX = "🔔 تنبيه سعر من \u{2066}GRIFFINE\u{2069}:";
const MK_INTERVALS = [15, 30, 60, 120, 180, 360, 720, 1440];

// معرّف محادثة الشات الخاصة بالحساب (بيتعمل لو مش موجود - نفس طريقة chat_my_id.php)
function mk_user_chat_id($conn, $email){
    try {
        $st = $conn->prepare("SELECT chat_visitor_id FROM users WHERE username = ? LIMIT 1");
        $st->bind_param("s", $email); $st->execute(); $row = $st->get_result()->fetch_assoc(); $st->close();
        if (!$row) return null;
        if (!empty($row['chat_visitor_id'])) return $row['chat_visitor_id'];
        $id = 'u_' . bin2hex(random_bytes(16));
        $up = $conn->prepare("UPDATE users SET chat_visitor_id = ? WHERE username = ?"); $up->bind_param("ss", $id, $email); $up->execute(); $up->close();
        return $id;
    } catch (Throwable $e) { return null; }
}

function mk_check_custom($conn, $email = null, $maxSymbols = 60){
    $sql = "SELECT * FROM custom_alerts WHERE active = 1 AND deleted_at IS NULL AND sent_count < max_repeats
            AND (last_sent_at IS NULL OR last_sent_at <= NOW() - INTERVAL repeat_minutes MINUTE)" . ($email !== null ? " AND account_email = ?" : "") . " ORDER BY symbol LIMIT 2000";
    $st = $conn->prepare($sql);
    if ($email !== null) $st->bind_param("s", $email);
    $st->execute(); $res = $st->get_result();
    $bySym = [];
    while ($r = $res->fetch_assoc()) $bySym[$r['symbol'] . '|' . $r['market']][] = $r;
    $st->close();
    $fired = 0; $n = 0;
    foreach ($bySym as $key => $alerts) {
        if (++$n > $maxSymbols) break;
        [$sym, $mkt] = explode('|', $key, 2);
        $q = mq_get_quote($sym, $mkt, 'day');
        if (empty($q['success']) || !is_numeric($q['last'] ?? null)) continue;
        $last = (float)$q['last'];
        $u = $conn->prepare("UPDATE custom_alerts SET last_price = ?, last_checked_at = NOW() WHERE symbol = ? AND market = ? AND active = 1");
        $u->bind_param("dss", $last, $sym, $mkt); $u->execute(); $u->close();
        foreach ($alerts as $a) {
            $target = (float)$a['target_price'];
            $hit = $a['cond'] === 'lte' ? $last <= $target : $last >= $target;
            if (!$hit) continue;
            $no = (int)$a['sent_count'] + 1; $max = (int)$a['max_repeats'];
            $up = $conn->prepare("UPDATE custom_alerts SET sent_count = ?, last_sent_at = NOW(), active = IF(? >= max_repeats, 0, 1)
                WHERE id = ? AND sent_count = ?");
            $prev = $no - 1; $up->bind_param("iiii", $no, $no, $a['id'], $prev); $up->execute(); $ok = $up->affected_rows === 1; $up->close();
            if (!$ok) continue;
            $ccy = mk_ccy_ar($a['currency'] ?: ($q['currency'] ?? 'EGP'));
            $condTxt = $a['cond'] === 'lte' ? 'أقل من أو يساوي' : 'أكبر من أو يساوي';
            $title = "🔔 سهم " . mk_ltr($sym) . ": وصل إلى السعر الذي حددته";
            $body = "السعر الحالي: " . mk_num($last) . " {$ccy}.\n"
                  . "السعر الذي حددته: " . mk_num($target) . " {$ccy} (الشرط: {$condTxt}).\n"
                  . "التذكير رقم " . mk_ltr($no) . " من " . mk_ltr($max) . "."
                  . ($a['note'] ? "\nملاحظتك: " . $a['note'] : '') . "\n(الأسعار متأخرة 15 دقيقة)";
            $title = gm_bidi($title); $body = gm_bidi($body);
            try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)");
                $i->bind_param("sssss", $a['account_email'], $title, $body, $sym, $mkt); $i->execute(); $i->close(); } catch (Throwable $e) {}
            try { $vid = mk_user_chat_id($conn, $a['account_email']);
                if ($vid) { $msg = gm_bidi(MK_CHAT_PREFIX . "\n" . $body); $c = $conn->prepare("INSERT INTO chat_messages (visitor_id, visitor_email, sender, message) VALUES (?, ?, 'admin', ?)");
                    $c->bind_param("sss", $vid, $a['account_email'], $msg); $c->execute(); $c->close(); } } catch (Throwable $e) {}
            try { griffine_notify($conn, $a['account_email'], $title, $title, array_merge(explode("\n", $body), ['يمكنك إدارة تنبيهاتك من شاشة «تنبيهات الأسعار».']), ['label' => 'فتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'price_alert'); } catch (Throwable $e) {}
            $fired++;
        }
    }
    return $fired;
}
?>
