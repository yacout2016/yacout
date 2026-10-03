/* =====================================================================
   GRIFFINE — opps.js (الإصدار 101) — 🎯 البحث عن فرص حسب المؤشرات (من شاشة كشاف الأسهم)
   ⚠️ ليست توصية استثمارية - مجرد تطبيق للمؤشرات المتاحة على أسعار متأخرة 15 دقيقة
   - شراء (أخضر) أو بيع (أحمر) + إطار زمني + من 1 لـ 5 مؤشرات (لازم كلهم يتحققوا) بإعداداتها
   - لو اخترت بيع ← الشروط الافتراضية بتتعكس تلقائي (وتقدر تغيّرها) ، والإعدادات المتعارضة بتظهر وتمنع الحفظ
   - مدة البحث 1-5 أيام تداول ، الإشعار على الموقع / الإيميل / الاتنين ، لحد 3 مرات والفترة بينهم
   - لحد 4 فرص مفتوحة في نفس الوقت ، والحذف بيودّي للسلة
   ===================================================================== */
const OPP_TFS = [['1d', 'يومي'], ['1wk', 'أسبوعي'], ['1mo', 'شهري'], ['4h', '4 ساعات (حسب توفر البيانات)'], ['1h', 'ساعة (حسب توفر البيانات)']];
// الإصدار 144: الأطر الظاهرة + الافتراضي من «⏱ المدد والفترات» (الإطار المحفوظ في الفرصة بيفضل ظاهر لصاحبها)
function oppTfOpts(cur){ if (!window.gPerOpts) return OPP_TFS.map(([k, l]) => `<option value="${k}" ${k === (cur || '1d') ? 'selected' : ''}>${l}</option>`).join('');
  const vis = gPerFilter('opps_tf', OPP_TFS), arr = OPP_TFS.filter(x => vis.includes(x) || x[0] === cur);
  return gPerOpts('opps_tf', arr, cur || gPerDef('opps_tf')); }
