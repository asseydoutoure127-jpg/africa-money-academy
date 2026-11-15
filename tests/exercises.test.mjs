// Exercices sur une vraie base : réponse enregistrée/modifiable, par élève, et déblocage leçon par leçon.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createTestDatabase, dropTestDatabase, psqlDb } from './helpers/psql-db.mjs';
import { runMigrations } from '../src/lib/migrate.js';
import * as store from '../src/lib/store.js';
import { computeProgress, findUnlockedLesson } from '../src/lib/progress.js';

let name, db, user, other, course, lessons;
before(async () => {
  name = createTestDatabase();
  db = psqlDb(name);
  const dir = new URL('../db/migrations/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => ({ name: f, sql: readFileSync(new URL(f, dir), 'utf8') }));
  await runMigrations(db, files);
  user = await store.createUser(db, { email: 'e@x.test', name: 'Eleve', passwordHash: 'x', verified: true });
  other = await store.createUser(db, { email: 'f@x.test', name: 'Autre', passwordHash: 'x', verified: true });
  const c = (await db.query(`insert into courses (slug, title) values ('c', 'C') returning id`)).rows[0];
  course = c.id;
  const m = (await db.query(`insert into modules (course_id, title, position) values ($1, 'M', 0) returning id`, [course])).rows[0];
  lessons = [];
  for (let i = 0; i < 3; i++) {
    const l = (await db.query(`insert into lessons (module_id, title, position, exercise) values ($1, $2, $3, $4) returning id`, [m.id, `L${i}`, i, i === 2 ? '' : 'Faites ceci'])).rows[0];
    lessons.push(l.id);
  }
});
after(() => dropTestDatabase(name));

test('la colonne exercise existe et la consigne est lue avec la leçon', async () => {
  assert.equal((await store.getLesson(db, lessons[0])).exercise, 'Faites ceci');
  assert.equal((await store.getLesson(db, lessons[2])).exercise, '');
});

test('réponse enregistrée, puis modifiée sans doublon, propre à chaque élève', async () => {
  await store.saveExerciseAnswer(db, user.id, lessons[0], 'Ma première réponse');
  await store.saveExerciseAnswer(db, user.id, lessons[0], 'Ma réponse corrigée');
  await store.saveExerciseAnswer(db, other.id, lessons[0], 'Réponse de l\'autre');
  assert.equal((await store.getExerciseAnswer(db, user.id, lessons[0])).answer, 'Ma réponse corrigée');
  assert.equal((await store.getExerciseAnswer(db, other.id, lessons[0])).answer, 'Réponse de l\'autre');
  assert.equal(await store.getExerciseAnswer(db, user.id, lessons[1]), null);
  const n = (await db.query(`select count(*)::int n from lesson_exercises where user_id = $1`, [user.id])).rows[0].n;
  assert.equal(Number(n), 1);
});

test('la leçon suivante ne s\'ouvre qu\'après la leçon précédente terminée', async () => {
  const mods = await store.listModulesWithLessons(db, course);
  let p = computeProgress(mods, await store.listCompletedLessonIds(db, other.id, course));
  assert.equal(findUnlockedLesson(p, lessons[1]).locked, true);
  await store.markLessonDone(db, other.id, lessons[0]);
  p = computeProgress(mods, await store.listCompletedLessonIds(db, other.id, course));
  assert.equal(findUnlockedLesson(p, lessons[1]).locked, undefined);
  assert.equal(findUnlockedLesson(p, lessons[2]).locked, true);
});
