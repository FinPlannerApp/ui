// Serves the built Angular app and answers every API call with fixtures from mock-data.js.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const m = require('./mock-data');

const MIME = { '.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json' };
const PORT = +process.env.E2E_PORT || 4300;
const ORIGIN = `http://localhost:${PORT}`;
const CORS = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-credentials': 'true' };

function serve(root) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
      rsp.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(PORT, () => res(srv));
  });
}

/** Routes: add an entry to `overrides` in a test to change a response, e.g. { 'Budgets/dashboard': () => ... }. */
function routes(overrides = {}) {
  return (route) => {
    const req = route.request(), u = new URL(req.url());
    const p = u.pathname.replace(/^\/api\//, '');
    const send = v => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(m.ok(v)) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (overrides[p]) return send(overrides[p](u));
    if (/^Auth\/refresh/.test(p)) return send({ accessToken: m.jwt, userName: 'subhrajit' });
    if (p === 'Transactions/undoable') return send(m.undoable);
    if (p === 'Budgets/dashboard') return send(m.dashboard);
    let x; if ((x = p.match(/^Budgets\/(\d+)\/breakdown/))) return send(m.breakdown(+x[1], +(u.searchParams.get('categoryId') || 0)));
    if (p === 'Budgets/alert-patterns') return send({ months: 6, totalAlerts: 0, warnings: 0, breaches: 0, insights: [], categories: [], byMonth: [], byWeekday: [0,0,0,0,0,0,0], byPartOfMonth: [0,0,0] });
    if (p.startsWith('Budgets/progress')) return send(m.budgets);
    if (p === 'TransactionCategories') return send(m.cats);
    if (p === 'TransactionCategories/search') return send({ totalRecords: m.cats.length, pageNumber: 1, pageSize: 1000, data: m.cats });
    if (p === 'Accounts/search') return send({ totalRecords: m.accounts.length, pageNumber: 1, pageSize: 1000, data: m.accounts });
    if (p === 'Transactions/daily-spend') { const d = new Date(), k = x => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(x).padStart(2, '0')}T00:00:00`; return send([{ date: k(1), total: 450, count: 2 }, { date: k(2), total: 12000, count: 1 }]); }
    if (p === 'Merchants/spending') return send([{ merchantId: 1, merchantName: 'Swiggy', totalSpent: 3200, transactionCount: 8 }, { merchantId: 2, merchantName: 'Uber', totalSpent: 900, transactionCount: 3 }]);
    if (p === 'transaction-rules') return send([{ id: 1, name: 'Swiggy', matchText: 'swiggy', matchMode: 0, typeFilter: 1, minAmount: null, maxAmount: null, transactionCategoryId: 3, categoryName: 'Food', merchantId: null, merchantName: null, tags: ['food'], priority: 100, isActive: true }]);
    if (p === 'Transactions/quick-cards') return send(m.quickCards);
    if (p.startsWith('Dashboard/summary')) return send(m.summary);
    if (p.startsWith('Dashboard/spending-by-category')) return send([{ categoryName: 'Food', totalAmount: 8500 }, { categoryName: 'Rent', totalAmount: 8000 }, { categoryName: 'Travel', totalAmount: 5600 }]);
    if (p.startsWith('Dashboard/insights')) return send(m.insights);
    if (p.startsWith('Dashboard/financial-health')) return send({ score: 72, label: 'Good', factors: [] });
    if (/^user-settings/i.test(p)) return send({ monthStartDay: 1, defaultAlertPercent: 80 });
    return send([]);            // anything else: an empty list
  };
}

async function start(overrides) {
  const root = path.resolve(process.env.DIST || path.join(__dirname, '..', 'dist', 'angular-app', 'browser'));
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error(`No build at ${root}. Run: ng build --configuration development`);
  const server = await serve(root);
  // PW_CHANNEL=msedge (or chrome) drives an installed browser instead of Playwright's own download.
  const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('http://localhost:5018/**', routes(overrides));
  const go = url => page.goto(ORIGIN + url, { waitUntil: 'networkidle' });
  const shot = async name => { const d = process.env.SHOTS; if (d) { fs.mkdirSync(d, { recursive: true }); await page.screenshot({ path: path.join(d, name + '.png') }); } };
  const stop = async () => { await browser.close(); server.close(); };
  return { page, go, shot, stop, errors };
}
module.exports = { start };
