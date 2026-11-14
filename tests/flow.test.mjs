// Tests de bout en bout sur une VRAIE base PostgreSQL : webhook -> journal -> accès.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createTestDatabase, dropTestDatabase, psqlDb } from './helpers/psql-db.mjs';
import { runMigrations } from '../src/lib/migrate.js';
import * as store from '../src/lib/store.js';
import { receivePulse } from '../src/lib/chariow/webhook.js';
import { processDeliveryById } from '../src/lib/chariow/pulse.js';
import { claimPendingForUser } from '../src/lib/chariow/sales.js';
import { reconcile, syncRevocations, verifyMyPurchase } from '../src/lib/chariow/reconcile.js';
import { ChariowError } from '../src/lib/chariow/client.js';
import { hashPassword } from '../src/lib/crypto.js';

const SECRET = 'whsec_flow_test';
const PULSE_ID = 'pulse_main';
const SECRETS = [{ id: 's1', label: 'Pulse principal', pulse_id: PULSE_ID, secret: SECRET }];

let dbName;
let db;
let mails;
let notifyImpl;
let seq = 0;
const ctx = () => ({
  db,
  siteUrl: 'https://ama.test',
  notify: async (template, data) => {
    await notifyImpl(template, data);
  },
});

// Corps JSON comme l'envoie Chariow : compact, `/` échappés, caractères non ASCII en \uXXXX.
function chariowJson(obj) {
  return JSON.stringify(obj)
    .replace(/\//g, '\\/')
    .replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
const sign = (raw, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');

function salePayload({ saleId, productId = 'prd_course1', email, status = 'completed', event = 'successful.sale', name = 'Aïcha Traoré' }) {
  return {
    event,
    sale: { id: saleId, status, amount: { value: 15000, currency: 'XOF' }, custom_metadata: null },
    product: { id: productId, name: 'Cours', url: 'https://shop.example/p' },
    customer: { id: 'cus_' + saleId, name, first_name: 'Aïcha', last_name: 'Traoré', email },
    store: { id: 'str_1', name: 'Boutique' },
  };
}

/** Envoie un Pulse à receivePulse comme le ferait la route, puis attend le traitement en arrière-plan. */
async function sendPulse(payload, { deliveryId = `del_${++seq}`, secret = SECRET, rawOverride, signatureOverride, secrets = SECRETS, pulseId = PULSE_ID } = {}) {
  const rawBody = Buffer.from(rawOverride ?? chariowJson(payload), 'utf8');
  const headers = {
    'x-chariow-signature': signatureOverride === undefined ? sign(rawBody, secret) : signatureOverride,
    'x-pulse-id': pulseId,
    'x-pulse-delivery-id': deliveryId,
    'x-pulse-event': payload?.event ?? 'successful.sale',
  };
  if (headers['x-chariow-signature'] === null) delete headers['x-chariow-signature'];
  const scheduled = [];
  const response = await receivePulse({
    db,
    rawBody,
    headers,
    secrets,
    schedule: (fn) => scheduled.push(fn()),
    process: (id) => processDeliveryById(ctx(), id),
  });
  await Promise.all(scheduled);
  return { ...response, scheduledCount: scheduled.length, deliveryId };
}

async function makeCourse({ title, productId, status = 'published', slug } = {}) {
  const n = ++seq;
  const c = await store.createCourse(db, { slug: slug || `cours-${n}`, title: title || `Cours ${n}` });
  await store.updateCourse(db, c.id, { chariow_product_id: productId ?? null, chariow_product_ref: productId ?? null });
  if (status !== 'draft') await store.setCourseStatus(db, c.id, status);
  return store.getCourseById(db, c.id);
}
async function makeUser({ email, verified = true, blocked = false, role = 'learner' } = {}) {
  const u = await store.createUser(db, { email: email || `u${++seq}@example.com`, name: 'Apprenant', passwordHash: await hashPassword('motdepasse1'), role, verified });
  if (blocked) await store.setBlocked(db, u.id, true);
  return u;
}
const enrollmentOf = (userId, courseId) => store.getEnrollment(db, userId, courseId);
const lastMail = () => mails[mails.length - 1];
const openAlerts = async (kind) => (await store.listOpenAlerts(db)).filter((a) => a.kind === kind);

let course; // formation principale (produit prd_course1)

before(async () => {
  dbName = createTestDatabase();
  db = psqlDb(dbName);
  const sql = readFileSync(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8');
  const applied = await runMigrations(db, [{ name: '001_init.sql', sql }]);
  assert.deepEqual(applied, ['001_init.sql']);
  course = await makeCourse({ title: 'Débuter en ligne', productId: 'prd_course1', slug: 'debuter' });
});
after(() => dropTestDatabase(dbName));

// Chaque test repart avec un journal d'e-mails vide.
const reset = () => {
  mails = [];
  notifyImpl = async (template, data) => {
    mails.push({ template, ...data });
  };
};

test('migrations : rejouées, elles ne font rien', async () => {
  const sql = readFileSync(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8');
  assert.deepEqual(await runMigrations(db, [{ name: '001_init.sql', sql }]), []);
});

test('base : une formation payante ne peut pas être publiée sans produit Chariow', async () => {
  const c = await store.createCourse(db, { slug: 'sans-produit', title: 'Sans produit' });
  await assert.rejects(() => store.setCourseStatus(db, c.id, 'published'), /published_paid_needs_product|check constraint/);
  await store.updateCourse(db, c.id, { is_free: true });
  assert.equal((await store.setCourseStatus(db, c.id, 'published')).status, 'published');
});

test('base : un e-mail = un compte, même avec des majuscules', async () => {
  reset();
  const u = await makeUser({ email: 'Doublon@Example.com' });
  assert.ok(u.id);
  await assert.rejects(() => store.createUser(db, { email: 'doublon@example.COM', name: 'x', passwordHash: 'x' }), /duplicate key|users_email_lower_idx/);
});

test('Pulse valide, utilisateur vérifié : accès créé, e-mail de confirmation, journal complet', async () => {
  reset();
  const user = await makeUser({ email: 'aicha@example.com' });
  const out = await sendPulse(salePayload({ saleId: 'sal_ok1', email: 'aicha@example.com' }));
  assert.equal(out.status, 200);
  assert.equal(out.body, 'OK');
  const e = await enrollmentOf(user.id, course.id);
  assert.equal(e.status, 'active');
  assert.equal(e.source, 'pulse');
  assert.equal(e.chariow_sale_id, 'sal_ok1');
  assert.equal(mails.length, 1);
  assert.equal(lastMail().template, 'purchaseConfirmed');
  assert.equal(lastMail().link, 'https://ama.test/espace/formation/debuter');
  const [d] = await store.listDeliveries(db, { limit: 1 });
  assert.equal(d.status, 'done');
  assert.equal(d.result, 'granted');
  assert.equal(d.sale_id, 'sal_ok1');
  assert.equal(Number(d.attempts), 1);
});

test('corps avec accents et « / » échappés : la signature se vérifie sur les octets bruts', async () => {
  reset();
  const user = await makeUser({ email: 'zoé.dupré@example.com' });
  const payload = salePayload({ saleId: 'sal_unicode', email: 'zoé.dupré@example.com', name: 'Zoé Dupré' });
  const raw = chariowJson(payload);
  assert.ok(raw.includes('\\u00e9') && raw.includes('\\/'), 'le corps de test doit contenir des échappements Chariow');
  const out = await sendPulse(payload, { rawOverride: raw });
  assert.equal(out.status, 200);
  assert.equal((await enrollmentOf(user.id, course.id))?.status, 'active');
  // Le même contenu re-sérialisé par un intermédiaire (signature calculée sur l'original) est refusé.
  const reserialized = JSON.stringify(JSON.parse(raw));
  const bad = await sendPulse(payload, { rawOverride: reserialized, signatureOverride: sign(Buffer.from(raw)) });
  assert.equal(bad.status, 401);
});

test('doublon (même x-pulse-delivery-id) : 200, rien n\'est retraité', async () => {
  reset();
  const user = await makeUser();
  const payload = salePayload({ saleId: 'sal_dup', email: user.email });
  const first = await sendPulse(payload, { deliveryId: 'del_same' });
  const mailsAfterFirst = mails.length;
  const second = await sendPulse(payload, { deliveryId: 'del_same' });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.scheduledCount, 1);
  assert.equal(second.scheduledCount, 0, 'le doublon ne doit pas être traité une seconde fois');
  assert.equal(mails.length, mailsAfterFirst);
  const rows = (await store.listDeliveries(db, { limit: 100 })).filter((d) => d.delivery_id === 'del_same');
  assert.equal(rows.length, 1);
});

test('signature invalide, absente ou mauvais secret : 401, rien n\'est enregistré, aucun accès', async () => {
  reset();
  const user = await makeUser();
  const payload = salePayload({ saleId: 'sal_bad', email: user.email });
  const before = (await store.listDeliveries(db, { limit: 500 })).length;
  const a = await sendPulse(payload, { secret: 'whsec_pirate' });
  const b = await sendPulse(payload, { signatureOverride: null });
  const c = await sendPulse(payload, { signatureOverride: 'sha256=' + '0'.repeat(64) });
  const d = await sendPulse(payload, { signatureOverride: 'nimporte quoi' });
  assert.deepEqual([a.status, b.status, c.status, d.status], [401, 401, 401, 401]);
  assert.equal((await store.listDeliveries(db, { limit: 500 })).length, before);
  assert.equal(await enrollmentOf(user.id, course.id), null);
  assert.equal(mails.length, 0);
  assert.ok((await store.countRecentRejections(db, 60)) >= 4);
  assert.equal((await openAlerts('pulse_signature')).length, 1, 'alerte « secret peut-être renouvelé » après plusieurs refus');
});

test('un faux Pulse ne peut pas bloquer un vrai Pulse en réutilisant son x-pulse-delivery-id', async () => {
  reset();
  const user = await makeUser();
  const payload = salePayload({ saleId: 'sal_poison', email: user.email });
  assert.equal((await sendPulse(payload, { deliveryId: 'del_poison', secret: 'whsec_pirate' })).status, 401);
  assert.equal((await sendPulse(payload, { deliveryId: 'del_poison' })).status, 200);
  assert.equal((await enrollmentOf(user.id, course.id))?.status, 'active');
});

test('aucun secret enregistré : 401 et alerte claire', async () => {
  reset();
  const out = await sendPulse(salePayload({ saleId: 'sal_nosecret', email: 'x@example.com' }), { secrets: [] });
  assert.equal(out.status, 401);
  assert.ok((await openAlerts('pulse_signature')).length >= 1);
});

test('signature valide mais sans x-pulse-delivery-id ou JSON invalide : 400', async () => {
  reset();
  const payload = salePayload({ saleId: 'sal_x', email: 'x@example.com' });
  const raw = Buffer.from(chariowJson(payload));
  const r1 = await receivePulse({ db, rawBody: raw, headers: { 'x-chariow-signature': sign(raw), 'x-pulse-id': PULSE_ID }, secrets: SECRETS, schedule() {}, process() {} });
  assert.equal(r1.status, 400);
  const junk = Buffer.from('{pas du json');
  const r2 = await receivePulse({ db, rawBody: junk, headers: { 'x-chariow-signature': sign(junk), 'x-pulse-id': PULSE_ID, 'x-pulse-delivery-id': 'del_junk' }, secrets: SECRETS, schedule() {}, process() {} });
  assert.equal(r2.status, 400);
  const arr = Buffer.from('[1,2]');
  const r3 = await receivePulse({ db, rawBody: arr, headers: { 'x-chariow-signature': sign(arr), 'x-pulse-id': PULSE_ID, 'x-pulse-delivery-id': 'del_arr' }, secrets: SECRETS, schedule() {}, process() {} });
  assert.equal(r3.status, 400);
});

test('Pulse de test Chariow (identifiants test_) : « connexion OK », jamais d\'accès', async () => {
  reset();
  const user = await makeUser({ email: 'testeur@example.com' });
  const payload = { ...salePayload({ saleId: 'test_sal_123', productId: 'prd_course1', email: 'testeur@example.com' }), note: 'Ceci est un test' };
  const out = await sendPulse(payload);
  assert.equal(out.status, 200);
  assert.equal(await enrollmentOf(user.id, course.id), null);
  assert.equal(mails.length, 0);
  const [d] = await store.listDeliveries(db, { limit: 1 });
  assert.equal(d.result, 'test');
  assert.ok((await store.getSettingRow(db, 'last_test_pulse_at')).value);
  // Même avec un vrai produit et un vrai e-mail, un identifiant test_ n'ouvre rien.
  const p2 = salePayload({ saleId: 'sal_real', email: 'testeur@example.com' });
  p2.customer.id = 'test_cus_1';
  await sendPulse(p2);
  assert.equal(await enrollmentOf(user.id, course.id), null);
});

test('adresse sans compte : achat en attente + e-mail ; à la création et vérification du compte, l\'accès s\'ouvre', async () => {
  reset();
  const out = await sendPulse(salePayload({ saleId: 'sal_pend1', email: 'Nouveau@Example.com' }));
  assert.equal(out.status, 200);
  assert.equal(mails.length, 1);
  assert.equal(lastMail().template, 'purchaseNoAccount');
  assert.equal(lastMail().link, 'https://ama.test/inscription?email=Nouveau%40Example.com');
  assert.equal((await store.listPendingPurchases(db)).filter((p) => p.chariow_sale_id === 'sal_pend1').length, 1);
  assert.equal((await store.listDeliveries(db, { limit: 1 }))[0].result, 'pending');

  // Le compte est créé mais PAS vérifié : rien ne se rattache (sinon on pourrait voler un accès).
  const unverified = await makeUser({ email: 'nouveau@example.com', verified: false });
  assert.deepEqual(await claimPendingForUser(ctx(), unverified), { claimed: 0, granted: 0 });
  assert.equal(await enrollmentOf(unverified.id, course.id), null);

  // Vérification de l'adresse : l'achat en attente est rattaché automatiquement.
  const verified = await store.markEmailVerified(db, unverified.id);
  const full = await store.getUserById(db, verified.id);
  const out2 = await claimPendingForUser(ctx(), full);
  assert.deepEqual(out2, { claimed: 1, granted: 1 });
  const e = await enrollmentOf(unverified.id, course.id);
  assert.equal(e.status, 'active');
  assert.equal(e.chariow_sale_id, 'sal_pend1');
  assert.equal(lastMail().template, 'purchaseConfirmed');
  // Rejouer le rattachement ne change rien.
  assert.deepEqual(await claimPendingForUser(ctx(), full), { claimed: 0, granted: 0 });
});

test('compte existant mais e-mail non vérifié : en attente + e-mail adapté, puis accès après vérification', async () => {
  reset();
  const user = await makeUser({ email: 'nonverifie@example.com', verified: false });
  await sendPulse(salePayload({ saleId: 'sal_unv', email: 'nonverifie@example.com' }));
  assert.equal(lastMail().template, 'purchasePendingVerification');
  assert.equal(await enrollmentOf(user.id, course.id), null);
  await store.markEmailVerified(db, user.id);
  await claimPendingForUser(ctx(), await store.getUserById(db, user.id));
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
});

test('e-mail du Pulse en majuscules : le compte est retrouvé sans tenir compte de la casse', async () => {
  reset();
  const user = await makeUser({ email: 'fatou.diallo@example.com' });
  await sendPulse(salePayload({ saleId: 'sal_case', email: 'FATOU.Diallo@EXAMPLE.COM' }));
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
});

test('compte bloqué : l\'achat reste en attente, alerte pour l\'admin', async () => {
  reset();
  const user = await makeUser({ email: 'bloque@example.com', blocked: true });
  await sendPulse(salePayload({ saleId: 'sal_blk', email: 'bloque@example.com' }));
  assert.equal(await enrollmentOf(user.id, course.id), null);
  assert.equal((await openAlerts('pending_blocked')).length, 1);
});

test('produit inconnu : journalisé, alerte unique par produit, rien de cassé, aucun accès', async () => {
  reset();
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_unk1', productId: 'prd_inconnu', email: user.email }));
  await sendPulse(salePayload({ saleId: 'sal_unk2', productId: 'prd_inconnu', email: user.email }));
  const alerts = await openAlerts('unknown_product');
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].message, /prd_inconnu/);
  assert.equal((await store.listDeliveries(db, { limit: 1 }))[0].result, 'unknown_product');
  assert.equal((await store.listUserEnrollments(db, user.id)).length, 0);
});

test('vente non payée ou événements sans accès : journalisés, aucun accès', async () => {
  reset();
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_np', email: user.email, status: 'awaiting_payment' }));
  await sendPulse(salePayload({ saleId: 'sal_f', email: user.email, event: 'failed.sale', status: 'failed' }));
  await sendPulse(salePayload({ saleId: 'sal_a', email: user.email, event: 'abandoned.sale', status: 'abandoned' }));
  await sendPulse({ event: 'affiliate.joined', affiliate: { id: 'aff_1' } });
  await sendPulse({ event: 'license.issued', license: { id: 'lic_1' } });
  assert.equal((await store.listUserEnrollments(db, user.id)).length, 0);
  const results = (await store.listDeliveries(db, { limit: 5 })).map((d) => d.result).sort();
  assert.deepEqual(results, ['logged', 'logged', 'logged', 'sale_status_awaiting_payment', 'unknown_event']);
  assert.equal(mails.length, 0);
});

test('vente « settled » (fonds reversés) : traitée comme payée', async () => {
  reset();
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_set', email: user.email, status: 'settled' }));
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
});

test('charge utile incomplète : ignorée avec alerte', async () => {
  reset();
  await sendPulse({ event: 'successful.sale', sale: { id: 'sal_inc', status: 'completed' } });
  assert.equal((await store.listDeliveries(db, { limit: 1 }))[0].result, 'payload_incomplete');
  assert.ok((await openAlerts('bad_payload')).length >= 1);
});

test('remboursement : accès retiré, un Pulse REJOUÉ ne le rétablit pas, un NOUVEL achat oui', async () => {
  reset();
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_ref1', email: user.email }));
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
  await store.revokeAccess(db, { userId: user.id, courseId: course.id, reason: 'Remboursé' });
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'revoked');

  // Rejeu depuis Chariow (nouvelle livraison, même vente) : pas de ré-accès automatique.
  await sendPulse(salePayload({ saleId: 'sal_ref1', email: user.email }));
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'revoked');
  assert.equal((await store.listDeliveries(db, { limit: 1 }))[0].result, 'blocked_revoked');
  assert.ok((await openAlerts('blocked_revoked')).length >= 1);

  // Nouvel achat (autre vente) : accès rétabli.
  await sendPulse(salePayload({ saleId: 'sal_ref2', email: user.email }));
  const e = await enrollmentOf(user.id, course.id);
  assert.equal(e.status, 'active');
  assert.equal(e.chariow_sale_id, 'sal_ref2');
  assert.equal(e.revoked_at, null);
});

