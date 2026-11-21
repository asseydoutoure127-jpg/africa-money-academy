// Parrainage : liens personnels, attribution à l'inscription, alerte pour l'administrateur.
// Les commissions sont gérées à la main : le site dit seulement QUI a amené QUI et QUI a acheté.
import { createHash, randomInt } from 'node:crypto';
import * as store from './store.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I, pour éviter les confusions
export const REF_COOKIE = 'ama_ref';
export const REF_CODE_RE = /^[A-Z0-9]{6,12}$/;

const first = (r) => r.rows[0] ?? null;

// Part du prix de la formation reversée au parrain. Les commissions sont versées à la main par l'équipe.
export const REFERRAL_RATE_PERCENT = 50;

// Délai avant qu'une commission soit due : 7 jours de remboursement + 3 jours de marge (le contrôle des remboursements
// auprès de Chariow se fait une fois par jour).
export const REFERRAL_HOLD_DAYS = 10;
// Montant minimum pour recevoir un versement (une seule vente à 10 000 FCFA suffit : 5 000 FCFA).
export const REFERRAL_MIN_PAYOUT = 5000;

/** Une commission est « mûre » (payable) quand l'achat a plus de REFERRAL_HOLD_DAYS jours. */
export function isMature(grantedAt, now = new Date()) {
  return new Date(grantedAt).getTime() + REFERRAL_HOLD_DAYS * 86_400_000 <= now.getTime();
}

/** Sépare les commissions d'un parrain : payables, en attente (délai), déjà versées, reste à verser. */
export function summarizeCommissions(filleuls, paidTotal = 0, now = new Date()) {
  let payable = 0;
  let pending = 0;
  for (const f of filleuls) {
    for (const a of f.achats) {
      const c = commissionFor(a.prix) || 0;
      if (isMature(a.date, now)) payable += c;
      else pending += c;
    }
  }
  const due = Math.max(0, payable - paidTotal);
  return { payable, pending, paid: paidTotal, due, canPay: due >= REFERRAL_MIN_PAYOUT };
}

/** Lit un prix comme « 10 000 FCFA » et renvoie 10000 ; renvoie null si le prix n'est pas lisible. */
export function priceFromLabel(label) {
  const digits = String(label || '').replace(/[^0-9]/g, '');
  const n = Number(digits);
  return digits && Number.isFinite(n) && n > 0 ? n : null;
}

/** Commission estimée (en FCFA) pour l'achat d'une formation, d'après son prix affiché. */
export function commissionFor(priceLabel, rate = REFERRAL_RATE_PERCENT) {
  const price = priceFromLabel(priceLabel);
  return price === null ? null : Math.round((price * rate) / 100);
}

function randomCode(length = 8) {
  let s = '';
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Donne un code au compte s'il n'en a pas encore, et le renvoie. */
export async function ensureReferralCode(db, userId) {
  const existing = first(await db.query(`select referral_code from users where id = $1`, [userId]));
  if (!existing) return null;
  if (existing.referral_code) return existing.referral_code;
  for (let i = 0; i < 8; i++) {
    try {
      const r = await db.query(
        `update users set referral_code = $2 where id = $1 and referral_code is null returning referral_code`,
        [userId, randomCode()],
      );
      if (r.rows[0]) return r.rows[0].referral_code;
      // Un autre appel a déjà posé un code entre-temps.
      return first(await db.query(`select referral_code from users where id = $1`, [userId]))?.referral_code ?? null;
    } catch (e) {
      if (e?.code !== '23505') throw e; // code déjà pris par un autre : on réessaie
    }
  }
  throw new Error('Impossible de générer un code de parrainage.');
}

export async function findReferrerByCode(db, code) {
  const c = String(code || '').toUpperCase();
  if (!REF_CODE_RE.test(c)) return null;
  return first(await db.query(`select id, name, email, blocked_at from users where referral_code = $1`, [c]));
}

/**
 * Enregistre qui a amené le nouveau compte. Ne fait rien si le code est inconnu, si le parrain est le
 * compte lui-même (même adresse) ou si un parrain est déjà enregistré. Prévient l'administrateur.
 * Renvoie le parrain ou null.
 */
export async function registerReferral(db, newUser, code) {
  const referrer = await findReferrerByCode(db, code);
  if (!referrer || referrer.blocked_at) return null;
  if (referrer.id === newUser.id || referrer.email.toLowerCase() === newUser.email.toLowerCase()) return null;
  const r = await db.query(
    `update users set referred_by = $2, referred_at = now() where id = $1 and referred_by is null returning id`,
    [newUser.id, referrer.id],
  );
  if (!r.rows[0]) return null;
  await store.raiseAlert(db, {
    kind: 'referral',
    message: `Nouveau filleul : ${newUser.name} (${newUser.email}) s'est inscrit grâce au lien de ${referrer.name} (${referrer.email}).`,
  });
  return referrer;
}

export async function countReferred(db, userId) {
  return Number(first(await db.query(`select count(*)::int as n from users where referred_by = $1`, [userId])).n);
}

/** Pour l'administrateur : chaque parrain avec le nombre de filleuls et de filleuls qui ont acheté. */
export async function listReferrers(db) {
  return (
    await db.query(
      `select p.id, p.name, p.email, p.referral_code,
              count(f.id)::int as filleuls,
              count(distinct f.id) filter (where e.id is not null)::int as filleuls_acheteurs
       from users p
       join users f on f.referred_by = p.id
       left join enrollments e on e.user_id = f.id and e.status = 'active' and e.source in ('pulse', 'reconciliation')
       group by p.id
       order by filleuls_acheteurs desc, filleuls desc, p.name`,
    )
  ).rows;
}

/** Les filleuls d'un parrain, avec les formations payées (pour calculer la commission à la main). */
export async function listReferredWithPurchases(db, referrerId) {
  return (
    await db.query(
      `select f.id, f.name, f.email, f.referred_at, f.email_verified_at,
              (f.signup_fp is not null and f.signup_fp = p.signup_fp) as meme_empreinte,
              coalesce(json_agg(json_build_object('titre', c.title, 'date', e.granted_at, 'prix', c.price_label) order by e.granted_at)
                       filter (where e.id is not null), '[]'::json) as achats
       from users f
       join users p on p.id = f.referred_by
       left join enrollments e on e.user_id = f.id and e.status = 'active' and e.source in ('pulse', 'reconciliation')
       left join courses c on c.id = e.course_id
       where f.referred_by = $1
       group by f.id, p.signup_fp
       order by f.referred_at desc`,
      [referrerId],
    )
  ).rows;
}

/** Total déjà versé à un parrain (registre tenu par l'administrateur). */
export async function paidTotal(db, referrerId) {
  return Number(first(await db.query(`select coalesce(sum(amount), 0)::int as n from referral_payouts where referrer_id = $1`, [referrerId])).n);
}

export async function recordPayout(db, { referrerId, amount, note, adminId }) {
  await db.query(`insert into referral_payouts (referrer_id, amount, note, paid_by) values ($1, $2, $3, $4)`, [referrerId, amount, note, adminId]);
}

/** Empreinte d'inscription (adresse réseau + navigateur), jamais lisible : sert seulement à signaler des comptes qui se ressemblent. */
export function signupFingerprint(ip, userAgent) {
  return createHash('sha256').update(`${ip || ''}|${userAgent || ''}|ama-fp`).digest('hex').slice(0, 32);
}
