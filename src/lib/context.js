// Assemble ce dont les traitements ont besoin : base, adresse du site, envoi d'e-mails, client Chariow.
import { cache } from 'react';
import { getDb } from './db.js';
import * as store from './store.js';
import { getSetting } from './settings.js';
import { renderMail, sendViaResend, sendViaSmtp } from './mail.js';
import { createChariowClient } from './chariow/client.js';

export function getSiteUrl(env = process.env) {
  const raw =
    env.SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

// Mis en cache le temps d'une requête : l'en-tête, le pied de page et le titre le demandent chacun.
export const getSiteName = cache(async (db) => (await getSetting(db, 'site_name')) || 'Waypoint');

const MAIL_FAILURES = {
  not_configured: "Aucun service d'e-mails n'est configuré : un e-mail n'a pas pu partir. Renseignez la clé Resend et l'adresse d'expéditeur dans Réglages > Connexions.",
  rejected: "Resend a refusé d'envoyer un e-mail. Vérifiez que le domaine de l'adresse d'expéditeur est vérifié dans Resend.",
  network: "Impossible de joindre le service d'e-mails pour envoyer un e-mail.",
  smtp_rejected: "Gmail a refusé d'envoyer un e-mail. Vérifiez l'adresse et le mot de passe d'application (SMTP_USER / SMTP_PASSWORD).",
};

/** Envoie un e-mail sans jamais lever d'erreur : un échec est journalisé et signalé, jamais bloquant. */
export function makeNotify(db, siteUrl) {
  return async (template, data) => {
    try {
      const siteName = await getSiteName(db);
      const { subject, html, text } = renderMail(template, { siteName, ...data });
      // Gmail (mot de passe d'application) si configuré, sinon Resend.
      const smtpUser = await getSetting(db, 'smtp_user');
      const smtpPass = await getSetting(db, 'smtp_password');
      const useSmtp = Boolean(smtpUser && smtpPass);
      const r = useSmtp
        ? await sendViaSmtp({ user: smtpUser, pass: smtpPass, from: smtpUser, fromName: siteName, to: data.to, subject, html, text })
        : await sendViaResend({
            apiKey: await getSetting(db, 'resend_api_key'),
            from: await getSetting(db, 'mail_from'),
            to: data.to,
            subject,
            html,
            text,
          });
      if (!r.ok) {
        const extra = r.detail ? ` (${r.detail})` : '';
        const key = useSmtp && r.reason === 'rejected' ? 'smtp_rejected' : r.reason;
        await store.raiseAlert(db, { kind: 'mail_failed', message: (MAIL_FAILURES[key] || MAIL_FAILURES.network) + extra });
      }
      return r;
    } catch (e) {
      try {
        await store.raiseAlert(db, { kind: 'mail_failed', message: "Erreur pendant l'envoi d'un e-mail." });
      } catch {
        // on ne bloque jamais l'action de la personne
      }
      return { ok: false, reason: 'error' };
    }
  };
}

export function getCtx() {
  const db = getDb();
  const siteUrl = getSiteUrl();
  return { db, siteUrl, notify: makeNotify(db, siteUrl) };
}

/** Client Chariow avec la clé enregistrée (base d'abord, sinon variable d'environnement), ou null. */
export async function getChariowClient(db) {
  const apiKey = await getSetting(db, 'chariow_api_key');
  return apiKey ? createChariowClient({ apiKey }) : null;
}
