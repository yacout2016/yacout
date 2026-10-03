/* =====================================================================
   GRIFFINE — mkt.js (الإصدار 152) — لوحة التحكم ← «📣 التسويق» (قوالب ثابتة من غير ذكاء اصطناعي ومن غير تكلفة)
   ✨ اقترح محتوى (كابشن + هاشتاجات + سكريبت فيديو لكل منصة) · 📅 جدول النشر وسجل كل اللي اتعمل
   📝 مطلوب منك (مهام بقواعد ثابتة) · 📊 الأداء (زوار وتسجيلات كل منصة / حملة) · 🔗 الحسابات وروابط التتبع
   مفيش أي كلمات سر — روابط الحسابات بس. النشر نفسه بتعمله إنت من التطبيق (الواجهات الرسمية للنشر الآلي محتاجة تسجيل مطوّر عند المنصات).
   ===================================================================== */
(function(){
  'use strict';
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = (n) => (+n || 0).toLocaleString('en-US');
  const PF = { tiktok: '🎵 تيك توك', facebook: '📘 فيسبوك', instagram: '📸 إنستجرام', whatsapp: '🟢 واتساب', youtube: '▶️ يوتيوب شورتس', x: '✖️ X', other: '🌐 تاني' };
  const TOPICS = {
    dca: { l: 'خطط تعزيز المتوسط (DCA)', hooks: ['السهم نزل وإنت مش عارف تشتري تاني ولا تستنى؟', 'أغلب الناس بتخسر لأنها بتشتري كله مرة واحدة 👀', 'لو بتحب سهم ونازل… دي الطريقة الصح'],
      pts: ['قسّم فلوسك على مستويات شراء مدروسة كل ما السعر ينزل', 'GRIFFINE بيحسبلك متوسط التكلفة وسعر البيع المستهدف لحظة بلحظة', 'تنبيه أول ما السعر يوصل لمستوى الشراء الجاي'], tags: ['#DCA', '#متوسط_التكلفة'] },
    grid: { l: 'خطط الشبكة (Grid)', hooks: ['السهم بيطلع وينزل في نفس المكان؟ اكسب من الحركة دي', 'السوق عرضي؟ ده أحسن وقت للـ Grid'],
      pts: ['مستويات شراء وبيع على مسافات ثابتة جوه نطاق سعري', 'كل دورة شراء وبيع = ربح صغير بيتكرر', 'GRIFFINE بيحدد النطاق تلقائي من أعلى وأقل سعر'], tags: ['#Grid', '#تداول'] },
    basira: { l: 'بصيرة AI — تحليل الأسهم', hooks: ['عايز تعرف السهم ده رايح فين قبل ما تشتري؟', 'تحليل سهم كامل في 10 ثواني 🔮'],
      pts: ['احتمال الصعود والهبوط لكل فترة (يوم / أسبوع / شهر / سنة)', 'المتوسطات وRSI وMACD وتقاطع المؤشرات على الرسم', 'مسح السوق كله: الأسهم الأعلى احتمالًا للصعود'], tags: ['#تحليل_فني', '#بصيرة'] },
    mizan: { l: 'ميزان GRIFFINE AI — توزيع الاستثمار', hooks: ['معاك فلوس وعايز توزعها صح؟', 'كل فلوسك في سهم واحد؟ 😬'],
      pts: ['توزيع المبلغ على القطاعات حسب مستوى المخاطرة', 'أسهم + شهادات + ذهب + عقار — وهتبقى كام بعد مدة', 'فحص توزيعتك الحالية ومراكز الخطورة'], tags: ['#توزيع_الاستثمار', '#تنويع'] },
    opps: { l: 'البحث عن الفرص بالمؤشرات', hooks: ['خلي الموقع يدوّرلك على الفرص وإنت نايم 😴', 'RSI تحت 30 + تقاطع MACD؟ هيبعتلك فورًا'],
      pts: ['اختار لحد 5 مؤشرات وحدد شروطك', 'GRIFFINE بيفحص السوق كله ويبعتلك الأسهم اللي انطبقت', 'من الفرصة لخطة DCA أو Grid بضغطة'], tags: ['#فرص', '#مؤشرات_فنية'] },
    recs: { l: 'توصيات المحللين', hooks: ['توصية بنقاط دخول وأهداف ووقف خسارة واضحة', 'محلل مالي بيبعتلك الفرصة على الواتساب والإيميل'],
      pts: ['منطقة شراء + 3 أهداف + وقف خسارة', 'متابعة وتحديثات لحد ما التوصية تخلص', 'تعليمية واسترشادية — القرار قرارك'], tags: ['#توصيات', '#البورصة_المصرية'] },
    alerts: { l: 'تنبيهات الأسعار', hooks: ['متبقاش لازق في الشاشة طول اليوم', 'السعر وصل للي إنت عايزه؟ هيوصلك تنبيه'],
      pts: ['تنبيه على الموقع والإيميل والواتساب', 'أكبر من / أقل من / مرة واحدة أو متكرر', 'تنبيهات خططك تلقائي'], tags: ['#تنبيهات', '#أسهم'] },
    free: { l: 'الباقة المجانية (ابدأ ببلاش)', hooks: ['جرّب كل المميزات ببلاش 🎁', 'منصة استثمار عربية — وابدأ مجانًا'],
      pts: ['أول فترة كل المميزات مفتوحة', 'من غير كارت ومن غير التزام', 'بالعربي وسهل وعلى الموبايل'], tags: ['#مجانا', '#استثمار'] },
  };
  const BASE_TAGS = ['#GRIFFINE', '#البورصة', '#استثمار', '#الأسهم', '#مصر'];
  const CTA = ['ابدأ مجانًا من الرابط 👇', 'جرّبه ببلاش — الرابط في البايو 👆', 'سجّل دلوقتي واستفيد من الباقة المجانية 🎁'];
  const pick = (a, s) => a[Math.abs(s) % a.length];
  const trackLink = (pf, cmp) => `${location.origin}/?utm_source=${encodeURIComponent(pf)}${cmp ? '&utm_campaign=' + encodeURIComponent(cmp) : ''}`;
  function gen(pf, tp, seed, cmp){
    const T = TOPICS[tp] || TOPICS.free, s = seed, link = trackLink(pf, cmp);
    const hook = pick(T.hooks, s), cta = pick(CTA, s + 1), pts = T.pts;
    const tags = [...T.tags, ...BASE_TAGS].slice(0, pf === 'instagram' ? 8 : 5).join(' ');
    let title = `${T.l} — ${hook}`.slice(0, 190), body = '';
    if (pf === 'tiktok' || pf === 'youtube' || pf === 'instagram') {
      body = `🎬 سكريبت فيديو (30-45 ثانية):\n0-3 ث (الخطاف): «${hook}»\n3-10 ث (المشكلة): الناس بتتلخبط وبتاخد قرارات عشوائية.\n10-30 ث (الحل على الشاشة): افتح GRIFFINE ← ${T.l}:\n` +
        pts.map((p, i) => `   ${i + 1}) ${p}`).join('\n') + `\n30-40 ث (الدعوة): ${cta}\n\n📝 الكابشن:\n${hook}\n${pts[0]} ✅\n${cta}\n${link}\n\n${tags}\n\n💡 نصيحة: صوّر الشاشة من الموبايل، ونص كبير على الفيديو، وأول 3 ثواني أهم حاجة.`;
    } else if (pf === 'whatsapp') {
      body = `${hook}\n✅ ${pts[0]}\n✅ ${pts[1]}\n${cta}\n${link}`;
    } else {
      body = `${hook}\n\n${pts.map(p => '✅ ' + p).join('\n')}\n\nGRIFFINE منصة عربية بتنظّم استثمارك في البورصة المصرية والخليج.\n${cta}\n${link}\n\n${tags}\n\n⚠️ محتوى تعليمي — الاستثمار فيه مخاطر.`;
    }
    return { title, body, link };
  }

  let D = null, TAB = 'gen', SEED = Date.now() % 997;
  async function load(days){ D = await apiGet('/mkt_api.php?action=get&days=' + (days || 30)).catch(() => null); return D; }
  window.renderAdminMkt = async function(tab){
    const tok = screenToken(); pushNav(() => renderAdminMkt(tab)); window.__lastPageKey = 'admin_mkt';
    const email = await getSession(); if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    TAB = tab || TAB;
    await load(30);
    if (screenStale(tok)) return;
    if (!D || !D.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((D && D.message) || 'تعذّر التحميل')}</div></div>`; return; }
    draw();
  };
  function draw(){
    const todo = D.items.filter(x => x.kind === 'task' && x.status !== 'done').length;
    const TABS = [['gen', '✨ اقترح محتوى'], ['plan', '📅 جدول النشر والسجل'], ['tasks', `📝 مطلوب منك${todo ? ' (' + todo + ')' : ''}`], ['perf', '📊 الأداء'], ['acc', '🔗 الحسابات وروابط التتبع']];
    app.innerHTML = `<div class="container wide mkt">${logoHeader()}
      <div class="topbar"><div>${pageTitle('admin_mkt', '📣 التسويق')}</div><button class="secondary small" id="mkBack">🛡️ رجوع للوحة التحكم</button></div>
      <div class="info">المسوّق بتاعك: بيجهّزلك المحتوى لكل منصة، وبيسجّل كل اللي اتعمل، وبيقيس كل منصة جابت كام زائر وتسجيل، وبيكتبلك المطلوب منك كل أسبوع. النشر نفسه من تطبيق كل منصة (مفيش أي كلمات سر هنا).</div>
      <div class="mk-tabs">${TABS.map(([k, l]) => `<button type="button" class="small ${k === TAB ? '' : 'secondary'}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div id="mkBody">${({ gen: tGen, plan: tPlan, tasks: tTasks, perf: tPerf, acc: tAcc })[TAB]()}</div></div>`;
    document.getElementById('mkBack').onclick = () => renderAdminHub();
    app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { TAB = b.dataset.tab; draw(); });
    wire();
  }
  const pfSel = (id, v) => `<select id="${id}">${Object.entries(PF).map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  function tGen(){
    return `<div class="section-card"><div class="mk-row"><label>المنصة ${pfSel('mkPf', 'tiktok')}</label>
      <label>الموضوع <select id="mkTp">${Object.entries(TOPICS).map(([k, t]) => `<option value="${k}">${E(t.l)}</option>`).join('')}</select></label>
      <label>اسم الحملة (اختياري) <input id="mkCmp" placeholder="مثلًا launch" dir="ltr"></label>
      <button type="button" id="mkGo">✨ اقترح</button><button type="button" class="secondary" id="mkAgain">🔄 اقتراح تاني</button></div>
      <div id="mkOut" class="mk-out"></div></div>`;
  }
  function tPlan(){
    const posts = D.items.filter(x => x.kind === 'post');
    return `<div class="section-card"><div class="section-title">📅 البوستات (${posts.length})</div>${posts.map(itemRow).join('') || '<div class="u-muted">لسه مفيش — استخدم «✨ اقترح محتوى» واحفظ.</div>'}</div>
      <div class="section-card"><div class="section-title">🗂 سجل كل اللي اتعمل</div><div class="mk-log">${D.items.filter(x => x.status === 'done').map(x => `<div>✅ ${E(String(x.done_at || '').slice(0, 16))} — ${x.kind === 'task' ? 'مهمة' : 'بوست'} ${x.platform ? E(PF[x.platform] || x.platform) : ''}: ${E(x.title)}${x.url ? ` · <a href="${E(x.url)}" target="_blank" rel="noopener">الرابط</a>` : ''}</div>`).join('') || '<div class="u-muted u-fs12">لسه مفيش.</div>'}</div></div>`;
  }
  function itemRow(x){
    const st = { todo: '⏳ لسه', scheduled: '📅 متجدول', done: '✅ اتنشر' }[x.status] || x.status;
    return `<div class="mk-item mk-${x.status}"><div class="mk-ih"><b>${x.platform ? E(PF[x.platform] || x.platform) + ' — ' : ''}${E(x.title)}</b><small>${x.due ? '📆 ' + E(x.due) + ' · ' : ''}${st}${x.campaign ? ' · حملة ' + E(x.campaign) : ''}${x.created_by ? ' · ' + E(x.created_by) : ''}</small></div>
      ${x.body ? `<details><summary>المحتوى</summary><pre class="mk-pre">${E(x.body)}</pre></details>` : ''}
      <div class="mk-ia">${x.status !== 'done' ? `<button type="button" class="small" data-done="${x.id}">✅ ${x.kind === 'task' ? 'خلصت' : 'اتنشر'}</button>` : `<button type="button" class="small secondary" data-undo="${x.id}">↩ رجّعها</button>`}${x.body ? `<button type="button" class="small secondary" data-copy="${x.id}">📋 نسخ</button>` : ''}<button type="button" class="small secondary danger" data-del="${x.id}">🗑</button></div></div>`;
  }
  function tTasks(){
    const t = D.items.filter(x => x.kind === 'task'), open = t.filter(x => x.status !== 'done');
    return `<div class="section-card"><div class="section-title">📝 مطلوب منك (${open.length})</div><div class="u-fs12 u-muted">المهام دي بتتكتب لوحدها كل أسبوع حسب الأداء (المسوّق الآلي)، وتقدر تضيف مهام بنفسك.</div>
      ${open.map(itemRow).join('') || '<div class="u-muted u-mt6">مفيش مهام دلوقتي 👍</div>'}
      <div class="mk-row u-mt10"><input id="mkTask" placeholder="مهمة جديدة…"><button type="button" id="mkTaskAdd">➕ إضافة</button></div></div>
      ${t.filter(x => x.status === 'done').length ? `<div class="section-card"><div class="section-title">✅ خلصت</div>${t.filter(x => x.status === 'done').slice(0, 30).map(itemRow).join('')}</div>` : ''}`;
  }
  function tPerf(){
    const tv = D.perf.reduce((a, x) => a + +x.v, 0) || 1, mx = Math.max(1, ...D.weekly.map(w => +w.v));
    return `<div class="section-card"><div class="section-title">📊 كل منصة / حملة جابت إيه (آخر ${D.days} يوم)</div>
      <div class="mk-perf"><div class="mk-ph"><span>المصدر</span><span>زوار</span><span>تسجيلات</span><span>نسبة التسجيل</span></div>
      ${D.perf.map(x => `<div><span>${E(x.k)}</span><b>${N(x.v)}</b><b>${N(x.s)}</b><span>${x.v > 0 ? (x.s / x.v * 100).toFixed(1) : 0}%</span></div>`).join('') || '<div class="u-muted">لسه مفيش بيانات — استخدم روابط التتبع في كل بوست.</div>'}</div>
      <div class="u-fs12 u-muted u-mt6">بوستات اتنشرت آخر 7 أيام: <b>${D.postsDone7}</b> · الهدف 3 على الأقل.</div></div>
      <div class="section-card"><div class="section-title">📈 أسبوع بأسبوع (زوار / تسجيلات)</div><div class="rd-series">${D.weekly.map(w => `<div class="rd-col" title="${E(w.d)}"><i style="height:${Math.max(4, Math.round(w.v / mx * 100))}%"></i><small>${E(String(w.d).slice(5))}</small><b>${w.v}/${w.s}</b></div>`).join('') || '<div class="u-muted u-fs12">لسه مفيش بيانات.</div>'}</div></div>`;
  }
  function tAcc(){
    const L = (D.cfg && D.cfg.links) || {};
    return `<div class="section-card"><div class="section-title">🔗 روابط حساباتك (الرابط بس)</div><div class="mk-warn">🔒 متكتبش أي كلمة سر هنا ولا في الشات — الروابط بس عشان التقارير والمهام.</div>
      ${['tiktok', 'facebook', 'instagram', 'youtube', 'x', 'whatsapp'].map(p => `<label class="mk-lk">${PF[p]}<input id="mkL_${p}" value="${E(L[p] || '')}" placeholder="https://…" dir="ltr"></label>`).join('')}
      <button type="button" id="mkLinksSave">💾 حفظ</button></div>
      <div class="section-card"><div class="section-title">🏷 رابط تتبع لأي بوست أو إعلان</div><div class="mk-row"><label>المنصة ${pfSel('mkLpf', 'tiktok')}</label><label>الحملة <input id="mkLcmp" placeholder="مثلًا ramadan" dir="ltr"></label><button type="button" id="mkLgo">🔗 اعمل الرابط</button></div>
        <div id="mkLout" class="mk-out"></div><div class="u-fs12 u-muted">كل اللي هيدخل من الرابط ده بيتحسب للمنصة والحملة دي في «📊 الأداء» و«🔬 البحث والتطوير».</div></div>`;
  }
  async function post(d, ok){ const r = await apiPost('/mkt_api.php', d).catch(() => null); if (!r || !r.success) return GShell.toast((r && r.message) || 'تعذّر الحفظ', 'err'); if (ok) GShell.toast(ok, 'ok'); await load(30); draw(); }
  function wire(){
    const body = document.getElementById('mkBody');
    const out = (g, pf) => { const o = document.getElementById('mkOut'); o.innerHTML = `<b>${E(g.title)}</b><pre class="mk-pre">${E(g.body)}</pre><div class="mk-row"><button type="button" class="small" id="mkCopy">📋 نسخ</button><label>تاريخ النشر <input type="date" id="mkDue" value="${new Date().toISOString().slice(0, 10)}"></label><button type="button" class="small" id="mkSave">📅 حفظ في الجدول</button></div>`;
      document.getElementById('mkCopy').onclick = async () => { try { await navigator.clipboard.writeText(g.body); GShell.toast('✅ اتنسخ', 'ok'); } catch(e){} };
      document.getElementById('mkSave').onclick = () => post({ action: 'add', kind: 'post', platform: pf, title: g.title, body: g.body, campaign: (document.getElementById('mkCmp') || {}).value || '', due: document.getElementById('mkDue').value, status: 'scheduled' }, '✅ اتحفظ في الجدول'); };
    const go = () => { const pf = document.getElementById('mkPf').value; out(gen(pf, document.getElementById('mkTp').value, SEED, document.getElementById('mkCmp').value.trim()), pf); };
    const g1 = document.getElementById('mkGo'); if (g1) g1.onclick = go;
    const g2 = document.getElementById('mkAgain'); if (g2) g2.onclick = () => { SEED++; go(); };
    body.querySelectorAll('[data-done]').forEach(b => b.onclick = () => post({ action: 'update', id: b.dataset.done, status: 'done' }, '✅ اتسجّلت'));
    body.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => post({ action: 'update', id: b.dataset.undo, status: 'todo' }));
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (await gConfirm('حذف البند ده؟')) post({ action: 'del', id: b.dataset.del }); });
    body.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => { const x = D.items.find(i => String(i.id) === b.dataset.copy); try { await navigator.clipboard.writeText(x.body || ''); GShell.toast('✅ اتنسخ', 'ok'); } catch(e){} });
    const ta = document.getElementById('mkTaskAdd'); if (ta) ta.onclick = () => { const t = document.getElementById('mkTask').value.trim(); if (t) post({ action: 'add', kind: 'task', title: t }, '✅ اتضافت'); };
    const ls = document.getElementById('mkLinksSave'); if (ls) ls.onclick = () => { const d = { action: 'save_cfg' }; ['tiktok', 'facebook', 'instagram', 'youtube', 'x', 'whatsapp'].forEach(p => d['link_' + p] = document.getElementById('mkL_' + p).value.trim()); post(d, '✅ اتحفظت الروابط'); };
    const lg = document.getElementById('mkLgo'); if (lg) lg.onclick = () => { const u = trackLink(document.getElementById('mkLpf').value, document.getElementById('mkLcmp').value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '')); document.getElementById('mkLout').innerHTML = `<code dir="ltr">${E(u)}</code> <button type="button" class="small" id="mkLcp">📋 نسخ</button>`; document.getElementById('mkLcp').onclick = async () => { try { await navigator.clipboard.writeText(u); GShell.toast('✅ اتنسخ الرابط', 'ok'); } catch(e){} }; };
  }
  // الإصدار 153: «📢 إبلاغ كل المستخدمين بالرابط الجديد» (domain_notice.php) — إشعار جوه الموقع + إيميل، على دفعات
  window.renderAdminDomainNotice = async function(){
    const tok = screenToken(); pushNav(() => renderAdminDomainNotice()); window.__lastPageKey = 'admin_domain';
    const email = await getSession(); if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    const d = await apiGet('/domain_notice.php').catch(() => null);
    if (screenStale(tok)) return;
    if (!d || !d.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((d && d.message) || 'تعذّر التحميل')}</div></div>`; return; }
    const L = d.last;
    app.innerHTML = `<div class="container wide">${logoHeader()}
      <div class="topbar"><div>${pageTitle('admin_domain', '📢 إبلاغ كل المستخدمين بالرابط الجديد')}</div><button class="secondary small" id="dnBack">🛡️ رجوع للوحة التحكم</button></div>
      <div class="section-card"><div class="info">هيتبعت لكل المستخدمين (<b>${N(d.total)}</b> حساب): إشعار جوه الموقع + إيميل فيه الرابط الجديد <b dir="ltr">www.griffine.app</b> وإنهم يسجّلوا دخولهم من جديد بنفس الإيميل وكلمة السر.</div>
        <div id="dnLast" class="u-fs12 u-muted u-mt6">${L ? `آخر إرسال: ${E(L.at)} — إشعارات ${N(L.app)} · إيميلات ${N(L.mail)}${L.running ? ' (ماكملش)' : ''}` : 'لسه ماتبعتش.'}</div>
        <button type="button" id="dnSend" class="u-mt6">📢 ابعت الإشعار والإيميل للكل</button><div id="dnProg" class="u-fs12 u-mt6"></div></div></div>`;
    document.getElementById('dnBack').onclick = () => renderAdminHub();
    document.getElementById('dnSend').onclick = async () => {
      if (L && !L.running && !(await gConfirm('الإبلاغ اتبعت قبل كده — تبعته تاني لكل المستخدمين؟'))) return;
      if (!L && !(await gConfirm(`هيتبعت إشعار وإيميل لـ ${N(d.total)} مستخدم. متأكد؟`))) return;
      const btn = document.getElementById('dnSend'), pg = document.getElementById('dnProg'); btn.disabled = true;
      let after = 0, r = null;
      do {
        r = await apiPost('/domain_notice.php', { action: 'send', after }).catch(() => null);
        if (!r || !r.success) { btn.disabled = false; return GShell.toast((r && r.message) || 'تعذّر الإرسال — دوس تاني', 'err'); }
        after = r.next; pg.textContent = `⏳ إشعارات ${N(r.app)} · إيميلات ${N(r.mail)} من ${N(r.total)}`;
      } while (!r.done && !screenStale(tok));
      pg.textContent = `✅ خلص: إشعارات ${N(r.app)} · إيميلات ${N(r.mail)} من ${N(r.total)}`; btn.disabled = false;
      GShell.toast('✅ اتبعت الإبلاغ لكل المستخدمين', 'ok');
    };
  };
  window.__mktGen = gen;   // للاختبارات
})();
