/* =====================================================================
   GRIFFINE — app-subscribe.js (الإصدار 88) — الاشتراك والباقات + الدفع + تغيير الباقة
   (اتفصل من griffine.js - كل الملفات بتتحمّل بالترتيب في index.php وبتشارك نفس المتغيرات العامة)
   ===================================================================== */
/* ================== شاشة اشتراك العملاء (شكل وفكرة - التفعيل الفعلي والدفع سيتم ربطهم بعد إطلاق الموقع على السيرفر) ================== */
async function renderSubscriptionPlans(){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderSubscriptionPlans());
  const email = await getSession();
  if(!email) return renderLogin();

  const marketToCurrency = { 'مصر':'جنيه مصري', 'السعودية':'ريال سعودي', 'الإمارات':'درهم إماراتي', 'قطر':'ريال قطري', 'الكويت':'دينار كويتي' };

  const myRes = await getMySubscription();
  const mySub = (myRes && myRes.success) ? myRes.subscription : null;
  const selectedMarket = (mySub && mySub.market) || 'مصر';

  window.__lastPageKey='subscription_plans'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container wide">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <div id="currentPlanArea"></div>

    <h2>${mySub ? 'طلب ترقية أو تخفيض الباقة' : 'اختر باقة الاشتراك'}</h2>
    ${mySub ? `<div class="info">الباقة الجديدة التي ستختارها ستتفعّل تلقائيًا فور انتهاء باقتك الحالية (${formatDateAr(mySub.endDate)}) — لن تدفع ولن تتأثر خدمتك قبل ذلك.</div>` : ''}
    <div class="section-card">
      <label>الدولة / البورصة (لتحديد العملة)</label>
      <select id="subMarket" style="max-width:260px;">
        <option value="مصر">مصر (EGX) — جنيه مصري</option>
        <option value="السعودية">السعودية (تداول) — ريال سعودي</option>
        <option value="الإمارات">الإمارات — درهم إماراتي</option>
        <option value="قطر">قطر — ريال قطري</option>
        <option value="الكويت">الكويت — دينار كويتي</option>
      </select>
    </div>

    <div class="pricing-grid" id="pricingGrid"></div>

    <div id="subConfirmArea"></div>

    <button class="secondary" id="skipToHomeLink" style="margin-top:18px;">${mySub ? '🏠 رجوع للشاشة الرئيسية' : 'تخطي الآن والدخول على الموقع'}</button>
  </div>`;
  document.getElementById('skipToHomeLink').onclick=()=>renderHome();
  document.getElementById('subMarket').value = selectedMarket;

  if (mySub) {
    document.getElementById('currentPlanArea').innerHTML = `
      <div class="section-card" style="border:2px solid var(--green);">
        <strong style="color:var(--green-dark);">باقتك الحالية: ${escapeHtml(mySub.planName)}</strong>
        (${mySub.amount===0?'مجانًا':fmtMoney(mySub.amount)+' '+mySub.currency})<br>
        <span style="font-size:12.5px;color:#666;">من ${formatDateAr(mySub.startDate)} إلى ${formatDateAr(mySub.endDate)}</span>
        ${mySub.pendingPlanName ? `<div class="info" style="margin-top:8px;">📅 في انتظار التفعيل: <strong>${escapeHtml(mySub.pendingPlanName)}</strong> — ستتفعّل تلقائيًا يوم ${formatDateAr(mySub.endDate)}</div>` : ''}
      </div>`;
  }

  // الإصدار 88: التجديد التلقائي بالكارت المحفوظ (Paymob)
  if (mySub && mySub.amount > 0) (async () => {
    const box = document.getElementById('currentPlanArea'); if (!box) return;
    const rs = await apiGet('/renewal_api.php?action=status').catch(() => null);
    if (!rs || !rs.success || !rs.available) return;
    const card = document.createElement('div');
    card.className = 'section-card';
    const draw = () => {
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div><strong>🔁 التجديد التلقائي</strong><div style="font-size:12.5px;opacity:.8;line-height:1.8;">${rs.card ? `يتم خصم قيمة الباقة من كارتك المحفوظ (${escapeHtml(rs.card.brand || '')} ${escapeHtml(rs.card.masked || '')}) قبل انتهاء الاشتراك بيوم، وتصلك رسالة بالنتيجة.` : 'ادفع مرة بالكارت عن طريق Paymob مع اختيار "حفظ الكارت" لتفعيل التجديد التلقائي.'}</div></div>
        ${rs.card ? `<label class="toggle-switch"><input type="checkbox" id="autoRenewChk" ${rs.autoRenew ? 'checked' : ''}><span class="toggle-slider"></span></label>` : ''}
      </div>${rs.card ? `<button type="button" class="small secondary" id="removeCardBtn" style="width:auto;margin-top:8px;">مسح الكارت المحفوظ</button>` : ''}`;
      const chk = card.querySelector('#autoRenewChk');
      if (chk) chk.onchange = async () => { const r = await apiPost('/renewal_api.php', { action: 'toggle', on: chk.checked ? 1 : 0 }).catch(() => null);
        if (!r || !r.success) { chk.checked = !chk.checked; alert((r && r.message) || 'تعذّر'); } else { rs.autoRenew = r.autoRenew; alert(r.autoRenew ? '✅ تم تفعيل التجديد التلقائي' : 'تم إيقاف التجديد التلقائي'); } };
      const rm = card.querySelector('#removeCardBtn');
      if (rm) rm.onclick = async () => { if (!await gConfirm('مسح الكارت المحفوظ وإيقاف التجديد التلقائي؟', { ok: 'مسح', danger: true })) return;
        const r = await apiPost('/renewal_api.php', { action: 'remove_card' }).catch(() => null); if (r && r.success) { rs.card = null; rs.autoRenew = false; draw(); } };
    };
    draw(); box.appendChild(card);
  })();

  async function renderCards(){
    const market = document.getElementById('subMarket').value;
    const currency = marketToCurrency[market];
    const grid = document.getElementById('pricingGrid');
    grid.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;grid-column:1/-1;">جاري تحميل الباقات...</p>';

    const res = await getPlansList();
    if (!res || !res.success || !res.plans.length) {
      grid.innerHTML = '<p style="text-align:center;color:#888;font-size:13px;grid-column:1/-1;">لا توجد باقات متاحة الآن، حاول مرة أخرى لاحقًا.</p>';
      return;
    }
    // التجربة المجانية مرة واحدة بس - متظهرش حتى عنده اشتراك بالفعل
    const plans = mySub ? res.plans.filter(p => Number(p.amount) > 0) : res.plans;

    grid.innerHTML = plans.map(p => `
      <div class="price-card ${p.badge==='الأكثر توفيرًا'?'featured':''} ${mySub && mySub.planId===p.id ? 'selected':''}" data-plan="${p.id}">
        ${p.badge ? `<div class="price-badge">${escapeHtml(p.badge)}</div>` : ''}
        <div class="price-plan-name">${escapeHtml(p.name)}</div>
        <div class="price-amount">${p.amount===0?'مجانًا':p.amount.toLocaleString('en-US')}<span> ${p.amount>0?currency:''}</span></div>
        <div style="font-size:12px;color:#888;">${escapeHtml(p.periodLabel)}</div>
        ${p.saveNote?`<div class="price-save">${p.saveNote.replace('عن السعر', 'جنيه عن السعر')}</div>`:'<div style="height:18px;"></div>'}
        <ul class="price-features">${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
        <button class="small choosePlanBtn" data-plan="${p.id}" style="width:100%;">
          ${mySub ? (mySub.planId===p.id ? 'باقتك الحالية' : 'طلب التحويل لهذه الباقة') : (p.amount===0?'ابدأ التجربة المجانية':'اشترك الآن')}
        </button>
      </div>`).join('');

    document.querySelectorAll('.choosePlanBtn').forEach(btn=>{
      btn.onclick = () => {
        const planId = btn.dataset.plan;
        const plan = plans.find(x=>x.id===planId);
        if (mySub) {
          if (mySub.planId===planId) return;
          renderPlanChangeCheckout({ planId, planName: plan.name, amount: plan.amount, durationDays: plan.durationDays, currency, market }, mySub);
        } else {
          renderCheckoutForm({ planId, planName: plan.name, amount: plan.amount, durationDays: plan.durationDays, currency, market });
        }
      };
    });
  }
  await renderCards();
  document.getElementById('subMarket').addEventListener('change', renderCards);
}

