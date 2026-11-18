// Réglages : la base de données a la priorité sur les variables d'environnement.
// Les secrets (clé API Chariow, clé Resend, secrets de Pulse) sont chiffrés en base.
import * as store from './store.js';
import { decryptSecret, encryptSecret } from './crypto.js';

export const SECRET_KEYS = new Set(['chariow_api_key', 'resend_api_key']);

const ENV_NAMES = {
  chariow_api_key: 'CHARIOW_API_KEY',
  resend_api_key: 'RESEND_API_KEY',
  smtp_user: 'SMTP_USER',
  smtp_password: 'SMTP_PASSWORD',
  mail_from: 'MAIL_FROM',
  site_name: 'SITE_NAME',
  support_email: 'SUPPORT_EMAIL',
};

/** Valeur d'un réglage (déchiffrée si besoin), ou null. Ne lève jamais d'erreur de déchiffrement. */
export async function getSetting(db, key, env = process.env) {
  const row = await store.getSettingRow(db, key);
  if (row) {
    if (!(row.encrypted === true || row.encrypted === 't' || row.encrypted === 'true')) return row.value;
    try {
      return decryptSecret(row.value, env.APP_SECRET);
    } catch {
      await store.raiseAlert(db, {
        kind: 'secret_unreadable',
        message: `Le réglage « ${key} » ne peut pas être lu (APP_SECRET a-t-il changé ?). Enregistrez-le de nouveau dans Réglages > Connexions.`,
      });
      return null;
    }
  }
  const envName = ENV_NAMES[key];
  return envName && env[envName] ? env[envName] : null;
}

export async function setSetting(db, key, value, userId = null, env = process.env) {
  const encrypted = SECRET_KEYS.has(key);
  await store.putSetting(db, {
    key,
    value: encrypted ? encryptSecret(value, env.APP_SECRET) : String(value),
    encrypted,
    userId,
  });
}

/** D'où vient la valeur affichée ? 'base' | 'environnement' | null */
export async function getSettingSource(db, key, env = process.env) {
  if (await store.getSettingRow(db, key)) return 'base';
  const envName = ENV_NAMES[key];
  return envName && env[envName] ? 'environnement' : null;
}

/** Secrets de signature de tous les Pulses : ceux de la base, plus CHARIOW_PULSE_SECRET s'il existe. */
export async function getPulseSecrets(db, env = process.env) {
  const out = [];
  for (const r of await store.listPulseSecretRows(db)) {
    try {
      out.push({ id: r.id, label: r.label, pulse_id: r.pulse_id || null, secret: decryptSecret(r.secret_enc, env.APP_SECRET) });
    } catch {
      await store.raiseAlert(db, {
        kind: 'secret_unreadable',
        message: `Le secret de Pulse « ${r.label} » ne peut pas être lu (APP_SECRET a-t-il changé ?). Supprimez-le et enregistrez-le de nouveau.`,
      });
    }
  }
  if (env.CHARIOW_PULSE_SECRET) {
    out.push({ id: 'env', label: "Variable d'environnement", pulse_id: env.CHARIOW_PULSE_ID || null, secret: env.CHARIOW_PULSE_SECRET });
  }
  return out;
}

export async function addPulseSecret(db, { label, pulseId, secret }, env = process.env) {
  return store.addPulseSecret(db, { label, pulseId, secretEnc: encryptSecret(secret, env.APP_SECRET) });
}
