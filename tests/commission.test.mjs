import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceFromLabel, commissionFor, REFERRAL_RATE_PERCENT } from '../src/lib/referral.js';

test('la commission de parrainage est de 50 % du prix affiché', () => {
  assert.equal(REFERRAL_RATE_PERCENT, 50);
  assert.equal(priceFromLabel('10 000 FCFA'), 10000);
  assert.equal(commissionFor('10 000 FCFA'), 5000);
  assert.equal(commissionFor('3 500 FCFA'), 1750);
  assert.equal(commissionFor('7 000 FCFA'), 3500);
});

test('un prix illisible ou gratuit ne donne aucune commission inventée', () => {
  assert.equal(commissionFor(''), null);
  assert.equal(commissionFor(null), null);
  assert.equal(commissionFor('Gratuit'), null);
});
