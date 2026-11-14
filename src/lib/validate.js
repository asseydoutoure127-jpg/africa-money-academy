// Validations partagées (côté serveur : ce sont les seules qui comptent).
import { COUNTRIES } from './countries.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanText(value, max = 200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function validEmail(value) {
  const v = String(value ?? '').trim();
  return v.length <= 255 && EMAIL_RE.test(v);
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 200;
}

export function slugify(text) {
  const s = String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'formation';
}

/** Redirection interne uniquement (évite qu'un lien de connexion renvoie vers un site pirate). */
export function safeInternalPath(value, fallback = '/espace') {
  const v = String(value ?? '');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\r\n]/.test(v)) return fallback;
  return v;
}

/** URL https uniquement. */
export function httpsUrlOrNull(value) {
  try {
    const u = new URL(String(value ?? '').trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Téléphone pour l'API Chariow : `number` = chiffres seulement, `country_code` = ISO alpha-2.
 * Si la personne tape son numéro avec l'indicatif (+225..., 00225...), on l'enlève : on envoie le numéro national.
 * ATTENTION : la doc ne précise pas si Chariow attend le numéro national ou international ; à confirmer
 * lors du premier achat de test (README, étape 7).
 */
export function normalizePhone(rawNumber, countryCode) {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return { ok: false, error: 'country' };
  let digits = String(rawNumber ?? '').replace(/\D/g, '');
  const typedWithPlus = /^\s*\+/.test(String(rawNumber ?? '')) || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (typedWithPlus && digits.startsWith(country.dial)) digits = digits.slice(country.dial.length);
  if (digits.length < 6 || digits.length > 15) return { ok: false, error: 'number' };
  return { ok: true, number: digits, country_code: country.code };
}

export function clientIp(headers) {
  const get = (n) => (typeof headers.get === 'function' ? headers.get(n) : headers[n]);
  const forwarded = get('x-forwarded-for');
  const ip = (forwarded ? String(forwarded).split(',')[0] : get('x-real-ip')) || '';
  const t = ip.trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(t) ? t : '';
}