test('accès manuel de l\'admin : rétablit même une vente retirée', async () => {
  reset();
  const admin = await makeUser({ role: 'admin' });
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_man', email: user.email }));
  await store.revokeAccess(db, { userId: user.id, courseId: course.id, reason: 'Test' });
  const g = await store.grantAccess(db, { userId: user.id, courseId: course.id, source: 'manual', saleId: 'sal_man', grantedBy: admin.id });
  assert.equal(g.action, 'granted');
  const e = await enrollmentOf(user.id, course.id);
  assert.equal(e.status, 'active');
  assert.equal(e.source, 'manual');
  assert.equal(e.granted_by, admin.id);
});

test('deux ventes en attente pour la même formation et la même adresse : le rattachement ne plante pas', async () => {
  reset();
  await sendPulse(salePayload({ saleId: 'sal_twin1', email: 'jumeaux@example.com' }));
  await sendPulse(salePayload({ saleId: 'sal_twin2', email: 'jumeaux@example.com' }));
  const user = await makeUser({ email: 'jumeaux@example.com' });
  const out = await claimPendingForUser(ctx(), user);
  assert.equal(out.claimed, 2);
  assert.equal(out.granted, 1);
  assert.equal((await store.listUserEnrollments(db, user.id)).length, 1);
});

