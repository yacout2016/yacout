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

const MK_MARKETS = ['مصر', 'السعودية', 'الإمارات', 'قطر', 'الكويت'];
function mk_clean_symbol($s){ $s = strtoupper(trim((string)$s)); return preg_match('/^[A-Z0-9.\-]{1,20}$/', $s) ? $s : null; }
function mk_clean_market($m){ $m = trim((string)$m); return in_array($m, MK_MARKETS, true) ? $m : 'مصر'; }

// بيقارن مستويات تنبيه (لحساب واحد أو لكل الحسابات) بآخر سعر، ويرجّع عدد التنبيهات الجديدة
function mk_check_targets($conn, $email = null, $maxSymbols = 60){
    $sql = "SELECT * FROM alert_targets WHERE triggered_at IS NULL" . ($email !== null ? " AND account_email = ?" : "") . " ORDER BY symbol LIMIT 2000";
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
        if (empty($q['success'])) continue;
        $last = (float)$q['last'];
        foreach ($targets as $t) {
            $price = (float)$t['price'];
            $hit = ($t['side'] === 'buy' && $last <= $price) || ($t['side'] === 'sell' && $last >= $price);
            if (!$hit) continue;
            $u = $conn->prepare("UPDATE alert_targets SET triggered_at = NOW() WHERE id = ? AND triggered_at IS NULL");
            $u->bind_param("i", $t['id']); $u->execute(); $ok = $u->affected_rows === 1; $u->close();
            if (!$ok) continue;
            $sideTxt = $t['side'] === 'buy' ? 'وصل لسعر الشراء التالي' : 'وصل لهدف البيع';
            $title = "🔔 {$sym}: {$sideTxt}";
            $body = "السعر الآن {$last} " . ($q['currency'] ?? '') . " — المستوى في خطتك ({$t['plan_kind']}) {$price}." . ($t['label'] ? ' ' . $t['label'] : '') . ' (الأسعار متأخرة 15 دقيقة)';
            $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)");
            $i->bind_param("sssss", $t['account_email'], $title, $body, $sym, $mkt); $i->execute(); $i->close();
            try { griffine_notify($conn, $t['account_email'], $title, $title, [$body, 'افتح GRIFFINE لمراجعة خطتك وتسجيل التنفيذ لو نفّذت.'], ['label' => 'فتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'price_alert'); } catch (Throwable $e) {}
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
const MK_CHAT_PREFIX = '🔔 تنبيه سعر GRIFFINE:';
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
            $ccy = $a['currency'] ?: ($q['currency'] ?? '');
            $condTxt = $a['cond'] === 'lte' ? 'أقل من أو يساوي' : 'أكبر من أو يساوي';
            $title = "🔔 {$sym}: السعر وصل للرقم المطلوب";
            $body = "سعر {$sym} الآن {$last} {$ccy} — وهو {$condTxt} السعر الذي حددته ({$target} {$ccy}). تذكير {$no} من {$max}." . ($a['note'] ? ' ملاحظتك: ' . $a['note'] : '') . ' (الأسعار متأخرة 15 دقيقة)';
            try { $i = $conn->prepare("INSERT INTO user_alerts (account_email, title, body, symbol, market) VALUES (?, ?, ?, ?, ?)");
                $i->bind_param("sssss", $a['account_email'], $title, $body, $sym, $mkt); $i->execute(); $i->close(); } catch (Throwable $e) {}
            try { $vid = mk_user_chat_id($conn, $a['account_email']);
                if ($vid) { $msg = MK_CHAT_PREFIX . "\n" . $body; $c = $conn->prepare("INSERT INTO chat_messages (visitor_id, visitor_email, sender, message) VALUES (?, ?, 'admin', ?)");
                    $c->bind_param("sss", $vid, $a['account_email'], $msg); $c->execute(); $c->close(); } } catch (Throwable $e) {}
            try { griffine_notify($conn, $a['account_email'], $title, $title, [$body, 'يمكنك إدارة تنبيهاتك من شاشة «تنبيهات الأسعار».'], ['label' => 'فتح GRIFFINE', 'url' => MAIL_SITE_URL . '/index.php'], 'price_alert'); } catch (Throwable $e) {}
            $fired++;
        }
    }
    return $fired;
}
?>
