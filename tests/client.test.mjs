import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChariowError, assessProduct, createChariowClient } from '../src/lib/chariow/client.js';

function res(status, body, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

/** Faux `fetch` : consomme des réponses dans l'ordre et mémorise les requêtes. */
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(url, init) : next;
  };
  fn.calls = calls;
  return fn;
}
const noSleep = async () => {};
const mk = (responses, extra = {}) => {
  const f = fakeFetch(responses);
  return { f, c: createChariowClient({ apiKey: 'sk_live_test', fetchImpl: f, sleep: noSleep, ...extra }) };
};

test('clé manquante : erreur claire sans appel réseau', async () => {
  const f = fakeFetch([]);
  const c = createChariowClient({ apiKey: '', fetchImpl: f });
  await assert.rejects(() => c.getProduct('prd_1'), (e) => e instanceof ChariowError && e.kind === 'missing_key');
  assert.equal(f.calls.length, 0);
});

test('requête : en-tête Bearer, URL de base v1, identifiant encodé', async () => {
  const { f, c } = mk([res(200, { data: { id: 'prd_1' } })]);
  await c.getProduct('mon produit');
  assert.equal(f.calls[0].url, 'https://api.chariow.com/v1/products/mon%20produit');
  assert.equal(f.calls[0].init.headers.Authorization, 'Bearer sk_live_test');
});

test('401, 403 (avec autorisations manquantes), 404, 422, 400 : bon type d\'erreur', async () => {
  const cases = [
    [res(401, { message: 'Invalid API key', errors: [] }), 'unauthorized'],
    [res(403, { message: 'Forbidden', errors: { scopes: ['sales.read'] } }), 'forbidden'],
    [res(404, { message: 'No query results', errors: [] }), 'not_found'],
    [res(422, { message: 'Invalid', errors: { 'phone.number': ['bad'] } }), 'validation'],
    [res(400, { message: 'Invalid phone number for the country', errors: [] }), 'business'],
    [res(500, { message: 'boom' }), 'unexpected'],
    [new Response('<html>oups</html>', { status: 502 }), 'unexpected'],
  ];
  for (const [response, kind] of cases) {
    const { c } = mk([response]);
    await assert.rejects(() => c.request('GET', '/x'), (e) => e instanceof ChariowError && e.kind === kind, kind);
  }
  const { c } = mk([res(403, { message: 'Forbidden', errors: { scopes: ['sales.read', 'customers.pii.read'] } })]);
  await assert.rejects(() => c.request('GET', '/x'), (e) => e.scopes.join() === 'sales.read,customers.pii.read');
  const { c: c2 } = mk([res(400, { message: 'Invalid phone number for the country', errors: [] })]);
  await assert.rejects(() => c2.request('GET', '/x'), (e) => e.apiMessage === 'Invalid phone number for the country');
});

test('erreur réseau : type network', async () => {
  const { c } = mk([new TypeError('fetch failed')]);
  await assert.rejects(() => c.request('GET', '/x'), (e) => e.kind === 'network');
});

test('429 : on attend Retry-After puis on réessaie', async () => {
  const waits = [];
  const { f, c } = mk([res(429, { message: 'Too Many Attempts.', errors: [] }, { 'retry-after': '3' }), res(200, { data: [] })], {
    sleep: async (ms) => waits.push(ms),
  });
  const out = await c.request('GET', '/x');
  assert.deepEqual(out, { data: [] });
  assert.deepEqual(waits, [3000]);
  assert.equal(f.calls.length, 2);
});

test('429 persistant ou Retry-After très long : on abandonne avec rate_limited', async () => {
  const { c } = mk([res(429, {}, { 'retry-after': '60' })]);
  await assert.rejects(() => c.request('GET', '/x'), (e) => e.kind === 'rate_limited' && e.retryAfter === 60);
  const { c: c2 } = mk([res(429, {}, { 'retry-after': '1' }), res(429, {}, { 'retry-after': '1' }), res(429, {}, { 'retry-after': '1' })]);
  await assert.rejects(() => c2.request('GET', '/x'), (e) => e.kind === 'rate_limited');
});

test('réponse 200 qui n\'est pas du JSON : erreur inattendue (pas de plantage)', async () => {
  const { c } = mk([new Response('pas du json', { status: 200 })]);
  await assert.rejects(() => c.request('GET', '/x'), (e) => e.kind === 'unexpected');
});

