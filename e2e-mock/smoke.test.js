// Mocked-API smoke tests: no backend or database needed. Run after `ng build --configuration development`:
//   npm run e2e:mock          (set SHOTS=./e2e-mock/shots to also save screenshots)
const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('./harness');

let h;
test.before(async () => { h = await start(); });
test.after(async () => { await h.stop(); });
test.afterEach(() => { assert.deepEqual(h.errors, [], 'uncaught page errors'); });

test('Undo centre: lists deletes with outcome previews, blocks the unsafe one, ring has no box', async () => {
  await h.go('/app/undo');
  const cards = h.page.locator('article');
  await cards.first().waitFor();
  assert.equal(await cards.count(), 3);
  const text = await h.page.locator('main, body').first().innerText();
  assert.match(text, /Lunch/); assert.match(text, /Fuel/);
  assert.match(text, /Takes off ₹100\.00 from the account again/);
  assert.match(text, /Food goes from 84% to 85% of its budget/);
  assert.match(text, /No budget is set for this category/);
  assert.match(text, /overdraw/i);                                   // blocked reason shown for the refund
  const btns = h.page.getByRole('button', { name: /Undo delete/ });
  assert.equal(await btns.count(), 3);
  assert.equal(await btns.nth(0).isDisabled(), false);
  assert.equal(await btns.nth(2).isDisabled(), true);                 // the blocked refund can't be undone
  const shadow = await h.page.locator('svg.count-ring').first().evaluate(e => getComputedStyle(e).boxShadow);
  assert.equal(shadow, 'none');                                       // regression: Tailwind `.ring` used to draw a square
  await h.shot('undo-centre');
});

test('Budgets: card opens the sub-category split; overall budget drills down and back', async () => {
  await h.go('/app/budgets');
  const cards = h.page.locator('article.budget-card');
  await cards.first().waitFor();
  assert.equal(await cards.count(), 3);

  await cards.first().click();
  const drawer = h.page.locator('.p-drawer');
  await drawer.getByText('Grocery').waitFor();
  let t = await drawer.innerText();
  for (const s of ['Grocery', 'Dining', 'Directly in Food', '₹5,200', '₹2,600', '₹700', 'Split by sub-categories']) assert.ok(t.includes(s), `missing ${s}`);
  await h.shot('budget-drawer-food');
  await h.page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });

  await cards.nth(2).click();
  await drawer.getByText('Split by categories').waitFor();
  await drawer.getByText('Food', { exact: true }).first().click();
  await drawer.getByText('Grocery').waitFor();
  assert.match(await drawer.locator('nav').innerText(), /All spending\s*›\s*Food/);
  await drawer.locator('nav button').first().click();
  await drawer.getByText('Rent').waitFor();
  assert.match(await drawer.innerText(), /Uncategorised/);
});

test('Dashboard: Indian grouping, compact tiles with full amount on hover, detail drawers', async () => {
  await h.go('/app/dashboard');
  await h.page.getByText('Real Available Cash', { exact: false }).first().waitFor();
  const body = await h.page.innerText('body');
  assert.ok(body.includes('₹1,10,000.00'), 'Indian grouping expected');          // liquid cash
  assert.ok(!body.includes('₹110,000.00'), 'Western grouping must not appear');
  assert.ok(body.includes('₹3.12L'), 'compact net worth tile');
  const title = await h.page.getByText('₹3.12L').first().getAttribute('title');
  assert.match(title, /3,12,000/);                                                  // full amount on hover

  await h.page.getByText('Expenses', { exact: true }).first().click();
  const drawer = h.page.locator('.p-drawer');
  await drawer.getByText('Daily average so far').waitFor();
  assert.match(await drawer.innerText(), /Where it went/);
  await h.shot('dashboard-expenses-drawer');
  await h.page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });

  await h.page.getByText('Net Worth', { exact: true }).first().click();
  await drawer.getByText('Credit-card debt').waitFor();
});

test('Category manager: tree with sub-categories and a sub-category button', async () => {
  await h.go('/app/transaction-categories');
  await h.page.getByText('Transaction categories').first().waitFor();
  await h.page.getByText('Fuel', { exact: true }).waitFor();          // tree rendered
  const t = await h.page.innerText('body');
  for (const s of ['Food', '2 sub', 'Grocery', 'Dining', 'Travel', 'Fuel', 'Rent']) assert.ok(t.includes(s), `missing ${s}`);
  assert.ok((await h.page.getByRole('button', { name: /Sub-category/ }).count()) >= 3);
});

test('Tips page loads', async () => {
  await h.go('/app/tips');
  await h.page.getByRole('heading', { name: /Tips & how-tos/ }).waitFor();
  assert.match(await h.page.innerText('body'), /Undo centre/);
});

