/* GRIFFINE — ALL_SCHEMA_UPDATES.sql (الإصدار 157) — كل التحديثات، آمن يتشغل أكتر من مرة. الصقه كله في تبويب SQL ← Go */
/* v69: جدول login_attempts (حماية من تخمين كلمات المرور). */
/* v72: جدول ui_customizations (استوديو التصميم) + جدول email… */
/* v82: عمود allow_upload في chat_conversation_meta (الأدمن ب… */
/* v83: عمود max_upload_mb في chat_conversation_meta (أقصى حج… */
/* v84: جدول site_config (رقم الخدمة + طرق الدفع + بيانات Pay… */
/* v85: شؤون الموظفين (HR): جداول job_titles (المسميات الوظيف… */
/* v88: email_log (أرشيف + سلة محذوفات) + user_watchlist (قائ… */
/* v89: plan_trades (جدول الصفقات المنظم لتقارير الإدارة - بي… */
/* v91: عمود dismissed في user_alerts (تنبيهات الرئيسية بتفضل… */
/* v96: تصحيح النصوص (DAC ← DCA ، Top7 المصرية) + أكواد الأعض… */
/* v97: alert_targets.meta + rearmed (إشعارات الخطط بالكمية و… */
/* v98: جدول symbol_checks (الأسهم المكتوبة غلط بتتمسح نهائيً… */
/* v100: فهارس (Indexes) إضافية للسرعة مع عدد كبير من المستخدم… */
/* v101: جداول opportunities + opportunity_hits (البحث عن فرص… */
/* v114: جدول basira_reports («بصيرة GRIFFINE AI» - التحليلات… */
/* v122: جدول mizan_studies («ميزان GRIFFINE AI» - الدراسات ال… */
/* v127: جدول user_ai_access (الذكاء الاصطناعي لكل مشترك: الشا… */
/* v128: «توصية شراء / بيع» للمحللين — أعمدة جديدة في recommen… */
/* v129: شاشة المحلل الاحترافية — أعمدة جديدة في recommendatio… */
/* v130: «ميزان GRIFFINE AI» — العوائد السنوية لكل أصل بتتحدث… */
/* v131: «توصية شراء / بيع» — معاينة قبل الإرسال (إشعار / إيمي… */
/* v132: صلاحية «توصياته لازم الأدمن يوافق عليها» للمحلل + تصحيح الصلاحية القديمة */
/* v133: نوع الإشعار (kind / rec_id) في user_alerts لألوان إشعارات التوصيات */
/* v134: مفيش تغيير في قاعدة البيانات (جدول مسح السوق: الكود + الاسم + القطاع) */
/* v135: مميزات كل باقة (subscription_plans.perks) + الباقة المجانية + الأسعار (مجاني / 200 شهري / 2000 سنوي / برو 3000) مرة واحدة */
/* v136: ترتيب الباقات: المجانية ← الشهرية ← السنوية ← برو (مرة واحدة) */
/* v137: مفيش تغيير في قاعدة البيانات (إخفاء / إظهار المميزات بيتحفظ في site_config) */
/* v138: user_perks (مميزات إضافية / متشالة لكل مشترك) + الحسابات اللي مالهاش اشتراك ← الباقة المجانية (مرة واحدة) */
/* v139: مفيش تغيير في قاعدة البيانات (فترة «يومي» في بصيرة) */
/* v140: مفيش تغيير في قاعدة البيانات (فترة المسح قائمة منسدلة — الافتراضي يومي) */
/* v142: مفيش تغيير في قاعدة البيانات (يوم وأسبوع في كل الرسوم البيانية) */
/* v143: مفيش تغيير في قاعدة البيانات (الافتراضي «يوم» في كل الرسوم) */
/* v144: مفيش تغيير في الجداول (إعدادات المدد في site_config.periods_cfg وكروت الرئيسية في admin_settings بتتعمل لوحدها أول ما تحفظ) */
/* v145: مفيش تغيير في قاعدة البيانات (الرئيسية من غير أزرار تحكم + رقم جديد عشان الموبايل يحدّث نفسه) */
/* v146: عدادات صفحة الموقع العامة ← أرقام يدوية مناسبة (مرة واحدة) — بتتعدّل من لوحة التحكم ← صفحة اللاندينج ← العدادات */
/* v147: مفيش تغيير في الجداول (العدادات بتزيد يوميًا + الشروط والأحكام + حالة مراجعة التوصيات) */
/* v148: مفيش تغيير في الجداول (مرفق صورة / PDF مع التوصية — مقفول افتراضيًا + بحث لوحة التحكم) */
/* v149: مفيش تغيير في قاعدة البيانات (الزائر بيحمّل ملفات الصفحة العامة بس) */
/* v150: جدول rate_limits (حماية من سحب البيانات بالبوتات) */
/* v151: جدول site_events (تحليلات الزوار — البحث والتطوير) + جدول mkt_items (التسويق) */
/* v152: الإيميل الجديد info@griffine.app — أي نص محفوظ فيه الإيميل القديم بيتغيّر مرة واحدة (صفحات النصوص / المساعد الذكي / اللاندينج / الإعدادات) */
/* v153: نقل الموقع لـ www.griffine.app — أي رابط محفوظ فيه griffine.store بيتغيّر لـ griffine.app مرة واحدة (نفس الجداول) */
/* v154: جدول broadcasts («📢 رسالة لكل المستخدمين»: السجل + السلة) — صلاحية send_broadcast بتتضاف من الفريق والصلاحيات */
/* v155: مفيش تغيير في الجداول (شعار GRIFFINE في الإيميلات والإشعارات) */
/* v156: جدول broadcast_recipients (الرسائل لأشخاص بالاسم + 📥 الوارد بين الأدمن والموظفين) */
/* v157: مفيش تغيير في الجداول («🔎 الظهور في جوجل» بيتحفظ في site_config) */
/* v85: ترميز الاتصال UTF-8 عشان النصوص العربي اللي بتتضاف من… */
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS users (
 id INT AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(191) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL,
 is_admin TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS subscribers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(191) NOT NULL,
 name VARCHAR(191) NOT NULL,
 phone VARCHAR(50) NOT NULL,
 contact_email VARCHAR(191) NOT NULL,
 national_id VARCHAR(50) NULL,
 address VARCHAR(500) NULL,
 plan_id VARCHAR(20) NOT NULL,
 plan_name VARCHAR(120) NOT NULL,
 amount DECIMAL(10,2) NOT NULL DEFAULT 0,
 currency VARCHAR(50),
 market VARCHAR(50),
 payment_method VARCHAR(20),
 payment_ref VARCHAR(191),
 payment_proof LONGTEXT,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 reminder_enabled TINYINT(1) NOT NULL DEFAULT 1,
 reminder_interval_days INT NOT NULL DEFAULT 2,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS national_id VARCHAR(50) NULL, ADD COLUMN IF NOT EXISTS address VARCHAR(500) NULL;
CREATE TABLE IF NOT EXISTS page_contents (
 page_key VARCHAR(50) NOT NULL PRIMARY KEY,
 content LONGTEXT NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 updated_by VARCHAR(191) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS email_change_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 current_email VARCHAR(191) NOT NULL,
 requested_email VARCHAR(191) NOT NULL,
 status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
 requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 reviewed_at DATETIME NULL,
 reviewed_by VARCHAR(191) NULL,
 review_note TEXT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS reminder_defaults (
 id INT PRIMARY KEY,
 start_before_days INT NOT NULL DEFAULT 6,
 interval_days INT NOT NULL DEFAULT 2
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO reminder_defaults (id, start_before_days, interval_days)
 SELECT 1, 6, 2 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM reminder_defaults WHERE id=1);
CREATE TABLE IF NOT EXISTS password_resets (
 id INT AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(191) NOT NULL,
 token VARCHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 used TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS blacklist (
 id INT AUTO_INCREMENT PRIMARY KEY,
 type ENUM('email','phone','name') NOT NULL,
 value VARCHAR(191) NOT NULL,
 reason VARCHAR(255) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS email_verifications (
 id INT AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(191) NOT NULL,
 token VARCHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL,
 used TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS admin_settings (
 setting_key VARCHAR(64) PRIMARY KEY,
 setting_value TINYINT(1) NOT NULL DEFAULT 1
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS chat_messages (
 id INT AUTO_INCREMENT PRIMARY KEY,
 visitor_email VARCHAR(191) NULL,
 sender ENUM('visitor','admin') NOT NULL DEFAULT 'visitor',
 message TEXT NULL,
 attachment LONGTEXT NULL,
 attachment_name VARCHAR(255) NULL,
 visitor_id VARCHAR(64) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(64) NULL;
ALTER TABLE chat_messages MODIFY COLUMN IF EXISTS visitor_email VARCHAR(191) NULL;
CREATE TABLE IF NOT EXISTS admin_presence (
 id INT PRIMARY KEY,
 last_seen DATETIME NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO admin_presence (id, last_seen)
 SELECT 1, NULL FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_presence WHERE id=1);
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_plan_id VARCHAR(20) NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_plan_name VARCHAR(120) NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(10,2) NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS is_comp TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_payment_method VARCHAR(20) NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_payment_ref VARCHAR(191) NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_payment_proof LONGTEXT NULL;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE reminder_defaults ADD COLUMN IF NOT EXISTS grace_period_days INT NOT NULL DEFAULT 3;
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_email_verification', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_email_verification');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_valid_email_domain', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_valid_email_domain');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_payment_ref', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_payment_ref');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_payment_proof', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_payment_proof');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_card_details', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_card_details');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'require_manual_activation', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='require_manual_activation');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'chat_enabled', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='chat_enabled');
INSERT INTO admin_settings (setting_key, setting_value)
 SELECT 'chat_icon_visible', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key='chat_icon_visible');
