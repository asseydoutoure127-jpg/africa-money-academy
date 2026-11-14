import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { computeSignature, findValidSecret, verifySignature } from '../src/lib/chariow/signature.js';

const SECRET = 'whsec_test_secret_123';

// Corps tel que Chariow l'envoie : JSON compact, `/` échappés (\/), accents en \uXXXX.
const RAW = Buffer.from(
  '{"event":"successful.sale","sale":{"id":"sal_1","status":"completed"},"product":{"id":"prd_1","url":"https:\\/\\/shop.example\\/p"},"customer":{"email":"a\\u00efcha@example.com"}}',
  'utf8',
);
const sign = (body, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

test('signature valide sur le corps brut', () => {
  assert.equal(verifySignature(RAW, sign(RAW), SECRET), true);
  assert.equal(computeSignature(RAW, SECRET), sign(RAW));
});

test('corps modifié, même d\'un octet : refusé', () => {
  const tampered = Buffer.from(RAW.toString('utf8').replace('sal_1', 'sal_2'));
  assert.equal(verifySignature(tampered, sign(RAW), SECRET), false);
});

test('mauvais secret : refusé', () => {
  assert.equal(verifySignature(RAW, sign(RAW, 'whsec_autre'), SECRET), false);
});

test('en-tête absent, vide, sans préfixe sha256= ou de mauvaise longueur : refusé', () => {
  assert.equal(verifySignature(RAW, undefined, SECRET), false);
  assert.equal(verifySignature(RAW, null, SECRET), false);
  assert.equal(verifySignature(RAW, '', SECRET), false);
  assert.equal(verifySignature(RAW, sign(RAW).replace('sha256=', ''), SECRET), false);
  assert.equal(verifySignature(RAW, 'md5=' + sign(RAW).slice(7), SECRET), false);
  assert.equal(verifySignature(RAW, sign(RAW).slice(0, -2), SECRET), false);
  assert.equal(verifySignature(RAW, sign(RAW) + 'ab', SECRET), false);
});

test('secret vide : refusé', () => {
  assert.equal(verifySignature(RAW, sign(RAW, ''), ''), false);
});

test('re-sérialiser le JSON casse la signature (c\'est pourquoi on garde le corps brut)', () => {
  const reserialized = Buffer.from(JSON.stringify(JSON.parse(RAW.toString('utf8'))));
  assert.notEqual(reserialized.toString(), RAW.toString());
  assert.equal(verifySignature(reserialized, sign(RAW), SECRET), false);
  assert.equal(verifySignature(RAW, sign(RAW), SECRET), true);
});

test('plusieurs secrets : on trouve le bon, celui du x-pulse-id d\'abord', () => {
  const secrets = [
    { id: 'a', label: 'Pulse A', pulse_id: 'pulse_a', secret: 'whsec_a' },
    { id: 'b', label: 'Pulse B', pulse_id: 'pulse_b', secret: 'whsec_b' },
  ];
  const body = RAW;
  assert.equal(findValidSecret(body, sign(body, 'whsec_b'), secrets, 'pulse_b')?.id, 'b');
  assert.equal(findValidSecret(body, sign(body, 'whsec_a'), secrets, 'pulse_b')?.id, 'a'); // x-pulse-id trompeur : on essaie quand même les autres
  assert.equal(findValidSecret(body, sign(body, 'whsec_x'), secrets, 'pulse_b'), null);
  assert.equal(findValidSecret(body, sign(body, 'whsec_a'), [], 'pulse_a'), null);
});