/* ================== شاشة تأكيد ودفع تغيير الباقة (ترقية/تخفيض) ================== */
async function renderPlanChangeCheckout(newPlan, currentSub){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderPlanChangeCheckout(newPlan, currentSub));
  const email = await getSession();
  if(!email) return renderLogin();
  const settings = await getAdminSettings();
  const needRef = settings.require_payment_ref !== false;
  const needProof = settings.require_payment_proof !== false;
  const payCfg = await getSiteConfig(true);   // الإصدار 84: طرق الدفع ورقم الخدمة من لوحة التحكم

  const isUpgrade = newPlan.amount > currentSub.amount;
  let chosenMode = isUpgrade ? null : 'deferred'; // تخفيض دايمًا مؤجل، ترقية تحتاج اختيار

  window.__lastPageKey='plan_change_checkout'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <h2>تأكيد تغيير الباقة</h2>
    <div class="section-card">
      باقتك الحالية: <strong>${escapeHtml(currentSub.planName)}</strong> (سارية حتى ${formatDateAr(currentSub.endDate)})<br>
      الباقة الجديدة: <strong>${escapeHtml(newPlan.planName)}</strong> — ${newPlan.amount===0?'مجانًا':fmtMoney(newPlan.amount)+' '+newPlan.currency}
    </div>

    <div id="modeChoiceArea"></div>
    <div id="planChangePaymentArea"></div>
    <div class="muted-link"><a id="backToSubPlansLink">إلغاء والرجوع</a></div>
  </div>`;
  document.getElementById('backToSubPlansLink').onclick=()=>renderSubscriptionPlans();

  function renderModeChoice(){
    if (!isUpgrade){
      document.getElementById('modeChoiceArea').innerHTML = `
        <div class="info">📌 ستستمر في الاستفادة من كل مميزات باقتك الحالية (${escapeHtml(currentSub.planName)}) حتى ${formatDateAr(currentSub.endDate)}، وبعدها ستتحول تلقائيًا إلى الباقة المخفضة (${escapeHtml(newPlan.planName)}).</div>`;
      renderPaymentSection();
      return;
    }
    document.getElementById('modeChoiceArea').innerHTML = `
      <div class="section-card">
        <label>اختر طريقة الانتقال</label>
        <div class="radio-row" style="flex-direction:column;align-items:stretch;gap:8px;">
          <label class="ms-item" style="border:1px solid #e7ebe9;border-radius:8px;padding:10px;">
            <input type="radio" name="switchMode" value="immediate"> <strong>انتقل الآن</strong> — ستفقد الأيام المتبقية من باقتك الحالية (${formatDateAr(currentSub.endDate)})
          </label>
          <label class="ms-item" style="border:1px solid #e7ebe9;border-radius:8px;padding:10px;">
            <input type="radio" name="switchMode" value="deferred" checked> <strong>ادفع الآن وانتقل لاحقًا</strong> — ستستمر في الاستفادة من باقتك الحالية حتى ${formatDateAr(currentSub.endDate)}، وبعدها ستتفعّل الباقة الجديدة تلقائيًا
          </label>
        </div>
      </div>`;
    chosenMode = 'deferred';
    document.querySelectorAll('input[name="switchMode"]').forEach(r=>{
      r.addEventListener('change', (e)=>{ chosenMode = e.target.value; renderPaymentSection(); });
    });
    renderPaymentSection();
  }

  function renderPaymentSection(){
    const modeNote = chosenMode==='immediate'
      ? `<div class="info">⚠️ عند التأكيد، ستنتقل فورًا إلى الباقة الجديدة، وستُلغى أي أيام متبقية من باقتك الحالية.</div>`
      : '';
    if (newPlan.amount === 0){
      document.getElementById('planChangePaymentArea').innerHTML = `
        ${modeNote}
        <button id="confirmPlanChangeBtn">تأكيد التحويل للباقة المجانية</button>`;
      document.getElementById('confirmPlanChangeBtn').onclick = () => submitPlanChange(null, null, null);
      return;
    }
    document.getElementById('planChangePaymentArea').innerHTML = `
      ${modeNote}
      ${paymentMethodsHtml('pc', payCfg, needRef, needProof)}
      <button id="confirmPlanChangeBtn" style="margin-top:14px;">تأكيد ${chosenMode==='immediate'?'الانتقال الآن':'السداد'}</button>`;

    const pay = wirePaymentMethods('pc', payCfg);
    document.getElementById('confirmPlanChangeBtn').onclick = () => {
      const v = pay.get();
      if (!v.method) { alert('لا توجد طريقة دفع متاحة الآن.'); return; }
      submitPlanChange(v.method, v.ref, v.proof);
    };
  }

  async function submitPlanChange(method, ref, proof){
    if (newPlan.amount > 0 && (method==='vodafone' || method==='instapay')) {
      if ((needRef && !ref) || (needProof && !proof)) {
        alert('يجب إدخال رقم عملية التحويل وإرفاق صورة إثبات التحويل قبل تأكيد تغيير الباقة — لا تحويل بدون السداد والإشعار.');
        return;
      }
    }
    const btn = document.getElementById('confirmPlanChangeBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const r = await requestPlanChange(newPlan.planId, newPlan.planName, newPlan.amount, newPlan.durationDays, chosenMode==='immediate', method, ref, proof);
    if (r.success && r.redirect) { window.location.href = r.redirect; return; }   // الإصدار 84: Paymob
    if (r.success){
      window.__lastPageKey='plan_change_checkout'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
        <div class="success-banner">✅ ${escapeHtml(r.message)}
          <button class="small" style="margin-top:10px;" id="continueAfterChangeBtn">المتابعة إلى الموقع</button>
        </div>
      </div>`;
      document.getElementById('continueAfterChangeBtn').onclick=()=>postLoginRedirect(email);
    } else {
      document.getElementById('planChangePaymentArea').insertAdjacentHTML('beforeend', `<div class="error" style="margin-top:10px;">${r.message||'حدث خطأ، حاول مرة أخرى'}</div>`);
      btn.disabled = false; btn.textContent = 'إعادة المحاولة';
    }
  }

  renderModeChoice();
}
/* =====================================================================
   الإصدار 84: طرق الدفع - بتتبني من إعدادات لوحة التحكم (رقم الخدمة + الطرق المفعّلة)
   - فودافون كاش + رقم العملية + صورة التحويل (رقم الخدمة)
   - إنستاباي + رقم العملية + صورة التحويل
   - فيزا / ماستركارد / ميزة أونلاين عن طريق Paymob (الاشتراك بيتفعّل تلقائي بعد الدفع)
   بيانات الكارت عمرها ما بتتكتب في موقعنا - بتتكتب في صفحة Paymob الآمنة بس
   ===================================================================== */
