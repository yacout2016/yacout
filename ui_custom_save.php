<?php
/* =====================================================================
   GRIFFINE — ui_custom_save.php (الإصدار 72)
   ---------------------------------------------------------------------
   حفظ تخصيصات استوديو التصميم - للأدمن بصلاحية "تنسيق الموقع" (edit_site_design) بس.
   المدخلات (POST):
     key    = theme | overrides
     value  = JSON
   كل قيمة بتتنضّف هنا قبل الحفظ (حتى لو الواجهة نضّفتها) لأن التنسيقات دي بتظهر لكل الزوار:
     - الألوان لازم #RRGGBB
     - الخطوط من قائمة مسموحة بس
     - خصائص التنسيق من قائمة مسموحة، والقيم من غير أي رموز خطرة ( < { } ; @ \ url( )
     - النصوص بتتعرض كنص عادي (مش HTML) في الواجهة
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

// ---------------------------------------------------------------------
// 1) الصلاحيات
// ---------------------------------------------------------------------
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'edit_site_design');
requireCsrf();

// ---------------------------------------------------------------------
// 2) القوائم المسموحة (لازم تطابق studio.js)
// ---------------------------------------------------------------------
$ALLOWED_FONTS = ['', 'IBM Plex Sans Arabic', 'Noto Kufi Arabic', 'Cairo', 'Tajawal', 'Almarai', 'Readex Pro', 'Changa', 'El Messiri', 'Tahoma', 'Arial'];
$ALLOWED_PROPS = ['color', 'background-color', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-align',
                  'text-decoration', 'letter-spacing', 'line-height', 'padding', 'border-radius', 'border-color', 'display', 'opacity'];
$MAX_BYTES = 400000;   // أقصى حجم للتعديلات كلها
$MAX_ITEMS = 3000;     // أقصى عدد تعديلات في كل نوع

$key = trim($_POST['key'] ?? '');
$raw = $_POST['value'] ?? '';
if (!in_array($key, ['theme', 'overrides'], true)) { echo json_encode(["success" => false, "message" => "مفتاح غير معروف."]); exit(); }
if (strlen($raw) > $MAX_BYTES) { echo json_encode(["success" => false, "message" => "التعديلات كتير جدًا - احذف شوية منها."]); exit(); }
$data = json_decode($raw, true);
if ($raw !== 'null' && !is_array($data)) { echo json_encode(["success" => false, "message" => "بيانات غير صحيحة."]); exit(); }

// ---------------------------------------------------------------------
// 3) دوال التنضيف
// ---------------------------------------------------------------------
function uc_hex($v){ $v = trim((string)$v); return preg_match('/^#[0-9a-fA-F]{6}$/', $v) ? strtoupper($v) : ''; }
function uc_int($v, $min, $max, $def){ $n = intval($v); return ($n < $min || $n > $max) ? $def : $n; }
function uc_text($v, $max){
    $v = (string)$v;
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);   // حروف تحكم
    return mb_substr($v, 0, $max);
}
function uc_screen($v){ $v = (string)$v; return preg_match('/^(\*|[A-Za-z0-9_]{1,60})$/', $v) ? $v : null; }
function uc_selector($v){
    $v = trim((string)$v);
    if ($v === '' || strlen($v) > 400) return null;
    return preg_match('/^[A-Za-z0-9_\-#.:() >\[\]="]+$/', $v) ? $v : null;
}
function uc_css_value($prop, $v){
    $v = trim((string)$v);
    if ($v === '' || strlen($v) > 80) return null;
    if (preg_match('/[<>{};@\\\\]|url\s*\(|expression|javascript/i', $v)) return null;
    if ($prop === 'display') return $v === 'none' ? 'none' : null;
    if (in_array($prop, ['color', 'background-color', 'border-color'], true)) return preg_match('/^(#[0-9a-fA-F]{3,8}|transparent)$/', $v) ? $v : null;
    return preg_match('/^[#A-Za-z0-9 .,%()\'"\-]+$/u', $v) ? $v : null;
}

// ---------------------------------------------------------------------
// 4) تنضيف الثيم
// ---------------------------------------------------------------------
function uc_clean_theme($t, $fonts){
    if (!is_array($t)) return null;
    return [
        "preset"      => preg_match('/^[a-z0-9_-]{1,30}$/', $t['preset'] ?? '') ? $t['preset'] : 'custom',
        "primary"     => uc_hex($t['primary'] ?? ''),
        "ink"         => uc_hex($t['ink'] ?? ''),
        "bg"          => uc_hex($t['bg'] ?? ''),
        "surface"     => uc_hex($t['surface'] ?? ''),
        "text"        => uc_hex($t['text'] ?? ''),
        "font"        => in_array($t['font'] ?? '', $fonts, true) ? $t['font'] : '',
        "scale"       => uc_int($t['scale'] ?? 100, 80, 130, 100),
        "radius"      => uc_int($t['radius'] ?? 18, 0, 32, 18),
        "buttons"     => in_array($t['buttons'] ?? '', ['filled', 'soft', 'outline'], true) ? $t['buttons'] : 'filled',
        "tableNowrap" => !isset($t['tableNowrap']) || !empty($t['tableNowrap']),
    ];
}

// ---------------------------------------------------------------------
// 5) تنضيف تعديلات الشاشات
// ---------------------------------------------------------------------
function uc_clean_overrides($o, $props, $fonts, $maxItems){
    if (!is_array($o)) return null;
    $out = ["v" => 1, "texts" => [], "elTexts" => [], "styles" => []];

    // أ) قاموس النصوص: كلمة ← كلمة (في شاشة أو في كل الموقع)
    foreach (array_slice((array)($o['texts'] ?? []), 0, $maxItems) as $r) {
        if (!is_array($r)) continue;
        $screen = uc_screen($r['screen'] ?? '*'); $from = trim(uc_text($r['from'] ?? '', 500));
        if ($screen === null || $from === '') continue;
        $out['texts'][] = ["screen" => $screen, "from" => $from, "to" => uc_text($r['to'] ?? '', 500)];
    }
    // ب) نص عنصر واحد بعينه
    foreach (array_slice((array)($o['elTexts'] ?? []), 0, $maxItems) as $r) {
        if (!is_array($r)) continue;
        $screen = uc_screen($r['screen'] ?? '*'); $sel = uc_selector($r['sel'] ?? '');
        if ($screen === null || $sel === null) continue;
        $out['elTexts'][] = ["screen" => $screen, "sel" => $sel, "text" => uc_text($r['text'] ?? '', 500)];
    }
    // ج) تنسيق عنصر
    foreach (array_slice((array)($o['styles'] ?? []), 0, $maxItems) as $r) {
        if (!is_array($r) || !is_array($r['css'] ?? null)) continue;
        $screen = uc_screen($r['screen'] ?? '*'); $sel = uc_selector($r['sel'] ?? '');
        if ($screen === null || $sel === null) continue;
        $css = [];
        foreach ($r['css'] as $p => $v) {
            if (!in_array($p, $props, true)) continue;
            if ($p === 'font-family') { if (in_array($v, $fonts, true) && $v !== '') $css[$p] = $v; continue; }
            $clean = uc_css_value($p, $v);
            if ($clean !== null) $css[$p] = $clean;
        }
        if ($css) $out['styles'][] = ["screen" => $screen, "sel" => $sel, "css" => $css, "label" => uc_text($r['label'] ?? '', 80)];
    }
    return $out;
}

$clean = ($key === 'theme') ? uc_clean_theme($data, $ALLOWED_FONTS) : uc_clean_overrides($data, $ALLOWED_PROPS, $ALLOWED_FONTS, $MAX_ITEMS);

// ---------------------------------------------------------------------
// 6) الحفظ (null = مسح التخصيص والرجوع للشكل الأصلي)
// ---------------------------------------------------------------------
try {
    if ($clean === null) {
        $stmt = $conn->prepare("DELETE FROM ui_customizations WHERE ui_key = ?");
        $stmt->bind_param("s", $key);
    } else {
        $json = json_encode($clean, JSON_UNESCAPED_UNICODE);
        $by = $_SESSION['user_email'];
        $stmt = $conn->prepare("INSERT INTO ui_customizations (ui_key, data_value, updated_by) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_by = VALUES(updated_by)");
        $stmt->bind_param("sss", $key, $json, $by);
    }
    $stmt->execute();
    $stmt->close();
    echo json_encode(["success" => true, "value" => $clean], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('GRIFFINE ui_custom_save: ' . $e->getMessage());
    echo json_encode(["success" => false, "message" => "تعذّر الحفظ - اتأكد إنك شغّلت ملف ALL_SCHEMA_UPDATES.sql (جدول ui_customizations)."]);
}
?>