test('Bulk add: Quick Cards add today\'s copy of a habitual entry, can be hidden', async () => {
  await h.go('/app/bulk-transaction-add');
  const bus = h.page.getByRole('button', { name: /Add Bus 16/ });
  await bus.waitFor();
  const strip = await h.page.locator('section[aria-label="Quick Cards"]').innerText();
  assert.match(strip, /Bus/); assert.match(strip, /₹16/); assert.match(strip, /Transport/); assert.match(strip, /used 23×/);
  // an untouched starter row must not show the warning icon
  assert.equal(await h.page.locator('tbody tr').first().locator('.pi-exclamation-triangle').count(), 0, 'blank first row has no warning');
  await bus.click(); await bus.click();
  await h.page.locator('section[aria-label="Quick Cards"]').getByText('×2').waitFor({ timeout: 4000 });   // tapped twice this session
  const rows = await h.page.locator('input[value="Bus"], input').evaluateAll(els => els.map(e => e.value).filter(v => v === 'Bus').length);
  assert.ok(rows >= 2, 'two Bus rows were added');
  const firstRow = await h.page.locator('tbody tr').first().locator('input').evaluateAll(els => els.map(e => e.value));
  const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  assert.ok(firstRow.includes(today), `tapped card uses today's date (${today}), got ${firstRow.join(',')}`);
  assert.ok(firstRow.includes('Bus'), 'first (empty) row is reused, not skipped: ' + firstRow.join(','));
  await h.shot('quick-cards');
  await h.page.getByRole('button', { name: /Hide card Auto/ }).click();
  await h.page.getByRole('button', { name: /Add Auto 18/ }).waitFor({ state: 'detached', timeout: 4000 });
});

test('Rules page: lists a rule in plain words and opens the editor', async () => {
  await h.go('/app/transactions/rules');
  await h.page.getByRole('heading', { name: 'Rules' }).waitFor();
  await h.page.getByText('description contains').first().waitFor();
  const body = await h.page.innerText('body');
  assert.match(body, /description contains/); assert.match(body, /swiggy/); assert.match(body, /category Food/); assert.match(body, /#food/);
  await h.page.getByRole('button', { name: /New rule/ }).click();
  await h.page.locator('section[aria-label="Rule editor"]').waitFor();
  await h.shot('rules');
});

test('Transactions overview: spending heatmap and top merchants', async () => {
  await h.go('/app/transactions/overview');
  await h.page.getByRole('heading', { name: /Spending heatmap/ }).waitFor();
  await h.page.getByRole('heading', { name: /Top merchants/ }).waitFor();
  await h.page.locator('.heat-cell[data-level="4"]').first().waitFor({ timeout: 5000 });
  await h.page.getByText('Swiggy').first().waitFor({ timeout: 5000 });
  assert.ok(await h.page.locator('.heat-cell[title*="12,000"]').count() === 1, 'tooltip shows the full amount in Indian grouping');
  assert.match(await h.page.innerText('body'), /Swiggy/);
  await h.shot('heatmap');
});

test('Quick add: floating button opens the dialog; Add needs amount and description; /app/quick-add shortcut opens it too', async () => {
  await h.go('/app/dashboard');
  await h.page.locator('.quick-fab').click();
  const dlg = h.page.locator('.p-dialog').filter({ hasText: 'Quick add' });
  await dlg.waitFor();
  const add = dlg.locator('button', { hasText: /^\s*Add\s*$/ });
  await add.first().waitFor();
  assert.equal(await add.first().isDisabled(), true, 'Add is disabled until amount and description are given');
  await dlg.locator('#qa-amount input, input#qa-amount').first().fill('16');
  await dlg.locator('#qa-desc').fill('Bus');
  await dlg.locator('#qa-desc').blur();
  await h.page.waitForFunction(() => { const b = [...document.querySelectorAll('.p-dialog button')].find(x => x.textContent.trim() === 'Add'); return b && !b.disabled; }, null, { timeout: 5000 });
  await h.shot('quick-add');
  await dlg.locator('button', { hasText: 'Add & another' }).waitFor();
  await h.page.keyboard.press('Escape');
  await h.go('/app/quick-add');
  await h.page.locator('.p-dialog').filter({ hasText: 'Quick add' }).waitFor({ timeout: 8000 });
});

test('What-ifs: loan and card results update from the inputs', async () => {
  await h.go('/app/accounts/what-if');
  await h.page.getByRole('heading', { name: 'What-ifs' }).waitFor();
  const loan = h.page.locator('section[aria-label="Loan results"]');
  await loan.waitFor();
  await h.page.waitForFunction(() => /10 yr/.test(document.querySelector('section[aria-label="Loan results"]')?.textContent ?? ''), null, { timeout: 5000 });
  assert.match(await loan.innerText(), /saves/);
  await h.page.getByRole('button', { name: /Credit card/ }).click();
  const card = h.page.locator('section[aria-label="Card results"]');
  await card.waitFor();
  const t = await card.innerText();
  assert.match(t, /No interest/); assert.match(t, /Pay only the minimum/); assert.match(t, /12-month EMI/);
  await h.shot('what-if');
});
