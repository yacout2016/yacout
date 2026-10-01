/* =====================================================================
   GRIFFINE — mizan.js (الإصدار 115) — «ميزان محفظتك AI» (تقرير توزيع التنوع في المحفظة والتقارير)
   المراكز المفتوحة الفعلية (DCA + Grid) ← mizan_api.php (الأسعار + القطاعات + النسب المالية + رأي الذكاء الاصطناعي)
   بنفس شكل وفلسفة «ميزان GRIFFINE»: درجة الخطورة + التوزيع + التنبيهات + إعادة التوازن + الشركات المرشحة (بتفتح في بصيرة)
   ===================================================================== */
const MZ_COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#14B8A6', '#EAB308', '#64748B', '#EC4899'];
function mzE(x){ return String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function mzN(v, d = 2){ return v == null || isNaN(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function mzP(v){ return v == null || isNaN(v) ? '—' : (v > 0 ? '+' : '') + mzN(v) + '%'; }
function mzGauge(score){
  const a = Math.PI * (1 - score / 100), x = 75 + 62 * Math.cos(a), y = 82 - 62 * Math.sin(a), col = score >= 65 ? 'var(--gs-neg,#DC2626)' : score >= 45 ? '#D97706' : 'var(--gs-pos,#0E9F6E)';
  return `<path d="M13,82 A62,62 0 0 1 137,82" fill="none" stroke="var(--gs-surface-3,#E5E7EB)" stroke-width="12" stroke-linecap="round"/><path d="M13,82 A62,62 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>
    <text x="75" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">${score}</text><text x="75" y="90" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">من 100</text>`;
}
function mzDonut(parts){
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1; let a0 = -Math.PI / 2; const R = 80, r = 50, cx = 100, cy = 100;
  if (parts.length === 1) return `<circle cx="100" cy="100" r="65" fill="none" stroke="${parts[0].c}" stroke-width="30"/>`;
  return parts.map(p => { const a1 = a0 + p.v / tot * Math.PI * 2, lg = a1 - a0 > Math.PI ? 1 : 0;
    const P = (ang, rr) => `${(cx + rr * Math.cos(ang)).toFixed(2)},${(cy + rr * Math.sin(ang)).toFixed(2)}`;
    const d = `M${P(a0, R)} A${R},${R} 0 ${lg} 1 ${P(a1, R)} L${P(a1, r)} A${r},${r} 0 ${lg} 0 ${P(a0, r)}Z`; a0 = a1;
    return `<path d="${d}" fill="${p.c}"><title>${mzE(p.l)} ${mzN(p.v / tot * 100)}%</title></path>`; }).join('');
}

/* المراكز المفتوحة من الخطط - لكل عملة */
function mzPositions(plans, grids){
  const by = {}, skipped = [];
  const ccyOf = (p, m) => p.currency || (typeof MARKET_TO_CURRENCY_MAP !== 'undefined' ? MARKET_TO_CURRENCY_MAP[m] : '') || '—';
  Object.entries(plans || {}).forEach(([s, p]) => {
    if (!p || !Array.isArray(p.levels)) return;
    let sim; try { sim = simulatePlan(p); } catch(e){ return; }
    if (!(sim.heldQty > 0) || !(sim.avgCostCurrent > 0)) return;
    if (p.listed === false) { skipped.push(s); return; }
    const m = p.market || 'مصر', c = ccyOf(p, m); (by[c] = by[c] || []).push({ s, m, q: +sim.heldQty.toFixed(6), avg: +sim.avgCostCurrent.toFixed(6), t: 'DCA' });
  });
  Object.entries(grids || {}).forEach(([s, g]) => {
    if (!g || !Array.isArray(g.levels)) return;
    const held = g.levels.filter(l => l.status === 'bought' && l.executedQty > 0), q = held.reduce((a, l) => a + l.executedQty, 0);
    if (!(q > 0)) return;
    if (g.listed === false) { skipped.push(s); return; }
    const m = g.market || 'مصر', c = ccyOf({}, m); (by[c] = by[c] || []).push({ s, m, q: +q.toFixed(6), avg: +(held.reduce((a, l) => a + l.executedQty * l.executedPrice, 0) / q).toFixed(6), t: 'Grid' });
  });
  return { by, skipped };
}

async function renderDiversificationReport(){
  const __tok = screenToken();
  pushNav(() => renderDiversificationReport());
  const email = await getSession();
  if (!email) return renderLogin();
  if (!(await ensureAccess())) return;
  if (!window.__isAdmin && window.GShell && GShell.settings && GShell.settings.hide_mizan_screen === true) return renderHome();   // الإصدار 116: مخفية من الإعدادات
  const [plans, grids] = await Promise.all([getPlans(email).catch(() => ({})), getGridPlans(email).catch(() => ({}))]);
  if (screenStale(__tok)) return;
  const { by, skipped } = mzPositions(plans, grids);
  const ccys = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
  let sel = ''; try { sel = localStorage.getItem('mz_ccy') || ''; } catch(e){}
  if (!ccys.includes(sel)) sel = ccys[0] || '';
  let LAST = null;

  app.innerHTML = `<div class="container wide bs-screen mz-screen">${logoHeader()}<span class="gs-page-title" hidden>ميزان محفظتك AI — توزيع التنوع</span>
    <div class="bs-top"><div class="bs-brand"><div class="bs-logo">⚖</div><div><h1>ميزان محفظتك <span>GRIFFINE AI</span></h1><p>تحليل تنويع محفظتك الفعلية بالنسب المالية والذكاء الاصطناعي</p></div></div>
      <div class="mz-actions">${ccys.length > 1 ? `<span class="mz-ccy">${ccys.map(c => `<button type="button" data-c="${mzE(c)}" class="${c === sel ? 'on' : ''}">${mzE(c)}</button>`).join('')}</span>` : ''}
        <button type="button" class="secondary small" id="mzFresh" hidden>🔄 تحديث التحليل</button><button type="button" class="secondary small" id="mzPdf" hidden>🖨 PDF</button>
        <button type="button" class="secondary small" id="homeBtn">🏠 الرئيسية</button></div></div>
    <div class="bs-disc"><span>⚠️</span><div><b>تنويه:</b> تحليل آلي تعليمي معتمد على خططك وأسعار السوق المتأخرة 15 دقيقة والنسب المالية والذكاء الاصطناعي — مش نصيحة استثمارية ولا توصية بالشراء أو البيع.</div></div>
    ${skipped.length ? `<div class="mz-note">الأسهم غير المدرجة (${skipped.map(mzE).join('، ')}) مش داخلة في التحليل لأن مفيش ليها أسعار سوق.</div>` : ''}
    <div id="mzBody"></div></div>`;
  document.getElementById('homeBtn').onclick = () => renderHome();
  document.querySelectorAll('.mz-ccy button').forEach(b => b.onclick = () => { sel = b.dataset.c; try { localStorage.setItem('mz_ccy', sel); } catch(e){} document.querySelectorAll('.mz-ccy button').forEach(x => x.classList.toggle('on', x === b)); run(false); });
  document.getElementById('mzFresh').onclick = () => run(true);
  document.getElementById('mzPdf').onclick = () => { if (LAST) mzPrint(LAST); };

  const body = document.getElementById('mzBody');
  if (!ccys.length) {
    body.innerHTML = `<div class="bs-card mz-empty"><div class="mz-empty-ic">⚖️</div><b>لا توجد مراكز مفتوحة حاليًا</b><p>التقرير بيحلل الأسهم اللي محتفظ بيها فعلًا في خطط DCA وGrid. أول ما تشتري أول مستوى هيظهر تحليل تنويع محفظتك هنا.</p></div>`;
    return;
  }

  async function run(fresh){
    const steps = ['جلب آخر سعر وأسعار سنة لكل سهم', 'تحديد قطاع كل شركة', 'حساب الأوزان والتركّز (HHI) والتذبذب والارتباط', 'رأي الذكاء الاصطناعي واقتراحات إعادة التوازن'];
    body.innerHTML = `<div class="bs-card mz-loading">${steps.map((s, i) => `<div class="mz-step" style="animation-delay:${i * 0.6}s"><span class="mz-spin"></span>${s}</div>`).join('')}</div>`;
    document.getElementById('mzFresh').hidden = true; document.getElementById('mzPdf').hidden = true;
    const my = sel;
    const r = await apiPost('/mizan_api.php', { action: 'analyze', positions: JSON.stringify(by[sel]), ccy: sel, fresh: fresh ? 1 : '' }).catch(() => null);
    if (screenStale(__tok) || my !== sel) return;
    if (!r || !r.success) {
      body.innerHTML = `<div class="bs-card"><div class="bs-err">${mzE((r && r.message) || 'تعذّر التحليل الآن — حاول تاني.')}</div>${r && r.requiresSubscription ? '<button type="button" class="small u-mt10" id="mzSub">الاشتراك</button>' : ''}</div>`;
      const sb = document.getElementById('mzSub'); if (sb) sb.onclick = () => renderSubscriptionPlans();
      return;
    }
    LAST = r.report; mzPaint(body, LAST);
    document.getElementById('mzFresh').hidden = false; document.getElementById('mzPdf').hidden = false;
  }
  run(false);
}

function mzPaint(body, R){
  const M = R.m, ai = R.ai || {}, H = M.holdings;
  const lvl = M.risk >= 65 ? ['خطورة عالية', 'neg'] : M.risk >= 45 ? ['خطورة متوسطة', 'warn'] : ['خطورة منخفضة', 'pos'];
  const top = H.slice(0, 8), rest = H.slice(8).reduce((a, h) => a + h.value, 0);
  const parts = top.map((h, i) => ({ l: h.s, v: h.value, c: MZ_COLORS[i % MZ_COLORS.length] })); if (rest > 0) parts.push({ l: 'أخرى', v: rest, c: '#94A3B8' });
  const secs = Object.entries(M.sectors || {});
  const kpi = (l, v, cls, tip) => `<div class="mz-kpi"${tip ? ` title="${mzE(tip)}"` : ''}><span>${l}</span><b class="n ${cls || ''}">${v}</b></div>`;
  const mvIc = { reduce: '⬇️', add: '⬆️', hold: '✅', watch: '👁', new: '➕' };
  const aiMoves = (ai.moves || []).filter(m => m.t);
  body.innerHTML = `
    <div class="bs-card mz-risk-card"><div class="mz-risk">
      <svg class="mz-gauge" viewBox="0 0 150 92" aria-hidden="true">${mzGauge(M.risk)}</svg>
      <div class="mz-risk-txt"><h3 class="${lvl[1]}">${lvl[0]}</h3>
        <div class="mz-sub">قيمة المحفظة <b class="n">${mzN(M.total)}</b> ${mzE(R.ccy)} • ${M.n} ${M.n === 1 ? 'سهم' : 'أسهم'} • ${secs.length} ${secs.length === 1 ? 'قطاع' : 'قطاعات'} • <span class="bs-chip ${ai.auto ? 'bs-c-neu' : 'bs-c-gold'}">${ai.auto ? 'تحليل آلي' : '🤖 ذكاء اصطناعي'}</span>${R.cached ? ' <small class="u-muted">(محفوظ مؤقتًا)</small>' : ''}</div>
        <div class="mz-parts">${[['التركّز', M.parts.conc], ['القطاعات', M.parts.sector], ['الارتباط', M.parts.corr], ['التذبذب', M.parts.vol]].map(([l, v]) => `<div><small>${l}</small><div class="mz-bar"><i style="width:${v}%;background:${v >= 65 ? 'var(--gs-neg,#DC2626)' : v >= 45 ? '#D97706' : 'var(--gs-pos,#0E9F6E)'}"></i></div></div>`).join('')}</div>
      </div></div>
      <div class="mz-kpis">
        ${kpi('الربح / الخسارة غير المحققة', `${mzN(M.pnl)} (${mzP(M.pnlPct)})`, M.pnl >= 0 ? 'pos' : 'neg')}
        ${kpi('مؤشر التركّز HHI', mzN(M.hhi), M.hhi > 0.3 ? 'neg' : M.hhi <= 0.2 ? 'pos' : 'warn', 'مجموع مربعات الأوزان — أقل من 0.2 ممتاز، أكبر من 0.3 ضعيف')}
        ${kpi('عدد الأسهم الفعلي', mzN(M.effN), '', '1 ÷ HHI — المحفظة كأنها العدد ده من الأسهم المتساوية')}
        ${kpi('أكبر سهم / أكبر 3', `${mzN(M.top1, 1)}% / ${mzN(M.top3, 1)}%`, M.top1 >= 40 ? 'neg' : '')}
        ${kpi('التذبذب السنوي', M.volP == null ? '—' : mzN(M.volP) + '%', M.volP >= 35 ? 'warn' : '', 'الانحراف المعياري للعائد اليومي × √252 بأوزانك الحالية')}
        ${kpi('أقصى تراجع (سنة)', M.mddP == null ? '—' : mzN(M.mddP) + '%', 'neg', 'أكبر نزول من قمة لقاع للمحفظة بأوزانها الحالية خلال السنة')}
        ${kpi('متوسط الارتباط', M.avgCorr == null ? '—' : mzN(M.avgCorr), M.avgCorr >= 0.6 ? 'warn' : '', 'من −1 لـ 1 — كل ما قلّ كل ما الأسهم بتحمي بعض أكتر')}
        ${kpi('نسبة التنويع', M.divRatio == null ? '—' : mzN(M.divRatio), M.divRatio >= 1.25 ? 'pos' : '', 'متوسط تذبذب الأسهم ÷ تذبذب المحفظة — أكبر من 1 يعني التنويع بيقلل المخاطرة')}
      </div></div>

    <div class="mz-two">
      <div class="bs-card"><h3 class="mz-h">🥧 التوزيع حسب السهم</h3><div class="mz-donut-wrap"><svg class="mz-donut" viewBox="0 0 200 200">${mzDonut(parts)}</svg>
        <div class="mz-legend">${parts.map(p => `<div class="mz-lg"><i style="background:${p.c}"></i>${mzE(p.l)}<b class="n">${mzN(p.v / M.total * 100, 1)}%</b></div>`).join('')}</div></div></div>
      <div class="bs-card"><h3 class="mz-h">🏭 التوزيع حسب القطاع</h3>
        ${secs.map(([s, w], i) => `<div class="mz-sec"><div class="mz-sec-top"><span>${mzE(s)}</span><b class="n">${mzN(w, 1)}%</b></div><div class="mz-bar"><i style="width:${Math.min(100, w)}%;background:${w >= 50 ? 'var(--gs-neg,#DC2626)' : MZ_COLORS[i % MZ_COLORS.length]}"></i></div></div>`).join('')}
        ${M.pairs && M.pairs.length ? `<h3 class="mz-h u-mt10">🔗 أعلى ارتباط بين أسهمك</h3><div class="mz-pairs">${M.pairs.slice(0, 4).map(p => `<span class="bs-chip ${p.c >= 0.8 ? 'bs-c-neg' : p.c >= 0.5 ? 'bs-c-gold' : 'bs-c-neu'}"><span class="n">${mzE(p.a)} ↔ ${mzE(p.b)}</span> <b class="n">${mzN(p.c)}</b></span>`).join('')}</div>` : ''}
      </div>
    </div>

    <h2 class="mz-sec-title"><span class="ic">📋</span> أسهم المحفظة</h2>
    <div class="bs-card u-ox"><table class="mz-table"><thead><tr><th>السهم</th><th>القطاع</th><th>الخطة</th><th>الوزن</th><th>النسبة المقترحة</th><th>القيمة</th><th>الربح/الخسارة</th><th>التذبذب</th><th>عائد سنة</th><th>أقصى تراجع</th><th></th></tr></thead><tbody>
      ${H.map((h, i) => `<tr><td><b class="n" title="${mzE(h.name || '')}">${mzE(h.s)}</b>${h.name ? `<br><small class="u-muted">${mzE(h.name)}</small>` : ''}</td><td>${mzE(h.sector)}</td><td><span class="bs-chip bs-c-neu">${mzE(h.t)}</span></td>
        <td><div class="mz-wcell"><div class="mz-bar"><i style="width:${Math.min(100, h.w)}%;background:${h.target != null && h.w > h.target + 5 ? 'var(--gs-neg,#DC2626)' : MZ_COLORS[i % MZ_COLORS.length]}"></i></div><b class="n">${mzN(h.w, 1)}%</b></div></td>
        <td class="mz-tgt" title="${mzE(h.tReason || '')}"><b class="n ${h.target != null && h.w > h.target + 5 ? 'neg' : 'pos'}">${h.target != null ? h.target + '%' : '—'}</b> <span class="bs-chip ${h.tSrc === 'ai' ? 'bs-c-gold' : 'bs-c-neu'}">${h.tSrc === 'ai' ? '🤖 AI' : 'قواعد'}</span>${h.tReason ? `<br><small class="u-muted mz-why">${mzE(h.tReason)}</small>` : ''}</td>
        <td class="mz-num">${mzN(h.value)}</td><td class="mz-num ${h.pnl >= 0 ? 'pos' : 'neg'}">${mzP(h.pnlPct)}</td><td class="mz-num">${h.vol == null ? '—' : mzN(h.vol) + '%'}</td>
        <td class="mz-num ${h.y1 == null ? '' : h.y1 >= 0 ? 'pos' : 'neg'}">${mzP(h.y1)}</td><td class="mz-num neg">${h.mdd == null ? '—' : mzN(h.mdd) + '%'}</td>
        <td><button type="button" class="secondary small mz-bs" data-s="${mzE(h.s)}" data-m="${mzE(h.m)}">بصيرة ↗</button></td></tr>`).join('')}
    </tbody></table><small class="u-muted">النسبة المقترحة لكل سهم بتتحدد حسب قطاعه ونوعه وتذبذبه وارتباطه ووضع السوق (بالذكاء الاصطناعي، أو بالقواعد المتعارف عليها لتوازن المحافظ لو مش شغال) — مفيش رقم ثابت لكل الأسهم. الوزن الأعلى من المقترح بأكتر من 5 نقط باللون الأحمر.</small></div>

    ${R.alerts && R.alerts.length ? `<h2 class="mz-sec-title"><span class="ic">🚦</span> التنبيهات</h2><div class="bs-card mz-alerts">${R.alerts.map(a => `<div class="mz-al k-${a.k}"><span class="d">${a.k === 'pos' ? '✅' : a.k === 'neg' ? '⛔' : '⚠️'}</span><div><b>${mzE(a.t)}</b><small>${mzE(a.d)}</small></div></div>`).join('')}</div>` : ''}

    <h2 class="mz-sec-title"><span class="ic">🤖</span> ${ai.auto ? 'الرأي الآلي' : 'رأي الذكاء الاصطناعي'}</h2>
    <div class="bs-card mz-ai"><p>${mzE(ai.summary)}</p>
      <div class="mz-two mz-two-flat"><div><b class="pos">نقاط القوة</b><ul>${(ai.strengths || []).map(x => `<li>${mzE(x)}</li>`).join('')}</ul></div><div><b class="neg">مخاطر تنتبه لها</b><ul>${(ai.risks || []).map(x => `<li>${mzE(x)}</li>`).join('')}</ul></div></div>
      ${aiMoves.length ? `<b>خطوات مقترحة</b><div class="mz-moves">${aiMoves.map(m => `<div class="mz-mv"><span>${mvIc[m.k] || '•'}</span>${m.s ? `<b class="n">${mzE(m.s)}</b>` : ''} ${mzE(m.t)}</div>`).join('')}</div>` : ''}
      ${ai.market_view ? `<p class="mz-mview">📊 ${mzE(ai.market_view)}</p>` : ''}
      ${R.aiErr ? `<small class="u-muted">(${mzE(R.aiErr)})</small>` : ''}</div>

    <h2 class="mz-sec-title"><span class="ic">⚖️</span> إعادة التوازن بالأرقام</h2>
    <div class="bs-card"><div class="mz-moves">${(R.moves || []).map(m => `<div class="mz-mv"><span>${mvIc[m.k] || '•'}</span><span>${mzE(m.t)}</span></div>`).join('')}</div>
      <small class="u-muted">التنفيذ بيكون بتعديل المبلغ المرصود لخطط الأسهم أو بدء خطة جديدة — الخطط نفسها مالهاش حد خسارة.</small></div>

    ${(ai.candidates || []).length ? `<h2 class="mz-sec-title"><span class="ic">🏢</span> شركات مرشحة للتنويع</h2><div class="mz-cands">${ai.candidates.map(c => `<button type="button" class="mz-co" data-s="${mzE(c.s)}" data-m="${mzE(c.m)}"><span class="av">${mzE(c.s.slice(0, 5))}</span><span><b>${mzE(c.n || c.s)}</b><small>${mzE(c.r)}</small></span><span class="go">حلّل في بصيرة ↗</span></button>`).join('')}</div>` : ''}

    <h2 class="mz-sec-title"><span class="ic">🎓</span> الأسس المالية المستخدمة</h2>
    <div class="mz-sci">
      <div><b>نظرية المحفظة الحديثة (ماركويتز)</b>التنويع بين أسهم وقطاعات مش مرتبطة ببعض بيقلل المخاطرة من غير ما يقلل العائد المتوقع بنفس القدر.</div>
      <div><b>مؤشر التركّز HHI</b>مجموع مربعات الأوزان. 1 ÷ HHI = عدد الأسهم الفعلي. أقل من 0.2 ممتاز، أكبر من 0.3 ضعيف.</div>
      <div><b>التذبذب والارتباط</b>تذبذب المحفظة بيتحسب من العوائد اليومية بأوزانك، والارتباط العالي (فوق 0.8) معناه السهمين بيتحركوا مع بعض.</div>
      <div><b>أقصى تراجع</b>أكبر نزول من قمة لقاع خلال السنة — بيوضح أسوأ فترة كانت ممكن تعدّي على المحفظة.</div>
    </div>
    <div class="bs-disc bs-disc2"><span>⚠️</span><div>${mzE((R.config && R.config.disclaimer) || 'تحليل آلي تعليمي — مش نصيحة استثمارية.')} الأداء السابق لا يضمن النتائج المستقبلية.</div></div>`;
  const openBs = (s, m) => { if (typeof window.renderBasira === 'function') window.renderBasira(s, m); };
  body.querySelectorAll('.mz-bs, .mz-co').forEach(b => b.onclick = () => openBs(b.dataset.s, b.dataset.m));
  if (typeof gLabelCells === 'function') body.querySelectorAll('table.mz-table').forEach(gLabelCells);   // الإصدار 123: كروت على الموبايل
}

function mzPrint(R){
  const w = window.open('', '_blank'); if (!w) { if (typeof toast === 'function') toast('المتصفح منع فتح نافذة التقرير — اسمح بالنوافذ المنبثقة', 'err'); return; }
  const M = R.m, ai = R.ai || {}, e = mzE;
  const lvl = M.risk >= 65 ? 'خطورة عالية' : M.risk >= 45 ? 'خطورة متوسطة' : 'خطورة منخفضة';
  w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>ميزان محفظتك GRIFFINE AI</title>
    <style>body{font-family:IBM Plex Sans Arabic,Tahoma,sans-serif;padding:24px;color:#111;background:#fff}h1{margin:0 0 4px;font-size:22px}h2{font-size:16px;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:12.5px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:right}th{background:#f3f4f6}.n,.mz-num{direction:ltr;unicode-bidi:plaintext;font-variant-numeric:tabular-nums}
    .pos{color:#15803d}.neg{color:#b91c1c}.kv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kv div{background:#f8fafc;border:1px solid #eee;border-radius:8px;padding:8px;text-align:center}.kv span{display:block;font-size:11px;color:#666}
    .disc{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12px;margin:10px 0}p{line-height:1.8;font-size:13.5px}li{font-size:13px;margin-bottom:3px}</style></head><body>
    <h1>ميزان محفظتك GRIFFINE AI — تحليل التنويع</h1><div style="color:#555;font-size:13px">${e(R.ccy)} — ${e(new Date(R.at).toLocaleString('ar-EG'))}</div>
    <div class="disc">⚠️ تحليل آلي تعليمي — مش نصيحة استثمارية.</div>
    <h2>درجة الخطورة: ${M.risk} من 100 (${lvl})</h2>
    <div class="kv">${[['قيمة المحفظة', mzN(M.total)], ['الربح/الخسارة', mzN(M.pnl) + ' (' + mzP(M.pnlPct) + ')'], ['HHI', mzN(M.hhi)], ['عدد الأسهم الفعلي', mzN(M.effN)], ['أكبر سهم', mzN(M.top1, 1) + '%'], ['التذبذب السنوي', M.volP == null ? '—' : mzN(M.volP) + '%'], ['أقصى تراجع', M.mddP == null ? '—' : mzN(M.mddP) + '%'], ['متوسط الارتباط', M.avgCorr == null ? '—' : mzN(M.avgCorr)]].map(([l, v]) => `<div><span>${l}</span><b class="n">${v}</b></div>`).join('')}</div>
    <h2>أسهم المحفظة</h2><table><thead><tr><th>السهم</th><th>القطاع</th><th>الوزن</th><th>النسبة المقترحة</th><th>القيمة</th><th>الربح/الخسارة</th><th>التذبذب</th><th>عائد سنة</th></tr></thead><tbody>
    ${M.holdings.map(h => `<tr><td><b>${e(h.s)}</b> ${e(h.name || '')}</td><td>${e(h.sector)}</td><td class="mz-num">${mzN(h.w, 1)}%</td><td class="mz-num">${h.target != null ? h.target + '%' : '—'}</td><td class="mz-num">${mzN(h.value)}</td><td class="mz-num ${h.pnl >= 0 ? 'pos' : 'neg'}">${mzP(h.pnlPct)}</td><td class="mz-num">${h.vol == null ? '—' : mzN(h.vol) + '%'}</td><td class="mz-num">${mzP(h.y1)}</td></tr>`).join('')}</tbody></table>
    <h2>التوزيع حسب القطاع</h2><table><tbody>${Object.entries(M.sectors).map(([s, v]) => `<tr><td>${e(s)}</td><td class="mz-num">${mzN(v, 1)}%</td></tr>`).join('')}</tbody></table>
    ${R.alerts.length ? `<h2>التنبيهات</h2><ul>${R.alerts.map(a => `<li class="${a.k === 'pos' ? 'pos' : a.k === 'neg' ? 'neg' : ''}"><b>${e(a.t)}:</b> ${e(a.d)}</li>`).join('')}</ul>` : ''}
    <h2>${ai.auto ? 'الرأي الآلي' : 'رأي الذكاء الاصطناعي'}</h2><p>${e(ai.summary)}</p>
    <table><thead><tr><th class="pos">نقاط القوة</th><th class="neg">المخاطر</th></tr></thead><tbody><tr><td><ul>${(ai.strengths || []).map(x => `<li>${e(x)}</li>`).join('')}</ul></td><td><ul>${(ai.risks || []).map(x => `<li>${e(x)}</li>`).join('')}</ul></td></tr></tbody></table>
    ${(ai.moves || []).length ? `<h2>خطوات مقترحة</h2><ul>${ai.moves.map(m => `<li>${m.s ? '<b>' + e(m.s) + '</b> ' : ''}${e(m.t)}</li>`).join('')}</ul>` : ''}
    <h2>إعادة التوازن بالأرقام</h2><ul>${R.moves.map(m => `<li>${e(m.t)}</li>`).join('')}</ul>
    ${(ai.candidates || []).length ? `<h2>شركات مرشحة للتنويع</h2><ul>${ai.candidates.map(c => `<li><b>${e(c.s)}</b> ${e(c.n)} — ${e(c.r)}</li>`).join('')}</ul>` : ''}
    <div class="disc">⚠️ ${e((R.config && R.config.disclaimer) || '')}</div></body></html>`);
  w.document.close(); if (typeof gReportReady === 'function') gReportReady(w);
}