// كل مؤشر: الاسم + الإعدادات (المفتاح، العنوان، الافتراضي للشراء، الافتراضي للبيع) + الشروط (للشراء / للبيع)
const OPP_DEF = {
  rsi:     { n: 'RSI (مؤشر القوة النسبية)', p: [['period', 'الفترة', 14], ['level', 'المستوى', 30, 70], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['below', 'أقل من المستوى (تشبع بيعي)'], ['cross_up', 'يقطع المستوى لفوق']], sell: [['above', 'أعلى من المستوى (تشبع شرائي)'], ['cross_down', 'يقطع المستوى لتحت']] } },
  macd:    { n: 'MACD', p: [['fast', 'السريع', 12], ['slow', 'البطيء', 26], ['signal', 'الإشارة', 9], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['cross_up', 'MACD يقطع خط الإشارة لفوق'], ['above', 'MACD فوق خط الإشارة']], sell: [['cross_down', 'MACD يقطع خط الإشارة لتحت'], ['below', 'MACD تحت خط الإشارة']] } },
  sma:     { n: 'المتوسط المتحرك البسيط (SMA)', p: [['period', 'الفترة', 50], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['above', 'السعر فوق المتوسط'], ['cross_up', 'السعر يقطع المتوسط لفوق']], sell: [['below', 'السعر تحت المتوسط'], ['cross_down', 'السعر يقطع المتوسط لتحت']] } },
  ema:     { n: 'المتوسط المتحرك الأسي (EMA)', p: [['period', 'الفترة', 20], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['above', 'السعر فوق المتوسط'], ['cross_up', 'السعر يقطع المتوسط لفوق']], sell: [['below', 'السعر تحت المتوسط'], ['cross_down', 'السعر يقطع المتوسط لتحت']] } },
  bb:      { n: 'بولينجر باند', p: [['period', 'الفترة', 20], ['std', 'الانحراف', 2]],
             c: { buy: [['touch_lower', 'السعر يلمس الحد السفلي']], sell: [['touch_upper', 'السعر يلمس الحد العلوي']] } },
  stoch:   { n: 'ستوكاستيك', p: [['k', '%K', 14], ['d', '%D', 3], ['smooth', 'التنعيم', 3], ['level', 'المستوى', 20, 80], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['below_cross_up', 'تحت المستوى و%K يقطع %D لفوق'], ['below', 'تحت المستوى']], sell: [['above_cross_down', 'فوق المستوى و%K يقطع %D لتحت'], ['above', 'فوق المستوى']] } },
  vol:     { n: 'حجم التداول', p: [['period', 'متوسط آخر (شموع)', 20], ['ratio', 'أعلى من المتوسط بنسبة %', 150]],
             c: { buy: [['above', 'الحجم أعلى من متوسطه بالنسبة المحددة']], sell: [['above', 'الحجم أعلى من متوسطه بالنسبة المحددة']] } },
  macross: { n: 'تقاطع متوسطين (مثل 50 و200)', p: [['fast', 'المتوسط السريع', 50], ['slow', 'المتوسط البطيء', 200], ['lookback', 'آخر شموع للتقاطع', 3]],
             c: { buy: [['cross_up', 'السريع يقطع البطيء لفوق (تقاطع ذهبي)'], ['above', 'السريع فوق البطيء']], sell: [['cross_down', 'السريع يقطع البطيء لتحت (تقاطع الموت)'], ['below', 'السريع تحت البطيء']] } },
};
const oppDefaultInd = (t, side) => { const d = OPP_DEF[t]; const p = {}; d.p.forEach(([k, , b, s]) => { p[k] = side === 'sell' && s != null ? s : b; }); return { t, p, c: d.c[side][0][0] }; };
// نفس قواعد التعارض في opps_lib.php
function oppClass(side, x){
  const buy = side === 'buy', l = +(x.p.level != null ? x.p.level : 0);
  if (x.t === 'rsi') return (buy && ['below', 'cross_up'].includes(x.c) && l <= 35) || (!buy && ['above', 'cross_down'].includes(x.c) && l >= 65) ? 'rev' : '';
  if (x.t === 'stoch') return (buy && l <= 25 && ['below', 'below_cross_up'].includes(x.c)) || (!buy && l >= 75 && ['above', 'above_cross_down'].includes(x.c)) ? 'rev' : '';
  if (x.t === 'bb') return (buy && x.c === 'touch_lower') || (!buy && x.c === 'touch_upper') ? 'rev' : '';
  if (['sma', 'ema', 'macross'].includes(x.t)) return (buy && ['above', 'cross_up'].includes(x.c)) || (!buy && ['below', 'cross_down'].includes(x.c)) ? 'trend' : '';
  return '';
}
function oppConflict(side, inds){
  const rev = [], trend = [], seen = new Set();
  for (const x of inds) {
    if ((x.t === 'macd' || x.t === 'macross') && +x.p.fast >= +x.p.slow) return `في ${OPP_DEF[x.t].n} لازم الفترة السريعة تكون أقل من البطيئة.`;
    const key = x.t + JSON.stringify(x.p) + x.c; if (seen.has(key)) return `المؤشر ${OPP_DEF[x.t].n} متكرر بنفس الإعدادات.`; seen.add(key);
    const c = oppClass(side, x); if (c === 'rev') rev.push(OPP_DEF[x.t].n); if (c === 'trend') trend.push(OPP_DEF[x.t].n);
  }
  if (rev.length && trend.length) return `⚠️ الإعدادات متعارضة: ${rev.join(' و')} (${side === 'buy' ? 'تشبع بيعي / ارتداد من القاع' : 'تشبع شرائي / ارتداد من القمة'}) مع ${trend.join(' و')} (${side === 'buy' ? 'اتجاه صاعد' : 'اتجاه هابط'}) نادرًا ما يتحققوا في نفس الوقت. غيّر إعدادات واحد منهم — مثلًا خلي مستوى RSI ${side === 'buy' ? '50 بدل 30' : '50 بدل 70'}، أو اختار شرط «يقطع» بدل «فوق/تحت» في المتوسط، أو شيل واحد منهم.`;
  return '';
}

