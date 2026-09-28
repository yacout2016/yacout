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
?>