let __siteCfgPromise = null;
function getSiteConfig(force){
  if (force || !__siteCfgPromise) __siteCfgPromise = apiGet('/site_public_config.php').then(r => (r && r.success) ? r.config : null).catch(() => null)
    .then(c => c || { servicePhone: '00201095125325', instapayAddress: '00201095125325', payVodafone: true, payInstapay: true, payPaymob: false });
  return __siteCfgPromise;
}
const PAY_LABELS = { vodafone: 'فودافون كاش', instapay: 'إنستاباي', paymob: 'بطاقة بنكية (فيزا / ماستركارد / ميزة) - Paymob', wallet: 'محفظة إلكترونية', bank: 'تحويل بنكي', card: 'بطاقة (يدوي)', trial: 'تجربة مجانية' };
function payMethodLabel(m){ return PAY_LABELS[m] || m || '—'; }
function paymentMethodsHtml(p, cfg, needRef, needProof){
  const opts = [];
  if (cfg.payVodafone) opts.push(['vodafone', '📱 فودافون كاش (تحويل + صورة التحويل)']);
  if (cfg.payInstapay) opts.push(['instapay', '🏦 إنستاباي (تحويل + صورة التحويل)']);
  if (cfg.payPaymob) opts.push(['paymob', '💳 فيزا / ماستركارد / ميزة (دفع أونلاين فوري)']);
  if (!opts.length) return `<div class="error">لا توجد طرق دفع متاحة الآن - تواصل معنا على ${escapeHtml(cfg.servicePhone)}.</div>`;
  return `
    <label>طريقة السداد</label>
    <select id="${p}Method">${opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>
    <div id="${p}TransferFields">
      <div class="info" id="${p}PayNote"></div>
      <label>رقم/مرجع عملية التحويل ${needRef ? '<span style="color:#c0392b;">(إلزامي)</span>' : '(اختياري)'}</label>
      <input type="text" id="${p}Ref" placeholder="مثال: رقم العملية أو الرقم الذي حوّلت منه" dir="ltr">
      <label>إرفاق صورة إثبات التحويل ${needProof ? '<span style="color:#c0392b;">(إلزامي)</span>' : '(اختياري)'}</label>
      <input type="file" id="${p}Proof" accept="image/*,application/pdf">
      <div id="${p}ProofPreview" style="margin-top:8px;"></div>
    </div>
    <div id="${p}PaymobNote" class="info" style="display:none;">🔒 هتتحوّل لصفحة الدفع الآمنة بتاعة Paymob تكتب فيها بيانات الكارت (بياناتك مبتعدّيش على موقعنا خالص)، وأول ما الدفع يتم اشتراكك بيتفعّل تلقائي.</div>`;
}
/* بيربط الحقول ويرجّع get() ← { method, ref, proof } */
function wirePaymentMethods(p, cfg){
  const sel = document.getElementById(p + 'Method'); if (!sel) return { get: () => ({ method: null, ref: '', proof: null }) };
  let proof = null;
  const sync = () => {
    const m = sel.value, isT = m === 'vodafone' || m === 'instapay';
    document.getElementById(p + 'TransferFields').style.display = isT ? '' : 'none';
    document.getElementById(p + 'PaymobNote').style.display = m === 'paymob' ? '' : 'none';
    const num = m === 'instapay' ? (cfg.instapayAddress || cfg.servicePhone) : cfg.servicePhone;
    document.getElementById(p + 'PayNote').innerHTML = `💚 حوّل المبلغ ${m === 'instapay' ? 'عن طريق <strong>إنستاباي</strong> على' : 'على محفظة <strong>فودافون كاش</strong> رقم'}: <strong style="font-size:16px;letter-spacing:1px;" dir="ltr">${escapeHtml(num)}</strong><br><small>وبعدها اكتب رقم العملية وارفع صورة التحويل.</small>`;
  };
  sel.addEventListener('change', sync); sync();
  document.getElementById(p + 'Proof').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 6 * 1024 * 1024) { alert('الصورة كبيرة - أقصى حجم 6 ميجا.'); e.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => { proof = rd.result; document.getElementById(p + 'ProofPreview').innerHTML = /^data:image\//.test(proof) ? `<img src="${proof}" style="max-height:120px;border-radius:8px;border:1px solid #ddd;">` : '📄 ' + escapeHtml(f.name); };
    rd.readAsDataURL(f);
  });
  return { get: () => ({ method: sel.value, ref: (document.getElementById(p + 'Ref').value || '').trim(), proof }) };
}