CREATE TABLE IF NOT EXISTS chat_conversation_meta (
 visitor_key VARCHAR(191) PRIMARY KEY,
 archived TINYINT(1) NOT NULL DEFAULT 0,
 deleted TINYINT(1) NOT NULL DEFAULT 0,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS vapid_keys (
 id INT PRIMARY KEY,
 public_key VARCHAR(255) NOT NULL,
 private_key VARCHAR(255) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 owner_key VARCHAR(191) NOT NULL,
 endpoint TEXT NOT NULL,
 endpoint_hash CHAR(64) NOT NULL,
 p256dh VARCHAR(255) NOT NULL,
 auth VARCHAR(255) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY unique_sub (owner_key, endpoint_hash)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS subscription_plans (
 id VARCHAR(20) PRIMARY KEY,
 name VARCHAR(120) NOT NULL,
 amount DECIMAL(10,2) NOT NULL DEFAULT 0,
 period_label VARCHAR(50) NOT NULL,
 duration_days INT NOT NULL DEFAULT 30,
 badge VARCHAR(100) NULL,
 save_note VARCHAR(255) NULL,
 features TEXT NULL,
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
 SELECT 'monthly', 'الخطة الشهرية', 100, 'شهريًا', 30, NULL, NULL, '["متابعة عدد غير محدود من الأسهم","خطط تعزيز متوسط كاملة","كشاف الأسهم وملخص المحفظة","تقارير وكشوف حساب PDF/Excel"]', 1, 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='monthly');
INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
 SELECT 'yearly', 'الخطة السنوية', 1000, 'سنويًا', 365, 'الأكثر توفيرًا', 'وفّر 200 عن السعر الشهري (1200)', '["كل مزايا الخطة الشهرية","خصم 200 مقارنة بالاشتراك الشهري ×12","أولوية في الدعم الفني"]', 1, 2 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='yearly');
INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order)
 SELECT 'trial', 'تجربة مجانية', 0, '٣٠ يوم', 30, 'ابدأ مجانًا', NULL, '["تجربة كل المزايا مجانًا","بدون أي التزام","تتحول لاشتراك مدفوع بعد انتهاء الفترة"]', 1, 3 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id='trial');
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS pending_duration_days INT NULL;
CREATE TABLE IF NOT EXISTS staff_members (
 id INT AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(191) NOT NULL UNIQUE,
 job_title VARCHAR(50) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS staff_permissions (
 staff_id INT NOT NULL,
 permission_key VARCHAR(64) NOT NULL,
 PRIMARY KEY (staff_id, permission_key),
 FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_content (
 content_key VARCHAR(64) PRIMARY KEY,
 content_value TEXT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO site_content (content_key, content_value)
 SELECT 'announcement_enabled', '0' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='announcement_enabled');
INSERT INTO site_content (content_key, content_value)
 SELECT 'announcement_text', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='announcement_text');
INSERT INTO site_content (content_key, content_value)
 SELECT 'bg_color', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='bg_color');
