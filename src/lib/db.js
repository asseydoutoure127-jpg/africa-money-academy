// Connexion PostgreSQL (Neon).
// - Vercel / Node : un seul pool par instance de la fonction serveur.
// - Cloudflare Workers : une connexion par requête (un Worker ne peut pas réutiliser une connexion d'une requête à l'autre).
import pg from 'pg';

const onWorkers = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

function workersDb(url) {
  const open = async () => {
    const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
    await client.connect();
    return client;
  };
  return {
    async query(text, params) {
      const client = await open();
      try {
        return await client.query(text, params);
      } finally {
        client.end().catch(() => {});
      }
    },
    // Pour les transactions (points.js) : le client se ferme quand on le « relâche ».
    async connect() {
      const client = await open();
      client.release = () => {
        client.end().catch(() => {});
      };
      return client;
    },
  };
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL est manquant : ajoutez l'adresse de la base Neon dans les variables d'environnement.");
  if (onWorkers) return workersDb(url);
  if (!globalThis.__amaPool) {
    globalThis.__amaPool = new pg.Pool({
      connectionString: url,
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalThis.__amaPool;
}
