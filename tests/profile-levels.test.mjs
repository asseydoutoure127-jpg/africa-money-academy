import test from 'node:test';
import assert from 'node:assert/strict';
import { levelFor, buildAchievements, bestStreak } from '../src/lib/profile.js';

test('niveau et progression vers le suivant', () => {
  assert.equal(levelFor(0).name, 'Débutant');
  assert.equal(levelFor(149).name, 'Débutant');
  assert.equal(levelFor(150).name, 'Apprenti');
  const l = levelFor(325);
  assert.equal(l.name, 'Apprenti');
  assert.equal(l.next.name, 'Pratiquant');
  assert.equal(l.toNext, 175);
  assert.equal(l.pct, 50);
  assert.equal(levelFor(99999).next, null);
});

test('réussites : débloquées seulement si la condition est vraie, progression plafonnée', () => {
  const base = { lessons: 0, courses: 0, exercises: 0, validated: 0, bestGrade: 0, bestStreak: 0, daysActive: 0, readingMinutes: 0, referred: 0, orders: 0 };
  assert.ok(buildAchievements(base).every((a) => !a.done));
  const some = buildAchievements({ ...base, lessons: 7, bestGrade: 9, bestStreak: 3 });
  const by = Object.fromEntries(some.map((a) => [a.key, a]));
  assert.ok(by.l1.done && by.l5.done && !by.l10.done);
  assert.equal(by.l10.current, 7);
  assert.ok(by.n8.done && !by.n10.done);
  assert.ok(by.s3.done && !by.s7.done);
  assert.equal(by.l1.current, 1);
});

test('meilleure série', () => {
  assert.equal(bestStreak(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10']), 3);
  assert.equal(bestStreak([]), 0);
});
