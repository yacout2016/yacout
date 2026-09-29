<?php
require_once __DIR__ . '/symbols_lib.php';
/* =====================================================================
   تخزين خطط العملاء (DCA / Grid) - كل سهم في صف مستقل في جدول user_plans
   - كل صف ليه رقم نسخة (version) بيزيد مع كل تعديل
   - الحذف "ناعم" (deleted = 1) عشان جهاز تاني قديم ميرجّعش سهم اتمسح
   - نسخة كاملة من الخطط بتتكتب كمان في user_data_store القديم (احتياطي)
   - لو جدول user_plans غير موجود بعد (ملف SQL ماتشغّلش) بيرجع للطريقة القديمة تلقائيًا
   ===================================================================== */

function plans_table_ready($conn){
    static $ready = null;
    if ($ready !== null) return $ready;
    $r = @$conn->query("SHOW TABLES LIKE 'user_plans'");
    $ready = ($r && $r->num_rows > 0);
    return $ready;
}

function plans_legacy_get($conn, $email, $key){
    $stmt = $conn->prepare("SELECT data_value FROM user_data_store WHERE account_email = ? AND data_key = ? LIMIT 1");
    $stmt->bind_param("ss", $email, $key);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? $row['data_value'] : null;
}

function plans_legacy_put($conn, $email, $key, $jsonValue){
    $stmt = $conn->prepare("INSERT INTO user_data_store (account_email, data_key, data_value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_value = VALUES(data_value)");
    $stmt->bind_param("sss", $email, $key, $jsonValue);
    $stmt->execute();
    $stmt->close();
}

// أول مرة لكل حساب: بننقل الخطط من الصف القديم (JSON واحد) لصفوف مستقلة
function plans_migrate_if_needed($conn, $email, $key){
    $stmt = $conn->prepare("SELECT COUNT(*) c FROM user_plans WHERE account_email = ? AND plan_type = ?");
    $stmt->bind_param("ss", $email, $key);
    $stmt->execute();
    $c = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();
    if ($c > 0) return;
    $legacy = plans_legacy_get($conn, $email, $key);
    if ($legacy === null) return;
    $map = json_decode($legacy);
    if (!is_object($map)) return;
    $ins = $conn->prepare("INSERT IGNORE INTO user_plans (account_email, plan_type, symbol, data_value, version) VALUES (?, ?, ?, ?, 1)");
    foreach (get_object_vars($map) as $sym => $data) {
        $sym = (string)$sym;
        if ($sym === '' || strlen($sym) > 64) continue;
        // الإصدار 100: رمز اتمسح نهائي (مش موجود في البورصة) مبيرجعش من التخزين القديم
        if (function_exists('sym_is_banned') && !(is_object($data) && isset($data->listed) && $data->listed === false)
            && sym_is_banned($conn, $sym, is_object($data) && isset($data->market) ? $data->market : 'مصر')) continue;
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        $ins->bind_param("ssss", $email, $key, $sym, $json);
        $ins->execute();
    }
    $ins->close();
}

function plans_read_rows($conn, $email, $key, $forUpdate = false){
    $sql = "SELECT symbol, data_value, version, deleted FROM user_plans WHERE account_email = ? AND plan_type = ?" . ($forUpdate ? " FOR UPDATE" : "");
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $email, $key);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[$r['symbol']] = $r;
    $stmt->close();
    return $rows;
}

// بيرجع: value (نص JSON للخطط الحالية) + versions (رقم نسخة كل سهم) + deleted (الأسهم المحذوفة)
function plans_get($conn, $email, $key){
    if (!plans_table_ready($conn)) {
        return ["value" => plans_legacy_get($conn, $email, $key), "versions" => new stdClass(), "deleted" => [], "mode" => "legacy"];
    }
    plans_migrate_if_needed($conn, $email, $key);
    $rows = plans_read_rows($conn, $email, $key);
    // stdClass (مش array) عشان {} يفضل {} ورموز زي "2222" تفضل مفاتيح نصية
    $map = new stdClass(); $versions = new stdClass(); $deleted = [];
    foreach ($rows as $sym => $r) {
        if ((int)$r['deleted'] === 1) { $deleted[] = (string)$sym; continue; }
        $map->{(string)$sym} = json_decode($r['data_value']);
        $versions->{(string)$sym} = (int)$r['version'];
    }
    return [
        "value" => empty($rows) ? null : json_encode($map, JSON_UNESCAPED_UNICODE),
        "versions" => $versions,
        "deleted" => $deleted,
        "mode" => "rows",
    ];
}

