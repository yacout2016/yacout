/* =====================================================================
   GRIFFINE — app-chat.js (الإصدار 88) — شات الدردشة العائم (العميل + الأدمن)
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== شات الدردشة العائم ================== */
/* الإصدار 83: لا يوجد إشعارات منبثقة على الشاشة (Notification / Push) للشات خالص - زي ماسنجر:
   التنبيه = نقطة حمرا على أيقونة الشات + صوت (المستخدم يقدر يكتمه) ← chatAlert() */

/* الإصدار 78: الشات بيتظبط حسب الحساب الحالي - ولو الحساب اتغيّر (خروج / دخول بحساب تاني من غير تحديث الصفحة)
   بيتقفل ويتعمل من جديد. قبل كده كان بيفضل بوضع الحساب القديم: عميل يلاقي لوحة "محادثات العملاء"
   بتاعة الأدمن والسيرفر يرفض ← "غير مصرح لك". */
function chatWidgetMode(email){ return (email || 'guest') + '|' + ((window.__isAdmin && hasPermission('view_chat')) ? 'admin' : 'visitor'); }
function teardownChatWidget(){
  ['__chatBgPoll', '__chatPollInterval', '__adminBubblePoll', '__adminBubbleHeartbeat', '__chatQuickPoll'].forEach(k => { if (window[k]) { clearInterval(window[k]); window[k] = null; } });
  window.__adminBubbleCheck = null; window.__adminChatSeen = null;
  ['chatBubble', 'chatPanel'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  window.__chatWidgetMode = null;
}
async function syncChatWidget(email){
  if (window.__chatWidgetMode === undefined) return;            // الشات بعد متعملش أول مرة (init هيعمله)
  if (window.__chatWidgetMode === chatWidgetMode(email)) return; // نفس الحساب ونفس الوضع
  teardownChatWidget();
  await initChatWidget(email);
}

async function initChatWidget(sessionEmail){
  window.__chatWidgetMode = chatWidgetMode(sessionEmail);
  const myMode = window.__chatWidgetMode;
  const [settings] = await Promise.all([getAdminSettings(), loadChatNotifyCfg()]);
  if (window.__chatWidgetMode !== myMode) return;   // الحساب اتغيّر أثناء التحميل
  if (settings.chat_enabled === false) return; // الشات موقوف خالص
  if (settings.chat_icon_visible === false) return; // الأيقونة مخفية

  // الإصدار 77: لوحة "محادثات العملاء" للي عنده صلاحية مشاهدة الشات فقط.
  // أي موظف تاني (أو أدمن من غير الصلاحية دي) بيشوف شات العميل العادي ويقدر يكلّم الدعم
  // (قبل كده كانت بتفتحله لوحة الإدارة والسيرفر يرفض ← "حصل خطأ في تحميل المحادثات")
  const isAdminUser = window.__isAdmin && hasPermission('view_chat');

  const bubble = document.createElement('div');
  bubble.id = 'chatBubble';
  // الصورة: شعار GRIFFINE (بيتبدّل مع الوضع الليلي/النهاري) أو صورة مخصّصة من الأدمن / من المستخدم (الإصدار 83)
  bubble.innerHTML = `<img src="" alt="الدردشة الفورية"><span id="chatBadge"></span>`;
  document.body.appendChild(bubble);
  applyChatBubbleIcon();

  const panel = document.createElement('div');
  panel.id = 'chatPanel';
  document.body.appendChild(panel);

  if (isAdminUser) { initAdminBubble(bubble, panel); return; }

  /* =====================================================================
     شات العميل / الزائر (الإصدار 82 - على طريقة ماسنجر)
     - نقطة حمرا على الأيقونة لما يوصل رد جديد من الإدارة (حتى لو الرد وصل وإنت قافل الموقع)
     - الرسائل بتتحدّث كل 3 ثواني والشات مفتوح، وكل 8 ثواني في الخلفية
     - رفع الملفات والصور مقفول افتراضيًا - بيظهر 📎 بس لما الأدمن/الموظف يفتحه للمحادثة دي
     - "✓✓ تمت القراءة" تحت آخر رسالة ليك لما الإدارة تقراها
     - الزائر اللي بعد مسجّلش/اشتركش بيشوف "استفسار قبل الاشتراك"
     ===================================================================== */
  // المستخدم المسجّل ← معرّف محادثة ثابت للحساب من السيرفر (نفس المحادثة من أي جهاز). الزائر ← معرّف الجهاز
  let visitorId = getOrCreateVisitorId();
  if (sessionEmail) {
    try { const r = await apiGet('/chat_my_id.php?local=' + encodeURIComponent(visitorId)); if (r && r.success && r.visitorId) visitorId = r.visitorId; } catch(e){}
    if (window.__chatWidgetMode !== chatWidgetMode(sessionEmail)) return;   // الحساب اتغيّر أثناء التحميل
    // الإصدار 83: معرّف الجهاز بقى بتاع الحساب ← الجهاز ياخد معرّف زائر جديد عشان بعد الخروج الزائر ميشوفش محادثة الحساب
    if (visitorId === localStorage.getItem('griffine_visitor_id')) { try { localStorage.removeItem('griffine_visitor_id'); } catch(e){} }
  }
  let knownEmail = sessionEmail || localStorage.getItem('griffine_chat_email') || null;
  const startedKey = 'griffine_chat_started_' + visitorId;
  const seenKey = 'griffine_chat_seen_admin_' + visitorId;          // آخر رسالة من الإدارة تمت القراءة على الجهاز ده
  let hasStarted = localStorage.getItem(startedKey) === '1';
  let allowUpload = false, adminReadAt = null, maxUploadMb = CHAT_DEFAULT_UPLOAD_MB;
  let attachFile = null;   // الإصدار 83: الملف نفسه (بيترفع على أجزاء وقت الإرسال) بدل Base64
  let lastNotifiedId = +(localStorage.getItem(seenKey) || 0);
  const isGuest = !sessionEmail;
  const headerTitle = isGuest ? '💬 استفسار قبل الاشتراك' : '💬 تواصل مع GRIFFINE';
  // الإصدار 83: المحادثة طلعت بتاعة حساب (الزائر على جهاز كان مسجّل عليه حد) ← معرّف زائر جديد ونبدأ من الأول
  function handleNotOwner(res){
    if (!res || res.code !== 'not_owner' || !isGuest) return false;
    resetGuestChatIdentity();
    teardownChatWidget();
    initChatWidget(null);
    return true;
  }

  const markStarted = () => { if (!hasStarted) { hasStarted = true; try { localStorage.setItem(startedKey, '1'); } catch(e){} } };
  const seenAdminId = () => +(localStorage.getItem(seenKey) || 0);
  const maxAdminId = (msgs) => msgs.reduce((mx, m) => (m.sender === 'admin' && +m.id > mx ? +m.id : mx), 0);

  function updateBadge(hasUnread){
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    badge.style.display = hasUnread ? 'block' : 'none';
  }

  // فحص في الخلفية حتى والشات مقفول: رد جديد من الإدارة ← نقطة حمرا + صوت (من غير أي إشعار منبثق)
  async function backgroundCheck(){
    if (!hasStarted || panel.classList.contains('open')) return;
    const res = await getChatHistory(visitorId);
    if (handleNotOwner(res)) return;
    if (!res || !res.success) return;
    allowUpload = !!res.allowUpload; adminReadAt = res.adminReadAt || null; maxUploadMb = +res.maxUploadMb || CHAT_DEFAULT_UPLOAD_MB;
    const msgs = res.messages || [];
    const top = maxAdminId(msgs);
    if (top > seenAdminId()) {
      updateBadge(true);
      if (top > lastNotifiedId) { lastNotifiedId = top; chatAlert(); }
    }
  }
  if (hasStarted) backgroundCheck();
  window.__chatBgPoll = setInterval(backgroundCheck, 8000);

  function renderEmailGate(){
    panel.innerHTML = `
      <div class="chat-header"><span>${headerTitle}</span><span><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span></div>
      <div class="chat-email-gate">
        <p style="font-size:13px;line-height:1.8;">${isGuest ? 'لديك سؤال عن GRIFFINE أو الاشتراك، أو لا تعرف كيف تشترك؟ راسلنا وسيرد عليك فريقنا.' : 'تقدر تبدأ تكلمنا على طول.'}<br><small style="opacity:.75">اكتب بريدك إذا أردت أن نرد عليك عليه أيضًا (اختياري).</small></p>
        <input type="email" id="chatEmailInput" placeholder="بريدك الإلكتروني (اختياري)" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;margin:8px 0;" dir="ltr">
        <button id="chatStartBtn" class="u-w100">بدء المحادثة</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => renderChatPrefsPanel(panel, renderEmailGate, closeChat);
    document.getElementById('chatStartBtn').onclick = async () => {
      const val = document.getElementById('chatEmailInput').value.trim().toLowerCase();
      if (val) {
        if (!val.includes('@')) { alert('اكتب بريدًا صحيحًا أو اترك الخانة فارغة'); return; }
        knownEmail = val;
        localStorage.setItem('griffine_chat_email', knownEmail);
      }
      markStarted();
      renderChatConversation();
    };
  }

  // شريط الإرفاق (بيظهر بس لو الإدارة فتحت الرفع)
  function syncUploadUi(){
    const label = document.getElementById('chatAttachLabel');
    const note = document.getElementById('chatUploadNote');
    if (label) label.style.display = allowUpload ? '' : 'none';
    if (note) { note.style.display = allowUpload ? '' : 'none'; note.textContent = `📎 فتح لك فريق الدعم إرسال صورة أو PDF أو فيديو أو ملف (حتى ${maxUploadMb} ميجا)`; }
    if (!allowUpload && attachFile) { attachFile = null; renderAttachChip(); }
  }
  function renderAttachChip(progress){
    const chip = document.getElementById('chatAttachChip');
    if (!chip) return;
    chip.style.display = attachFile ? '' : 'none';
    chip.innerHTML = attachFile ? `<span>📎 ${escapeHtml(attachFile.name)} <small>(${chatFileSizeLabel(attachFile.size)})</small>${progress != null ? ` <b class="chat-up-prog">⏳ جاري الرفع ${Math.round(progress * 100)}%</b>` : ''}</span> <button type="button" id="chatAttachClear" aria-label="إلغاء المرفق">✕</button>` : '';
    const x = document.getElementById('chatAttachClear');
    if (x) x.onclick = () => { attachFile = null; const fi = document.getElementById('chatFileInput'); if (fi) fi.value = ''; renderAttachChip(); };
  }

  async function renderChatConversation(){
    if (window.__chatPollInterval) clearInterval(window.__chatPollInterval);
    updateBadge(false);
    const statusRes = await getChatAdminStatus();
    const isOnline = statusRes && statusRes.online;
    panel.innerHTML = `
      <div class="chat-header">
        <span>${headerTitle}</span>
        <span><button id="chatFaqBtn" title="الأسئلة الشائعة - رد فوري من المساعد" hidden>❓</button><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span>
      </div>
      <div style="padding:6px 12px;font-size:11px;background:${isOnline?'#eafaf1':'#fdf6e3'};color:${isOnline?'var(--green)':'#8a6d1b'};text-align:center;">
        ${isOnline ? '🟢 فريق الدعم متصل الآن — سيردون عليك في الحال' : '📩 سنرد عليك في أقرب وقت ممكن'}
      </div>
      <div class="chat-faq" id="chatFaq" hidden></div>
      <div class="chat-upload-note" id="chatUploadNote" style="display:none;">📎 فريق الدعم فتحلك إمكانية إرسال صورة أو ملف PDF</div>
      <div class="chat-body" id="chatBody"><div style="text-align:center;font-size:12px;color:#888;">جاري تحميل المحادثة...</div></div>
      <div class="chat-attach-chip" id="chatAttachChip" style="display:none;"></div>
      <div class="chat-input-area">
        <label class="chat-attach-label" id="chatAttachLabel" for="chatFileInput" style="display:none;" title="إرفاق صورة أو PDF">📎</label>
        <input type="file" id="chatFileInput" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatTextInput" placeholder="اكتب رسالتك...">
        <button id="chatSendBtn">إرسال</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => { if (window.__chatPollInterval) { clearInterval(window.__chatPollInterval); window.__chatPollInterval = null; } renderChatPrefsPanel(panel, renderChatConversation, closeChat); };

    let lastSig = '';
    async function refreshMessages(){
      const body = document.getElementById('chatBody');
      if (!body) return; // البانل اتقفل
      const res = await getChatHistory(visitorId);
      if (handleNotOwner(res)) return;
      if (!res || !res.success) return;
      const msgs = res.messages || [];
      allowUpload = !!res.allowUpload; adminReadAt = res.adminReadAt || null; maxUploadMb = +res.maxUploadMb || CHAT_DEFAULT_UPLOAD_MB;
      syncUploadUi();
      if (msgs.length) markStarted();
      // الرسائل تمت القراءة (الشات مفتوح) ← النقطة الحمرا تختفي
      const top = maxAdminId(msgs);
      if (top > seenAdminId()) { try { localStorage.setItem(seenKey, String(top)); } catch(e){} }
      lastNotifiedId = Math.max(lastNotifiedId, top);
      updateBadge(false);
      // لا يوجد جديد ← منعيدش الرسم (عشان منقاطعش الكتابة)
      const sig = msgs.length + '|' + (msgs.length ? msgs[msgs.length - 1].id : '') + '|' + (adminReadAt || '');
      if (sig === lastSig) return;
      lastSig = sig;
      const wasNearBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 60;
      if (msgs.length){
        const lastMine = [...msgs].reverse().find(m => m.sender === 'visitor');
        body.innerHTML = msgs.map(m => {
          let receipt = '';
          if (lastMine && m.id === lastMine.id) receipt = (adminReadAt && adminReadAt >= m.createdAt) ? ' <span class="chat-receipt seen">✓✓ تمت القراءة</span>' : ' <span class="chat-receipt">✓ أُرسلت</span>';
          return chatMsgHtml(m, receipt);
        }).join('');
      } else {
        body.innerHTML = `<div style="text-align:center;font-size:12.5px;color:#888;line-height:1.8;">${isGuest ? 'اسألنا عن أي شيء: الباقات، طريقة الاشتراك، أو كيفية استخدام GRIFFINE 👋' : 'اكتب أول رسالة وابدأ المحادثة 👋'}</div>`;
      }
      if (wasNearBottom) body.scrollTop = body.scrollHeight;
    }
    await refreshMessages();
    window.__chatPollInterval = setInterval(refreshMessages, 3000);

    document.getElementById('chatFileInput').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if (!file) return;
      if (!allowUpload) { alert('رفع الملفات مغلق الآن.'); e.target.value = ''; return; }
      // الإصدار 83: الحد اللي الأدمن كتبه للمحادثة دي (مثلًا 100 أو 500 ميجا)
      if (file.size > maxUploadMb * 1024 * 1024) { alert(`حجم الملف (${chatFileSizeLabel(file.size)}) أكبر من المسموح - أقصى حجم ${maxUploadMb} ميجا.`); e.target.value = ''; return; }
      attachFile = file; renderAttachChip();
    });

    async function doSend(){
      const input = document.getElementById('chatTextInput');
      const text = input.value.trim();
      if (!text && !attachFile) return;
      const btn = document.getElementById('chatSendBtn');
      btn.disabled = true;
      let r;
      try {
        // الملف بيترفع الأول على أجزاء (مع نسبة التقدّم) وبعدين الرسالة بتتبعت ومعاها token الملف
        let token = null, name = null;
        if (attachFile) {
          const up = await chatUploadFile(attachFile, visitorId, (p) => renderAttachChip(p));
          if (!up || !up.success) { r = up; } else { token = up.token; name = up.name; }
        }
        if (!r) r = await apiPost('/chat_send.php', { visitorId, email: knownEmail, message: text, uploadToken: token, attachmentName: name });
      } catch(e){ r = { success:false, message:'حدث خطأ في الاتصال بالسيرفر، حاول مرة أخرى.' }; }
      btn.disabled = false;
      if (r && r.success){
        input.value = '';
        attachFile = null; document.getElementById('chatFileInput').value = ''; renderAttachChip();
        markStarted();
        lastSig = ''; // نجبر التحديث فورًا عشان رسالتنا تظهر على طول
        refreshMessages();
      } else {
        renderAttachChip();
        if (handleNotOwner(r)) return;
        alert((r && r.message) || 'حصل خطأ في الإرسال');
        if (r && /مقفول|مغلق/.test(r.message || '')) { allowUpload = false; syncUploadUi(); }
        if (r && r.maxUploadMb) { maxUploadMb = +r.maxUploadMb; syncUploadUi(); }
      }
    }
    document.getElementById('chatSendBtn').onclick = doSend;
    document.getElementById('chatTextInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSend(); });
    // الإصدار 89: أسئلة شائعة (المساعد الذكي بيرد عليها فورًا)
    apiGet('/chat_faq_api.php?action=public').then(f => {
      const box = document.getElementById('chatFaq');
      if (!box || !f || !f.enabled || !(f.items || []).length) return;
      // الإصدار 90: قائمة واضحة (كل الأسئلة ظاهرة) + زرار ❓ في رأس الشات لإظهارها وإخفائها
      box.innerHTML = `<div class="chat-faq-head"><span class="chat-faq-lbl">🤖 اختر سؤالًا ويرد عليك المساعد فورًا:</span><button type="button" class="chat-faq-x" aria-label="إخفاء">✕</button></div>`
        + `<div class="chat-faq-list">${f.items.map(it => `<button type="button" class="chat-faq-chip" data-q="${escapeHtml(it.question)}">${escapeHtml(it.question)}</button>`).join('')}</div>`;
      const qb = document.getElementById('chatFaqBtn');
      const setOpen = (on) => { box.hidden = !on; try { localStorage.setItem('griffine_chat_faq', on ? '1' : '0'); } catch(e){} };
      let open = true; try { open = localStorage.getItem('griffine_chat_faq') !== '0'; } catch(e){}
      setOpen(open);
      if (qb) { qb.hidden = false; qb.onclick = () => setOpen(box.hidden); }
      box.querySelector('.chat-faq-x').onclick = () => setOpen(false);
      box.querySelectorAll('.chat-faq-chip').forEach(b => b.onclick = () => { const inp = document.getElementById('chatTextInput'); if (!inp) return; inp.value = b.dataset.q; doSend(); });
    }).catch(() => {});
  }

  function closeChat(){
    panel.classList.remove('open');
    if (window.__chatPollInterval) { clearInterval(window.__chatPollInterval); window.__chatPollInterval = null; }
  }

  bubble.onclick = async () => {
    if (panel.classList.contains('open')) { closeChat(); return; }
    panel.classList.add('open');
    // لو المستخدم مسجل دخول، ناخد إيميله تلقائي بدل ما نسأله (بعد اختياري لغير المسجلين)
    if (!knownEmail) {
      const sessionEmail = await getSession();
      if (sessionEmail) { knownEmail = sessionEmail; localStorage.setItem('griffine_chat_email', knownEmail); }
    }
    if (hasStarted || knownEmail) renderChatConversation(); else renderEmailGate();
  };
}

