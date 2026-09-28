<?php
/* تصدير ملف Excel كامل بكل الحسابات وكل مدخلات العملاء - لمدير الموقع الأصلي بس
   ملف .xlsx حقيقي (عربي + اتجاه من اليمين للشمال) بصفحات منفصلة:
   الحسابات، الاشتراكات، خطط DCA، مستويات DCA، خطط Grid، مستويات Grid، الصفقات المغلقة، أحداث الاشتراكات،
   التوصيات، المقترحات، الإحالات، موافقات إخلاء المسؤولية، رسائل الدردشة */
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/plans_store.php';

if (!isset($_SESSION['user_email']) || !in_array('manage_staff', getCurrentUserPermissions($conn), true) || strtolower($_SESSION['user_email']) !== strtolower(ADMIN_EMAIL)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "غير مصرح. التصدير الكامل متاح لمدير الموقع الأصلي فقط.";
    exit();
}
@set_time_limit(300);
@ini_set('memory_limit', '512M');

function q_rows($conn, $sql){
    $out = [];
    $r = @$conn->query($sql);
    if ($r) while ($row = $r->fetch_assoc()) $out[] = $row;
    return $out;
}
function yesno($v){ return ((int)$v === 1) ? 'نعم' : 'لا'; }
function num($v){ return ($v === null || $v === '') ? '' : (is_numeric($v) ? 0 + $v : $v); }
function fileRef($v){
    if ($v === null || $v === '') return '';
    if (strpos($v, 'file:') === 0) return 'ملف: ' . substr($v, 5);
    if (strpos($v, 'data:') === 0) return 'صورة مخزّنة (Base64)';
    return $v;
}

$sheets = [];

// ---------------- الحسابات ----------------
$users = q_rows($conn, "SELECT id, username, is_admin, email_verified, archived, archived_at, referral_code, created_at FROM users ORDER BY id");
$rows = [['#', 'البريد الإلكتروني', 'أدمن/فريق', 'البريد مفعّل', 'محذوف/مؤرشف', 'تاريخ الأرشفة', 'كود الإحالة', 'تاريخ التسجيل']];
foreach ($users as $u) $rows[] = [(int)$u['id'], $u['username'], yesno($u['is_admin']), yesno($u['email_verified']), yesno($u['archived']), $u['archived_at'], $u['referral_code'], $u['created_at']];
$sheets['الحسابات'] = $rows;

// ---------------- الاشتراكات ----------------
$subs = q_rows($conn, "SELECT * FROM subscribers ORDER BY id");
$rows = [['#', 'إيميل الحساب', 'الاسم', 'الهاتف', 'إيميل التواصل', 'الرقم القومي', 'العنوان', 'الباقة', 'المبلغ', 'العملة', 'السوق', 'طريقة الدفع', 'رقم العملية', 'إثبات الدفع', 'البداية', 'النهاية', 'مفعّل', 'هدية', 'مؤرشف', 'باقة معلّقة', 'مبلغ معلّق', 'تاريخ الطلب']];
foreach ($subs as $s) $rows[] = [(int)$s['id'], $s['account_email'], $s['name'], $s['phone'], $s['contact_email'], $s['national_id'] ?? '', $s['address'] ?? '', $s['plan_name'], num($s['amount']), $s['currency'], $s['market'], $s['payment_method'], $s['payment_ref'], fileRef($s['payment_proof']), $s['start_date'], $s['end_date'], yesno($s['active']), yesno($s['is_comp'] ?? 0), yesno($s['archived'] ?? 0), $s['pending_plan_name'] ?? '', num($s['pending_amount'] ?? ''), $s['created_at']];
$sheets['الاشتراكات'] = $rows;