test('traitement qui échoue après le 200 : livraison conservée, puis retraitée sans doublon', async () => {
  reset();
  const user = await makeUser();
  notifyImpl = async () => {
    throw new Error('panne e-mail simulée');
  };
  const out = await sendPulse(salePayload({ saleId: 'sal_fail', email: user.email }), { deliveryId: 'del_fail' });
  assert.equal(out.status, 200, 'Chariow reçoit 200 même si le traitement échoue ensuite');
  const failed = (await store.listDeliveries(db, { limit: 100 })).find((d) => d.delivery_id === 'del_fail');
  assert.equal(failed.status, 'failed');
  assert.match(failed.error, /panne e-mail/);
  assert.equal(Number(failed.attempts), 1);

  reset(); // l'e-mail refonctionne
  const summary = await reconcile(ctx(), null);
  assert.equal(summary.retried >= 1, true);
  assert.equal(summary.skipped, 'no_api_key');
  const retried = (await store.listDeliveries(db, { limit: 100 })).find((d) => d.delivery_id === 'del_fail');
  assert.equal(retried.status, 'done');
  assert.equal(Number(retried.attempts), 2);
  assert.equal((await store.listUserEnrollments(db, user.id)).length, 1);
});

test('livraison restée « received » (plantage juste après le 200) : reprise par la réconciliation', async () => {
  reset();
  const user = await makeUser();
  const payload = salePayload({ saleId: 'sal_crash', email: user.email });
  const id = await store.insertDelivery(db, { deliveryId: 'del_crash', pulseId: PULSE_ID, event: 'successful.sale', payload });
  assert.ok(id);
  await db.query(`update pulse_deliveries set received_at = now() - interval '5 minutes' where id = $1`, [id]);
  await reconcile(ctx(), null);
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
});