INSERT INTO site_content (content_key, content_value)
 SELECT 'text_color', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='text_color');
INSERT INTO site_content (content_key, content_value)
 SELECT 'accent_color', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='accent_color');
INSERT INTO site_content (content_key, content_value)
 SELECT 'font_family', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='font_family');
INSERT INTO site_content (content_key, content_value)
 SELECT 'font_size_base', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='font_size_base');
INSERT INTO site_content (content_key, content_value)
 SELECT 'hero_banner_type', 'none' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_banner_type');
INSERT INTO site_content (content_key, content_value)
 SELECT 'hero_banner_url', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_banner_url');
INSERT INTO site_content (content_key, content_value)
 SELECT 'hero_title', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_title');
INSERT INTO site_content (content_key, content_value)
 SELECT 'hero_subtitle', '' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='hero_subtitle');
INSERT INTO site_content (content_key, content_value)
 SELECT 'custom_buttons', '[]' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE content_key='custom_buttons');
CREATE TABLE IF NOT EXISTS subscription_events (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(191) NOT NULL,
 event_type VARCHAR(30) NOT NULL,
 plan_id VARCHAR(20) NULL,
 plan_name VARCHAR(120) NULL,
 amount DECIMAL(10,2) NOT NULL DEFAULT 0,
 event_date DATE NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS disclaimer_acceptances (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(191) NOT NULL,
 disclaimer_version INT NOT NULL,
 accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY unique_accept (account_email, disclaimer_version)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS screener_settings (
 setting_key VARCHAR(64) PRIMARY KEY,
 setting_value VARCHAR(64) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS recommendations (
 id INT AUTO_INCREMENT PRIMARY KEY,
 symbol VARCHAR(20) NOT NULL,
 stock_name VARCHAR(120) NOT NULL,
 buy_from DECIMAL(12,3) NOT NULL,
 buy_to DECIMAL(12,3) NOT NULL,
 resistance1 DECIMAL(12,3) NULL, resistance1_pct DECIMAL(5,2) NULL,
 resistance2 DECIMAL(12,3) NULL, resistance2_pct DECIMAL(5,2) NULL,
 resistance3 DECIMAL(12,3) NULL, resistance3_pct DECIMAL(5,2) NULL,
 support1 DECIMAL(12,3) NULL,
 support2 DECIMAL(12,3) NULL,
 support3 DECIMAL(12,3) NULL,
 validity_hours INT NOT NULL DEFAULT 24,
 archived TINYINT(1) NOT NULL DEFAULT 0,
 archived_at DATETIME NULL,
 created_by VARCHAR(191) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS validity_hours INT NOT NULL DEFAULT 24;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS archived_at DATETIME NULL;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
CREATE TABLE IF NOT EXISTS recommendation_settings (
 setting_key VARCHAR(64) PRIMARY KEY,
 setting_value VARCHAR(64) NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO recommendation_settings (setting_key, setting_value)
 SELECT 'retention_hours', '24' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM recommendation_settings);
ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_account_email (account_email);
ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_archived_active (archived, active);
ALTER TABLE blacklist ADD INDEX IF NOT EXISTS idx_type_value (type, value);
ALTER TABLE chat_messages ADD INDEX IF NOT EXISTS idx_visitor_id (visitor_id);
ALTER TABLE chat_messages ADD INDEX IF NOT EXISTS idx_visitor_email (visitor_email);
ALTER TABLE subscription_events ADD INDEX IF NOT EXISTS idx_account_email (account_email);
ALTER TABLE subscription_events ADD INDEX IF NOT EXISTS idx_event_date (event_date);
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_archived (archived);
CREATE TABLE IF NOT EXISTS testimonials (
 id INT AUTO_INCREMENT PRIMARY KEY,
 customer_email VARCHAR(191) NOT NULL,
 display_name VARCHAR(100) NOT NULL,
 rating TINYINT NOT NULL DEFAULT 5,
 comment_text VARCHAR(500) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS articles (
 id INT AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(200) NOT NULL,
 slug VARCHAR(200) NOT NULL UNIQUE,
 body TEXT NOT NULL,
 summary VARCHAR(300) NULL,
 published TINYINT(1) NOT NULL DEFAULT 1,
 created_by VARCHAR(191) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) NULL UNIQUE;
CREATE TABLE IF NOT EXISTS referrals (
 id INT AUTO_INCREMENT PRIMARY KEY,
 referrer_email VARCHAR(191) NOT NULL,
 referred_email VARCHAR(191) NOT NULL UNIQUE,
 rewarded TINYINT(1) NOT NULL DEFAULT 0,
 rewarded_at DATETIME NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data MEDIUMTEXT NULL;
CREATE TABLE IF NOT EXISTS suggestions (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(191) NOT NULL,
 message TEXT NOT NULL,
 attachment_data MEDIUMTEXT NULL,
 attachment_name VARCHAR(255) NULL,
 attachment_type VARCHAR(100) NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'new',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS page_backgrounds (
 page_key VARCHAR(60) NOT NULL PRIMARY KEY,
 image_data LONGTEXT NULL,
 updated_by VARCHAR(191) NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_data_store (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 data_key VARCHAR(50) NOT NULL,
 data_value LONGTEXT NOT NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uniq_email_key (account_email, data_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_plans (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 plan_type VARCHAR(20) NOT NULL,
 symbol VARCHAR(64) NOT NULL,
 data_value LONGTEXT NULL,
 version INT NOT NULL DEFAULT 1,
 deleted TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uniq_plan (account_email, plan_type, symbol),
 KEY idx_plans_email (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS login_attempts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(190) NOT NULL,
 ip VARCHAR(45) NOT NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_la_email (email, created_at),
 KEY idx_la_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS account_email VARCHAR(190) NULL, ADD KEY IF NOT EXISTS idx_push_email (account_email);
CREATE TABLE IF NOT EXISTS ui_customizations (
 ui_key VARCHAR(50) NOT NULL PRIMARY KEY,
 data_value LONGTEXT NOT NULL,
 updated_by VARCHAR(190) NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS email_log (
 id INT AUTO_INCREMENT PRIMARY KEY,
 to_email VARCHAR(190) NOT NULL,
 subject VARCHAR(255) NOT NULL,
 mail_type VARCHAR(40) NOT NULL DEFAULT 'general',
 status VARCHAR(10) NOT NULL,
 transport VARCHAR(10) NULL,
 error_text VARCHAR(500) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_email_log_created (created_at),
 KEY idx_email_log_to (to_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE chat_conversation_meta ADD COLUMN IF NOT EXISTS admin_read_at DATETIME NULL;
UPDATE users SET is_admin = 1 WHERE LOWER(username) = 'top72026@gmail.com' AND archived = 0;
ALTER TABLE chat_conversation_meta ADD COLUMN IF NOT EXISTS allow_upload TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_visitor_id VARCHAR(64) NULL, ADD KEY IF NOT EXISTS idx_users_chat_visitor (chat_visitor_id);
ALTER TABLE chat_conversation_meta ADD COLUMN IF NOT EXISTS max_upload_mb INT NULL DEFAULT NULL;
CREATE TABLE IF NOT EXISTS site_config (
 config_key VARCHAR(64) NOT NULL PRIMARY KEY,
 config_value TEXT NULL,
 updated_by VARCHAR(190) NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS payment_orders (
 id INT AUTO_INCREMENT PRIMARY KEY,
 provider VARCHAR(20) NOT NULL DEFAULT 'paymob',
 merchant_ref VARCHAR(40) NOT NULL,
 provider_order_id VARCHAR(40) NULL,
 provider_txn_id VARCHAR(40) NULL,
 kind VARCHAR(10) NOT NULL DEFAULT 'new',
 subscriber_id INT NOT NULL DEFAULT 0,
 account_email VARCHAR(190) NOT NULL,
 plan_id VARCHAR(64) NOT NULL,
 immediate TINYINT(1) NOT NULL DEFAULT 0,
 amount_cents INT NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'pending',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 paid_at DATETIME NULL,
 UNIQUE KEY uq_payment_merchant (merchant_ref),
 KEY idx_payment_provider_order (provider, provider_order_id),
 KEY idx_payment_email (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS job_titles (
 title_key VARCHAR(40) NOT NULL PRIMARY KEY,
 label VARCHAR(100) NOT NULL,
 default_perms TEXT NULL,
 sort_order INT NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO job_titles (title_key, label, default_perms, sort_order) VALUES
 ('site_manager', 'مدير موقع', '["manage_staff","manage_admin_settings","manage_subscribers","manage_plans","manage_blacklist","manage_reminders","view_chat","reply_chat","edit_site_design","view_reports","manage_recommendations","manage_content","manage_testimonials","manage_suggestions","manage_hr"]', 1),
 ('editor', 'مبرمج للتنسيق والتعديل', '["edit_site_design","manage_content","manage_testimonials"]', 2),
 ('customer_service', 'خدمة عملاء', '["view_chat","reply_chat"]', 3),
 ('sales', 'مندوب مبيعات', '["manage_subscribers","view_chat","reply_chat","view_reports","manage_recommendations"]', 4),
 ('accounts', 'مدير حسابات', '["manage_subscribers","manage_plans","manage_reminders","view_reports","manage_hr"]', 5);
CREATE TABLE IF NOT EXISTS hr_employees (
 id INT AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(150) NOT NULL,
 job_title VARCHAR(40) NULL,
 phone VARCHAR(30) NULL,
 email VARCHAR(190) NULL,
 national_id VARCHAR(20) NULL,
 salary DECIMAL(12,2) NOT NULL DEFAULT 0,
 start_date DATE NULL,
 end_date DATE NULL,
 status VARCHAR(10) NOT NULL DEFAULT 'active',
 notes TEXT NULL,
 created_by VARCHAR(190) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_hr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hr_documents (
 id INT AUTO_INCREMENT PRIMARY KEY,
 employee_id INT NOT NULL,
 file_token VARCHAR(80) NOT NULL,
 file_name VARCHAR(150) NOT NULL,
 uploaded_by VARCHAR(190) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_hr_docs_emp (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hr_attendance (
 employee_id INT NOT NULL,
 month CHAR(7) NOT NULL,
 work_days DECIMAL(5,1) NOT NULL DEFAULT 26,
 present_days DECIMAL(5,1) NOT NULL DEFAULT 0,
 bonus DECIMAL(12,2) NOT NULL DEFAULT 0,
 deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
 base_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
 note VARCHAR(255) NULL,
 updated_by VARCHAR(190) NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (employee_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO staff_permissions (staff_id, permission_key)
 SELECT staff_id, 'manage_testimonials' FROM staff_permissions WHERE permission_key = 'manage_content';
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS archived TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS deleted TINYINT(1) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS user_watchlist (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 symbol VARCHAR(20) NOT NULL,
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_watch (account_email, symbol, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS alert_targets (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 symbol VARCHAR(20) NOT NULL,
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 plan_kind VARCHAR(5) NOT NULL DEFAULT 'DCA',
 side VARCHAR(4) NOT NULL DEFAULT 'buy',
 price DECIMAL(14,4) NOT NULL,
 label VARCHAR(150) NULL,
 triggered_at DATETIME NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_target (account_email, symbol, market, plan_kind, side),
 KEY idx_target_open (triggered_at, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_alerts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 title VARCHAR(200) NOT NULL,
 body VARCHAR(500) NULL,
 symbol VARCHAR(20) NULL,
 market VARCHAR(20) NULL,
 is_read TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_alerts_user (account_email, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
 account_email VARCHAR(190) NOT NULL,
 snap_date DATE NOT NULL,
 currency VARCHAR(5) NOT NULL DEFAULT 'EGP',
 value DECIMAL(16,2) NOT NULL DEFAULT 0,
 cost DECIMAL(16,2) NOT NULL DEFAULT 0,
 PRIMARY KEY (account_email, snap_date, currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS payment_cards (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 provider VARCHAR(20) NOT NULL DEFAULT 'paymob',
 card_token VARCHAR(255) NOT NULL,
 masked_pan VARCHAR(25) NULL,
 brand VARCHAR(20) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_card_owner (account_email, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS auto_renew TINYINT(1) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS plan_trades (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 plan_kind VARCHAR(5) NOT NULL DEFAULT 'DCA',
 symbol VARCHAR(64) NOT NULL,
 market VARCHAR(20) NULL,
 trade_type VARCHAR(6) NOT NULL,
 qty DECIMAL(18,4) NOT NULL DEFAULT 0,
 price DECIMAL(16,4) NOT NULL DEFAULT 0,
 exit_price DECIMAL(16,4) NULL,
 profit DECIMAL(16,2) NULL,
 capital DECIMAL(16,2) NULL,
 trade_date DATE NULL,
 level INT NULL,
 KEY idx_trades_owner (account_email, plan_kind),
 KEY idx_trades_symbol (symbol),
 KEY idx_trades_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS chat_faq (
 id INT AUTO_INCREMENT PRIMARY KEY,
 question VARCHAR(300) NOT NULL,
 keywords VARCHAR(500) NULL,
 answer TEXT NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0,
 hits INT NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS custom_alerts (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 symbol VARCHAR(20) NOT NULL,
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 currency VARCHAR(5) NOT NULL DEFAULT 'EGP',
 cond VARCHAR(3) NOT NULL DEFAULT 'gte',
 target_price DECIMAL(14,4) NOT NULL,
 max_repeats TINYINT NOT NULL DEFAULT 1,
 repeat_minutes INT NOT NULL DEFAULT 60,
 sent_count TINYINT NOT NULL DEFAULT 0,
 last_sent_at DATETIME NULL,
 last_price DECIMAL(14,4) NULL,
 last_checked_at DATETIME NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 note VARCHAR(150) NULL,
 deleted_at DATETIME NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_custom_owner (account_email),
 KEY idx_custom_open (active, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS trash_bin (
 id INT AUTO_INCREMENT PRIMARY KEY,
 deleted_by VARCHAR(190) NOT NULL,
 owner_email VARCHAR(190) NULL,
 scope VARCHAR(10) NOT NULL DEFAULT 'user',
 item_type VARCHAR(30) NOT NULL,
 item_label VARCHAR(255) NOT NULL,
 payload LONGTEXT NOT NULL,
 deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 restored_at DATETIME NULL,
 restored_by VARCHAR(190) NULL,
 KEY idx_trash_by (deleted_by, restored_at),
 KEY idx_trash_owner (owner_email, restored_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO chat_faq (question, keywords, answer, sort_order)
SELECT * FROM (
 SELECT 'ما هي الباقات والأسعار؟' AS q, 'سعر, اسعار, باقه, باقات, تكلفه, كام' AS k, 'تجد كل الباقات وأسعارها ومميزات كل باقة في صفحة «الاشتراك والباقات» من القائمة الجانبية. يمكنك البدء بالتجربة المجانية إن كانت متاحة لحسابك.' AS a, 1 AS o
 UNION ALL SELECT 'كيف أشترك؟', 'اشترك, اشتراك, تفعيل, ادفع, الدفع', 'افتح «الاشتراك والباقات»، اختر الباقة، ثم اختر طريقة الدفع: بطاقة بنكية (Paymob) أو فودافون كاش أو إنستاباي مع إرسال صورة التحويل. يتم التفعيل تلقائيًا للدفع بالبطاقة، وبعد المراجعة للتحويلات.', 2
 UNION ALL SELECT 'ما هي خطة تعزيز المتوسط (DCA)؟', 'dca, تعزيز, المتوسط, متوسط', 'خطة تعزيز المتوسط تقسّم رأس مالك على مستويات شراء متتالية كلما نزل السعر، فيقل متوسط تكلفة السهم، ثم تبيع عند هدف الربح. أنشئها من «خطط تعزيز المتوسط (DCA)» واتبع الخطوات.', 3
 UNION ALL SELECT 'ما هي خطة الشبكة (Grid)؟', 'grid, شبكه, جريد', 'خطة الشبكة تضع مستويات شراء وبيع على مسافات ثابتة داخل نطاق سعري، فتشتري عند كل مستوى أقل وتبيع عند المستوى الأعلى، وتتكرر الدورات لتحقيق أرباح صغيرة متكررة.', 4
 UNION ALL SELECT 'نسيت كلمة المرور', 'نسيت, كلمه المرور, كلمه السر, باسورد, password', 'من شاشة تسجيل الدخول اضغط «نسيت كلمة المرور» واكتب بريدك الإلكتروني، وسيصلك رابط لتعيين كلمة مرور جديدة.', 5
 UNION ALL SELECT 'هل الأسعار لحظية؟', 'لحظي, لحظيه, متاخره, تاخير, الاسعار', 'أسعار الأسهم في الموقع متأخرة حوالي 15 دقيقة عن السوق، وتُستخدم للمتابعة والتنبيهات فقط وليست توصية بالشراء أو البيع.', 6
) t WHERE NOT EXISTS (SELECT 1 FROM chat_faq);
ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS dismissed TINYINT(1) NOT NULL DEFAULT 0;
UPDATE user_alerts SET body = REPLACE(REPLACE(body, 'في خطتك (DCA)', 'في خطة تعزيز المتوسط'), 'في خطتك (Grid)', 'في خطة خطوط الشبكة')
 WHERE body LIKE '%(DCA)%' OR body LIKE '%(Grid)%';
UPDATE page_contents SET content = REPLACE(content, 'DAC', 'DCA') WHERE content LIKE BINARY '%DAC%';
UPDATE page_contents SET content = REPLACE(REPLACE(content, 'لشركة Top7،', 'لشركة Top7 المصرية،'), ' في الأسواق المصرية والخليجية', '')
 WHERE content LIKE '%Top7%' AND content NOT LIKE '%Top7 المصرية%';
UPDATE ui_customizations SET data_value = REPLACE(data_value, 'DAC', 'DCA') WHERE data_value LIKE BINARY '%DAC%';
CREATE TABLE IF NOT EXISTS code_counters (
 prefix VARCHAR(10) NOT NULL PRIMARY KEY,
 last_no INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS member_code_history (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 code VARCHAR(20) NOT NULL,
 kind VARCHAR(10) NOT NULL DEFAULT 'member',
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_code_hist (account_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_no INT NULL, ADD COLUMN IF NOT EXISTS inv_code VARCHAR(20) NULL, ADD UNIQUE KEY IF NOT EXISTS uq_inv_code (inv_code);
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) NULL, ADD UNIQUE KEY IF NOT EXISTS uq_staff_code (staff_code);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_market VARCHAR(20) NOT NULL DEFAULT 'مصر';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS market VARCHAR(20) NOT NULL DEFAULT 'مصر';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS market VARCHAR(20) NOT NULL DEFAULT 'مصر';
UPDATE subscribers SET market = 'مصر' WHERE market IS NULL OR market = '';
ALTER TABLE alert_targets ADD COLUMN IF NOT EXISTS meta TEXT NULL;
ALTER TABLE alert_targets ADD COLUMN IF NOT EXISTS rearmed TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE user_alerts MODIFY COLUMN IF EXISTS body TEXT NULL;
CREATE TABLE IF NOT EXISTS symbol_checks (
 symbol VARCHAR(64) NOT NULL,
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 first_fail_at DATETIME NULL,
 last_fail_at DATETIME NULL,
 fails INT NOT NULL DEFAULT 0,
 banned TINYINT(1) NOT NULL DEFAULT 0,
 PRIMARY KEY (symbol, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE user_alerts ADD INDEX IF NOT EXISTS idx_alerts_owner_id (account_email, id);
ALTER TABLE password_resets ADD INDEX IF NOT EXISTS idx_reset_token (token);
ALTER TABLE email_verifications ADD INDEX IF NOT EXISTS idx_verify_token (token);
ALTER TABLE email_change_requests ADD INDEX IF NOT EXISTS idx_ecr_email (current_email, status);
ALTER TABLE referrals ADD INDEX IF NOT EXISTS idx_ref_referrer (referrer_email);
ALTER TABLE subscription_events ADD INDEX IF NOT EXISTS idx_events_owner_date (account_email, event_date);
ALTER TABLE subscribers ADD INDEX IF NOT EXISTS idx_subs_end (active, end_date);
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_rec_archived_created (archived, created_at);
ALTER TABLE trash_bin ADD INDEX IF NOT EXISTS idx_trash_clean (restored_at, deleted_at);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_users_market (account_market);
ALTER TABLE chat_messages ADD INDEX IF NOT EXISTS idx_chat_created (created_at);
ALTER TABLE custom_alerts ADD INDEX IF NOT EXISTS idx_custom_sym_mkt (symbol, market, active);
CREATE TABLE IF NOT EXISTS opportunities (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 opp_no INT NOT NULL DEFAULT 1,
 side VARCHAR(4) NOT NULL DEFAULT 'buy',
 timeframe VARCHAR(4) NOT NULL DEFAULT '1d',
 indicators TEXT NOT NULL,
 days TINYINT NOT NULL DEFAULT 1,
 ch_app TINYINT(1) NOT NULL DEFAULT 1,
 ch_email TINYINT(1) NOT NULL DEFAULT 1,
 max_sends TINYINT NOT NULL DEFAULT 1,
 send_gap INT NOT NULL DEFAULT 60,
 status VARCHAR(8) NOT NULL DEFAULT 'active',
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 started_at DATETIME NULL,
 ends_at DATETIME NULL,
 sends_count TINYINT NOT NULL DEFAULT 0,
 last_sent_at DATETIME NULL,
 last_run_at DATETIME NULL,
 last_pass_at DATETIME NULL,
 scan_pos INT NOT NULL DEFAULT 0,
 pass_no INT NOT NULL DEFAULT 0,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_opp_owner (account_email, status),
 KEY idx_opp_run (status, last_pass_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS opportunity_hits (
 id INT AUTO_INCREMENT PRIMARY KEY,
 opp_id INT NOT NULL,
 account_email VARCHAR(190) NOT NULL,
 symbol VARCHAR(20) NOT NULL,
 name VARCHAR(190) NULL,
 price DECIMAL(16,4) NOT NULL DEFAULT 0,
 pass_no INT NOT NULL DEFAULT 0,
 hit_at DATETIME NULL,
 notified TINYINT(1) NOT NULL DEFAULT 0,
 sent_no TINYINT NOT NULL DEFAULT 0,
 UNIQUE KEY uq_opp_sym (opp_id, symbol),
 KEY idx_hit_notify (opp_id, notified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS notify_prefs (
 account_email VARCHAR(190) NOT NULL PRIMARY KEY,
 app TINYINT(1) NOT NULL DEFAULT 1,
 email TINYINT(1) NOT NULL DEFAULT 1,
 wa TINYINT(1) NOT NULL DEFAULT 0,
 wa_phone VARCHAR(30) NULL,
 user_visible TINYINT(1) NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS basira_reports (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 symbol VARCHAR(20) NOT NULL,
 market VARCHAR(20) NOT NULL DEFAULT 'مصر',
 score TINYINT NOT NULL DEFAULT 50,
 verdict VARCHAR(40) NOT NULL DEFAULT '',
 data MEDIUMTEXT NOT NULL,
 share_token VARCHAR(40) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_bs_owner (account_email, id),
 UNIQUE KEY uq_bs_share (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mizan_studies (
 id INT AUTO_INCREMENT PRIMARY KEY,
 account_email VARCHAR(190) NOT NULL,
 mode VARCHAR(10) NOT NULL DEFAULT 'stocks',
 title VARCHAR(200) NOT NULL DEFAULT '',
 data MEDIUMTEXT NOT NULL,
 share_token VARCHAR(40) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_mz_owner (account_email, id),
 UNIQUE KEY uq_mz_share (share_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS user_ai_access (
 account_email VARCHAR(190) NOT NULL PRIMARY KEY,
 basira TINYINT(1) NOT NULL DEFAULT 1,
 mizan TINYINT(1) NOT NULL DEFAULT 1,
 mizanai TINYINT(1) NOT NULL DEFAULT 1,
 paid TINYINT(1) NULL,
 daily_limit INT NULL,
 used_day DATE NULL,
 used_count INT NOT NULL DEFAULT 0,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS includes_ai TINYINT(1) NOT NULL DEFAULT 0;
INSERT INTO subscription_plans (id, name, amount, period_label, duration_days, badge, save_note, features, is_active, sort_order, includes_ai)
 SELECT 'pro_yearly', 'برو سنوي — شامل الذكاء الاصطناعي', 3000, 'سنويًا', 365, 'برو ✨', 'كل المزايا + خدمات الذكاء الاصطناعي والتحليل',
 '["كل مزايا الخطة السنوية","بصيرة AI — تحليل الأسهم بالذكاء الاصطناعي","ميزان محفظتك AI","ميزان GRIFFINE AI — توزيع الاستثمار","أولوية في الدعم"]', 1, 4, 1
 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = 'pro_yearly');
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS rec_type VARCHAR(6) NOT NULL DEFAULT 'buy', ADD COLUMN IF NOT EXISTS timeframe VARCHAR(8) NULL, ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NULL,
 ADD COLUMN IF NOT EXISTS pivot DECIMAL(14,4) NULL, ADD COLUMN IF NOT EXISTS last_price DECIMAL(14,4) NULL,
 ADD COLUMN IF NOT EXISTS stop1 DECIMAL(14,4) NULL, ADD COLUMN IF NOT EXISTS stop1_pct DECIMAL(6,2) NULL, ADD COLUMN IF NOT EXISTS stop2 DECIMAL(14,4) NULL, ADD COLUMN IF NOT EXISTS stop2_pct DECIMAL(6,2) NULL,
 ADD COLUMN IF NOT EXISTS sell_pct DECIMAL(6,2) NULL, ADD COLUMN IF NOT EXISTS note TEXT NULL, ADD COLUMN IF NOT EXISTS channels VARCHAR(20) NULL, ADD COLUMN IF NOT EXISTS analyst_name VARCHAR(120) NULL;
ALTER TABLE recommendations MODIFY COLUMN IF EXISTS buy_from DECIMAL(14,4) NOT NULL, MODIFY COLUMN IF EXISTS buy_to DECIMAL(14,4) NOT NULL;
CREATE TABLE IF NOT EXISTS recommendation_updates (
 id INT AUTO_INCREMENT PRIMARY KEY,
 rec_id INT NOT NULL,
 kind VARCHAR(10) NOT NULL DEFAULT 'note',
 message TEXT NOT NULL,
 created_by VARCHAR(190) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_ru_rec (rec_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rec_outbox (
 id INT AUTO_INCREMENT PRIMARY KEY,
 rec_id INT NOT NULL,
 upd_id INT NULL,
 account_email VARCHAR(190) NOT NULL,
 channel VARCHAR(6) NOT NULL,
 status TINYINT(1) NOT NULL DEFAULT 0,
 error VARCHAR(255) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 sent_at DATETIME NULL,
 KEY idx_ro_status (status, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS stop3 DECIMAL(14,4) NULL, ADD COLUMN IF NOT EXISTS stop3_pct DECIMAL(6,2) NULL,
 ADD COLUMN IF NOT EXISTS img_key VARCHAR(40) NULL, ADD COLUMN IF NOT EXISTS attach VARCHAR(60) NULL, ADD COLUMN IF NOT EXISTS ai_text TEXT NULL, ADD COLUMN IF NOT EXISTS indicators TEXT NULL,
 ADD COLUMN IF NOT EXISTS expired_notified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_rec_active (archived, created_at);
INSERT IGNORE INTO job_titles (title_key, label, default_perms, sort_order) VALUES ('financial_analyst', 'محلل مالي', '["manage_recommendations"]', 6);
CREATE TABLE IF NOT EXISTS mizan_user_rates (
 account_email VARCHAR(190) NOT NULL,
 market VARCHAR(20) NOT NULL,
 mode VARCHAR(8) NOT NULL DEFAULT 'auto',
 rates TEXT NULL,
 updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (account_email, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mizan_rates_log (
 id INT AUTO_INCREMENT PRIMARY KEY,
 market VARCHAR(20) NOT NULL,
 old_rates TEXT NULL,
 new_rates TEXT NULL,
 sources TEXT NULL,
 trigger_kind VARCHAR(8) NOT NULL DEFAULT 'auto',
 created_by VARCHAR(190) NULL,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 KEY idx_mrl_market (market, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(190) NULL, ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL, ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(300) NULL;
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_rec_status (status, id);
UPDATE job_titles SET default_perms = '["manage_recommendations","rec_needs_review"]' WHERE title_key = 'financial_analyst' AND default_perms = '["manage_recommendations"]';
INSERT IGNORE INTO staff_permissions (staff_id, permission_key) SELECT sp.staff_id, 'rec_needs_review' FROM staff_permissions sp JOIN staff_members s ON s.id = sp.staff_id WHERE sp.permission_key = 'rec_approve' AND s.job_title = 'financial_analyst' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_132_rec');
DELETE sp FROM staff_permissions sp JOIN staff_members s ON s.id = sp.staff_id WHERE sp.permission_key = 'rec_approve' AND s.job_title = 'financial_analyst' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_132_rec');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_132_rec', '1');
ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NULL, ADD COLUMN IF NOT EXISTS rec_id INT NULL;
ALTER TABLE user_alerts MODIFY COLUMN title VARCHAR(255) NOT NULL;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS perks TEXT NULL;
UPDATE subscription_plans SET name = 'الباقة المجانية', features = '["أول 20 يوم: كل مميزات الموقع مفتوحة عشان تتعرّف عليها","بعدها 10 أيام بمميزات الباقة المجانية","من غير أي التزام أو كارت"]' WHERE id = 'trial' AND name = 'تجربة مجانية';
UPDATE subscription_plans SET amount = 200 WHERE id = 'monthly' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_135_price');
UPDATE subscription_plans SET amount = 2000, save_note = 'وفّر 400 عن السعر الشهري (2400)', features = REPLACE(features, 'خصم 200', 'خصم 400') WHERE id = 'yearly' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_135_price');
UPDATE subscription_plans SET amount = 3000 WHERE id = 'pro_yearly' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_135_price');
UPDATE subscription_plans SET amount = 0 WHERE id = 'trial' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_135_price');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_135_price', '1');
UPDATE subscription_plans SET sort_order = CASE id WHEN 'trial' THEN 1 WHEN 'monthly' THEN 2 WHEN 'yearly' THEN 3 WHEN 'pro_yearly' THEN 4 ELSE sort_order END WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_136_order');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_136_order', '1');
CREATE TABLE IF NOT EXISTS user_perks (account_email VARCHAR(191) NOT NULL PRIMARY KEY, plus_keys TEXT NULL, minus_keys TEXT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO user_perks (account_email, minus_keys) SELECT LOWER(account_email), CONCAT('[', CONCAT_WS(',', IF(basira = 0, '"basira","basira_scan"', NULL), IF(mizan = 0, '"mizan"', NULL), IF(mizanai = 0, '"mizanai"', NULL)), ']') FROM user_ai_access WHERE (basira = 0 OR mizan = 0 OR mizanai = 0) AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_138_perks') ON DUPLICATE KEY UPDATE minus_keys = VALUES(minus_keys);
UPDATE user_ai_access SET basira = 1, mizan = 1, mizanai = 1 WHERE NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_138_perks');
INSERT INTO subscribers (account_email, name, phone, contact_email, plan_id, plan_name, amount, market, start_date, end_date, active) SELECT LOWER(u.username), SUBSTRING_INDEX(u.username, '@', 1), '', LOWER(u.username), p.id, p.name, 0, COALESCE(NULLIF(u.account_market, ''), 'مصر'), CURDATE(), DATE_ADD(CURDATE(), INTERVAL p.duration_days DAY), 1 FROM users u JOIN subscription_plans p ON p.id = 'trial' WHERE u.is_admin = 0 AND COALESCE(u.archived, 0) = 0 AND NOT EXISTS (SELECT 1 FROM subscribers s WHERE LOWER(s.account_email) = LOWER(u.username)) AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_138_perks');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_138_perks', '1');
UPDATE ui_customizations SET data_value = JSON_SET(data_value, '$.stats.items[0].mode', 'manual', '$.stats.items[0].value', 12480, '$.stats.items[1].mode', 'manual', '$.stats.items[1].value', 860, '$.stats.items[2].mode', 'manual', '$.stats.items[2].value', 2140, '$.stats.items[3].mode', 'manual', '$.stats.items[3].value', 9750) WHERE ui_key = 'landing' AND JSON_VALID(data_value) AND JSON_CONTAINS_PATH(data_value, 'one', '$.stats.items[3]') AND JSON_UNQUOTE(JSON_EXTRACT(data_value, '$.stats.items[0].key')) = 'visitors' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_146_stats');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_146_stats', '1');
CREATE TABLE IF NOT EXISTS rate_limits (k VARCHAR(100) NOT NULL PRIMARY KEY, n INT NOT NULL DEFAULT 0, win INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP, day DATE NOT NULL, ev VARCHAR(12) NOT NULL, vid VARCHAR(40) NOT NULL, screen VARCHAR(60) NOT NULL DEFAULT '', src VARCHAR(40) NOT NULL DEFAULT 'direct', device VARCHAR(10) NOT NULL DEFAULT '', browser VARCHAR(20) NOT NULL DEFAULT '', os VARCHAR(20) NOT NULL DEFAULT '', country VARCHAR(4) NOT NULL DEFAULT '', logged TINYINT NOT NULL DEFAULT 0, ms INT NOT NULL DEFAULT 0, x VARCHAR(200) NOT NULL DEFAULT '', KEY ix_day_ev (day, ev), KEY ix_vid (vid)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS mkt_items (id INT AUTO_INCREMENT PRIMARY KEY, kind VARCHAR(10) NOT NULL, platform VARCHAR(20) NOT NULL DEFAULT '', title VARCHAR(200) NOT NULL, body TEXT NULL, campaign VARCHAR(40) NOT NULL DEFAULT '', status VARCHAR(12) NOT NULL DEFAULT 'todo', due DATE NULL, url VARCHAR(300) NOT NULL DEFAULT '', auto_key VARCHAR(60) NULL, created_by VARCHAR(190) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, done_at DATETIME NULL, UNIQUE KEY ux_auto (auto_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
UPDATE page_contents SET content = REPLACE(content, 'info@griffine.store', 'info@griffine.app') WHERE content LIKE '%info@griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_152_mail');
UPDATE chat_faq SET answer = REPLACE(answer, 'info@griffine.store', 'info@griffine.app') WHERE answer LIKE '%info@griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_152_mail');
UPDATE ui_customizations SET data_value = REPLACE(data_value, 'info@griffine.store', 'info@griffine.app') WHERE data_value LIKE '%info@griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_152_mail');
UPDATE site_config SET config_value = REPLACE(config_value, 'info@griffine.store', 'info@griffine.app') WHERE config_value LIKE '%info@griffine.store%' AND NOT EXISTS (SELECT 1 FROM (SELECT config_key FROM site_config WHERE config_key = 'mig_152_mail') x);
UPDATE site_content SET content_value = REPLACE(content_value, 'info@griffine.store', 'info@griffine.app') WHERE content_value LIKE '%info@griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_152_mail');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_152_mail', '1');
UPDATE page_contents SET content = REPLACE(content, 'griffine.store', 'griffine.app') WHERE content LIKE '%griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_153_domain');
UPDATE chat_faq SET answer = REPLACE(answer, 'griffine.store', 'griffine.app') WHERE answer LIKE '%griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_153_domain');
UPDATE ui_customizations SET data_value = REPLACE(data_value, 'griffine.store', 'griffine.app') WHERE data_value LIKE '%griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_153_domain');
UPDATE site_config SET config_value = REPLACE(config_value, 'griffine.store', 'griffine.app') WHERE config_value LIKE '%griffine.store%' AND NOT EXISTS (SELECT 1 FROM (SELECT config_key FROM site_config WHERE config_key = 'mig_153_domain') x);
UPDATE site_content SET content_value = REPLACE(content_value, 'griffine.store', 'griffine.app') WHERE content_value LIKE '%griffine.store%' AND NOT EXISTS (SELECT 1 FROM site_config WHERE config_key = 'mig_153_domain');
INSERT IGNORE INTO site_config (config_key, config_value) VALUES ('mig_153_domain', '1');
CREATE TABLE IF NOT EXISTS broadcasts (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(200) NOT NULL, body TEXT NOT NULL, btn_label VARCHAR(80) NOT NULL DEFAULT '', btn_url VARCHAR(300) NOT NULL DEFAULT '', ch_app TINYINT NOT NULL DEFAULT 1, ch_mail TINYINT NOT NULL DEFAULT 1, audience VARCHAR(12) NOT NULL DEFAULT 'all', total INT NOT NULL DEFAULT 0, sent_app INT NOT NULL DEFAULT 0, sent_mail INT NOT NULL DEFAULT 0, status VARCHAR(10) NOT NULL DEFAULT 'sending', last_uid INT NOT NULL DEFAULT 0, created_by VARCHAR(190) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME NULL, deleted TINYINT NOT NULL DEFAULT 0, deleted_at DATETIME NULL, deleted_by VARCHAR(190) NULL, KEY ix_del (deleted, id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS broadcast_recipients (id INT AUTO_INCREMENT PRIMARY KEY, broadcast_id INT NOT NULL, email VARCHAR(190) NOT NULL, KEY ix_b (broadcast_id, id), KEY ix_e (email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SELECT 'GRIFFINE database is up to date (v157)' AS result;
