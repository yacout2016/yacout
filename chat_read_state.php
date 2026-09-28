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

// عمود معيّن موجود في chat_conversation_meta؟ (مرة واحدة لكل عمود في كل طلب)
function chat_meta_has($conn, $col){
    static $cache = [];
    if (isset($cache[$col])) return $cache[$col];
    try {
        $st = $conn->prepare("SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_conversation_meta' AND COLUMN_NAME = ?");
        $st->bind_param("s", $col); $st->execute();
        $cache[$col] = $st->get_result()->num_rows > 0; $st->close();
    } catch (Throwable $e) { $cache[$col] = false; }
    return $cache[$col];
}
function chat_has_read_col($conn){ return chat_meta_has($conn, 'admin_read_at'); }

/* ---------------------------------------------------------------------
   الإصدار 82: رفع الملفات/الصور في الشات
   - مقفول افتراضيًا عند العميل. الأدمن/الموظف بيفتحه لمحادثة معيّنة من شاشة الشات
   - بيتقفل تلقائيًا مع "إنهاء المحادثة" أو الأرشفة أو الحذف
   - لو ملف SQL لسه متشغّلش (العمود مش موجود) بيفضل الرفع مسموح زي الأول (عشان محدش يتعطل)
   --------------------------------------------------------------------- */
function chat_upload_allowed($conn, $visitorKey){
    if (!chat_meta_has($conn, 'allow_upload')) return true;
    $st = $conn->prepare("SELECT allow_upload FROM chat_conversation_meta WHERE visitor_key = ?");
    $st->bind_param("s", $visitorKey); $st->execute();
    $r = $st->get_result()->fetch_assoc(); $st->close();
    return $r && (int)$r['allow_upload'] === 1;
}
function chat_set_upload($conn, $visitorKey, $allow){
    if (!chat_meta_has($conn, 'allow_upload')) return false;
    $v = $allow ? 1 : 0;
    $st = $conn->prepare("INSERT INTO chat_conversation_meta (visitor_key, allow_upload) VALUES (?, ?) ON DUPLICATE KEY UPDATE allow_upload = VALUES(allow_upload)");
    $st->bind_param("si", $visitorKey, $v); $st->execute(); $st->close();
    return true;
}
// حالة المحادثة اللي العميل محتاجها (رفع الملفات مسموح؟ + آخر مرة الأدمن قرا)
function chat_conversation_state($conn, $visitorKey){
    $out = ["allowUpload" => !chat_meta_has($conn, 'allow_upload'), "adminReadAt" => null];
    try {
        $cols = [];
        if (chat_meta_has($conn, 'allow_upload')) $cols[] = 'allow_upload';
        if (chat_has_read_col($conn)) $cols[] = 'admin_read_at';
        if (!$cols) return $out;
        $st = $conn->prepare("SELECT " . implode(',', $cols) . " FROM chat_conversation_meta WHERE visitor_key = ?");
        $st->bind_param("s", $visitorKey); $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        if ($r) {
            if (isset($r['allow_upload'])) $out['allowUpload'] = (int)$r['allow_upload'] === 1;
            if (isset($r['admin_read_at'])) $out['adminReadAt'] = $r['admin_read_at'];
        }
    } catch (Throwable $e) {}
    return $out;
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
               " . (chat_meta_has($conn, 'allow_upload') ? "COALESCE(cm.allow_upload, 0)" : "1") . " AS allow_upload,
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
