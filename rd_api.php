<?php
/* =====================================================================
   GRIFFINE — rd_api.php (الإصدار 151) — «🔬 البحث والتطوير» (للإدارة: الصلاحيات والإعدادات أو التقارير)
   GET ?action=summary&days=1|7|30|90 ← تحليلات الزوار + رحلة التسجيل والاشتراك + الأخطاء والبطء
                                        + البحث اللي مالقاش + أسئلة الشات اللي مالهاش رد + اقتراحات التطوير (قواعد ثابتة من غير تكلفة)
   ===================================================================== */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/session_boot.php';
session_start();
include 'db.php';
require_once __DIR__ . '/rd_lib.php';
function rd_out($a){ echo json_encode($a, JSON_UNESCAPED_UNICODE); exit(); }
if (!isset($_SESSION['user_email']) || empty($_SESSION['is_admin'])) { http_response_code(403); rd_out(["success" => false, "message" => "غير مصرح لك."]); }
$perms = getCurrentUserPermissions($conn);
if (!in_array('manage_admin_settings', $perms, true) && !in_array('view_reports', $perms, true)) { http_response_code(403); rd_out(["success" => false, "message" => "غير مصرح لك."]); }
session_write_close();
rd_ready($conn);
$days = (int)($_GET['days'] ?? 7); if (!in_array($days, [1, 7, 30, 90], true)) $days = 7;
$from = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
$q1 = function($sql, $types = '', ...$args) use ($conn){ $st = $conn->prepare($sql); if ($types) $st->bind_param($types, ...$args); $st->execute(); $r = $st->get_result(); $o = []; while ($x = $r->fetch_assoc()) $o[] = $x; $st->close(); return $o; };
$one = function($sql, $types = '', ...$args) use ($q1){ $r = $q1($sql, $types, ...$args); return $r ? (int)array_values($r[0])[0] : 0; };

$visitors = $one("SELECT COUNT(DISTINCT vid) FROM site_events WHERE day >= ? AND ev = 'pv'", "s", $from);
$views = $one("SELECT COUNT(*) FROM site_events WHERE day >= ? AND ev = 'pv'", "s", $from);
$series = $q1("SELECT day d, COUNT(DISTINCT vid) v, COUNT(*) p FROM site_events WHERE day >= ? AND ev = 'pv' GROUP BY day ORDER BY day", "s", $from);
$grp = fn($col) => $q1("SELECT $col k, COUNT(DISTINCT vid) n FROM site_events WHERE day >= ? AND ev = 'pv' GROUP BY $col ORDER BY n DESC LIMIT 12", "s", $from);
$sources = $grp('src'); $devices = $grp('device'); $browsers = $grp('browser'); $oses = $grp('os'); $countries = $grp('country');
$screens = $q1("SELECT screen k, COUNT(*) n, COUNT(DISTINCT vid) u FROM site_events WHERE day >= ? AND ev = 'pv' AND screen <> '' GROUP BY screen ORDER BY n DESC LIMIT 40", "s", $from);
$load = $q1("SELECT device k, ROUND(AVG(ms)) ms, COUNT(*) n FROM site_events WHERE day >= ? AND ev = 'pv' AND x = 'load' AND ms > 0 GROUP BY device", "s", $from);
$errors = $q1("SELECT x k, COUNT(*) n, MAX(screen) s FROM site_events WHERE day >= ? AND ev = 'err' GROUP BY x ORDER BY n DESC LIMIT 12", "s", $from);
$misses = $q1("SELECT LOWER(x) k, COUNT(*) n FROM site_events WHERE day >= ? AND ev = 'miss' AND x <> '' GROUP BY LOWER(x) ORDER BY n DESC LIMIT 15", "s", $from);
// أسئلة الشات اللي المساعد ما عرفش يرد عليها
$unans = [];
try { $unans = $q1("SELECT m.message k, COUNT(*) n FROM chat_messages m WHERE m.sender = 'visitor' AND m.created_at >= ? AND EXISTS (SELECT 1 FROM chat_messages b WHERE b.visitor_id = m.visitor_id AND b.sender = 'admin' AND b.id > m.id AND b.id <= m.id + 3 AND b.message LIKE '%لم أجد إجابة%') GROUP BY m.message ORDER BY n DESC LIMIT 15", "s", $from); } catch (Throwable $e) {}
// رحلة الزائر: الصفحة العامة ← شاشة التسجيل ← حساب جديد ← فعّل الإيميل ← اشتراك مدفوع
$landingV = $one("SELECT COUNT(DISTINCT vid) FROM site_events WHERE day >= ? AND ev = 'pv' AND screen IN ('renderLanding', 'renderPublicHome', 'renderWelcome')", "s", $from);
$regV = $one("SELECT COUNT(DISTINCT vid) FROM site_events WHERE day >= ? AND ev = 'pv' AND screen = 'renderRegister'", "s", $from);
$newUsers = $one("SELECT COUNT(*) FROM users WHERE is_admin = 0 AND created_at >= ?", "s", $from . ' 00:00:00');
$verified = $one("SELECT COUNT(*) FROM users WHERE is_admin = 0 AND created_at >= ? AND email_verified = 1", "s", $from . ' 00:00:00');
$paid = $one("SELECT COUNT(DISTINCT account_email) FROM subscribers WHERE amount > 0 AND created_at >= ?", "s", $from . ' 00:00:00');
$noPlans = $one("SELECT COUNT(*) FROM users u WHERE u.is_admin = 0 AND COALESCE(u.archived, 0) = 0 AND NOT EXISTS (SELECT 1 FROM user_plans p WHERE LOWER(p.account_email) = LOWER(u.username))");
$allUsers = $one("SELECT COUNT(*) FROM users WHERE is_admin = 0 AND COALESCE(archived, 0) = 0");
$unverifiedAll = $one("SELECT COUNT(*) FROM users WHERE is_admin = 0 AND COALESCE(archived, 0) = 0 AND email_verified = 0");
$freeEnding = 0; try { $freeEnding = $one("SELECT COUNT(*) FROM subscribers WHERE plan_id = 'trial' AND active = 1 AND end_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 5 DAY"); } catch (Throwable $e) {}

