// TradingView scanner + Yahoo mock with settable prices: GET /set?sym=COMI&price=80
const http = require('http'); const prices = { COMI: 80, HRHO: 20, TMGH: 55, CRVX: 12, DROPX: 10 };
const falling = new Set(['DROPX']);   // الإصدار 101: سهم نازل (RSI تشبع بيعي) لاختبار البحث عن فرص
http.createServer((req, res) => { let body = ''; req.on('data', c => body += c); req.on('end', () => {
  const u = new URL(req.url, 'http://x'); const send = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/set') { prices[u.searchParams.get('sym')] = +u.searchParams.get('price'); return send({ ok: true, prices }); }
  if (/\/scan$/.test(u.pathname)) { const j = JSON.parse(body || '{}');
    // الإصدار 101: قائمة كل أسهم البورصة (من غير tickers)
    if (!j.symbols || !j.symbols.tickers) return send({ totalCount: Object.keys(prices).length, data: Object.keys(prices).sort().map(sym => ({ s: 'EGX:' + sym, d: [sym, sym + ' Co', prices[sym]] })) });
    const t = j.symbols.tickers[0]; const sym = t.split(':')[1]; const p = prices[sym];
    if (!p) return send({ data: [] });
    const vals = { description: sym + ' Co', close: p, change_abs: 1, high: p * 1.02, low: p * 0.98, currency: 'EGP', update_mode: 'delayed_streaming_900', 'High.1M': p * 1.1, 'Low.1M': p * 0.9, 'High.3M': p * 1.2, 'Low.3M': p * 0.8 };
    return send({ data: [{ s: t, d: j.columns.map(c => vals[c] ?? p) }] }); }
  // Yahoo chart (الإصدار 91): أسعار إغلاق يومية لآخر 400 يوم - خط من 70% لحد السعر الحالي
  const ym = u.pathname.match(/^\/([A-Z0-9-]+)\.CA$/);
  if (ym && prices[ym[1]] && u.searchParams.get('interval')) {
    const p = prices[ym[1]], n = 400, now = Math.floor(Date.now() / 86400000) * 86400, ts = [], c = [], down = falling.has(ym[1]);
    for (let i = n - 1; i >= 0; i--) { ts.push(now - i * 86400); const f = (n - 1 - i) / (n - 1); c.push(+(p * (down ? 1.6 - 0.6 * f : 0.7 + 0.3 * f)).toFixed(3)); }
    const v = c.map((_, i) => i === c.length - 1 ? 3000 : 1000);   // حجم آخر يوم 3 أضعاف المتوسط
    return send({ chart: { result: [{ meta: { currency: 'EGP', longName: ym[1] + ' Co' }, timestamp: ts, indicators: { quote: [{ high: c.map(x => x * 1.01), low: c.map(x => x * 0.99), close: c, volume: v }] } }] } });
  }
  send({ chart: { result: null } });
}); }).listen(8098, () => console.log('market mock 8098'));
