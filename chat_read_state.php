<?php
/* =====================================================================
   GRIFFINE — chat_read_state.php (الإصدار 72) — حالة "اتقرت" لمحادثات الشات
   ---------------------------------------------------------------------
   المشكلة القديمة: المحادثة كانت بتتحسب "غير مقروءة" طول ما آخر رسالة فيها من العميل،
   حتى لو الأدمن فتحها وقراها - فالنقطة الحمرا ورقم (1) كانوا بيفضلوا ظاهرين.
   دلوقتي: chat_conversation_meta.admin_read_at = آخر وقت الأدمن فتح فيه المحادثة.
   المحادثة غير مقروءة = فيها رسالة من العميل أحدث من admin_read_at (ومش مؤرشفة/محذوفة).
   لو ملف SQL لسه متشغّلش (العمود مش موجود) الشات بيشتغل بالطريقة القديمة من غير ما يقف.
   ===================================================================== */

// العمود موجود؟ (مرة واحدة في كل طلب)
function chat_has_read_col($conn){
    static $has = null;
    if ($has !== null) return $has;
    try {
        $r = $conn->query("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_conversation_meta' AND COLUMN_NAME = 'admin_read_at'");
        $has = $r && $r->num_rows > 0;
    } catch (Throwable $e) { $has = false; }
    return $has;
}

// تعليم محادثة (أو كل المحادثات) كمقروءة
function chat_mark_read($conn, $visitorKey = null){
    if (!chat_has_read_col($conn)) return false;
    if ($visitorKey === null) {
        // كل المحادثات اللي فيها رسايل
        $conn->query("INSERT INTO chat_conversation_meta (visitor_key, admin_read_at)
            SELECT DISTINCT COALESCE(visitor_id, visitor_email), NOW() FROM chat_messages WHERE COALESCE(visitor_id, visitor_email) IS NOT NULL
            ON DUPLICATE KEY UPDATE admin_read_at = NOW()");
        return true;
    }
    $st = $conn->prepare("INSERT INTO chat_conversation_meta (visitor_key, admin_read_at) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE admin_read_at = NOW()");
    $st->bind_param("s", $visitorKey);
    $st->execute(); $st->close();
    return true;
}

/* استعلام موحّد لكل محادثة (بيستخدمه chat_conversations_list.php و chat_unread_count.php):
   - بيجمّع الرسايل بمفتاح المحادثة ويجيب آخر رسالة بـ MAX(id) - من غير استعلامات فرعية مرتبطة
     (بيشتغل حتى لو MySQL مفعّل فيه ONLY_FULL_GROUP_BY)
   - الأعمدة: conv_key, visitor_id, visitor_email, last_at, last_message, last_sender, last_visitor_at, read_at, archived, deleted, unread */
function chat_conversations_sql($conn, $where){
    $readCol = chat_has_read_col($conn) ? 'cm.admin_read_at' : 'NULL';
    $unread = chat_has_read_col($conn)
        ? "(lm.sender = 'visitor' AND (cm.admin_read_at IS NULL OR t.last_visitor_at > cm.admin_read_at))"
        : "(lm.sender = 'visitor')";
    return "
        SELECT t.conv_key, t.visitor_id, t.visitor_email, t.last_at, t.last_visitor_at,
               lm.message AS last_message, lm.sender AS last_sender,
               $readCol AS read_at,
               COALESCE(cm.archived, 0) AS archived, COALESCE(cm.deleted, 0) AS deleted,
               $unread AS unread
        FROM (
            SELECT COALESCE(visitor_id, visitor_email) AS conv_key,
                   MAX(visitor_id) AS visitor_id, MAX(visitor_email) AS visitor_email,
                   MAX(created_at) AS last_at, MAX(id) AS last_id,
                   MAX(CASE WHEN sender = 'visitor' THEN created_at END) AS last_visitor_at
            FROM chat_messages
            GROUP BY COALESCE(visitor_id, visitor_email)
        ) t
        JOIN chat_messages lm ON lm.id = t.last_id
        LEFT JOIN chat_conversation_meta cm ON cm.visitor_key = t.conv_key
        WHERE $where";
}
?>