test('une livraison ne peut être prise que par un seul traitement à la fois', async () => {
  reset();
  const user = await makeUser();
  const id = await store.insertDelivery(db, { deliveryId: 'del_once', pulseId: PULSE_ID, event: 'successful.sale', payload: salePayload({ saleId: 'sal_once', email: user.email }) });
  const [a, b] = await Promise.all([processDeliveryById(ctx(), id), processDeliveryById(ctx(), id)]);
  assert.equal([a, b].filter((x) => x.skipped).length, 1);
  assert.equal(mails.length, 1);
});

// ---------- Réconciliation, vérification d'achat, remboursements ----------

function fakeClient({ sales = [], customersSales = [], saleDetails = {}, failWith = null } = {}) {
  return {
    async listPaidSalesSince() {
      if (failWith) throw failWith;
      return sales;
    },
    async findPaidSalesByEmail() {
      if (failWith) throw failWith;
      return customersSales;
    },
    async getSale(id) {
      if (failWith) throw failWith;
      if (!(id in saleDetails)) throw new ChariowError('not_found', 404);
      return saleDetails[id];
    },
  };
}
const apiSale = (id, productId, email) => ({ id, status: 'completed', product: { id: productId }, customer: { email, name: 'Client' } });

test('réconciliation : crée les accès manquants, ignore les autres produits, signale un Pulse muet, reste idempotente', async () => {
  reset();
  const user = await makeUser({ email: 'manque@example.com' });
  const client = fakeClient({
    sales: [
      apiSale('sal_miss1', 'prd_course1', 'manque@example.com'),
      apiSale('sal_miss2', 'prd_course1', 'sansCompte@example.com'),
      apiSale('sal_other', 'prd_autre_boutique', 'manque@example.com'),
    ],
  });
  const s1 = await reconcile(ctx(), client);
  assert.equal(s1.sales, 3);
  assert.equal(s1.newAccess, 1);
  assert.equal(s1.newPending, 1);
  assert.equal(s1.missedByPulse, 2);
  assert.equal((await enrollmentOf(user.id, course.id)).source, 'reconciliation');
  assert.equal((await openAlerts('pulse_inactive')).length, 1);
  assert.equal((await openAlerts('unknown_product')).filter((a) => a.message.includes('prd_autre_boutique')).length, 0, 'un produit hors formations n\'est pas une erreur');
  const mailsAfter = mails.length;
  const s2 = await reconcile(ctx(), client);
  assert.equal(s2.newAccess + s2.newPending + s2.missedByPulse, 0);
  assert.equal(mails.length, mailsAfter, 'pas de nouvel e-mail au second passage');
});