// ---------------- الخطط (من الصفوف الجديدة، أو من الجدول القديم لو بعد متنقلتش) ----------------
$planMaps = []; // [email][type] => map
if (plans_table_ready($conn)) {
    foreach (q_rows($conn, "SELECT account_email, plan_type, symbol, data_value FROM user_plans WHERE deleted = 0 ORDER BY account_email, symbol") as $r)
        $planMaps[$r['account_email']][$r['plan_type']][$r['symbol']] = json_decode($r['data_value'], true);
}
foreach (q_rows($conn, "SELECT account_email, data_key, data_value FROM user_data_store WHERE data_key IN ('plans','grid_plans')") as $r) {
    if (isset($planMaps[$r['account_email']][$r['data_key']])) continue;
    $m = json_decode($r['data_value'], true);
    if (is_array($m)) $planMaps[$r['account_email']][$r['data_key']] = $m;
}

$dca = [['إيميل الحساب', 'السهم', 'السوق', 'العملة', 'تاريخ البداية', 'السعر عند الإنشاء', 'رأس المال', 'نسبة المخاطرة %', 'هدف الربح %', 'نسبة الهبوط بين المستويات %', 'زيادة الكمية %', 'آخر سعر يدوي', 'نسبة ربح الخروج الكلي %', 'عدد المستويات', 'المستويات المنفذة', 'الكمية المشتراة', 'إجمالي الشراء', 'الكمية المباعة', 'إجمالي البيع', 'الكمية المتبقية', 'متوسط التكلفة التقريبي']];
$dcaLv = [['إيميل الحساب', 'السهم', 'المستوى', 'منفذ', 'الكمية', 'سعر الشراء', 'تاريخ الشراء', 'عدد عمليات البيع', 'الكمية المباعة', 'متوسط سعر البيع', 'تفاصيل البيع']];
$grid = [['إيميل الحساب', 'السهم', 'السوق', 'تاريخ الإنشاء', 'السعر عند الإنشاء', 'رأس المال', 'نسبة المخاطرة %', 'حجم الصفقة', 'أعلى النطاق', 'أقل النطاق', 'الخطوة', 'عدد المستويات', 'مستويات مشتراة', 'دورات مكتملة', 'مغلقة', 'نسبة ربح الخروج الكلي %']];
$gridLv = [['إيميل الحساب', 'السهم', 'رقم المستوى', 'السعر المخطط', 'الكمية المخططة', 'الحالة', 'الكمية المنفذة', 'سعر التنفيذ', 'تاريخ التنفيذ', 'هدف البيع', 'عدد الدورات', 'عدد عمليات البيع']];
$closed = [['إيميل الحساب', 'نوع الخطة', 'السهم', 'تاريخ الإغلاق', 'الكمية', 'متوسط الدخول', 'متوسط الخروج', 'الربح', 'نسبة الربح %', 'رأس المال المستخدم', 'مؤرشفة', 'محذوفة']];

