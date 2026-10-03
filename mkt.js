/* =====================================================================
   GRIFFINE — mkt.js (الإصدار 154) — لوحة التحكم ← «📣 التسويق» + «📢 رسالة لكل المستخدمين» (قوالب ثابتة من غير ذكاء اصطناعي ومن غير تكلفة)
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
  // الإصدار 154: «📢 رسالة لكل المستخدمين» (broadcast_api.php) — العنوان والنص والزرار من عندك · إشعار و/أو إيميل · مين يستلم
  //   سجل الإرسالات + السلة (المسح والاسترجاع والحذف النهائي للأدمن بس — الموظف بصلاحية «send_broadcast» بيبعت بس)
  const BC_DOMAIN = { title: 'GRIFFINE اتنقل لرابط جديد', body: 'أهلًا بيك،\nمنصة GRIFFINE اتنقلت لرابط جديد: www.griffine.app\nافتح الرابط الجديد وسجّل دخولك من جديد بنفس الإيميل وكلمة السر — حسابك وخططك وكل بياناتك زي ما هي.\nلو كنت مثبّت التطبيق على الموبايل، احذفه وثبّته تاني من الرابط الجديد.', btn_label: 'افتح www.griffine.app', btn_url: 'https://www.griffine.app/index.php' };
  let BC = null, BCV = 'sent', BCF = null;
  window.renderAdminBroadcast = async function(view){
    const tok = screenToken(); pushNav(() => renderAdminBroadcast(view)); window.__lastPageKey = 'admin_broadcast';
    const email = await getSession(); if (!email) return renderLogin();
    if (!window.__isAdmin) return renderHome();
    BCV = view === 'trash' ? 'trash' : 'sent';
    BC = await apiGet('/broadcast_api.php?view=' + BCV).catch(() => null);
    if (screenStale(tok)) return;
    if (!BC || !BC.success) { app.innerHTML = `<div class="container"><div class="section-card error">${E((BC && BC.message) || 'تعذّر التحميل')}</div></div>`; return; }
    bcDraw(tok);
  };
  const bcAud = (k) => (BC.audiences || {})[k] || k;
  function bcRow(x){
    const ch = [+x.ch_app ? `🔔 ${N(x.sent_app)}` : '', +x.ch_mail ? `📧 ${N(x.sent_mail)}` : ''].filter(Boolean).join(' · ');
    const st = x.status === 'done' ? '✅ اتبعتت' : '⏳ ماكملتش';
    const tr = BCV === 'trash';
    return `<div class="bc-item" data-id="${x.id}">
      <div class="bc-h">${BC.canDelete ? `<input type="checkbox" class="bc-ck" value="${x.id}">` : ''}<b>${E(x.title)}</b><span class="u-fs12 u-muted">${E(String(x.created_at).slice(0, 16))}</span></div>
      <div class="u-fs12 u-muted">${st} · ${E(bcAud(x.audience))} (${N(x.total)}) · ${ch} · من ${E(x.created_by || '')}${tr ? ` · اتمسحت ${E(String(x.deleted_at || '').slice(0, 16))} من ${E(x.deleted_by || '')}` : ''}</div>
      <div class="bc-body">${E(x.body)}</div>
      <div class="bc-acts">${tr ? `<button type="button" class="small" data-restore="${x.id}">↩️ استرجاع</button><button type="button" class="small danger" data-purge="${x.id}">🗑 حذف نهائي</button>`
        : `<button type="button" class="small secondary" data-reuse="${x.id}">🔁 استخدمها تاني</button>${x.status !== 'done' ? `<button type="button" class="small secondary" data-resume="${x.id}">▶️ كمّل الإرسال</button>` : ''}${BC.canDelete ? `<button type="button" class="small danger" data-trash="${x.id}">🗑 مسح</button>` : ''}`}</div></div>`;
  }
  function bcDraw(tok){
    const f = BCF || { title: '', body: '', btn_label: '', btn_url: '', ch_app: 1, ch_mail: 1, audience: 'all' };
    const tr = BCV === 'trash';
    app.innerHTML = `<div class="container wide bc">${logoHeader()}
      <div class="topbar"><div>${pageTitle('admin_broadcast', '📢 رسالة لكل المستخدمين')}</div><button class="secondary small" id="bcBack">🛡️ رجوع للوحة التحكم</button></div>
      <div class="mk-tabs"><button type="button" class="small ${tr ? 'secondary' : ''}" id="bcTabSent">📤 الإرسالات</button>${BC.canDelete ? `<button type="button" class="small ${tr ? '' : 'secondary'}" id="bcTabTrash">🗑 السلة${BC.trashCount ? ' (' + BC.trashCount + ')' : ''}</button>` : ''}</div>
      ${tr ? '' : `<div class="section-card"><div class="section-title">✍️ رسالة جديدة</div>
        <div class="mk-row"><label>مين يستلم <select id="bcAud">${Object.keys(BC.audiences).map(k => `<option value="${k}" ${k === f.audience ? 'selected' : ''}>${E(BC.audiences[k])} (${N(BC.counts[k])})</option>`).join('')}</select></label>
          <label class="bc-ch"><span>القنوات</span><span><label><input type="checkbox" id="bcApp" ${+f.ch_app ? 'checked' : ''}> 🔔 إشعار جوه الموقع</label> <label><input type="checkbox" id="bcMail" ${+f.ch_mail ? 'checked' : ''}> 📧 إيميل</label></span></label></div>
        <label class="bc-f">العنوان <input id="bcTitle" maxlength="200" value="${E(f.title)}"></label>
        <label class="bc-f">نص الرسالة (كل سطر فقرة في الإيميل) <textarea id="bcBody" rows="6" maxlength="5000">${E(f.body)}</textarea></label>
        <div class="mk-row"><label>نص زرار الإيميل <input id="bcBtnL" maxlength="80" value="${E(f.btn_label)}" placeholder="افتح GRIFFINE"></label><label>رابط الزرار <input id="bcBtnU" dir="ltr" maxlength="300" value="${E(f.btn_url)}" placeholder="${E(BC.siteUrl)}/index.php"></label></div>
        <div class="mk-row u-mt6"><button type="button" class="small secondary" id="bcPreset">🔗 نص الدومين الجديد</button><button type="button" class="small secondary" id="bcPrev">👁 معاينة</button><button type="button" class="small secondary" id="bcTest">🧪 تجربة على إيميلي</button><button type="button" class="small" id="bcSend">📢 ابعت</button></div>
        <div id="bcPv"></div><div id="bcProg" class="u-fs12 u-mt6"></div></div>`}
      <div class="section-card"><div class="section-title">${tr ? '🗑 السلة' : '📤 الإرسالات'} (${N(BC.rows.length)})</div>
        ${BC.canDelete && BC.rows.length ? `<div class="mk-row"><label class="bc-all"><span><input type="checkbox" id="bcAll"> تحديد الكل</span></label>${tr ? `<button type="button" class="small" id="bcRestoreSel">↩️ استرجاع المحدد</button><button type="button" class="small danger" id="bcPurgeSel">🗑 حذف المحدد نهائي</button><button type="button" class="small danger" id="bcEmpty">🧹 تفريغ السلة</button>` : `<button type="button" class="small danger" id="bcTrashSel">🗑 مسح المحدد</button>`}</div>` : ''}
        <div class="bc-list">${BC.rows.map(bcRow).join('') || `<div class="u-muted u-fs13">${tr ? 'السلة فاضية.' : 'لسه مفيش رسائل اتبعتت.'}</div>`}</div></div></div>`;
    bcWire(tok);
  }
  const bcForm = () => ({ title: document.getElementById('bcTitle').value.trim(), body: document.getElementById('bcBody').value.trim(), btn_label: document.getElementById('bcBtnL').value.trim(), btn_url: document.getElementById('bcBtnU').value.trim(),
    ch_app: document.getElementById('bcApp').checked ? 1 : 0, ch_mail: document.getElementById('bcMail').checked ? 1 : 0, audience: document.getElementById('bcAud').value });
  async function bcRun(id, tok){
    const btn = document.getElementById('bcSend'), pg = document.getElementById('bcProg'); if (btn) btn.disabled = true;
    let r = null, after = 0;
    do {
      r = await apiPost('/broadcast_api.php', { action: 'batch', id, after }).catch(() => null);
      if (!r || !r.success) { if (btn) btn.disabled = false; return GShell.toast((r && r.message) || 'تعذّر الإرسال — دوس «▶️ كمّل الإرسال»', 'err'); }
      after = r.next; if (pg) pg.textContent = `⏳ إشعارات ${N(r.app)} · إيميلات ${N(r.mail)} من ${N(r.total)}`;
    } while (!r.done && !screenStale(tok));
    if (screenStale(tok)) return;
    GShell.toast(`✅ خلص: إشعارات ${N(r.app)} · إيميلات ${N(r.mail)} من ${N(r.total)}`, 'ok'); BCF = null; renderAdminBroadcast('sent');
  }
  async function bcAct(action, ids, ask){
    if (!ids.length) return GShell.toast('اختار رسالة الأول', 'err');
    if (ask && !(await gConfirm(ask))) return;
    const r = await apiPost('/broadcast_api.php', { action, ids: ids.join(',') }).catch(() => null);
    if (!r || !r.success) return GShell.toast((r && r.message) || 'تعذّر التنفيذ', 'err');
    renderAdminBroadcast(BCV);
  }
  function bcWire(tok){
    const $ = (id) => document.getElementById(id), on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('bcBack', () => renderAdminHub()); on('bcTabSent', () => renderAdminBroadcast('sent')); on('bcTabTrash', () => renderAdminBroadcast('trash'));
    on('bcPreset', () => { BCF = Object.assign(bcForm(), BC_DOMAIN); bcDraw(tok); });
    on('bcPrev', () => { const f = bcForm(); $('bcPv').innerHTML = `<div class="bc-pv"><div class="u-fs12 u-muted">🔔 الإشعار جوه الموقع</div><div class="bc-pv-n"><img class="gs-bc-logo" src="griffine-logo-${document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'}.webp" alt="GRIFFINE"><b>${E(f.title)}</b><div>${E(f.body.replace(/\n+/g, ' '))}</div></div>
      <div class="u-fs12 u-muted u-mt6">📧 الإيميل (من info@griffine.app)</div><div class="bc-pv-m"><div class="bc-pv-hd"><img src="griffine-logo-email.png" alt="GRIFFINE" width="55" height="48"><span>GRIFFINE</span></div><h3>${E(f.title)}</h3>${f.body.split(/\n+/).filter(Boolean).map(p => `<p>${E(p)}</p>`).join('')}<span class="bc-pv-b">${E(f.btn_label || 'افتح GRIFFINE')}</span></div></div>`; });
    on('bcTest', async () => { const r = await apiPost('/broadcast_api.php', Object.assign({ action: 'test' }, bcForm())).catch(() => null); GShell.toast((r && r.message) || 'تعذّر الإرسال', r && r.success ? 'ok' : 'err'); });
    on('bcSend', async () => {
      const f = bcForm(); if (!f.title || !f.body) return GShell.toast('اكتب العنوان ونص الرسالة', 'err');
      if (!f.ch_app && !f.ch_mail) return GShell.toast('اختار قناة واحدة على الأقل', 'err');
      if (!(await gConfirm(`هتتبعت «${f.title}» لـ ${bcAud(f.audience)} (${N(BC.counts[f.audience])} مستخدم). متأكد؟`))) return;
      BCF = f; const r = await apiPost('/broadcast_api.php', Object.assign({ action: 'create' }, f)).catch(() => null);
      if (!r || !r.success) return GShell.toast((r && r.message) || 'تعذّر الإرسال', 'err');
      bcRun(r.id, tok);
    });
    document.querySelectorAll('[data-reuse]').forEach(b => b.onclick = () => { const x = BC.rows.find(r => String(r.id) === b.dataset.reuse); BCF = { title: x.title, body: x.body, btn_label: x.btn_label, btn_url: x.btn_url, ch_app: x.ch_app, ch_mail: x.ch_mail, audience: x.audience }; bcDraw(tok); window.scrollTo(0, 0); });
    document.querySelectorAll('[data-resume]').forEach(b => b.onclick = () => bcRun(+b.dataset.resume, tok));
    document.querySelectorAll('[data-trash]').forEach(b => b.onclick = () => bcAct('trash', [b.dataset.trash], 'مسح الرسالة دي من السجل؟ (هتروح السلة)'));
    document.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => bcAct('restore', [b.dataset.restore]));
    document.querySelectorAll('[data-purge]').forEach(b => b.onclick = () => bcAct('purge', [b.dataset.purge], 'حذف نهائي؟ مش هتقدر ترجّعها تاني.'));
    const sel = () => [...document.querySelectorAll('.bc-ck:checked')].map(c => c.value);
    const all = $('bcAll'); if (all) all.onchange = () => document.querySelectorAll('.bc-ck').forEach(c => c.checked = all.checked);
    on('bcTrashSel', () => bcAct('trash', sel(), 'مسح الرسائل المحددة؟ (هتروح السلة)'));
    on('bcRestoreSel', () => bcAct('restore', sel()));
    on('bcPurgeSel', () => bcAct('purge', sel(), 'حذف المحدد نهائي؟ مش هتقدر ترجّعه تاني.'));
    on('bcEmpty', async () => { if (await gConfirm('تفريغ السلة كلها نهائي؟')) { const r = await apiPost('/broadcast_api.php', { action: 'empty_trash' }).catch(() => null); if (r && r.success) renderAdminBroadcast('trash'); } });
  }
  window.renderAdminDomainNotice = () => renderAdminBroadcast();   // اسم الإصدار 153
  window.__mktGen = gen;   // للاختبارات
})();