test('réconciliation : clé API refusée => alerte claire, pas de plantage', async () => {
  reset();
  const s = await reconcile(ctx(), fakeClient({ failWith: new ChariowError('unauthorized', 401) }));
  assert.equal(s.apiError, 'unauthorized');
  assert.equal((await openAlerts('api_key')).length, 1);
  const s2 = await reconcile(ctx(), fakeClient({ failWith: new ChariowError('network', null) }));
  assert.equal(s2.apiError, 'network');
});

test('« J\'ai payé, vérifier mon achat » : ouvre l\'accès de la bonne formation seulement', async () => {
  reset();
  const other = await makeCourse({ title: 'Autre', productId: 'prd_course2' });
  const user = await makeUser({ email: 'verifie@example.com' });
  const client = fakeClient({ customersSales: [apiSale('sal_v1', 'prd_course2', 'verifie@example.com'), apiSale('sal_v2', 'prd_pas_chez_nous', 'verifie@example.com')] });
  const r = await verifyMyPurchase(ctx(), user, client);
  assert.deepEqual({ ok: r.ok, granted: r.granted }, { ok: true, granted: 1 });
  assert.equal((await enrollmentOf(user.id, other.id)).status, 'active');
  assert.equal(await enrollmentOf(user.id, course.id), null);
  const again = await verifyMyPurchase(ctx(), user, client);
  assert.equal(again.granted, 0);
  assert.equal(again.found, 1);
});

