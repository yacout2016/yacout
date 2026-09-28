// Paymob Accept mock (independent HMAC implementation to validate the PHP side)
const http = require('http'), crypto = require('crypto');
const HMAC = 'testhmac', SITE = 'http://127.0.0.1:8099';
const orders = {}; let seq = 5000;
function hmacOf(t){ const keys=['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order','owner','pending','source_data_pan','source_data_sub_type','source_data_type','success'];
  return crypto.createHmac('sha512', HMAC).update(keys.map(k => String(t[k])).join('')).digest('hex'); }
http.createServer((req, res) => {
  let body=''; req.on('data', c => body += c); req.on('end', () => {
    const u = new URL(req.url, 'http://x'); const j = body ? JSON.parse(body) : {};
    const send = (o) => { res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(o)); };
    if (u.pathname === '/api/auth/tokens') return j.api_key === 'test_api_key' ? send({ token: 'AUTH123' }) : (res.writeHead(403), res.end('{}'));
    if (u.pathname === '/api/ecommerce/orders') { const id = ++seq; orders[id] = { amount: j.amount_cents, ref: j.merchant_order_id }; return send({ id }); }
    if (u.pathname === '/api/acceptance/payment_keys') { orders[j.order_id].key = 'PK' + j.order_id; return send({ token: 'PK' + j.order_id }); }
    const wa = u.pathname.match(/^\/wa\/(\d+)\/messages$/);
    if (wa) { if (req.headers.authorization !== 'Bearer test_wa_token') { res.writeHead(401, {'Content-Type':'application/json'}); return res.end(JSON.stringify({ error: { message: 'Invalid OAuth access token' } })); }
      require('fs').appendFileSync(require('path').join(__dirname, '..', 'out', 'wa.log'), JSON.stringify({ to: j.to, template: j.template.name, code: j.template.components[0].parameters[0].text }) + '\n');
      return send({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.' + Date.now() }] }); }
    if (u.pathname === '/api/acceptance/payments/pay') { const oid = j.payment_token.slice(2); const o = orders[oid];
      if (j.source.subtype !== 'TOKEN' || j.source.identifier !== 'tok_test_123') return send({ success: false, pending: false, data: { message: 'Card declined' } });
      return send({ success: true, pending: false, id: 800000 + +oid, amount_cents: o.amount }); }
    const m = u.pathname.match(/^\/api\/acceptance\/iframes\/(\d+)$/);
    if (m) { // simulate the customer paying: redirect back with signed params
      const oid = u.searchParams.get('payment_token').slice(2); const o = orders[oid];
      const fail = process.env.FAIL === '1';
      const t = { amount_cents: o.amount, created_at: '2026-09-28T15:00:00.000000', currency: 'EGP', error_occured: 'false', has_parent_transaction: 'false', id: String(900000 + +oid), integration_id: '111', is_3d_secure: 'true', is_auth: 'false', is_capture: 'false', is_refunded: 'false', is_standalone_payment: 'true', is_voided: 'false', order: oid, owner: '42', pending: 'false', source_data_pan: '2346', source_data_sub_type: 'MasterCard', source_data_type: 'card', success: fail ? 'false' : 'true' };
      const qs = new URLSearchParams(); for (const [k, v] of Object.entries(t)) qs.set(k.replace('source_data_', 'source_data.'), v); qs.set('hmac', hmacOf(t));
      res.writeHead(302, { Location: SITE + '/paymob_callback.php?' + qs.toString() }); return res.end();
    }
    res.writeHead(404); res.end('nf');
  });
}).listen(8097, () => console.log('paymob mock on 8097'));