async function renderOpportunities(editId){
  const __tok = screenToken();
  pushNav(() => renderOpportunities());
  const email = await getSession();
  if (!email) return renderLogin();
  const d = await apiGet('/opps_api.php?action=list').catch(() => ({ success: false, message: 'تعذّر الاتصال بالسيرفر' }));
  if (screenStale(__tok)) return;
  window.__lastPageKey = 'opportunities';
  if (!d.success) {
    app.innerHTML = `<div class="container wide"><div class="gs-page-title">🎯 البحث عن فرص</div><div class="info">${escapeHtml(d.message || 'غير متاح')}</div>
      ${d.requiresSubscription ? '<button class="u-wa" id="oppSub">الاشتراك والباقات</button>' : ''}</div>`;
    const b = document.getElementById('oppSub'); if (b) b.onclick = () => renderSubscriptionPlans();
    return;
  }
  const opps = d.opps || [], edit = editId ? opps.find(o => o.id === editId) : null;
  let side = edit ? edit.side : 'buy';
  let inds = edit ? JSON.parse(JSON.stringify(edit.indicators)) : [oppDefaultInd('rsi', 'buy')];
  const canNew = edit || d.open < d.max;
  const stLabel = { active: '🟢 شغّال', paused: '⏸ متوقف', expired: '⌛ انتهت المدة' };
  app.innerHTML = `<div class="container wide">
    <div class="gs-page-title">🎯 البحث عن فرص حسب المؤشرات</div>
    <div class="opp-disc">⚠️ ده <b>مش توصية استثمارية</b> — مجرد تطبيق للمؤشرات الفنية اللي بتختارها على أسعار متأخرة 15 دقيقة، والقرار قرارك.</div>
    <div class="info">البحث بيتم في كل أسهم بورصة حسابك (<b>${escapeHtml(d.market)}</b>). لحد ${d.max} فرص مفتوحة في نفس الوقت — عندك دلوقتي ${d.open}.</div>
    ${canNew ? `<div class="section-card opp-form" id="oppForm">
      <h3 class="u-m0">${edit ? `✏️ تعديل فرصة ${edit.no}` : `➕ فرصة جديدة (فرصة ${(Math.max(0, ...opps.map(o => o.no)) || 0) + 1})`}</h3>
      <div class="opp-side u-mt10" role="radiogroup" aria-label="هدف الفرصة">
        <button type="button" class="opp-buy" data-side="buy">🟢 شراء</button><button type="button" class="opp-sell" data-side="sell">🔴 بيع</button>
      </div>
      <div class="g-grid-filters u-mt10">
        <label>الإطار الزمني ${window.gPerGear ? gPerGear('opps_tf') : ''}<select id="oppTf">${oppTfOpts(edit && edit.timeframe)}</select></label>
        <label>عدد المؤشرات<select id="oppCount">${[1, 2, 3, 4, 5].map(n => `<option ${n === inds.length ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <div id="oppInds"></div>
      <div id="oppWarn" class="opp-warn" hidden></div>
      <div class="g-grid-filters u-mt10">
        <label>مدة البحث (أيام تداول)<select id="oppDays">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${edit && edit.days === n ? 'selected' : ''}>${n} ${n === 1 ? 'يوم' : 'أيام'}</option>`).join('')}</select></label>
        <label>عدد مرات الإرسال<select id="oppSends">${[1, 2, 3].map(n => `<option ${edit && edit.maxSends === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>الفترة بين كل مرة<select id="oppGap">${[[15, '15 دقيقة'], [30, '30 دقيقة'], [60, 'ساعة'], [120, 'ساعتين'], [240, '4 ساعات'], [1440, 'يوم']].map(([v, l]) => `<option value="${v}" ${edit ? (edit.sendGap === v ? 'selected' : '') : (v === 60 ? 'selected' : '')}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="radio-row u-mt8">
        <label class="u-check"><input type="checkbox" id="oppChApp" ${!edit || edit.chApp ? 'checked' : ''}> إشعار على حسابي بالموقع</label>
        <label class="u-check"><input type="checkbox" id="oppChEmail" ${!edit || edit.chEmail ? 'checked' : ''}> إيميل</label>
      </div>
      <div class="radio-row u-mt10">
        <button type="button" class="u-wa" id="oppSave">${edit ? '💾 حفظ وبدء بحث جديد' : '🔎 تشغيل البحث'}</button>
        <button type="button" class="secondary u-wa" id="oppClear">🧹 تفريغ الخانات</button>
        ${edit ? '<button type="button" class="secondary u-wa" id="oppCancel">إلغاء التعديل</button>' : ''}
      </div>
    </div>` : `<div class="section-card u-muted">وصلت للحد الأقصى (${d.max} فرص مفتوحة). أوقف أو احذف فرصة عشان تعمل واحدة جديدة.</div>`}
    <div id="oppList">${opps.map(o => oppCardHtml(o, stLabel)).join('') || '<p class="u-muted">لسه معملتش أي فرصة.</p>'}</div>
  </div>`;

  // ---- النموذج ----
  const paintSide = () => { app.querySelectorAll('.opp-side [data-side]').forEach(b => b.classList.toggle('on', b.dataset.side === side)); };
  const paintInds = () => {
    const w = document.getElementById('oppInds'); if (!w) return;
    w.innerHTML = inds.map((x, i) => { const def = OPP_DEF[x.t];
      return `<div class="opp-ind" data-i="${i}">
        <label class="opp-ind-t">المؤشر ${i + 1}<select class="oppT">${Object.entries(OPP_DEF).map(([k, v]) => `<option value="${k}" ${k === x.t ? 'selected' : ''}>${escapeHtml(v.n)}</option>`).join('')}</select></label>
        <label>الشرط<select class="oppC">${[...def.c.buy, ...def.c.sell].filter((c, j, a) => a.findIndex(z => z[0] === c[0]) === j).map(([k, l]) => `<option value="${k}" ${k === x.c ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}</select></label>
        ${def.p.map(([k, l]) => `<label class="opp-p">${escapeHtml(l)}<input type="number" step="any" data-k="${k}" value="${escapeHtml(x.p[k])}"></label>`).join('')}
      </div>`; }).join('');
    w.querySelectorAll('.opp-ind').forEach(row => {
      const i = +row.dataset.i;
      row.querySelector('.oppT').onchange = (e) => { inds[i] = oppDefaultInd(e.target.value, side); paintInds(); };
      row.querySelector('.oppC').onchange = (e) => { inds[i].c = e.target.value; warn(); };
      row.querySelectorAll('input[data-k]').forEach(inp => inp.oninput = () => { inds[i].p[inp.dataset.k] = +inp.value; warn(); });
    });
    warn();
  };
  const warn = () => { const m = oppConflict(side, inds), w = document.getElementById('oppWarn'), s = document.getElementById('oppSave'); if (!w) return;
    w.hidden = !m; w.textContent = m || ''; if (s) s.disabled = !!m; };
  if (document.getElementById('oppForm')) {
    paintSide(); paintInds();
    app.querySelectorAll('.opp-side [data-side]').forEach(b => b.onclick = () => {
      if (b.dataset.side === side) return; side = b.dataset.side;
      // عكس الشروط والمستويات الافتراضية تلقائي
      inds = inds.map(x => { const n = oppDefaultInd(x.t, side); Object.keys(x.p).forEach(k => { const d0 = OPP_DEF[x.t].p.find(z => z[0] === k); if (d0 && d0[3] == null) n.p[k] = x.p[k]; }); return n; });
      paintSide(); paintInds();
    });
    document.getElementById('oppCount').onchange = (e) => { const n = +e.target.value; const pool = ['rsi', 'macd', 'sma', 'bb', 'vol'];
      while (inds.length < n) inds.push(oppDefaultInd(pool.find(t => !inds.some(x => x.t === t)) || 'ema', side)); inds = inds.slice(0, n); paintInds(); };
    document.getElementById('oppClear').onclick = () => { side = 'buy'; inds = [oppDefaultInd('rsi', 'buy')]; document.getElementById('oppCount').value = '1'; document.getElementById('oppTf').value = window.gPerDef ? gPerDef('opps_tf') : '1d'; paintSide(); paintInds(); };
    if (window.gPerWire) gPerWire(app, () => { const t = document.getElementById('oppTf'); t.innerHTML = oppTfOpts(t.value); });
    const cc = document.getElementById('oppCancel'); if (cc) cc.onclick = () => renderOpportunities();
    document.getElementById('oppSave').onclick = async () => {
      const m = oppConflict(side, inds); if (m) return warn();
      const btn = document.getElementById('oppSave'); btn.disabled = true;
      const r = await apiPost('/opps_api.php', { action: 'save', id: edit ? edit.id : '', side, timeframe: document.getElementById('oppTf').value, indicators: JSON.stringify(inds),
        days: document.getElementById('oppDays').value, maxSends: document.getElementById('oppSends').value, sendGap: document.getElementById('oppGap').value,
        chApp: document.getElementById('oppChApp').checked ? '1' : '0', chEmail: document.getElementById('oppChEmail').checked ? '1' : '0' }).catch(() => null);
      if (!r || !r.success) { btn.disabled = false; GShell.toast((r && r.message) || 'تعذّر الحفظ', 'err'); return; }
      GShell.toast('بدأ البحث ✓ — النتائج بتظهر هنا أول ما تخلص أول دورة', 'ok');
      apiPost('/opps_api.php', { action: 'run', id: r.id }).then(() => { if (!screenStale(__tok2)) renderOppsSilent(); }).catch(() => {});
      window.__navSilent = true; try { renderOpportunities(); } finally { window.__navSilent = false; }
    };
  }
  const __tok2 = GShell.seq + 1;
  // ---- قائمة الفرص ----
  app.querySelectorAll('[data-opp-act]').forEach(b => b.onclick = async () => {
    const id = +b.dataset.id, act = b.dataset.oppAct;
    if (act === 'edit') return renderOpportunities(id);
    if (act === 'delete' && !await gConfirm('حذف الفرصة؟ هتنتقل لسلة المحذوفات وتقدر ترجّعها أو تحذفها نهائي.', { ok: '🗑️ نقل للسلة', danger: true })) return;
    const r = await apiPost('/opps_api.php', { action: act, id }).catch(() => null);
    if (r && r.success) { if (act === 'run') GShell.toast('تم تشغيل البحث ✓', 'ok'); renderOppsSilent(); } else GShell.toast((r && r.message) || 'تعذّر التنفيذ', 'err');
  });
  app.querySelectorAll('[data-opp-plan]').forEach(b => b.onclick = () => {
    const pre = { symbol: b.dataset.sym, market: d.market, price: +b.dataset.px };
    if (b.dataset.oppPlan === 'grid') { window.__prefillGridPlan = pre; renderGridPlanForm(); } else { window.__prefillPlan = pre; renderNewPlanForm(); }
  });
  app.querySelectorAll('.opp-hits').forEach(box => { if (typeof mkLimitList === 'function') mkLimitList(box, 5); });
  // تحديث تلقائي كل دقيقة طول ما في بحث شغّال
  clearInterval(window.__oppTimer);
  if (opps.some(o => o.status === 'active')) window.__oppTimer = setInterval(() => { if (screenStale(__tok)) { clearInterval(window.__oppTimer); return; } if (!document.getElementById('oppForm') || !document.activeElement || !document.activeElement.closest('#oppForm')) renderOppsSilent(); }, 60000);
}
function renderOppsSilent(){ window.__navSilent = true; try { renderOpportunities(); } finally { window.__navSilent = false; } }
function oppCardHtml(o, stLabel){
  const buy = o.side === 'buy';
  const indTxt = (o.indicators || []).map(x => { const d = OPP_DEF[x.t]; if (!d) return x.t; const c = [...d.c.buy, ...d.c.sell].find(z => z[0] === x.c); return `${d.n}: ${c ? c[1] : x.c} (${d.p.map(([k, l]) => `${l} ${x.p[k]}`).join('، ')})`; });
  return `<div class="section-card opp-card ${buy ? 'buy' : 'sell'}">
    <div class="u-row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div><b class="opp-no">فرصة ${o.no}</b> <span class="opp-tag ${buy ? 'buy' : 'sell'}">${buy ? '🟢 شراء' : '🔴 بيع'}</span> <span class="u-fs12">${escapeHtml((OPP_TFS.find(x => x[0] === o.timeframe) || [, ''])[1])}</span> · <span class="u-fs12">${stLabel[o.status] || o.status}</span></div>
      <span class="radio-row">
        ${o.status !== 'expired' ? `<button class="small secondary u-wa" data-opp-act="toggle" data-id="${o.id}">${o.status === 'active' ? '⏸ إيقاف' : '▶ تشغيل'}</button>` : ''}
        ${o.status === 'active' ? `<button class="small secondary u-wa" data-opp-act="run" data-id="${o.id}">🔄 فحص الآن</button>` : ''}
        <button class="small secondary u-wa" data-opp-act="edit" data-id="${o.id}">✏️ تعديل</button>
        <button class="small danger u-wa" data-opp-act="delete" data-id="${o.id}">🗑️</button>
      </span>
    </div>
    <ul class="opp-inds u-fs12">${indTxt.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
    <div class="u-fs12 u-muted">البحث لحد ${escapeHtml(formatDateTimeAr(o.endsAt))} · إشعار على ${[o.chApp && 'الموقع', o.chEmail && 'الإيميل'].filter(Boolean).join(' + ')} · اتبعت ${o.sends} من ${o.maxSends}${o.scanning && o.status === 'active' ? ' · 🔎 جارٍ الفحص...' : o.lastPassAt ? ` · آخر فحص ${escapeHtml(formatDateTimeAr(o.lastPassAt))}` : ''}</div>
    ${o.hits.length ? `<div class="opp-hits gs-list">${o.hits.map(h => `<div class="opp-hit">
        <span class="opp-hit-s"><b dir="ltr">${escapeHtml(h.symbol)}</b><small>${escapeHtml(h.name && h.name !== h.symbol ? h.name : '')}</small></span>
        <span class="g-num">${fmt2(h.price)}</span>
        <span class="u-fs11 ${h.notified ? 'pos' : 'u-muted'}">${h.notified ? `✓ اتبعت (تنبيه ${h.sentNo})` : 'في انتظار الإرسال'}<br>${escapeHtml(formatDateTimeAr(h.at))}</span>
        <span class="opp-hit-b"><button class="small u-wa" data-opp-plan="dca" data-sym="${escapeHtml(h.symbol)}" data-px="${h.price}">+ خطة DCA</button><button class="small secondary u-wa" data-opp-plan="grid" data-sym="${escapeHtml(h.symbol)}" data-px="${h.price}">+ خطة Grid</button></span>
      </div>`).join('')}</div><div class="u-fs11 u-muted u-mt4">${o.hits.length} سهم انطبقت عليه الشروط</div>` : `<div class="u-fs12 u-muted u-mt8">${o.status === 'active' ? 'لسه مفيش أسهم انطبقت عليها الشروط.' : 'مفيش نتائج.'}</div>`}
  </div>`;
}