test('vérification d\'achat : refusée si l\'e-mail n\'est pas vérifié ou si la clé API manque', async () => {
  reset();
  const unverified = await makeUser({ verified: false });
  const client = fakeClient({ customersSales: [apiSale('sal_nv', 'prd_course1', unverified.email)] });
  assert.deepEqual(await verifyMyPurchase(ctx(), unverified, client), { ok: false, reason: 'email_not_verified' });
  assert.equal(await enrollmentOf(unverified.id, course.id), null);
  const verified = await makeUser();
  assert.deepEqual(await verifyMyPurchase(ctx(), verified, null), { ok: false, reason: 'not_configured' });
  const r = await verifyMyPurchase(ctx(), verified, fakeClient({ failWith: new ChariowError('rate_limited', 429) }));
  assert.deepEqual(r, { ok: false, reason: 'rate_limited' });
});

test('détection des remboursements : is_access_revoked retire l\'accès, sinon on laisse', async () => {
  reset();
  const refunded = await makeUser();
  const fine = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_rf', email: refunded.email }));
  await sendPulse(salePayload({ saleId: 'sal_fine', email: fine.email }));
  const client = fakeClient({ saleDetails: { sal_rf: { id: 'sal_rf', is_access_revoked: true }, sal_fine: { id: 'sal_fine', is_access_revoked: false } } });
  const out = await syncRevocations(ctx(), client, 100);
  assert.ok(out.revoked >= 1);
  assert.equal((await enrollmentOf(refunded.id, course.id)).status, 'revoked');
  assert.match((await enrollmentOf(refunded.id, course.id)).revoke_reason, /Chariow/);
  assert.equal((await enrollmentOf(fine.id, course.id)).status, 'active');
  assert.ok((await enrollmentOf(fine.id, course.id)).chariow_checked_at);
});

