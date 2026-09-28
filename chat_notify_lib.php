<?php
/* =====================================================================
   GRIFFINE — chat_notify_lib.php (الإصدار 83) — تخزين إعدادات تنبيهات الشات
   بتتخزّن في جدول ui_customizations (ui_key = 'chat_notify') كـ JSON - نفس جدول استوديو التصميم
   (مفيش جدول جديد) - ولو الجدول مش موجود بترجع القيم الافتراضية والموقع يكمّل عادي.
   ===================================================================== */
const CHAT_NOTIFY_SOUNDS = ['ding', 'pop', 'chime', 'bell', 'none'];

function chat_notify_defaults(){
    return ['icon' => '', 'sound' => 'ding', 'userIcon' => true, 'userSound' => true];
}
function chat_notify_load($conn){
    $cfg = chat_notify_defaults();
    try {
        $st = $conn->prepare("SELECT data_value FROM ui_customizations WHERE ui_key = 'chat_notify'");
        $st->execute();
        $r = $st->get_result()->fetch_assoc(); $st->close();
        $d = $r ? json_decode($r['data_value'], true) : null;
        if (is_array($d)) $cfg = array_merge($cfg, array_intersect_key($d, $cfg));
    } catch (Throwable $e) {}
    if (!in_array($cfg['sound'], CHAT_NOTIFY_SOUNDS, true)) $cfg['sound'] = 'ding';
    $cfg['userIcon'] = (bool)$cfg['userIcon']; $cfg['userSound'] = (bool)$cfg['userSound'];
    return $cfg;
}
function chat_notify_save_cfg($conn, $cfg, $by){
    $json = json_encode($cfg, JSON_UNESCAPED_UNICODE);
    $st = $conn->prepare("INSERT INTO ui_customizations (ui_key, data_value, updated_by) VALUES ('chat_notify', ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_by = VALUES(updated_by)");
    $st->bind_param("ss", $json, $by); $st->execute(); $st->close();
}
// الصورة بتتخزّن file:bg_... (ملفات bg متاحة لأي زائر) ← رابط عرض
function chat_notify_public($cfg){
    $cfg['icon'] = $cfg['icon'] ? upl_url($cfg['icon']) : '';
    return $cfg;
}
?>
