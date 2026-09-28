<?php
header('Content-Type: application/json');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';

if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "غير مصرح لك."]);
    exit();
}
requirePermission($conn, 'edit_site_design');
requireCsrf();

// خطوط عربية آمنة بس مسموح بيها - القائمة دي مطابقة تمامًا لقائمة الاختيار في الواجهة
$allowedFonts = ['', 'Cairo', 'Tajawal', 'Almarai', 'Arial', 'Georgia', 'Tahoma'];

$key = trim($_POST['key'] ?? '');
$value = $_POST['value'] ?? '';

$hexColorOk = function($v){ return $v === '' || preg_match('/^#[0-9a-fA-F]{6}$/', $v); };

switch ($key) {
    case 'announcement_enabled':
        $value = ($value == '1' || $value === 'true') ? '1' : '0';
        break;
    case 'announcement_text':
        $value = mb_substr(trim($value), 0, 300);
        break;
    case 'bg_color':
    case 'text_color':
    case 'accent_color':
        $value = trim($value);
        if (!$hexColorOk($value)) {
            echo json_encode(["success" => false, "message" => "لون غير صحيح - لازم يكون بصيغة #RRGGBB."]);
            exit();
        }
        break;
    case 'font_family':
        $value = trim($value);
        if (!in_array($value, $allowedFonts, true)) {
            echo json_encode(["success" => false, "message" => "نوع خط غير مسموح."]);
            exit();
        }
        break;
    case 'font_weight':
        $value = trim($value);
        if (!in_array($value, ['', '400', '500', '600', '700'], true)) {
            echo json_encode(["success" => false, "message" => "سماكة خط غير مسموحة."]);
            exit();
        }
        break;
    case 'font_size_base':
        $intVal = intval($value);
        if ($intVal < 12 || $intVal > 22) {
            echo json_encode(["success" => false, "message" => "حجم الخط لازم يكون بين 12 و22."]);
            exit();
        }
        $value = (string)$intVal;
        break;
    case 'hero_banner_type':
        $value = trim($value);
        if (!in_array($value, ['none', 'image', 'video'], true)) {
            echo json_encode(["success" => false, "message" => "نوع بانر غير معروف."]);
            exit();
        }
        break;
    case 'hero_banner_url':
        $value = trim($value);
        if ($value !== '' && !preg_match('#^https?://#i', $value)) {
            echo json_encode(["success" => false, "message" => "رابط البانر لازم يبدأ بـ http:// أو https://"]);
            exit();
        }
        $value = mb_substr($value, 0, 500);
        break;
    case 'hero_title':
        $value = mb_substr(trim($value), 0, 120);
        break;
    case 'hero_subtitle':
        $value = mb_substr(trim($value), 0, 200);
        break;
    case 'custom_buttons':
        $decoded = json_decode($value, true);
        if (!is_array($decoded) || count($decoded) > 6) {
            echo json_encode(["success" => false, "message" => "بيانات الأزرار غير صحيحة (حد أقصى 6 أزرار)."]);
            exit();
        }
        $clean = [];
        foreach ($decoded as $btn) {
            if (!is_array($btn)) continue;
            $label = mb_substr(trim($btn['label'] ?? ''), 0, 40);
            $type = trim($btn['type'] ?? '');
            $val = trim($btn['value'] ?? '');
            if ($label === '' || $val === '') continue;
            if (!in_array($type, ['whatsapp', 'phone', 'email', 'url'], true)) continue;
            if ($type === 'email' && !filter_var($val, FILTER_VALIDATE_EMAIL)) continue;
            if ($type === 'url' && !preg_match('#^https?://#i', $val)) continue;
            if (($type === 'whatsapp' || $type === 'phone') && !preg_match('/^[0-9+]{6,20}$/', $val)) continue;
            $clean[] = ["label" => $label, "type" => $type, "value" => mb_substr($val, 0, 200)];
        }
        $value = json_encode($clean, JSON_UNESCAPED_UNICODE);
        break;
    default:
        echo json_encode(["success" => false, "message" => "مفتاح غير معروف."]);
        exit();
}

$stmt = $conn->prepare("INSERT INTO site_content (content_key, content_value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE content_value = VALUES(content_value)");
$stmt->bind_param("ss", $key, $value);
if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "حدث خطأ: " . $conn->error]);
}
$stmt->close();
?>