test('license.revoked : retire l\'accès seulement si e-mail et produit sont identifiables', async () => {
  reset();
  const user = await makeUser();
  await sendPulse(salePayload({ saleId: 'sal_lic', email: user.email }));
  await sendPulse({ event: 'license.revoked', license: { id: 'lic_x' } });
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'active');
  await sendPulse({ event: 'license.revoked', customer: { email: user.email }, product: { id: 'prd_course1' } });
  assert.equal((await enrollmentOf(user.id, course.id)).status, 'revoked');
});

// ---------- Comptes, sessions, jetons, limitation de débit ----------

test('jeton e-mail : valable une seule fois, expire, et le plus récent remplace l\'ancien', async () => {
  const u = await makeUser({ verified: false });
  const future = new Date(Date.now() + 3600e3);
  await store.createEmailToken(db, { userId: u.id, kind: 'verify', tokenHash: 'h1', expiresAt: future });
  assert.equal(await store.consumeEmailToken(db, { kind: 'reset', tokenHash: 'h1' }), null, 'mauvais type');
  assert.equal(await store.consumeEmailToken(db, { kind: 'verify', tokenHash: 'h1' }), u.id);
  assert.equal(await store.consumeEmailToken(db, { kind: 'verify', tokenHash: 'h1' }), null, 'usage unique');
  await store.createEmailToken(db, { userId: u.id, kind: 'reset', tokenHash: 'old', expiresAt: future });
  await store.createEmailToken(db, { userId: u.id, kind: 'reset', tokenHash: 'new', expiresAt: future });
  assert.equal(await store.consumeEmailToken(db, { kind: 'reset', tokenHash: 'old' }), null);
  assert.equal(await store.consumeEmailToken(db, { kind: 'reset', tokenHash: 'new' }), u.id);
  await store.createEmailToken(db, { userId: u.id, kind: 'reset', tokenHash: 'exp', expiresAt: new Date(Date.now() - 1000) });
  assert.equal(await store.consumeEmailToken(db, { kind: 'reset', tokenHash: 'exp' }), null, 'expiré');
});

