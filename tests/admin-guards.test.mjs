// Garde-fous de l'espace administrateur, vérifiés sur le code source (aucune base de données nécessaire) :
// 1) toute action serveur exportée par admin.js / admin-points.js passe par requireAdmin avant tout le reste ;
// 2) toute page et tout layout sous src/app/admin appelle requireAdmin ;
// 3) le blocage d'un compte refuse un administrateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/app/', import.meta.url).pathname;

function actionsOf(file) {
  const src = readFileSync(join(root, 'actions', file), 'utf8');
  const out = [];
  const re = /export async function (\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(src))) out.push({ name: m[1], body: m[2] });
  return { src, out };
}

for (const file of ['admin.js', 'admin-points.js']) {
  test(`${file} : chaque action commence par un contrôle administrateur`, () => {
    const { out } = actionsOf(file);
    assert.ok(out.length > 0, 'aucune action trouvée');
    for (const a of out) {
      const firstLine = a.body.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('//'));
      assert.match(firstLine, /(start\(\)|requireAdmin\(\))/, `${a.name} ne commence pas par un contrôle admin : « ${firstLine} »`);
    }
  });
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test('toutes les pages et layouts admin appellent requireAdmin', () => {
  const files = walk(join(root, 'admin')).filter((f) => /(page|layout)\.jsx$/.test(f));
  assert.ok(files.length >= 10);
  for (const f of files) assert.match(readFileSync(f, 'utf8'), /requireAdmin\(/, `${f} sans requireAdmin`);
});

test('toggleBlock refuse de bloquer un administrateur', () => {
  const { out } = actionsOf('admin.js');
  const t = out.find((a) => a.name === 'toggleBlock');
  assert.match(t.body, /role === 'admin'/);
});
