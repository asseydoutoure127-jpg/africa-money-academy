// Connexion PostgreSQL (Neon). Un seul pool par instance de la fonction serveur.
import pg from 'pg';

export function getDb() {
  if (!globalThis.__amaPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL est manquant : ajoutez l'adresse de la base Neon dans les variables d'environnement.");
    globalThis.__amaPool = new pg.Pool({
      connectionString: url,
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__amaPool;
}
