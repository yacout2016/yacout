<?php
/* =====================================================================
   GRIFFINE — chat_faq_lib.php (الإصدار 89) — المساعد الذكي في الشات
   ---------------------------------------------------------------------
   الأدمن بيضيف أسئلة شائعة (سؤال + كلمات مفتاحية + إجابة) من لوحة التحكم.
   لما العميل يكتب رسالة: لو فيها كلمة مفتاحية أو شبه سؤال معروف ← المساعد بيرد فورًا
   (برسالة واضح إنها رد تلقائي) - والمحادثة بتفضل ظاهرة لفريق الدعم زي الأول.
   - لو موظف رد في المحادثة آخر 15 دقيقة ← المساعد بيسكت (فيه إنسان بيتابع)
   - العميل يكتب «موظف» ← بيتحوّل لفريق الدعم برسالة تأكيد
   ===================================================================== */
require_once __DIR__ . '/security_lib.php';

const FAQ_BOT_PREFIX = '🤖 مساعد GRIFFINE:';

function faq_table_ready($conn){
    static $r = null; if ($r !== null) return $r;
    try { $x = $conn->query("SHOW TABLES LIKE 'chat_faq'"); $r = $x && $x->num_rows > 0; } catch (Throwable $e) { $r = false; }
    return $r;
}
// توحيد الكتابة العربية: الهمزات والتاء المربوطة والألف المقصورة والتشكيل والتطويل
function faq_norm($t){
    $t = mb_strtolower((string)$t, 'UTF-8');
    $t = preg_replace('/[\x{064B}-\x{0652}\x{0640}]/u', '', $t);
    $t = strtr($t, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ة' => 'ه', 'ى' => 'ي', 'ؤ' => 'و', 'ئ' => 'ي']);
    $t = preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', $t);
    return trim(preg_replace('/\s+/u', ' ', $t));
}
function faq_tokens($t){
    static $stop = ['في','من','عن','علي','الي','هل','ما','ماذا','كيف','ازاي','انا','انت','هو','هي','او','و','يا','لو','ان','كم','اي','ايه','مع','هذا','هذه','ده','دي','عايز','اريد','ممكن'];
    $out = [];
    foreach (explode(' ', faq_norm($t)) as $w) {
        if (mb_strlen($w) < 2 || in_array($w, $stop, true)) continue;
        if (mb_strlen($w) > 4 && mb_substr($w, 0, 2) === 'ال') $w = mb_substr($w, 2);   // "الاشتراك" = "اشتراك"
        $out[$w] = true;
    }
    return array_keys($out);
}
function faq_is_handoff($text){ return (bool)preg_match('/(موظف|خدمه العملاء|خدمة العملاء|الدعم الفني|شخص حقيقي|بشري|اكلم حد|أكلم حد)/u', $text); }

// أفضل سؤال مطابق (أو null)
function faq_match($conn, $text){
    if (!faq_table_ready($conn)) return null;
    $msg = faq_norm($text); if ($msg === '' || mb_strlen($msg) > 400) return null;
    $mt = faq_tokens($text); if (!$mt) return null;
    $best = null; $bestScore = 0;
    $res = $conn->query("SELECT id, question, keywords, answer FROM chat_faq WHERE active = 1 ORDER BY sort_order, id LIMIT 300");
    while ($r = $res->fetch_assoc()) {
        $score = 0;
        foreach (preg_split('/[,،\n]+/u', (string)$r['keywords']) as $k) {
            $k = faq_norm($k); if ($k === '') continue;
            if (preg_match('/(^|\s)' . preg_quote($k, '/') . '/u', $msg)) $score += 2 + mb_substr_count($k, ' ');
        }
        $qt = faq_tokens($r['question']);
        if ($qt) { $hit = count(array_intersect($qt, $mt)); $score += 3 * $hit / max(count($qt), 1); }
        if ($score > $bestScore) { $bestScore = $score; $best = $r; }
    }
    return $bestScore >= 2 ? $best : null;
}

// بيتنادى بعد حفظ رسالة العميل - بيرجّع true لو المساعد رد
function faq_auto_reply($conn, $visitorId, $text){
    try {
        if (!site_config_on($conn, 'chat_bot') || !faq_table_ready($conn) || trim($text) === '') return false;
        // موظف رد آخر 15 دقيقة ← إنسان بيتابع المحادثة
        $st = $conn->prepare("SELECT message, created_at FROM chat_messages WHERE visitor_id = ? AND sender = 'admin' AND created_at > NOW() - INTERVAL 15 MINUTE ORDER BY id DESC");
        $st->bind_param("s", $visitorId); $st->execute(); $res = $st->get_result();
        $recentBot = [];
        while ($r = $res->fetch_assoc()) {
            if (mb_strpos((string)$r['message'], '🔔 تنبيه سعر') === 0) continue;   // تنبيه سعر تلقائي - مش موظف
            if (mb_strpos((string)$r['message'], FAQ_BOT_PREFIX) !== 0) { $st->close(); return false; }
            $recentBot[] = (string)$r['message'];
        }
        $st->close();
        if (faq_is_handoff($text)) {
            foreach ($recentBot as $m) if (mb_strpos($m, 'حوّلت محادثتك') !== false) return false;   // اتحوّل خلاص
            $reply = FAQ_BOT_PREFIX . "\nحوّلت محادثتك لفريق الدعم 👍 سيرد عليك أحد الموظفين هنا في أقرب وقت.";
        } else {
            $f = faq_match($conn, $text);
            if (!$f) return false;
            $reply = FAQ_BOT_PREFIX . "\n" . trim($f['answer']) . "\n\n— رد تلقائي. لو محتاج موظف اكتب «موظف».";
            foreach ($recentBot as $m) if ($m === $reply) return false;   // نفس الإجابة من شوية - منكررهاش
            $u = $conn->prepare("UPDATE chat_faq SET hits = hits + 1 WHERE id = ?"); $u->bind_param("i", $f['id']); $u->execute(); $u->close();
        }
        $i = $conn->prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'admin', ?)");
        $i->bind_param("ss", $visitorId, $reply); $i->execute(); $i->close();
        return true;
    } catch (Throwable $e) { error_log('GRIFFINE faq_auto_reply: ' . $e->getMessage()); return false; }
}
?>