/* الحفظ:
   - أي سهم في الطلب اتغير → نسخة جديدة
   - سهم موجود على السيرفر ومش في الطلب:
       * لو الجهاز كان شايفه وقت آخر قراءة (موجود في base) → المستخدم مسحه فعلًا → حذف ناعم
       * لو الجهاز مكانش شايفه (اتضاف من جهاز تاني بعدها) → نسيبه كما هو */
function plans_save($conn, $email, $key, $map, $base){
    if (!plans_table_ready($conn)) {
        plans_legacy_put($conn, $email, $key, json_encode($map, JSON_UNESCAPED_UNICODE));
        return ["versions" => new stdClass(), "deleted" => [], "mode" => "legacy"];
    }
    plans_migrate_if_needed($conn, $email, $key);
    $conn->begin_transaction();
    try {
        $rows = plans_read_rows($conn, $email, $key, true);
        $ins = $conn->prepare("INSERT INTO user_plans (account_email, plan_type, symbol, data_value, version, deleted) VALUES (?, ?, ?, ?, 1, 0)");
        $upd = $conn->prepare("UPDATE user_plans SET data_value = ?, version = version + 1, deleted = 0 WHERE account_email = ? AND plan_type = ? AND symbol = ?");
        $del = $conn->prepare("UPDATE user_plans SET deleted = 1, version = version + 1 WHERE account_email = ? AND plan_type = ? AND symbol = ?");

        $incoming = get_object_vars($map);
        foreach ($incoming as $sym => $data) {
            $sym = (string)$sym;
            if ($sym === '' || strlen($sym) > 64) continue;
            // الإصدار 98: رمز اتمسح لأنه مش موجود في البورصة ← مبيرجعش تاني حتى لو جهاز قديم بعته
            if (function_exists('sym_is_banned') && !(is_object($data) && isset($data->listed) && $data->listed === false)
                && sym_is_banned($conn, $sym, is_object($data) && isset($data->market) ? $data->market : 'مصر')) continue;
            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            if (!isset($rows[$sym])) {
                $ins->bind_param("ssss", $email, $key, $sym, $json);
                $ins->execute();
            } else {
                $old = $rows[$sym];
                $same = ((int)$old['deleted'] === 0) && (json_encode(json_decode($old['data_value']), JSON_UNESCAPED_UNICODE) === $json);
                if (!$same) {
                    $upd->bind_param("ssss", $json, $email, $key, $sym);
                    $upd->execute();
                }
            }
        }
        foreach ($rows as $sym => $r) {
            $sym = (string)$sym;
            if ((int)$r['deleted'] === 1 || array_key_exists($sym, $incoming)) continue;
            if (is_object($base) && property_exists($base, $sym)) {
                // الإصدار 89: سلة المحذوفات - نسخة من الخطة قبل حذفها (العميل يقدر يرجّعها)
                if (function_exists('trash_put')) {
                    try { trash_put($conn, 'plan', ($key === 'grid_plans' ? 'خطة خطوط الشبكة: ' : 'خطة تعزيز المتوسط: ') . $sym,
                        ['user_plans' => [['account_email' => $email, 'plan_type' => $key, 'symbol' => $sym, 'data_value' => $r['data_value'], 'version' => $r['version'], 'deleted' => 0]]], [], $email); } catch (Throwable $e) {}
                }
                $del->bind_param("sss", $email, $key, $sym);
                $del->execute();
            }
        }
        $ins->close(); $upd->close(); $del->close();
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        throw $e;
    }

    // النسخة الاحتياطية الكاملة في الجدول القديم (بتخلّي الرجوع لأي إصدار قديم آمن)
    $state = plans_get($conn, $email, $key);
    plans_legacy_put($conn, $email, $key, $state['value'] === null ? '{}' : $state['value']);
    return ["versions" => $state['versions'], "deleted" => $state['deleted'], "mode" => "rows"];
}
?>
