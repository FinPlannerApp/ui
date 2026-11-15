# Mocked-API smoke tests

Run these before deploying (or after a big change) to catch broken screens and bad bindings without a backend or database.

```bash
npm i -D playwright          # once (the browser is installed with: npx playwright install chromium)
ng build --configuration development
npm run e2e:mock             # SHOTS=./e2e-mock/shots npm run e2e:mock  saves screenshots too
```

What they cover: Undo centre, budget sub-category drawer (+ drill-down), dashboard tile drawers, Indian number format and
compact tiles, category tree, tips page. They also fail on any uncaught page error.

What they do NOT cover: real API results, database values, auth. API calls are answered from `mock-data.js`
(unknown endpoints return an empty list). To test a different case, pass overrides to `start({ 'Budgets/dashboard': () => ({...}) })`.

Add a test whenever you add a screen: copy one in `smoke.test.js`, add its endpoint to `harness.js` if it needs data.
