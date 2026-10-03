// TradingView scanner + Yahoo mock with settable prices: GET /set?sym=COMI&price=80
const http = require('http'); const prices = { COMI: 80, HRHO: 20, TMGH: 55, CRVX: 12, DROPX: 10 };
const falling = new Set(['DROPX']);   // الإصدار 101: سهم نازل (RSI تشبع بيعي) لاختبار البحث عن فرص
http.createServer((req, res) => { let body = ''; req.on('data', c => body += c); req.on('end', () => {
  const u = new URL(req.url, 'http://x'); const send = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  // الإصدار 114: أخبار (RSS) + Claude Messages API تجريبي لـ «بصيرة»
  if (u.pathname === '/news') { const q = u.searchParams.get('q') || ''; res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
    const items = [['ارتفاع أرباح الشركة بنسبة 20% في الربع الثالث', 'مباشر'], ['تراجع السيولة الأجنبية في البورصة', 'الأهرام'], ['مجلس الإدارة يوافق على توزيع كوبون نقدي', 'البورصة'], ['البنك المركزي يثبت أسعار الفائدة', 'رويترز']];
    return res.end(`<?xml version="1.0"?><rss><channel>${items.map(([t, s], i) => `<item><title>${t} - ${s}</title><link>https://example.com/n${i}?q=${encodeURIComponent(q)}</link><pubDate>${new Date(Date.now() - i * 3600e3).toUTCString()}</pubDate><source url="https://example.com">${s}</source></item>`).join('')}</channel></rss>`); }
  if (u.pathname === '/ai-last') return send(global.__aiLast || {});
  if (u.pathname === '/ai') { const j = JSON.parse(body || '{}'); global.__aiLast = { headers: req.headers, body: j, n: ((global.__aiLast || {}).n || 0) + 1 };
    if (req.headers['x-api-key'] === 'sk-bad-key-000000000000000') return send({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401);
    // الإصدار 115: «ميزان محفظتك AI» (مخطط فيه candidates)
    const sch = (((j.output_config || {}).format || {}).schema || {}).properties || {};
    // الإصدار 122: «ميزان GRIFFINE AI» (مخطط فيه steps)
    if (sch.steps) return send({ id: 'msg_test', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ summary: 'رأي تجريبي من الذكاء الاصطناعي على دراسة ميزان: التوزيع متوازن.', strengths: ['تنويع جيد'], risks: ['تقلبات السوق'], steps: ['الدخول على مراحل'] }) }], usage: { input_tokens: 10, output_tokens: 10 } });
    if (sch.candidates) { let firstSym = 'ZZZZ'; try { const c = String(j.messages[0].content); const d = JSON.parse(c.slice(c.indexOf('\n') + 1)); global.__mzIn = d; firstSym = (d.candidate_pool[0] || {}).symbol || 'ZZZZ'; } catch(e){}
      const mz = { summary: 'تحليل تجريبي من الذكاء الاصطناعي: المحفظة متركزة في قطاع المالية.', strengths: ['كل خطة ليها مبلغ مرصود'], risks: ['تركّز في قطاع واحد', 'ارتباط عالي'],
        moves: [{ symbol: 'COMI', action: 'reduce', text: 'تقليل المبلغ المرصود لخطة COMI تدريجيًا' }, { symbol: 'FAKE1', action: 'add', text: 'رمز مش موجود لازم يتشال' }],
        market_view: 'السوق في اتجاه صاعد متوسط.', targets: [{ symbol: 'COMI', max_weight: 30, reason: 'قطاع البنوك مسيطر على المحفظة' }, { symbol: 'FAKE1', max_weight: 50, reason: 'مش في المحفظة' }, { symbol: 'TMGH', max_weight: 99, reason: 'رقم مبالغ فيه لازم يتقص' }], candidates: [{ symbol: firstSym, reason: 'قطاع مختلف' }, { symbol: 'NOPE9', reason: 'مش في القائمة' }] };
      return send({ id: 'msg_test', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(mz) }], usage: { input_tokens: 10, output_tokens: 10 } }); }
    const out = { opinion: 'رأي تجريبي من الذكاء الاصطناعي: الصورة العامة متوازنة مع ميل إيجابي.', positives: ['نمو الأرباح', 'سيولة داخلة', 'فوق المتوسط 50'], negatives: ['تذبذب السوق', 'مقاومة قريبة'],
      bull: { prob: 40, text: 'اختراق المقاومة' }, base: { prob: 40, text: 'تداول عرضي' }, bear: { prob: 20, text: 'كسر الدعم' },
      horizons: [{ key: 'week', up: 99, note: 'زخم قصير' }, { key: 'month', up: 60, note: 'متوازن' }], news_summary: 'الأخبار تميل للإيجابية.', market_view: 'السوق في اتجاه صاعد متوسط.' };
    return send({ id: 'msg_test', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 10, output_tokens: 10 } }); }
  if (u.pathname === '/set') { prices[u.searchParams.get('sym')] = +u.searchParams.get('price'); return send({ ok: true, prices }); }
  if (/\/scan$/.test(u.pathname)) { const j = JSON.parse(body || '{}');
    // الإصدار 101: قائمة كل أسهم البورصة (من غير tickers)
    const SECT0 = { COMI: 'Finance', HRHO: 'Finance', TMGH: 'Industrial Services', CRVX: 'Health Technology', DROPX: 'Retail Trade' };
    // الإصدار 123: الصناعة (industry) ← كل قطاع مستقل (البنوك / الخدمات المالية غير المصرفية / المقاولات / الأدوية / تجارة التجزئة)
    const IND = { COMI: 'Major Banks', HRHO: 'Regional Banks', TMGH: 'Engineering & Construction', CRVX: 'Pharmaceuticals: Major', DROPX: 'Specialty Stores' };
    if (!j.symbols || !j.symbols.tickers) { const cols = j.columns || ['name', 'description', 'close'];   // الإصدار 118: الأعمدة حسب الطلب (القطاع + القيمة السوقية)
      return send({ totalCount: Object.keys(prices).length, data: Object.keys(prices).sort().map(sym => ({ s: 'EGX:' + sym, d: cols.map(c => ({ name: sym, description: sym + ' Co', close: prices[sym], sector: SECT0[sym] || 'Miscellaneous', industry: IND[sym] || '', market_cap_basic: prices[sym] * 1e6 })[c] ?? null) })) }); }
    const t = j.symbols.tickers[0]; const sym = t.split(':')[1]; const p = prices[sym];
    if (!p) return send({ data: [] });
    const SECT = { COMI: 'Finance', HRHO: 'Finance', TMGH: 'Industrial Services', CRVX: 'Health Technology', DROPX: 'Retail Trade' };
    const vals = { sector: SECT[sym] || 'Miscellaneous', industry: ({ COMI: 'Major Banks', HRHO: 'Regional Banks', TMGH: 'Engineering & Construction', CRVX: 'Pharmaceuticals: Major', DROPX: 'Specialty Stores' })[sym] || '', description: sym + ' Co', close: p, change_abs: 1, high: p * 1.02, low: p * 0.98, currency: 'EGP', update_mode: 'delayed_streaming_900', 'High.1M': p * 1.1, 'Low.1M': p * 0.9, 'High.3M': p * 1.2, 'Low.3M': p * 0.8 };
    return send({ data: [{ s: t, d: j.columns.map(c => vals[c] ?? p) }] }); }
  // Yahoo chart (الإصدار 91): أسعار إغلاق يومية لآخر 400 يوم - خط من 70% لحد السعر الحالي
  const ym = u.pathname.match(/^\/([A-Z0-9-]+)\.CA$/);
  if (ym && prices[ym[1]] && u.searchParams.get('interval')) {
    if (u.searchParams.get('interval') === '5m') {   // الإصدار 142: أسعار اليوم كل 5 دقايق (رسم «يوم»)
      const p = prices[ym[1]], st = Math.floor(Date.now() / 86400000) * 86400 + 8 * 3600, ts = [], c = [];
      for (let i = 0; i < 54; i++) { ts.push(st + i * 300); c.push(+(p * (0.985 + 0.015 * i / 53 + 0.004 * Math.sin(i / 3))).toFixed(3)); }
      return send({ chart: { result: [{ meta: { currency: 'EGP' }, timestamp: ts, indicators: { quote: [{ high: c.map(x => x * 1.002), low: c.map(x => x * 0.998), close: c, volume: c.map(() => 500) }] } }] } });
    }
    const p = prices[ym[1]], n = 400, now = Math.floor(Date.now() / 86400000) * 86400, ts = [], c = [], down = falling.has(ym[1]);
    for (let i = n - 1; i >= 0; i--) { ts.push(now - i * 86400); const f = (n - 1 - i) / (n - 1); c.push(+(p * (down ? 1.6 - 0.6 * f : 0.7 + 0.3 * f)).toFixed(3)); }
    const v = c.map((_, i) => i === c.length - 1 ? 3000 : 1000);   // حجم آخر يوم 3 أضعاف المتوسط
    return send({ chart: { result: [{ meta: { currency: 'EGP', longName: ym[1] + ' Co' }, timestamp: ts, indicators: { quote: [{ high: c.map(x => x * 1.01), low: c.map(x => x * 0.99), close: c, volume: v }] } }] } });
  }
  // الإصدار 130: عوائد «ميزان GRIFFINE AI» أونلاين — مؤشر البورصة / الذهب / سعر الدولار شهري 5 سنين + صفحة البنك المركزي
  const dp = decodeURIComponent(u.pathname);
  const MONTHLY = { '/^CASE30': [100, 0.20], '/GC=F': [1800, 0.10], '/EGP=X': [30, 0.08] };
  if (MONTHLY[dp]) { const [p0, g] = MONTHLY[dp], n = 61, now = Math.floor(Date.now() / 1000), ts = [], c = [];
    for (let i = 0; i < n; i++) { ts.push(now - (n - 1 - i) * 30.44 * 86400); c.push(+(p0 * Math.pow(1 + g, i / 12)).toFixed(4)); }
    return send({ chart: { result: [{ meta: { currency: 'USD' }, timestamp: ts.map(Math.round), indicators: { quote: [{ close: c }] } }] } }); }
  if (dp === '/bankcds') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<html><body><h3>Certificates</h3><p>Platinum Certificate 3 Years — annual return 17.25% paid monthly</p></body></html>'); }
  if (dp === '/cbe') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end('<html><body><h2>Key Policy Rates</h2><table><tr><td>Overnight Deposit Rate</td><td>22.00%</td></tr><tr><td>Overnight Lending Rate</td><td>23.00%</td></tr></table></body></html>'); }
  send({ chart: { result: null } });
}); }).listen(8098, () => console.log('market mock 8098'));