test('checkout : corps JSON envoyé tel quel, réponse = data', async () => {
  const { f, c } = mk([res(200, { data: { step: 'payment', payment: { checkout_url: 'https://pay.example/x' } } })]);
  const out = await c.initCheckout({ product_id: 'prd_1', email: 'a@b.co' });
  assert.equal(out.step, 'payment');
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].url, 'https://api.chariow.com/v1/checkout');
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { product_id: 'prd_1', email: 'a@b.co' });
});

test('clients par e-mail : correspondance EXACTE, sans tenir compte des majuscules', async () => {
  const { f, c } = mk([
    res(200, {
      data: [
        { id: 'cus_1', email: 'Aicha@Example.com' },
        { id: 'cus_2', email: 'aicha@example.com.evil.org' },
        { id: 'cus_3', email: 'xaicha@example.com' },
      ],
      pagination: { has_more_pages: false, next_cursor: null },
    }),
  ]);
  const found = await c.findCustomersByEmail('  AICHA@example.com ');
  assert.deepEqual(found.map((x) => x.id), ['cus_1']);
  assert.match(f.calls[0].url, /search=aicha%40example\.com/);
});

test('ventes payées d\'une adresse : client trouvé, puis ventes completed + settled, pagination suivie', async () => {
  const { f, c } = mk([
    res(200, { data: [{ id: 'cus_1', email: 'a@b.co' }], pagination: { has_more_pages: false } }),
    res(200, { data: [{ id: 'sal_1' }], pagination: { has_more_pages: true, next_cursor: 'CUR2' } }),
    res(200, { data: [{ id: 'sal_9' }], pagination: { has_more_pages: false } }),
    res(200, { data: [{ id: 'sal_2' }], pagination: { has_more_pages: false } }),
  ]);
  // Les requêtes completed/settled partent en parallèle : on ne dépend pas de l'ordre d'arrivée.
  f.calls.length = 0;
  const sales = await c.findPaidSalesByEmail('a@b.co');
  assert.deepEqual(sales.map((s) => s.id).sort(), ['sal_1', 'sal_2', 'sal_9']);
  const urls = f.calls.map((x) => x.url);
  assert.ok(urls.some((u) => u.includes('/sales') && u.includes('customer_id=cus_1') && u.includes('status=completed')));
  assert.ok(urls.some((u) => u.includes('/sales') && u.includes('status=settled')));
  assert.ok(urls.some((u) => u.includes('cursor=CUR2')));
});

test('testKey : une sonde par autorisation, arrêt dès qu\'une clé est refusée', async () => {
  const ok = { data: [], pagination: {} };
  const good = mk([res(200, ok), res(200, ok), res(200, ok)]);
  const r1 = await good.c.testKey();
  assert.equal(r1.ok, true);
  assert.deepEqual(r1.checks.map((c) => c.scope), ['products.read', 'sales.read', 'customers.pii.read']);

  const partial = mk([res(200, ok), res(403, { errors: { scopes: ['sales.read'] } }), res(200, ok)]);
  const r2 = await partial.c.testKey();
  assert.equal(r2.ok, false);
  assert.deepEqual(r2.checks.map((c) => c.ok), [true, false, true]);
  assert.deepEqual(r2.checks[1].missingScopes, ['sales.read']);

  const bad = mk([res(401, { message: 'Invalid API key' })]);
  const r3 = await bad.c.testKey();
  assert.equal(r3.ok, false);
  assert.equal(r3.checks.length, 1);
  assert.equal(r3.checks[0].kind, 'unauthorized');
});

test('assessProduct : publié, brouillon, service, prix libre, licence', () => {
  const base = { id: 'prd_1', slug: 'x', name: 'X', type: 'course', status: 'published', pricing: { type: 'one_time' } };
  assert.equal(assessProduct(base, 'api').ok, true);
  assert.equal(assessProduct({ ...base, status: 'draft' }, 'api').ok, false);
  assert.match(assessProduct({ ...base, status: 'draft' }, 'api').errors[0], /brouillon/);
  assert.equal(assessProduct({ ...base, type: 'service' }, 'api').ok, false);
  assert.equal(assessProduct({ ...base, type: 'service' }, 'link').ok, true);
  assert.equal(assessProduct({ ...base, pricing: { type: 'what_you_want' } }, 'api').ok, false);
  assert.equal(assessProduct({ ...base, type: 'license' }, 'api').warnings.length, 1);
  assert.equal(assessProduct(null, 'api').ok, false);
});
