import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, httpsUrlOrNull, normalizePhone, safeInternalPath, slugify, validEmail, validPassword } from '../src/lib/validate.js';

test('e-mail et mot de passe', () => {
  assert.equal(validEmail('aicha@example.com'), true);
  assert.equal(validEmail(' aicha@example.com '), true);
  for (const bad of ['', 'aicha', 'a@b', 'a b@c.com', '@c.com', 'a@@c.com']) assert.equal(validEmail(bad), false, bad);
  assert.equal(validPassword('12345678'), true);
  assert.equal(validPassword('1234567'), false);
  assert.equal(validPassword(undefined), false);
});

test('slug : accents, espaces, symboles', () => {
  assert.equal(slugify('Débuter en ligne : le guide !'), 'debuter-en-ligne-le-guide');
  assert.equal(slugify('   '), 'formation');
  assert.equal(slugify('Épargner & investir'), 'epargner-investir');
});

test('redirection interne : refuse les adresses externes et les astuces', () => {
  assert.equal(safeInternalPath('/espace/formation/x'), '/espace/formation/x');
  for (const bad of ['https://pirate.com', '//pirate.com', '/\\pirate.com', 'javascript:alert(1)', '', null, '/a\r\nSet-Cookie: x=1']) {
    assert.equal(safeInternalPath(bad), '/espace', String(bad));
  }
});

test('URL https uniquement', () => {
  assert.equal(httpsUrlOrNull('https://shop.example/p'), 'https://shop.example/p');
  assert.equal(httpsUrlOrNull('http://shop.example/p'), null);
  assert.equal(httpsUrlOrNull('javascript:alert(1)'), null);
  assert.equal(httpsUrlOrNull('pas une url'), null);
});

test('téléphone : chiffres seulement, indicatif retiré si saisi, pays obligatoire', () => {
  assert.deepEqual(normalizePhone('07 12 34 56 78', 'CI'), { ok: true, number: '0712345678', country_code: 'CI' });
  assert.deepEqual(normalizePhone('+225 07 12 34 56 78', 'CI'), { ok: true, number: '0712345678', country_code: 'CI' });
  assert.deepEqual(normalizePhone('00221 77 123 45 67', 'SN'), { ok: true, number: '771234567', country_code: 'SN' });
  assert.equal(normalizePhone('12', 'CI').ok, false);
  assert.equal(normalizePhone('0712345678', 'XX').ok, false);
  assert.equal(normalizePhone('abcdef', 'CI').ok, false);
});

test('adresse IP du visiteur : première de x-forwarded-for, valeurs étranges refusées', () => {
  assert.equal(clientIp({ 'x-forwarded-for': '41.202.1.9, 76.76.21.21' }), '41.202.1.9');
  assert.equal(clientIp({ 'x-real-ip': '2001:db8::1' }), '2001:db8::1');
  assert.equal(clientIp({ 'x-forwarded-for': '<script>' }), '');
  assert.equal(clientIp({}), '');
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4' })), '1.2.3.4');
});
