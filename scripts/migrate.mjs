// Usage : `npm run migrate` (aussi lancé automatiquement à chaque déploiement Vercel).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations } from '../src/lib/migrate.js';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL est manquant. Ajoutez-le dans les variables d\'environnement.');
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const applied = await runMigrations(pool, files);
  console.log(applied.length ? `Migrations appliquées : ${applied.join(', ')}` : 'Base déjà à jour.');
} catch (e) {
  console.error('Échec de la migration :', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
