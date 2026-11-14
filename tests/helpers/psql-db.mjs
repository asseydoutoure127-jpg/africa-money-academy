// Adaptateur de TEST : exécute les requêtes de l'application sur une vraie base PostgreSQL
// locale, via le programme `psql` (le module `pg` n'est pas installable dans cet environnement).
// Interface identique à celle de `pg` : db.query(texte, paramètres) -> { rows }.
import { spawnSync } from 'node:child_process';

const NULL_MARK = '__NULL__';

const PG = {
  host: process.env.TEST_PGHOST || '/var/lib/postgresql/amatest',
  port: process.env.TEST_PGPORT || '54329',
  user: process.env.TEST_PGUSER || 'postgres',
};

function literal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `'${s.replace(/'/g, "''")}'`;
}

function inline(sql, params = []) {
  return sql.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function psqlAdmin(args) {
  const r = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', PG.host, '-p', PG.port, '-U', PG.user, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || 'psql a échoué');
  return r.stdout;
}

export function createTestDatabase() {
  const name = `ama_test_${process.pid}_${Date.now()}`;
  psqlAdmin(['-d', 'postgres', '-c', `create database ${name}`]);
  return name;
}

export function dropTestDatabase(name) {
  psqlAdmin(['-d', 'postgres', '-c', `drop database if exists ${name} with (force)`]);
}

export function psqlDb(dbname) {
  return {
    async query(text, params = []) {
      const sql = inline(text, params);
      const r = spawnSync(
        'psql',
        ['-X', '-q', '--csv', '-P', `null=${NULL_MARK}`, '-v', 'ON_ERROR_STOP=1', '-h', PG.host, '-p', PG.port, '-U', PG.user, '-d', dbname, '-c', sql],
        { encoding: 'utf8' },
      );
      if (r.status !== 0) {
        const err = new Error((r.stderr || 'psql a échoué').trim());
        err.code = /duplicate key/.test(r.stderr) ? '23505' : /violates check constraint/.test(r.stderr) ? '23514' : undefined;
        throw err;
      }
      const table = parseCsv(r.stdout);
      if (table.length === 0) return { rows: [] };
      const [header, ...body] = table;
      return {
        rows: body.map((cells) =>
          Object.fromEntries(header.map((h, i) => [h, cells[i] === NULL_MARK ? null : cells[i]])),
        ),
      };
    },
  };
}
