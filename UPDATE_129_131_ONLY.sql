/* GRIFFINE — UPDATE_129_131_ONLY.sql
   تحديثات قاعدة البيانات للإصدارات 129 و130 و131 بس (ملف صغير يتلصق في phpMyAdmin من غير ما يتقص).
   شغّله مرة واحدة بعد رفع ملفات الإصدار 131 — آمن لو اتشغل أكتر من مرة.
   لو قاعدة البيانات أقدم من الإصدار 128: ارفع ALL_SCHEMA_UPDATES.sql كامل من تبويب Import (مش لصق). */
SET NAMES utf8mb4;

/* الإصدار 129: وقف الخسارة على 3 مراحل + الرسم البياني وفيبوناتشي (صور على السيرفر برابط سري) + رأي بصيرة AI + المؤشرات المختارة + المرفقات + انتهاء الصلاحية */
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS stop3 DECIMAL(14,4) NULL, ADD COLUMN IF NOT EXISTS stop3_pct DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS img_key VARCHAR(40) NULL, ADD COLUMN IF NOT EXISTS attach VARCHAR(60) NULL, ADD COLUMN IF NOT EXISTS ai_text TEXT NULL, ADD COLUMN IF NOT EXISTS indicators TEXT NULL,
  ADD COLUMN IF NOT EXISTS expired_notified TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_rec_active (archived, created_at);

/* الإصدار 129: المسمّى الوظيفي «محلل مالي» (إرسال التوصيات — وتغيير الاسم الظاهر صلاحية منفصلة الأدمن بيفتحها لو حب) */
INSERT IGNORE INTO job_titles (title_key, label, default_perms, sort_order) VALUES ('financial_analyst', 'محلل مالي', '["manage_recommendations"]', 6);

/* الإصدار 130: أرقام العوائد اللي المستثمر اختارها (تلقائي / يدوي) — محفوظة على حسابه لكل سوق */
CREATE TABLE IF NOT EXISTS mizan_user_rates (
  account_email VARCHAR(190) NOT NULL,
  market VARCHAR(20) NOT NULL,
  mode VARCHAR(8) NOT NULL DEFAULT 'auto',
  rates TEXT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_email, market)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* الإصدار 130: سجل تحديثات العوائد أونلاين (تلقائي / حدّث الآن / الأدمن) */
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

/* الإصدار 131: موافقة الأدمن على التوصية قبل الإرسال (مين وافق / رفض وإمتى + سبب الرفض) — الحالات: draft / pending / rejected / active */
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS approved_by VARCHAR(190) NULL, ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL, ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(300) NULL;
ALTER TABLE recommendations ADD INDEX IF NOT EXISTS idx_rec_status (status, id);

SELECT 'GRIFFINE database is up to date (v131)' AS result;
