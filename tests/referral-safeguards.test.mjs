import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCommissions, isMature, REFERRAL_MIN_PAYOUT, REFERRAL_HOLD_DAYS } from '../src/lib/referral.js';

const now = new Date('2026-12-01T12:00:00Z');
const day = (n) => new Date(now.getTime() - n * 86_400_000).toISOString();
const f = (...achats) => ({ achats: achats.map(([d, prix]) => ({ date: day(d), prix })) });

test('une commission n’est due qu’après le délai', () => {
  assert.equal(isMature(day(REFERRAL_HOLD_DAYS - 1), now), false);
  assert.equal(isMature(day(REFERRAL_HOLD_DAYS), now), true);
});
test('achat récent : en attente, rien à verser', () => {
  const s = summarizeCommissions([f([2, '10 000 FCFA'])], 0, now);
  assert.deepEqual([s.payable, s.pending, s.due, s.canPay], [0, 5000, 0, false]);
});
test('achat ancien : dû, et le minimum est atteint', () => {
  const s = summarizeCommissions([f([12, '10 000 FCFA'])], 0, now);
  assert.deepEqual([s.due, s.canPay], [5000, true]);
});
test('petit montant : sous le minimum', () => {
  const s = summarizeCommissions([f([12, '6 000 FCFA'])], 0, now);
  assert.equal(s.due, 3000);
  assert.equal(s.canPay, 3000 >= REFERRAL_MIN_PAYOUT);
});
test('le déjà versé est retranché (pas de double paiement)', () => {
  const s = summarizeCommissions([f([12, '10 000 FCFA'], [20, '10 000 FCFA'])], 5000, now);
  assert.deepEqual([s.payable, s.paid, s.due], [10000, 5000, 5000]);
});
