// Garde-fou de sécurité : l'espace administrateur ne doit jamais être atteignable par un élève.
// Ce test lit le code source : si quelqu'un ajoute une page ou une action d'administration sans protection, il échoue.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('chaque page /admin appelle requireAdmin() avant de lire quoi que ce soit', () => {
  const pages = walk('src/app/admin').filter((f) => f.endsWith('page.jsx'));
  assert.ok(pages.length >= 8);
  for (const f of pages) {
    const src = readFileSync(f, 'utf8');
    const body = src.slice(src.indexOf('export default async function'));
    assert.match(body.slice(0, 400), /await requireAdmin\(\)/, `${f} n'est pas protégée`);
  }
});

test('le layout /admin est protégé', () => {
  assert.match(readFileSync('src/app/admin/layout.jsx', 'utf8'), /await requireAdmin\(\)/);
});

test('chaque action exportée de actions/admin.js passe par une vérification admin', () => {
  const src = readFileSync('src/app/actions/admin.js', 'utf8');
  const parts = src.split(/\nexport async function /).slice(1);
  assert.ok(parts.length >= 20);
  for (const part of parts) {
    const name = part.slice(0, part.indexOf('('));
    const body = part.slice(0, 600);
    assert.match(body, /requireAdmin\(\)|await start\(\)/, `l'action ${name} n'est pas protégée`);
  }
  assert.match(src, /async function start\(\)[\s\S]{0,300}requireAdmin\(\)/);
});

test('un rôle admin ne peut pas être obtenu à l\'inscription', () => {
  const auth = readFileSync('src/app/actions/auth.js', 'utf8');
  const signup = auth.slice(auth.indexOf('export async function signup'), auth.indexOf('export async function login'));
  assert.doesNotMatch(signup, /role\s*:\s*'admin'/);
  assert.doesNotMatch(signup, /formData\.get\('role'\)/);
  const setup = readFileSync('src/app/actions/setup.js', 'utf8');
  assert.match(setup, /SETUP_TOKEN/, 'la création du premier admin doit exiger le jeton');
});

test('les actions de l\'élève vérifient la connexion', () => {
  const learn = readFileSync('src/app/actions/learn.js', 'utf8');
  for (const fn of ['markLessonDone', 'submitExercise', 'enrollFree', 'verifyPurchase']) {
    const part = learn.slice(learn.indexOf(`export async function ${fn}`));
    assert.match(part.slice(0, 500), /requireUser\(/, `${fn} sans requireUser`);
  }
});
