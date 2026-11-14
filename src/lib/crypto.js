// Outils de sécurité basés uniquement sur le module `node:crypto` (aucune dépendance).
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 32, maxmem: 128 * 1024 * 1024 };

/** Hache un mot de passe : `scrypt$N$r$p$sel$empreinte` (tout en base64). */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: SCRYPT.maxmem,
  });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Vérifie un mot de passe en temps constant. Ne lève jamais d'erreur. */
export async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scrypt(password, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Jeton aléatoire (à envoyer à l'utilisateur). On ne stocke que son empreinte. */
export function newToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function settingsKey(appSecret) {
  if (!appSecret || String(appSecret).length < 32) {
    throw new Error('APP_SECRET doit contenir au moins 32 caractères.');
  }
  return Buffer.from(hkdfSync('sha256', String(appSecret), 'ama-salt-v1', 'ama-settings-v1', 32));
}

/** Chiffre un secret (AES-256-GCM). Format : `v1:iv:tag:contenu` en base64. */
export function encryptSecret(plain, appSecret) {
  const key = settingsKey(appSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

/** Déchiffre un secret. Lève une erreur si la clé est mauvaise ou si les données sont altérées. */
export function decryptSecret(payload, appSecret) {
  const [version, ivB64, tagB64, dataB64] = String(payload).split(':');
  if (version !== 'v1') throw new Error('Format de secret inconnu.');
  const key = settingsKey(appSecret);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Affiche seulement la fin d'un secret : `••••abcd`. */
export function maskSecret(value) {
  const s = String(value || '');
  if (!s) return '';
  return '••••' + s.slice(-4);
}
