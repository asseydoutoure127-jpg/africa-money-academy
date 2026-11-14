// E-mails : modèles courts en français (lisibles sur téléphone) et envoi via l'API REST de Resend.
// Un échec d'envoi ne doit JAMAIS bloquer un accès : l'appelant journalise et alerte.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrap(siteName, title, paragraphs, button) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`).join('');
  const cta = button
    ? `<p style="margin:22px 0"><a href="${escapeHtml(button.url)}" style="background:#0f5132;color:#ffffff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${escapeHtml(button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#555">Si le bouton ne marche pas, copiez ce lien dans votre navigateur :<br>${escapeHtml(button.url)}</p>`
    : '';
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<p style="margin:0 0 18px;font-weight:bold;color:#0f5132;font-size:18px">${escapeHtml(siteName)}</p>
<div style="background:#ffffff;border-radius:10px;padding:22px">
<h1 style="margin:0 0 14px;font-size:20px">${escapeHtml(title)}</h1>${body}${cta}</div>
<p style="font-size:12px;color:#777;margin:14px 0 0">Vous recevez ce message car une action a été faite avec votre adresse e-mail sur ${escapeHtml(siteName)}.</p>
</div></body></html>`;
}

/**
 * @param {string} template
 * @param {{ siteName: string, name?: string, link?: string, courseTitle?: string }} d
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderMail(template, d) {
  const hello = d.name ? `Bonjour ${escapeHtml(d.name)},` : 'Bonjour,';
  const helloText = d.name ? `Bonjour ${d.name},` : 'Bonjour,';
  const course = escapeHtml(d.courseTitle || 'votre formation');
  switch (template) {
    case 'verifyEmail':
      return {
        subject: `Confirmez votre adresse e-mail – ${d.siteName}`,
        html: wrap(d.siteName, 'Confirmez votre adresse', [hello, 'Cliquez sur le bouton pour confirmer votre adresse e-mail. Le lien est valable 24 heures.'], { label: 'Confirmer mon adresse', url: d.link }),
        text: `${helloText}\n\nConfirmez votre adresse e-mail (lien valable 24 heures) :\n${d.link}\n`,
      };
    case 'resetPassword':
      return {
        subject: `Réinitialisez votre mot de passe – ${d.siteName}`,
        html: wrap(d.siteName, 'Nouveau mot de passe', [hello, 'Vous avez demandé à changer votre mot de passe. Le lien est valable 1 heure. Si ce n\'est pas vous, ignorez ce message : rien ne sera modifié.'], { label: 'Choisir un nouveau mot de passe', url: d.link }),
        text: `${helloText}\n\nPour choisir un nouveau mot de passe (lien valable 1 heure) :\n${d.link}\n\nSi ce n'est pas vous, ignorez ce message.\n`,
      };
    case 'purchaseConfirmed':
      return {
        subject: `Votre accès est activé : ${d.courseTitle} – ${d.siteName}`,
        html: wrap(d.siteName, 'Achat confirmé', [hello, `Votre paiement est bien reçu. L'accès à <strong>${course}</strong> est activé.`], { label: 'Commencer la formation', url: d.link }),
        text: `${helloText}\n\nVotre paiement est bien reçu. L'accès à ${d.courseTitle || 'votre formation'} est activé :\n${d.link}\n`,
      };
    case 'purchaseNoAccount':
      return {
        subject: `Paiement reçu : créez votre compte – ${d.siteName}`,
        html: wrap(d.siteName, 'Créez votre compte pour accéder à votre formation', [hello, `Votre paiement pour <strong>${course}</strong> est bien reçu. Il reste une étape : créez votre compte avec <strong>cette même adresse e-mail</strong> et confirmez-la. L'accès s'ouvrira automatiquement.`], { label: 'Créer mon compte', url: d.link }),
        text: `${helloText}\n\nVotre paiement pour ${d.courseTitle || 'votre formation'} est bien reçu. Créez votre compte avec cette même adresse e-mail et confirmez-la :\n${d.link}\n`,
      };
    case 'purchasePendingVerification':
      return {
        subject: `Paiement reçu : confirmez votre adresse – ${d.siteName}`,
        html: wrap(d.siteName, 'Confirmez votre adresse pour ouvrir l\'accès', [hello, `Votre paiement pour <strong>${course}</strong> est bien reçu. Confirmez votre adresse e-mail (message envoyé à l'inscription) et l'accès s'ouvrira automatiquement.`], { label: 'Me connecter', url: d.link }),
        text: `${helloText}\n\nVotre paiement pour ${d.courseTitle || 'votre formation'} est bien reçu. Confirmez votre adresse e-mail et l'accès s'ouvrira automatiquement :\n${d.link}\n`,
      };
    default:
      throw new Error(`Modèle d'e-mail inconnu : ${template}`);
  }
}

/** Envoi via Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendViaResend({ apiKey, from, to, subject, html, text, fetchImpl = globalThis.fetch }) {
  if (!apiKey || !from) return { ok: false, reason: 'not_configured' };
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.json())?.message || '';
      } catch {
        // pas de détail
      }
      return { ok: false, reason: 'rejected', status: res.status, detail: String(detail).slice(0, 200) };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