foreach ($planMaps as $email => $types) {
    foreach (($types['plans'] ?? []) as $sym => $p) {
        if (!is_array($p)) continue;
        $levels = is_array($p['levels'] ?? null) ? $p['levels'] : [];
        $execN = 0; $bq = 0; $bAmt = 0; $sq = 0; $sAmt = 0;
        foreach ($levels as $lv) {
            if (empty($lv['executed'])) continue;
            $execN++; $q = (float)($lv['actualQty'] ?? 0); $pr = (float)($lv['actualPrice'] ?? 0);
            $bq += $q; $bAmt += $q * $pr;
            $lvSold = 0; $lvSoldAmt = 0; $det = [];
            foreach (($lv['sells'] ?? []) as $sl) { $lvSold += (float)$sl['qty']; $lvSoldAmt += (float)$sl['qty'] * (float)$sl['price']; $det[] = ($sl['qty'] ?? '') . ' @ ' . ($sl['price'] ?? '') . ' (' . ($sl['date'] ?? '') . ')'; }
            $sq += $lvSold; $sAmt += $lvSoldAmt;
            $dcaLv[] = [$email, (string)$sym, num($lv['level'] ?? ''), 'نعم', num($q), num($pr), $lv['execDate'] ?? '', count($lv['sells'] ?? []), num($lvSold), $lvSold > 0 ? round($lvSoldAmt / $lvSold, 4) : '', implode(' | ', $det)];
        }
        foreach ($levels as $lv) if (empty($lv['executed'])) $dcaLv[] = [$email, (string)$sym, num($lv['level'] ?? ''), 'لا', '', '', '', 0, '', '', ''];
        $dca[] = [$email, (string)$sym, $p['market'] ?? '', $p['currency'] ?? '', $p['startDate'] ?? '', num($p['currentPrice'] ?? ''), num($p['capital'] ?? ''), num($p['riskPercent'] ?? ''), num($p['profitTarget'] ?? ''), num($p['dropPercent'] ?? ''), num($p['volumeIncrease'] ?? ''), num($p['manualLastPrice'] ?? ''), num($p['exitProfitPercent'] ?? ''), count($levels), $execN, num($bq), round($bAmt, 2), num($sq), round($sAmt, 2), num(round($bq - $sq, 4)), $bq > 0 ? round($bAmt / $bq, 4) : ''];
        foreach (($p['closedTrades'] ?? []) as $t) $closed[] = [$email, 'DCA', (string)$sym, $t['closedDate'] ?? '', num($t['totalQty'] ?? ''), num($t['avgEntry'] ?? ''), num($t['avgExit'] ?? ''), num($t['profit'] ?? ''), num($t['profitPercent'] ?? ''), num($t['capitalUsed'] ?? ''), yesno(!empty($t['archived'])), yesno(!empty($t['deleted']))];
    }
    foreach (($types['grid_plans'] ?? []) as $sym => $g) {
        if (!is_array($g)) continue;
        $levels = is_array($g['levels'] ?? null) ? $g['levels'] : [];
        $bought = 0; $cycles = 0;
        foreach ($levels as $i => $lv) {
            if (($lv['status'] ?? '') === 'bought') $bought++;
            $cycles += (int)($lv['cycles'] ?? 0);
            $gridLv[] = [$email, (string)$sym, $i + 1, num($lv['plannedPrice'] ?? ''), num($lv['plannedQty'] ?? ''), $lv['status'] ?? '', num($lv['executedQty'] ?? ''), num($lv['executedPrice'] ?? ''), $lv['executedDate'] ?? '', num($lv['sellTargetPrice'] ?? ''), (int)($lv['cycles'] ?? 0), count($lv['sells'] ?? [])];
        }
        $grid[] = [$email, (string)$sym, $g['market'] ?? '', $g['createdAt'] ?? '', num($g['currentPrice'] ?? ''), num($g['capital'] ?? ''), num($g['risk'] ?? ''), num($g['tradeSize'] ?? ''), num($g['rangeHigh'] ?? ''), num($g['rangeLow'] ?? ''), num($g['step'] ?? ''), count($levels), $bought, $cycles, yesno(!empty($g['closed'])), num($g['exitProfitPercent'] ?? '')];
        foreach (($g['closedTrades'] ?? []) as $t) $closed[] = [$email, 'Grid', (string)$sym, $t['closedDate'] ?? '', num($t['totalQty'] ?? ''), num($t['avgEntry'] ?? ''), num($t['avgExit'] ?? ''), num($t['profit'] ?? ''), num($t['profitPercent'] ?? ''), num($t['capitalUsed'] ?? ''), yesno(!empty($t['archived'])), yesno(!empty($t['deleted']))];
    }
}
$sheets['خطط DCA'] = $dca;
$sheets['مستويات DCA'] = $dcaLv;
$sheets['خطط Grid'] = $grid;
$sheets['مستويات Grid'] = $gridLv;
$sheets['الصفقات المغلقة'] = $closed;

