// Applique les fichiers db/migrations/*.sql dans l'ordre, une seule fois chacun.
// `db` : objet avec query(texte, paramètres). Chaque fichier est envoyé en une seule requête
// (donc dans une seule transaction implicite : tout ou rien).
export async function runMigrations(db, files) {
  await db.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await db.query(`select name from schema_migrations`)).rows.map((r) => r.name));
  const applied = [];
  for (const { name, sql } of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(name)) continue;
    await db.query(`${sql}\n;\ninsert into schema_migrations (name) values ('${name.replace(/'/g, "''")}');`);
    applied.push(name);
  }
  return applied;
}
