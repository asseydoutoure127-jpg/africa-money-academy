import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeProgress, findUnlockedLesson, flattenLessons } from '../src/lib/progress.js';

const mods = [
  { id: 'm1', lessons: [{ id: 'l1' }, { id: 'l2' }] },
  { id: 'm2', lessons: [{ id: 'l3' }] },
  { id: 'm3', lessons: [{ id: 'l4' }, { id: 'l5' }] },
];

test('début : seul le premier module est ouvert, « Reprendre » pointe sur la première leçon', () => {
  const p = computeProgress(mods, new Set());
  assert.deepEqual(p.modules.map((m) => m.unlocked), [true, false, false]);
  assert.equal(p.percent, 0);
  assert.deepEqual(p.nextLesson, { moduleId: 'm1', lessonId: 'l1' });
});

test('module terminé : le suivant s\'ouvre, pourcentages par module et global', () => {
  const p = computeProgress(mods, new Set(['l1', 'l2']));
  assert.deepEqual(p.modules.map((m) => m.unlocked), [true, true, false]);
  assert.deepEqual(p.modules.map((m) => m.percent), [100, 0, 0]);
  assert.equal(p.percent, 40);
  assert.deepEqual(p.nextLesson, { moduleId: 'm2', lessonId: 'l3' });
});

test('sauter une étape est impossible : terminer une leçon d\'un module verrouillé ne débloque rien', () => {
  const p = computeProgress(mods, new Set(['l1', 'l4', 'l5']));
  assert.deepEqual(p.modules.map((m) => m.unlocked), [true, false, false]);
  assert.equal(p.modules[2].finished, true, 'même fini, un module verrouillé ne débloque pas la suite');
  assert.deepEqual(p.nextLesson, { moduleId: 'm1', lessonId: 'l2' });
});

test('formation terminée', () => {
  const p = computeProgress(mods, new Set(['l1', 'l2', 'l3', 'l4', 'l5']));
  assert.equal(p.percent, 100);
  assert.equal(p.complete, true);
  assert.equal(p.nextLesson, null);
});

test('module vide : ne bloque pas la suite', () => {
  const p = computeProgress([{ id: 'a', lessons: [] }, { id: 'b', lessons: [{ id: 'x' }] }], new Set());
  assert.deepEqual(p.modules.map((m) => m.unlocked), [true, true]);
  assert.equal(p.complete, false);
});

test('formation sans leçon : 0 %, jamais « terminée »', () => {
  const p = computeProgress([], new Set());
  assert.equal(p.percent, 0);
  assert.equal(p.complete, false);
});

test('ouverture d\'une leçon : autorisée, verrouillée ou inconnue', () => {
  const p = computeProgress(mods, new Set());
  assert.equal(findUnlockedLesson(p, 'l1').lesson.id, 'l1');
  assert.equal(findUnlockedLesson(p, 'l3').locked, true);
  assert.equal(findUnlockedLesson(p, 'inconnue'), null);
  assert.deepEqual(flattenLessons(p).map((l) => l.id), ['l1', 'l2', 'l3', 'l4', 'l5']);
});

test('leçon par leçon : la 2e leçon reste verrouillée tant que la 1re n\'est pas terminée', () => {
  const p = computeProgress(mods, new Set());
  const flat = flattenLessons(p);
  assert.deepEqual(flat.map((l) => l.unlocked), [true, false, false, false, false]);
  assert.equal(findUnlockedLesson(p, 'l2').locked, true);
  const p2 = computeProgress(mods, new Set(['l1']));
  assert.deepEqual(flattenLessons(p2).map((l) => l.unlocked), [true, true, false, false, false]);
  assert.equal(findUnlockedLesson(p2, 'l2').lesson.id, 'l2');
});

test('sauter une leçon est impossible : terminer l3 sans l1/l2 ne l\'ouvre pas', () => {
  const p = computeProgress(mods, new Set(['l3']));
  assert.equal(findUnlockedLesson(p, 'l3').locked, true);
  assert.deepEqual(p.nextLesson, { moduleId: 'm1', lessonId: 'l1' });
});