test('sessions : valides jusqu\'à l\'expiration, refusées pour un compte bloqué ou après déconnexion', async () => {
  const u = await makeUser();
  await store.createSession(db, { userId: u.id, tokenHash: 'sess_ok', expiresAt: new Date(Date.now() + 3600e3), userAgent: 'test' });
  await store.createSession(db, { userId: u.id, tokenHash: 'sess_old', expiresAt: new Date(Date.now() - 1000), userAgent: 'test' });
  assert.equal((await store.getSessionUser(db, 'sess_ok')).id, u.id);
  assert.equal(await store.getSessionUser(db, 'sess_old'), null);
  assert.equal(await store.getSessionUser(db, 'inconnue'), null);
  await store.setBlocked(db, u.id, true);
  assert.equal(await store.getSessionUser(db, 'sess_ok'), null);
  await store.setBlocked(db, u.id, false);
  assert.equal((await store.getSessionUser(db, 'sess_ok')).id, u.id);
  await store.deleteSession(db, 'sess_ok');
  assert.equal(await store.getSessionUser(db, 'sess_ok'), null);
});

test('limitation de débit : refuse au-delà de la limite, par clé', async () => {
  const key = `login:test:${++seq}`;
  const results = [];
  for (let i = 0; i < 5; i++) results.push((await store.rateLimitHit(db, { key, windowSeconds: 900, limit: 3 })).allowed);
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.equal((await store.rateLimitHit(db, { key: key + 'autre', windowSeconds: 900, limit: 3 })).allowed, true);
});

test('suppression d\'un compte : accès, progression et sessions disparaissent avec lui', async () => {
  const u = await makeUser();
  await store.grantAccess(db, { userId: u.id, courseId: course.id, source: 'manual' });
  await store.createSession(db, { userId: u.id, tokenHash: `s_del_${seq}`, expiresAt: new Date(Date.now() + 1e6) });
  await store.deleteUser(db, u.id);
  assert.equal(await store.getUserById(db, u.id), null);
  assert.equal(await enrollmentOf(u.id, course.id), null);
});

test('progression : leçons terminées retrouvées par formation', async () => {
  const u = await makeUser();
  const c = await makeCourse({ productId: 'prd_prog' });
  const m = await store.createModule(db, { courseId: c.id, title: 'Module 1' });
  const l1 = await store.createLesson(db, { moduleId: m.id, title: 'Leçon 1' });
  const l2 = await store.createLesson(db, { moduleId: m.id, title: 'Leçon 2' });
  assert.deepEqual([l1.position, l2.position].map(Number), [0, 1]);
  await store.markLessonDone(db, u.id, l1.id);
  await store.markLessonDone(db, u.id, l1.id); // idempotent
  const done = await store.listCompletedLessonIds(db, u.id, c.id);
  assert.deepEqual([...done], [l1.id]);
  const tree = await store.listModulesWithLessons(db, c.id);
  assert.equal(tree[0].lessons.length, 2);
});
