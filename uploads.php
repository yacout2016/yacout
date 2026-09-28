<?php
/* =====================================================================
   الصور والمرفقات كملفات على السيرفر بدل Base64 جوه قاعدة البيانات
   - الملف بيتحفظ في مجلد خاص برّه public_html لو متاح (مش ممكن حد يفتحه برابط مباشر)،
     ولو مش متاح بيتعمل مجلد griffine_uploads جوه الموقع ومقفول بـ .htaccess
   - قاعدة البيانات بتخزّن بس اسم الملف (file:...)
   - العرض من خلال file_get.php اللي بيتحقق مين يقدر يشوف إيه
   - أي بيانات قديمة لسه Base64 بتفضل شغالة زي ما هي
   ===================================================================== */

const UPL_CATEGORIES = ['proof', 'avatar', 'chat', 'sugg', 'bg'];
const UPL_TYPES = [
    'image/png' => 'png', 'image/jpeg' => 'jpg', 'image/jpg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif',
    'application/pdf' => 'pdf',
];

function upl_dir(){
    static $dir = null;
    if ($dir !== null) return $dir;
    $outside = dirname(__DIR__) . '/griffine_uploads';
    if ((is_dir($outside) || @mkdir($outside, 0755, true)) && is_writable($outside)) { $dir = $outside; return $dir; }
    $inside = __DIR__ . '/griffine_uploads';
    if (!is_dir($inside)) @mkdir($inside, 0755, true);
    if (!file_exists($inside . '/.htaccess')) @file_put_contents($inside . '/.htaccess', "Require all denied\nDeny from all\n");
    if (!file_exists($inside . '/index.html')) @file_put_contents($inside . '/index.html', '');
    $dir = (is_dir($inside) && is_writable($inside)) ? $inside : false;
    return $dir;
}

/* بياخد data URI ويحفظه كملف. بيرجع:
   - "file:<اسم الملف>" لو اتحفظ
   - نفس القيمة زي ما هي لو مش data URI (أو SVG صغير من الأفاتارات الجاهزة) أو لو الحفظ كملف مش متاح
   - false لو النوع مش مسموح */
function upl_store($value, $category, $allowPdf = false){
    if ($value === null || $value === '') return $value;
    if (!in_array($category, UPL_CATEGORIES, true)) return false;
    if (strpos($value, 'data:') !== 0) return $value;
    if (strpos($value, 'data:image/svg+xml') === 0) return $value; // الأفاتارات الجاهزة (SVG صغير بيتولّد في المتصفح)
    if (!preg_match('#^data:([a-z0-9/+.-]+);base64,#i', $value, $m)) return false;
    $mime = strtolower($m[1]);
    if (!isset(UPL_TYPES[$mime])) return false;
    if ($mime === 'application/pdf' && !$allowPdf) return false;
    $bin = base64_decode(substr($value, strlen($m[0])), true);
    if ($bin === false || $bin === '') return false;
    // التأكد إن المحتوى فعلًا صورة/PDF مش أي حاجة متسمية صورة
    if ($mime === 'application/pdf') {
        if (substr($bin, 0, 5) !== '%PDF-') return false;
    } else {
        if (@getimagesizefromstring($bin) === false) return false;
    }
    $dir = upl_dir();
    if (!$dir) return $value; // مفيش مكان للحفظ - نكمّل بالطريقة القديمة عشان محدش يتعطل
    $name = $category . '_' . bin2hex(random_bytes(16)) . '.' . UPL_TYPES[$mime];
    if (@file_put_contents($dir . '/' . $name, $bin) === false) return $value;
    return 'file:' . $name;
}

// القيمة المخزّنة → رابط يتعرض في الصفحة
function upl_url($stored){
    if ($stored === null || $stored === '') return $stored;
    if (strpos($stored, 'file:') === 0) return 'file_get.php?f=' . rawurlencode(substr($stored, 5));
    return $stored;
}

// مسح ملف قديم لما يتبدل (مثلًا صورة شخصية جديدة)
function upl_delete($stored){
    if (!is_string($stored) || strpos($stored, 'file:') !== 0) return;
    $name = substr($stored, 5);
    if (!preg_match('/^[a-z]+_[a-f0-9]{32}\.[a-z]+$/', $name)) return;
    $dir = upl_dir();
    if ($dir && is_file($dir . '/' . $name)) @unlink($dir . '/' . $name);
}
?>