// ---------------- باقي الجداول ----------------
$rows = [['#', 'إيميل الحساب', 'نوع الحدث', 'الباقة', 'المبلغ', 'التاريخ']];
foreach (q_rows($conn, "SELECT * FROM subscription_events ORDER BY id") as $r) $rows[] = [(int)$r['id'], $r['account_email'], $r['event_type'], $r['plan_name'], num($r['amount']), $r['event_date']];
$sheets['أحداث الاشتراكات'] = $rows;

$recs = q_rows($conn, "SELECT * FROM recommendations ORDER BY id");
$rows = [['#', 'الرمز', 'اسم السهم', 'دخول من', 'دخول إلى', 'دعم 1', 'دعم 2', 'دعم 3', 'مقاومة 1', 'خروج 1 %', 'مقاومة 2', 'خروج 2 %', 'مقاومة 3', 'خروج 3 %', 'الصلاحية (ساعة)', 'الحالة', 'أرسلها', 'تاريخ الإرسال']];
foreach ($recs as $r) $rows[] = [(int)$r['id'], $r['symbol'], $r['stock_name'], num($r['buy_from']), num($r['buy_to']), num($r['support1'] ?? ''), num($r['support2'] ?? ''), num($r['support3'] ?? ''), num($r['resistance1'] ?? ''), num($r['resistance1_pct'] ?? ''), num($r['resistance2'] ?? ''), num($r['resistance2_pct'] ?? ''), num($r['resistance3'] ?? ''), num($r['resistance3_pct'] ?? ''), num($r['validity_hours'] ?? ''), $r['status'] ?? '', $r['created_by'] ?? '', $r['created_at']];
$sheets['التوصيات'] = $rows;

$rows = [['#', 'إيميل الحساب', 'المقترح', 'المرفق', 'الحالة', 'التاريخ']];
foreach (q_rows($conn, "SELECT id, account_email, message, attachment_data, attachment_name, status, created_at FROM suggestions ORDER BY id") as $r) $rows[] = [(int)$r['id'], $r['account_email'], $r['message'], $r['attachment_name'] ?: fileRef($r['attachment_data']), $r['status'], $r['created_at']];
$sheets['المقترحات'] = $rows;

$rows = [['الداعي', 'المدعو', 'اتصرفت المكافأة', 'تاريخ المكافأة', 'التاريخ']];
foreach (q_rows($conn, "SELECT * FROM referrals ORDER BY id") as $r) $rows[] = [$r['referrer_email'], $r['referred_email'], yesno($r['rewarded']), $r['rewarded_at'], $r['created_at']];
$sheets['الإحالات'] = $rows;

$rows = [['إيميل الحساب', 'رقم نسخة النص', 'تاريخ الموافقة']];
foreach (q_rows($conn, "SELECT * FROM disclaimer_acceptances ORDER BY id") as $r) $rows[] = [$r['account_email'], (int)$r['disclaimer_version'], $r['accepted_at'] ?? ($r['created_at'] ?? '')];
$sheets['موافقات إخلاء المسؤولية'] = $rows;

$rows = [['#', 'معرّف المحادثة', 'إيميل الزائر', 'المرسل', 'الرسالة', 'مرفق', 'التاريخ']];
foreach (q_rows($conn, "SELECT id, visitor_id, visitor_email, sender, message, attachment_name, created_at FROM chat_messages ORDER BY id") as $r) $rows[] = [(int)$r['id'], $r['visitor_id'], $r['visitor_email'], $r['sender'] === 'admin' ? 'الإدارة' : 'العميل', $r['message'], $r['attachment_name'], $r['created_at']];
$sheets['رسائل الدردشة'] = $rows;

