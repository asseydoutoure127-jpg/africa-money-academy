import test from 'node:test';
import assert from 'node:assert/strict';
import { BAREME, STREAK_BONUS, periodOf, dayOf, validatedPoints, readingPoints, streakFromDays, displayName } from '../src/lib/points.js';

test('mois et jour en UTC', () => {
  assert.equal(periodOf(new Date('2026-12-31T23:59:00Z')), '2026-12');
  assert.equal(periodOf(new Date('2027-01-01T00:00:00Z')), '2027-01');
  assert.equal(dayOf(new Date('2026-12-05T10:00:00Z')), '2026-12-05');
});

test('points d’un exercice validé : 30 + 5 par point de note', () => {
  assert.equal(validatedPoints(8), 70);
  assert.equal(validatedPoints(10), 80);
  assert.equal(validatedPoints(0), 30);
  assert.equal(validatedPoints(99), 80);
  assert.equal(validatedPoints(-3), 30);
  assert.equal(validatedPoints(undefined), 30);
});

test('temps de lecture : 1 point / 2 min, plafonné à 20 par jour', () => {
  assert.equal(readingPoints(60), 0);
  assert.equal(readingPoints(120), 1);
  assert.equal(readingPoints(600), 5);
  assert.equal(readingPoints(2400), 20);
  assert.equal(readingPoints(99999), BAREME.readingDailyCap);
});

test('série de jours de suite', () => {
  assert.equal(streakFromDays([], '2026-12-05'), 0);
  assert.equal(streakFromDays(['2026-12-05'], '2026-12-05'), 1);
  assert.equal(streakFromDays(['2026-12-05', '2026-12-04', '2026-12-03'], '2026-12-05'), 3);
  assert.equal(streakFromDays(['2026-12-05', '2026-12-03'], '2026-12-05'), 1);
  assert.equal(streakFromDays(['2026-12-04', '2026-12-03'], '2026-12-05'), 0);
  assert.equal(streakFromDays(['2026-12-01', '2026-11-30', '2026-11-29'], '2026-12-01'), 3);
  assert.deepEqual(Object.keys(STREAK_BONUS), ['3', '7', '14', '30']);
});

test('nom affiché : prénom + initiale', () => {
  assert.equal(displayName('ramata kane'), 'Ramata K.');
  assert.equal(displayName('Abdoulaye'), 'Abdoulaye');
  assert.equal(displayName('Jean Pierre Dupont'), 'Jean D.');
  assert.equal(displayName('   '), 'Élève');
});
