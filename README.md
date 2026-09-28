# GRIFFINE

خطط تعزيز المتوسط (DCA) والشبكة (Grid) ومتابعة المحفظة — PHP + MySQL + JavaScript (PWA) على هوستنجر.

## النشر (الإصدار 84)

1. ارفع كل ملفات الموقع في `public_html`.
2. **ملف الأسرار:** انسخ `griffine_config.sample.php` باسم `griffine_config.php`، واملا بيانات قاعدة البيانات وكلمة سر إيميل info@ ومفتاح الـ Cron،
   وارفعه **برّه public_html** (في `domains/griffine.store/` فوق `public_html` مباشرة). الملف ده عمره ما بيترفع على GitHub.
3. شغّل `ALL_SCHEMA_UPDATES.sql` من phpMyAdmin (آمن للتشغيل أكتر من مرة)، وبعدها امسح الملف ده و README.md من السيرفر
   (وهما مقفولين كمان بـ `.htaccess`).
4. من لوحة التحكم ← الإعدادات الإلزامية: فعّل "رابط دخول الإدارة السري" واحفظ الرابط، واكتب رقم الخدمة وبيانات Paymob.

## الملفات المهمة
- `db.php` — الاتصال بقاعدة البيانات والدوال المشتركة (من غير أي أسرار).
- `security_lib.php` — إعدادات لوحة التحكم (site_config)، رابط الإدارة السري، OTP، SMS.
- `paymob_lib.php` / `paymob_callback.php` — بوابة الدفع Paymob.
- `mailer.php` — الإيميلات من info@griffine.store (SMTP).
- الواجهة (بالترتيب في index.php): `shell.js` (الهيكل والتنقل) · `studio.js` · `app-core.js` (الأساس) · `app-public.js` · `app-subscribe.js` · `app-admin.js` · `app-plans.js` · `app-screener.js` · `app-chat.js` · `app-nav.js` · `hr.js` · `markets.js` · `app-init.js` (آخر ملف - تشغيل الموقع).
- `quote_lib.php` / `markets_lib.php` / `markets_api.php` — الأسعار وقائمة المتابعة والتنبيهات ومنحنى المحفظة.
- Cron (بمفتاح CRON_KEY): `send_reminders.php` · `price_alerts_check.php` (كل 15 دقيقة) · `renew_subscriptions.php` (يوميًا).