// ================= كاتب xlsx بسيط (من غير مكتبات خارجية) =================
function xml_esc($s){ return htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8'); }
function col_letter($i){ $s = ''; $i++; while ($i > 0) { $m = ($i - 1) % 26; $s = chr(65 + $m) . $s; $i = intdiv($i - 1, 26); } return $s; }
function sheet_xml($rows){
    $x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    $cols = 0; foreach ($rows as $r) $cols = max($cols, count($r));
    if ($cols) { $x .= '<cols>'; for ($c = 0; $c < $cols; $c++) $x .= '<col min="' . ($c+1) . '" max="' . ($c+1) . '" width="' . ($c === 0 ? 22 : 18) . '" customWidth="1"/>'; $x .= '</cols>'; }
    $x .= '<sheetData>';
    foreach ($rows as $ri => $r) {
        $x .= '<row r="' . ($ri + 1) . '">';
        foreach (array_values($r) as $ci => $v) {
            $ref = col_letter($ci) . ($ri + 1);
            $style = $ri === 0 ? ' s="1"' : '';
            if (is_int($v) || is_float($v)) $x .= '<c r="' . $ref . '"' . $style . '><v>' . $v . '</v></c>';
            elseif ($v === null || $v === '') continue;
            else $x .= '<c r="' . $ref . '" t="inlineStr"' . $style . '><is><t xml:space="preserve">' . xml_esc(mb_substr((string)$v, 0, 32000)) . '</t></is></c>';
        }
        $x .= '</row>';
    }
    $x .= '</sheetData>';
    if (count($rows) > 1 && $cols) $x .= '<autoFilter ref="A1:' . col_letter($cols - 1) . count($rows) . '"/>';
    return $x . '</worksheet>';
}

$names = array_keys($sheets);
$fname = 'griffine_all_data_' . date('Y-m-d_His');
if (class_exists('ZipArchive')) {
    $tmp = tempnam(sys_get_temp_dir(), 'gx');
    $zip = new ZipArchive();
    $zip->open($tmp, ZipArchive::OVERWRITE);
    $ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    foreach ($names as $i => $n) $ct .= '<Override PartName="/xl/worksheets/sheet' . ($i+1) . '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    $zip->addFromString('[Content_Types].xml', $ct . '</Types>');
    $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    $wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>';
    $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    foreach ($names as $i => $n) {
        $wb .= '<sheet name="' . xml_esc(mb_substr($n, 0, 31)) . '" sheetId="' . ($i+1) . '" r:id="rId' . ($i+1) . '"/>';
        $rels .= '<Relationship Id="rId' . ($i+1) . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' . ($i+1) . '.xml"/>';
        $zip->addFromString('xl/worksheets/sheet' . ($i+1) . '.xml', sheet_xml($sheets[$n]));
    }
    $rels .= '<Relationship Id="rId' . (count($names)+1) . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    $zip->addFromString('xl/workbook.xml', $wb . '</sheets></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels', $rels);
    $zip->addFromString('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>');
    $zip->close();
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $fname . '.xlsx"');
    header('Content-Length: ' . filesize($tmp));
    header('Cache-Control: no-store');
    readfile($tmp);
    @unlink($tmp);
    exit();
}

// احتياطي لو امتداد zip مش متاح على السيرفر: ملف Excel بصيغة XML (بيفتح في Excel عادي)
header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $fname . '.xls"');
header('Cache-Control: no-store');
echo '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>';
foreach ($sheets as $n => $rows) {
    echo '<Worksheet ss:Name="' . xml_esc(mb_substr($n, 0, 31)) . '" ss:RightToLeft="1"><Table>';
    foreach ($rows as $ri => $r) {
        echo '<Row>';
        foreach ($r as $v) {
            $t = (is_int($v) || is_float($v)) ? 'Number' : 'String';
            echo '<Cell' . ($ri === 0 ? ' ss:StyleID="h"' : '') . '><Data ss:Type="' . $t . '">' . xml_esc($v) . '</Data></Cell>';
        }
        echo '</Row>';
    }
    echo '</Table></Worksheet>';
}
echo '</Workbook>';