async function renderCheckoutForm(planInfo){
  const __tok = screenToken();   // الإصدار 88
  pushNav(() => renderCheckoutForm(planInfo));
  const email = await getSession();
  if(!email) return renderLogin();
  const settings = await getAdminSettings();
  const needRef = settings.require_payment_ref !== false;
  const needProof = settings.require_payment_proof !== false;
  const payCfg = await getSiteConfig(true);

  window.__lastPageKey='checkout_form'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
    <div class="topbar"><div>مرحبًا <strong>${email}</strong></div></div>

    <h2>إتمام الاشتراك</h2>
    <div class="section-card">
      <strong>${escapeHtml(planInfo.planName)}</strong> — ${planInfo.amount===0?'تجربة مجانية 30 يوم':fmtMoney(planInfo.amount)+' '+planInfo.currency}
    </div>

    <form id="checkoutForm">
      <label>الاسم بالكامل</label><input type="text" id="custName" required placeholder="مثال: أحمد محمد">
      <label>رقم الهاتف</label><input type="tel" id="custPhone" required placeholder="مثال: 01012345678">
      <label>البريد الإلكتروني للتواصل</label><input type="email" id="custEmail" required value="${email}">

      ${planInfo.amount>0 ? `
      ${paymentMethodsHtml('co', payCfg, needRef, needProof)}
      <div class="info" style="margin-top:10px;">⏳ التحويل (فودافون كاش / إنستاباي) يتفعّل فور مراجعة السداد من فريقنا، والدفع بالبطاقة يتفعّل فورًا.</div>
      ` : ''}

      <button type="submit">تأكيد الاشتراك</button>
    </form>
    <div class="muted-link"><a id="backToPlansLink">رجوع لاختيار خطة أخرى</a></div>
  </div>`;
  document.getElementById('backToPlansLink').onclick=()=>renderSubscriptionPlans();

  const pay = planInfo.amount > 0 ? wirePaymentMethods('co', payCfg) : null;

  document.getElementById('checkoutForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const contactEmail = document.getElementById('custEmail').value.trim();
    const pv = pay ? pay.get() : { method: 'trial', ref: '', proof: null };
    const paymentMethod = pv.method || 'trial', paymentRef = pv.ref, paymentProofData = pv.proof;
    if (planInfo.amount > 0 && !pv.method) { alert('لا توجد طريقة دفع متاحة الآن.'); return; }
    if (planInfo.amount > 0 && (paymentMethod === 'vodafone' || paymentMethod === 'instapay')) {
      if ((needRef && !paymentRef) || (needProof && !paymentProofData)) {
        alert('يجب إدخال رقم عملية التحويل وإرفاق صورة إثبات التحويل قبل تأكيد الاشتراك — لا يتفعّل الاشتراك إلا بعد استلام السداد والإشعار.');
        return;
      }
    }

    const startDate = new Date().toISOString().split('T')[0];
    const durEnd = new Date(startDate); durEnd.setDate(durEnd.getDate() + (planInfo.durationDays || 30));
    const endDate = durEnd.toISOString().split('T')[0];

    const record = {
      id: 'sub_' + Date.now() + '_' + Math.floor(Math.random()*10000),
      accountEmail: email, name, phone, contactEmail,
      planId: planInfo.planId, planName: planInfo.planName, amount: planInfo.amount,
      currency: planInfo.currency, market: planInfo.market,
      paymentMethod, paymentRef, paymentProof: paymentProofData,
      startDate, endDate, createdAt: startDate,
      active: planInfo.amount===0, reminderEnabled: true, reminderIntervalDays: 2,
    };
    const submitBtn = e.target.querySelector('button[type="submit"]'); if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'جاري الإرسال...'; }
    const addRes = await addSubscriberRecord(record).catch(() => null);
    if (!addRes || !addRes.success) {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'تأكيد الاشتراك'; }
      alert((addRes && addRes.message) || 'حدث خطأ في الإرسال، حاول مرة أخرى.');
      return;
    }
    // الإصدار 84: الدفع بالبطاقة ← صفحة Paymob الآمنة
    if (addRes.redirect) { window.location.href = addRes.redirect; return; }
    await saveSubscription(email, { planId: planInfo.planId, planName: planInfo.planName, amount: planInfo.amount, currency: planInfo.currency, market: planInfo.market, startDate, endDate });

    window.__lastPageKey='checkout_form'; if (screenStale(__tok)) return; app.innerHTML = `<div class="container">${logoHeader()}
      <div class="success-banner">
        ✅ <strong>${planInfo.amount===0 ? 'تم تفعيل التجربة المجانية بنجاح!' : 'تم استلام طلب اشتراكك بنجاح!'}</strong><br>
        الخطة: ${escapeHtml(planInfo.planName)}<br>
        ${planInfo.amount===0
          ? `يبدأ: ${formatDateAr(startDate)} — ينتهي: ${formatDateAr(endDate)}`
          : `<span style="font-size:12.5px;color:#666;">سيتم تفعيل اشتراكك فور مراجعة السداد من فريقنا (عادة خلال ساعات قليلة).</span>`}
        <button class="small" style="margin-top:10px;" id="continueToHomeBtn2">المتابعة إلى الموقع</button>
      </div>
    </div>`;
    document.getElementById('continueToHomeBtn2').onclick=()=>postLoginRedirect(email);
  };
}