/* الأيقونة العائمة للأدمن - نقطة حمرا بسيطة زي الماسنجر لما توصل رسالة جديدة من عميل، ورد سريع بدون الدخول للوحة التحكم */
function initAdminBubble(bubble, panel){
  // بنستخدم تاريخ السيرفر بس دايمًا (مش وقت المتصفح) عشان نتجنب أي فرق توقيت بين جهازك والسيرفر
  let lastSeenAt = localStorage.getItem('griffine_admin_chat_seen') || '1970-01-01 00:00:00';

  function updateBadge(hasUnread){
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    badge.style.display = hasUnread ? 'block' : 'none';
  }
  function markAllSeenFromConvs(convs){
    let maxAt = lastSeenAt;
    for (const c of convs) { if (c.lastAt && c.lastAt > maxAt) maxAt = c.lastAt; }
    lastSeenAt = maxAt;
    localStorage.setItem('griffine_admin_chat_seen', lastSeenAt);
    updateBadge(false);
  }

  // الإصدار 80: أي مكان بيفتح محادثة (صفحة الدردشة الكاملة / الرد السريع) بيبلّغ الأيقونة إن الرسالة تمت القراءة على الجهاز ده
  window.__adminChatSeen = (at) => {
    if (!at || at <= lastSeenAt) return;
    lastSeenAt = at;
    try { localStorage.setItem('griffine_admin_chat_seen', lastSeenAt); } catch(e){}
  };

  let notifiedAt = {}; // آخر وقت بعتنا فيه تنبيه لكل محادثة، عشان مانكررش تنبيهات لنفس الرسالة
  async function backgroundCheck(){
    try{
      const res = await getChatConversations('active');
      if (!res || !res.success) { console.error('chat backgroundCheck: فشل جلب المحادثات', res); return; }
      let anyUnread = false, anyNew = false;
      for (const c of res.conversations) {
        /* الإصدار 80: النقطة الحمرا والإشعار بيظهروا لو:
             - رسالة جديدة من العميل بعد آخر مرة فتحت لوحة الشات على الجهاز ده (lastSeenAt)، أو
             - المحادثة غير مقروءة على السيرفر (c.unread)
           (في 72-79 كانوا معتمدين على c.unread بس - ولو المحادثة كانت مفتوحة في جهاز/تبويب تاني
            كانت بتتعلّم مقروءة تلقائيًا والإشعار ميظهرش خالص) */
        const newHere = c.lastSender === 'visitor' && c.lastAt > lastSeenAt;
        const unreadServer = c.unread === true;
        if (!newHere && !unreadServer) continue;
        anyUnread = true;
        const isCurrentlyOpen = panel.classList.contains('open') && panel.dataset.openConv === c.visitorId;
        if (newHere && !isCurrentlyOpen && notifiedAt[c.visitorId] !== c.lastAt) {
          notifiedAt[c.visitorId] = c.lastAt;
          anyNew = true;
        }
      }
      updateBadge(anyUnread && !panel.classList.contains('open'));
      // الإصدار 83: رسالة جديدة ← نقطة حمرا + صوت بس (لا يوجد إشعار منبثق على الشاشة)
      if (anyNew) chatAlert();
    }catch(e){ console.error('chat backgroundCheck crashed:', e); }
  }
  window.__adminBubbleCheck = backgroundCheck;
  backgroundCheck();
  // الإصدار 80: فحص رسائل الأدمن بيفضل شغال والتبويب في الخلفية (عشان النقطة الحمرا والصوت يوصلوا وإنت على برنامج تاني)
  // - باقي الاستعلامات المتكررة بتقف والصفحة مخفية (shell.js) لتوفير البطارية والسيرفر
  window.__adminBubblePoll = (window.__nativeSetInterval || setInterval)(backgroundCheck, 10000);
  // heartbeat خفيف كمان من هنا عشان أي زائر يشوف "الأدمن متصل" حتى لو إنت في صفحة تانية غير لوحة الشات
  sendChatAdminHeartbeat();
  window.__adminBubbleHeartbeat = setInterval(sendChatAdminHeartbeat, 60000);

  function closeChat(){ panel.classList.remove('open'); panel.dataset.openConv=''; }

  async function renderConvList(){
    panel.innerHTML = `
      <div class="chat-header"><span>💬 محادثات العملاء</span><span><button id="chatPrefsBtn" title="تنبيهات الشات (الصوت / الصورة)">⚙️</button><button id="chatCloseBtn">✕</button></span></div>
      <div class="chat-body" id="chatBody" style="padding:0;"><div style="text-align:center;font-size:12px;color:#888;padding:14px;">جاري التحميل...</div></div>
      <div style="padding:8px;text-align:center;"><a href="#" id="chatFullPageLink" style="font-size:11.5px;color:var(--green-dark);">فتح لوحة الدردشة الفورية الكاملة</a></div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatPrefsBtn').onclick = () => renderChatPrefsPanel(panel, renderConvList, closeChat);
    document.getElementById('chatFullPageLink').onclick = (e) => { e.preventDefault(); closeChat(); renderChatAdminPage(); };

    const res = await getChatConversations('active');
    const body = document.getElementById('chatBody');
    if (!res || !res.success) {
      console.error('renderConvList: فشل جلب المحادثات', res);
      // السبب الحقيقي من السيرفر (صلاحية / قاعدة بيانات) بدل رسالة عامة
      body.innerHTML = `<p style="color:#c0392b;font-size:12px;padding:14px;text-align:center;">${escapeHtml((res && res.message) || 'حدث خطأ في تحميل المحادثات، حاول مرة أخرى.')}</p>
        <div class="u-tc"><button type="button" class="small secondary u-wa" id="chatRetryBtn">إعادة المحاولة</button></div>`;
      const rb = document.getElementById('chatRetryBtn'); if (rb) rb.onclick = renderConvList;
      return;
    }
    const convs = res.conversations;
    markAllSeenFromConvs(convs);
    body.innerHTML = convs.length ? convs.map(c=>`
      <div class="chat-conv-item" data-vid="${c.visitorId}">
        <div style="flex:1;"><strong style="font-size:12.5px;">${c.unread ? '<span class="chat-unread-dot"></span>' : ''}${escapeHtml(c.email || 'زائر بدون إيميل')}</strong> ${chatKindBadge(c)}<div class="u-fs11 u-muted">${escapeHtml((c.lastMessage||'').substring(0,35))}</div></div>
        <div style="font-size:10px;color:#aaa;white-space:nowrap;">${formatChatTime(c.lastAt)}</div>
      </div>`).join('') : '<p style="color:#888;font-size:12px;padding:14px;text-align:center;">لا توجد محادثات بعد.</p>';
    document.querySelectorAll('.chat-conv-item').forEach(el=>{
      el.onclick = () => renderQuickThread(el.dataset.vid, convs.find(c=>c.visitorId===el.dataset.vid));
    });
  }

  async function renderQuickThread(visitorId, convInfo){
    panel.dataset.openConv = visitorId;
    if (window.__adminChatSeen && convInfo) window.__adminChatSeen(convInfo.lastAt);
    markChatRead(visitorId).then(refreshChatUnreadIndicators); // الإصدار 72
    const upState = { on: !!(convInfo && convInfo.allowUpload), mb: +(convInfo && convInfo.maxUploadMb) || CHAT_DEFAULT_UPLOAD_MB,
      onChange: (st) => { if (convInfo) { convInfo.allowUpload = st.on; convInfo.maxUploadMb = st.mb; } } };
    panel.innerHTML = `
      <div class="chat-header">
        <span>${escapeHtml((convInfo&&convInfo.email) || 'زائر')}</span>
        <span><button id="chatBackBtn" style="background:none;border:none;color:#fff;font-size:13px;cursor:pointer;">◀ رجوع</button><button id="chatCloseBtn">✕</button></span>
      </div>
      <div style="padding:6px 10px;border-bottom:1px solid var(--border-soft);display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${convInfo ? chatKindBadge(convInfo) : ''} ${chatUploadBtnHtml('chatQuickUpload', upState.on, upState.mb)}</div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-attach-chip" id="chatQuickAttachChip" style="display:none;"></div>
      <div class="chat-input-area">
        <label class="chat-attach-label" for="chatQuickFile" title="إرسال صورة / PDF / فيديو / ملف للعميل">📎</label>
        <input type="file" id="chatQuickFile" accept="${CHAT_FILE_ACCEPT}" style="display:none;">
        <input type="text" id="chatTextInput" placeholder="اكتب الرد...">
        <button id="chatSendBtn">إرسال</button>
      </div>`;
    document.getElementById('chatCloseBtn').onclick = closeChat;
    document.getElementById('chatBackBtn').onclick = () => { panel.dataset.openConv=''; renderConvList(); };
    wireChatUploadBtn('chatQuickUpload', visitorId, upState);
    const quickAttach = wireAdminAttach('chatQuickFile', 'chatQuickAttachChip');

    async function refresh(){
      const body = document.getElementById('chatBody');
      if (!body) return;
      try{
        const res = await getChatHistory(visitorId);
        if (!res || !res.success) { console.error('renderQuickThread refresh: فشل جلب الرسائل', res); return; }
        const msgs = res.messages;
        syncChatUploadCtl('chatQuickUpload', visitorId, upState, res);
        const sig = msgs.length + '|' + (msgs.length ? msgs[msgs.length - 1].id : '');
        if (sig === body.dataset.sig) return;   // لا يوجد جديد ← منعيدش الرسم
        body.dataset.sig = sig;
        const wasNearBottom = (body.scrollHeight - body.scrollTop - body.clientHeight) < 60;
        body.innerHTML = msgs.length ? msgs.map(m => chatMsgHtml(m)).join('') : '<p style="font-size:12px;color:#888;text-align:center;">لا يوجد رسائل.</p>';
        if (wasNearBottom) body.scrollTop = body.scrollHeight;
      }catch(e){ console.error('renderQuickThread refresh crashed:', e); }
    }
    await refresh();
    if (window.__chatQuickPoll) clearInterval(window.__chatQuickPoll);
    window.__chatQuickPoll = setInterval(refresh, 3000);

    async function doSend(){
      const text = document.getElementById('chatTextInput').value.trim();
      const att = quickAttach.get();
      if (!text && !att.file) return;
      const btn = document.getElementById('chatSendBtn');
      btn.disabled = true;
      try{
        const r = await sendChatAdminReplyWithFile(visitorId, text, quickAttach);
        if (r && r.success){
          document.getElementById('chatTextInput').value='';
          quickAttach.clear();
          await refresh();
        } else {
          alert((r && r.message) || 'حدث خطأ في الإرسال، حاول مرة أخرى.');
          console.error('doSend failed:', r);
        }
      }catch(e){
        alert('حدث خطأ في الاتصال بالسيرفر، حاول مرة أخرى.');
        console.error('doSend crashed:', e);
      }
      btn.disabled = false;
    }
    document.getElementById('chatSendBtn').onclick = doSend;
    document.getElementById('chatTextInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') doSend(); });
  }

  bubble.onclick = () => {
    if (panel.classList.contains('open')) { closeChat(); return; }
    panel.classList.add('open');
    if (window.__chatQuickPoll) { clearInterval(window.__chatQuickPoll); window.__chatQuickPoll = null; }
    renderConvList();
  };
}