// ===== اقتراحات التطوير (قواعد ثابتة) =====
$S = []; $add = function($lvl, $t, $d) use (&$S){ $S[] = ['level' => $lvl, 'title' => $t, 'detail' => $d]; };
$pct = fn($a, $b) => $b > 0 ? round($a / $b * 100, 1) : 0;
$mob = 0; foreach ($devices as $x) if ($x['k'] === 'mobile') $mob = (int)$x['n'];
$mobPct = $pct($mob, max(1, $visitors));
$mobLoad = 0; foreach ($load as $x) if ($x['k'] === 'mobile') $mobLoad = (int)$x['ms'];
if ($visitors < 30) $add('info', 'البيانات لسه قليلة', "عدد الزوار في الفترة دي $visitors بس — الاقتراحات هتبقى أدق لما الزيارات تزيد (التسويق في الخطوة الجاية).");
if ($mobPct >= 60 && $mobLoad > 3000) $add('high', 'سرعة الموبايل محتاجة تحسين', "$mobPct% من الزوار على الموبايل ومتوسط التحميل " . round($mobLoad / 1000, 1) . " ثانية — المستهدف أقل من 3 ثواني (صور أصغر / ملفات أقل في أول فتح).");
if ($errors) { $n = array_sum(array_column($errors, 'n')); $add($n >= 20 ? 'high' : 'mid', "أخطاء في المتصفح عند المستخدمين ($n)", 'أكتر خطأ: «' . mb_substr($errors[0]['k'], 0, 120) . '» — ابعت التقرير ده للتطوير عشان يتصلّح.'); }
if ($landingV >= 20 && $newUsers / max(1, $landingV) < 0.02) $add('high', 'نسبة التسجيل من الزوار ضعيفة', "من $landingV زائر للصفحة العامة اتسجّل $newUsers بس (" . $pct($newUsers, $landingV) . "%) — المستهدف 3-5%: زرار تسجيل أوضح فوق، عرض مجاني واضح، وآراء عملاء حقيقية.");
if ($regV >= 10 && $newUsers / max(1, $regV) < 0.4) $add('mid', 'ناس بتفتح شاشة التسجيل ومش بتكمّل', "$regV فتحوا شاشة التسجيل واتسجّل $newUsers — راجع خانات التسجيل (أقل خانات ممكنة) وتفعيل الإيميل.");
if ($newUsers >= 5 && $verified / max(1, $newUsers) < 0.6) $add('mid', 'حسابات جديدة مافعّلتش الإيميل', "$verified من $newUsers بس فعّلوا الإيميل — ممكن إيميل التفعيل بيروح السبام، أو نسمح بالدخول قبل التفعيل.");
if ($unverifiedAll >= 5) $add('low', "$unverifiedAll حساب ماتفعّلش لحد دلوقتي", 'ابعتلهم تذكير بالتفعيل من مركز الإيميلات.');
if ($allUsers >= 5 && $noPlans / max(1, $allUsers) > 0.5) $add('mid', 'أغلب المستخدمين ماعملوش أي خطة', "$noPlans من $allUsers ماعندهمش ولا خطة — محتاجين شرح سريع أول ما يدخلوا (خطوات أو فيديو) أو خطة جاهزة بضغطة.");
if ($newUsers >= 5 && $paid == 0) $add('mid', 'مفيش اشتراكات مدفوعة في الفترة دي', 'جرّب عرض محدود المدة (خصم أول شهر) أو تذكير قبل نهاية الباقة المجانية.');
if ($freeEnding > 0) $add('mid', "$freeEnding مشترك الباقة المجانية بتاعتهم بتخلص خلال 5 أيام", 'وقت مناسب لعرض ترقية (من «الدعاية والعروض» أو إيميل).');
foreach ($sources as $x) if ((int)$x['n'] >= 15 && in_array(explode('.', $x['k'])[0], ['tiktok', 'facebook', 'instagram'], true)) $add('low', "«{$x['k']}» جايب {$x['n']} زائر", 'كمّل على المنصة دي — وراجع التسجيلات منها في التسويق.');
if ($misses) $add('mid', 'كلمات بيدوّروا عليها ومش لاقيينها', 'أكتر كلمات: ' . implode('، ', array_map(fn($x) => '«' . $x['k'] . '»', array_slice($misses, 0, 5))) . ' — ممكن ميزة ناقصة أو اسم مختلف للشاشة.');
if ($unans) $add('mid', 'أسئلة في الشات المساعد ما عرفش يرد عليها', 'زوّد الأسئلة دي في «المساعد الذكي في الشات»: ' . implode(' | ', array_map(fn($x) => mb_substr($x['k'], 0, 50), array_slice($unans, 0, 4))));
$lo = []; foreach ($screens as $x) if ((int)$x['n'] <= 1) $lo[] = $x['k'];
if (count($lo) >= 3 && $visitors >= 30) $add('low', 'شاشات قليلة الاستخدام', 'الشاشات دي اتفتحت مرة واحدة أو أقل: ' . implode('، ', array_slice($lo, 0, 6)) . ' — يا إما مش واضحة في القائمة يا إما مش مهمة.');
$ord = ['high' => 0, 'mid' => 1, 'low' => 2, 'info' => 3]; usort($S, fn($a, $b) => $ord[$a['level']] <=> $ord[$b['level']]);

rd_out(["success" => true, "days" => $days, "from" => $from,
    "kpi" => ['visitors' => $visitors, 'views' => $views, 'newUsers' => $newUsers, 'verified' => $verified, 'paid' => $paid, 'mobilePct' => $mobPct, 'allUsers' => $allUsers, 'noPlans' => $noPlans],
    "series" => $series, "sources" => $sources, "devices" => $devices, "browsers" => $browsers, "os" => $oses, "countries" => $countries, "screens" => $screens, "load" => $load,
    "errors" => $errors, "misses" => $misses, "unanswered" => $unans,
    "funnel" => ['landing' => $landingV, 'register' => $regV, 'users' => $newUsers, 'verified' => $verified, 'paid' => $paid], "suggestions" => $S]);
?>
