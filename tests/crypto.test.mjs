import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret, hashPassword, hashToken, maskSecret, newToken, verifyPassword } from '../src/lib/crypto.js';

const APP_SECRET = 'a'.repeat(40);

test('mot de passe : haché, vérifié, jamais en clair', async () => {
  const h = await hashPassword('Mon mot de passe 123');
  assert.match(h, /^scrypt\$/);
  assert.ok(!h.includes('Mon mot de passe'));
  assert.equal(await verifyPassword('Mon mot de passe 123', h), true);
  assert.equal(await verifyPassword('mon mot de passe 123', h), false);
  assert.equal(await verifyPassword('', h), false);
});

test('deux hachages du même mot de passe sont différents (sel aléatoire)', async () => {
  assert.notEqual(await hashPassword('abc12345'), await hashPassword('abc12345'));
});

test('empreinte stockée illisible : refus sans erreur', async () => {
  assert.equal(await verifyPassword('x', 'n importe quoi'), false);
  assert.equal(await verifyPassword('x', ''), false);
  assert.equal(await verifyPassword('x', null), false);
});

test('secrets chiffrés : aller-retour, mauvaise clé, données altérées', () => {
  const enc = encryptSecret('sk_live_abcdef123456', APP_SECRET);
  assert.ok(!enc.includes('sk_live'));
  assert.equal(decryptSecret(enc, APP_SECRET), 'sk_live_abcdef123456');
  assert.throws(() => decryptSecret(enc, 'b'.repeat(40)));
  const parts = enc.split(':');
  parts[3] = Buffer.from('altere').toString('base64');
  assert.throws(() => decryptSecret(parts.join(':'), APP_SECRET));
});

test('APP_SECRET trop court : refusé', () => {
  assert.throws(() => encryptSecret('x', 'court'));
  assert.throws(() => encryptSecret('x', ''));
});

test('jetons : uniques, longs, et on ne stocke que leur empreinte', () => {
  const a = newToken();
  const b = newToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 43);
  assert.equal(hashToken(a), hashToken(a));
  assert.notEqual(hashToken(a), a);
  assert.equal(hashToken(a).length, 64);
});

test('masquage : seulement les 4 derniers caractères', () => {
  assert.equal(maskSecret('sk_live_abcdef1234'), '••••1234');
  assert.equal(maskSecret(''), '');
  assert.equal(maskSecret(null), '');
});
