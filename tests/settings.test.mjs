import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTestDatabase, dropTestDatabase, psqlDb } from './helpers/psql-db.mjs';
import { runMigrations } from '../src/lib/migrate.js';
import * as store from '../src/lib/store.js';
import { addPulseSecret, getPulseSecrets, getSetting, getSettingSource, setSetting } from '../src/lib/settings.js';

const ENV = { APP_SECRET: 'x'.repeat(48) };
let name;
let db;

before(async () => {
  name = createTestDatabase();
  db = psqlDb(name);
  await runMigrations(db, [{ name: '001_init.sql', sql: readFileSync(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8') }]);
});
after(() => dropTestDatabase(name));

test('clé API : stockée chiffrée, relue en clair, jamais lisible dans la base', async () => {
  await setSetting(db, 'chariow_api_key', 'sk_live_super_secret_1234', null, ENV);
  const raw = await store.getSettingRow(db, 'chariow_api_key');
  assert.ok(!raw.value.includes('sk_live'));
  assert.equal(await getSetting(db, 'chariow_api_key', ENV), 'sk_live_super_secret_1234');
});

test('priorité : la base l\'emporte sur la variable d\'environnement', async () => {
  const env = { ...ENV, MAIL_FROM: 'env@exemple.com' };
  assert.equal(await getSetting(db, 'mail_from', env), 'env@exemple.com');
  assert.equal(await getSettingSource(db, 'mail_from', env), 'environnement');
  await setSetting(db, 'mail_from', 'base@exemple.com', null, env);
  assert.equal(await getSetting(db, 'mail_from', env), 'base@exemple.com');
  assert.equal(await getSettingSource(db, 'mail_from', env), 'base');
  assert.equal(await getSetting(db, 'support_email', ENV), null);
});

test('APP_SECRET changé : le secret est illisible, une alerte le dit, pas de plantage', async () => {
  const other = { APP_SECRET: 'y'.repeat(48) };
  assert.equal(await getSetting(db, 'chariow_api_key', other), null);
  assert.ok((await store.listOpenAlerts(db)).some((a) => a.kind === 'secret_unreadable'));
});

test('secrets de Pulse : plusieurs, chiffrés, avec l\'éventuel secret de l\'environnement', async () => {
  await addPulseSecret(db, { label: 'Ventes', pulseId: 'pulse_1', secret: 'whsec_one' }, ENV);
  await addPulseSecret(db, { label: 'Licences', pulseId: '', secret: 'whsec_two' }, ENV);
  const rows = await store.listPulseSecretRows(db);
  assert.ok(rows.every((r) => !r.secret_enc.includes('whsec')));
  const secrets = await getPulseSecrets(db, { ...ENV, CHARIOW_PULSE_SECRET: 'whsec_env' });
  assert.deepEqual(secrets.map((s) => s.secret).sort(), ['whsec_env', 'whsec_one', 'whsec_two']);
  assert.equal(secrets.find((s) => s.label === 'Ventes').pulse_id, 'pulse_1');
  assert.equal(secrets.find((s) => s.label === 'Licences').pulse_id, null);
});
