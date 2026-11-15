// Parrainage sur une vraie base : code unique, attribution, auto-parrainage refusé, alerte, comptage des achats.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createTestDatabase, dropTestDatabase, psqlDb } from './helpers/psql-db.mjs';
import { runMigrations } from '../src/lib/migrate.js';
import * as store from '../src/lib/store.js';
import { ensureReferralCode, registerReferral, countReferred, listReferrers, listReferredWithPurchases, findReferrerByCode } from '../src/lib/referral.js';

let name;
let db;
before(async () => {
  name = createTestDatabase();
  db = psqlDb(name);
  const dir = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => ({ name: f, sql: readFileSync(new URL(f, dir), 'utf8') }));
  await runMigrations(db, files);
});
after(() => dropTestDatabase(name));

const mk = (email, nom) => store.createUser(db, { email, name: nom, passwordHash: 'x', verified: true });

test('chaque compte reçoit un code stable et unique', async () => {
  const a = await mk('a@x.test', 'Awa');
  const b = await mk('b@x.test', 'Bakary');
  const ca = await ensureReferralCode(db, a.id);
  assert.match(ca, /^[A-Z0-9]{8}$/);
  assert.equal(await ensureReferralCode(db, a.id), ca);
  assert.notEqual(await ensureReferralCode(db, b.id), ca);
});

test('un code inconnu ou mal formé ne donne aucun parrain', async () => {
  assert.equal(await findReferrerByCode(db, 'ZZZZZZZZ'), null);
  assert.equal(await findReferrerByCode(db, "'; drop table users;--"), null);
  assert.equal(await findReferrerByCode(db, ''), null);
});

test('inscription par lien : attribution, alerte pour l\'admin, une seule fois', async () => {
  const parrain = await mk('p@x.test', 'Parrain');
  const code = await ensureReferralCode(db, parrain.id);
  const filleul = await mk('f@x.test', 'Filleul');
  const r = await registerReferral(db, filleul, code.toLowerCase());
  assert.equal(r.id, parrain.id);
  assert.equal(await countReferred(db, parrain.id), 1);
  const alerts = (await db.query(`select * from alerts where kind = 'referral' and resolved_at is null`)).rows;
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].message, /Filleul/);
  assert.match(alerts[0].message, /Parrain/);
  // Un second parrain ne remplace pas le premier.
  const autre = await mk('o@x.test', 'Autre');
  const codeAutre = await ensureReferralCode(db, autre.id);
  assert.equal(await registerReferral(db, filleul, codeAutre), null);
  assert.equal((await store.getUserById(db, filleul.id)).referred_by, parrain.id);
});

test('on ne peut pas se parrainer soi-même', async () => {
  const s = await mk('s@x.test', 'Solo');
  const code = await ensureReferralCode(db, s.id);
  assert.equal(await registerReferral(db, s, code), null);
  assert.equal(await countReferred(db, s.id), 0);
});

test('le suivi montre les filleuls qui ont acheté, pas les accès manuels', async () => {
  const parrain = (await store.getUserByEmail(db, 'p@x.test'));
  const filleul = await store.getUserByEmail(db, 'f@x.test');
  const course = await store.createCourse(db, { slug: 'cours-test', title: 'Cours test' });
  await store.grantAccess(db, { userId: filleul.id, courseId: course.id, source: 'manual' });
  let rows = await listReferrers(db);
  assert.equal(Number(rows.find((r) => r.id === parrain.id).filleuls_acheteurs), 0);
  await store.revokeAccess(db, { userId: filleul.id, courseId: course.id, reason: 'test' });
  await store.grantAccess(db, { userId: filleul.id, courseId: course.id, source: 'pulse', saleId: 'sale_1' });
  rows = await listReferrers(db);
  assert.equal(Number(rows.find((r) => r.id === parrain.id).filleuls_acheteurs), 1);
  const detail = await listReferredWithPurchases(db, parrain.id);
  // Avec `pg`, la colonne json arrive déjà décodée ; l'adaptateur de test (psql) la renvoie en texte.
  const achats = typeof detail[0].achats === 'string' ? JSON.parse(detail[0].achats) : detail[0].achats;
  assert.equal(achats[0].titre, 'Cours test');
});
