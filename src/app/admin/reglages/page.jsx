import Flash from '@/components/Flash.jsx';
import TestButton from '@/components/TestButton.jsx';
import CopyButton from '@/components/CopyButton.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getSetting, getSettingSource, getPulseSecrets } from '@/lib/settings.js';
import { maskSecret } from '@/lib/crypto.js';
import { getSiteUrl } from '@/lib/context.js';
import * as A from '@/app/actions/admin.js';

export default async function Settings({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const [apiKey, apiSource, secrets, resend, from, support, siteName] = await Promise.all([
    getSetting(db, 'chariow_api_key'), getSettingSource(db, 'chariow_api_key'), getPulseSecrets(db),
    getSetting(db, 'resend_api_key'), getSetting(db, 'mail_from'), getSetting(db, 'support_email'), getSetting(db, 'site_name'),
  ]);
  const siteUrl = getSiteUrl();
  const webhook = `${siteUrl}/api/webhooks/chariow`;
  const https = siteUrl.startsWith('https://');
  return (
    <>
      <h1>Réglages &gt; Connexions</h1>
      <Flash code={sp.m} />

      <section className="card">
        <h2>1. Clé API Chariow</h2>
        <p>Dans Chariow : Paramètres &gt; Clés API. Autorisations à cocher : <code>products.read</code>, <code>sales.read</code>, <code>customers.pii.read</code>, <code>checkout.write</code>.</p>
        <p>Clé enregistrée : {apiKey ? <code>{maskSecret(apiKey)}</code> : <strong>aucune</strong>} {apiSource && <span className="muted small">(source : {apiSource})</span>}</p>
        <form action={A.saveApiKey}>
          <label htmlFor="api_key">Coller la clé (sk_…)</label>
          <input id="api_key" name="api_key" type="password" autoComplete="off" placeholder="sk_…" />
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Enregistrer la clé</button></p>
        </form>
        <TestButton action={A.testApiKey} label="Tester la clé API" />
        <TestButton action={A.testProducts} label="Vérifier les produits" />
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>2. Pulse (notification de paiement)</h2>
        <p>Dans Chariow : Automatisations &gt; Pulses &gt; créer un Pulse. Collez cette adresse :</p>
        <div className="copybox"><code>{webhook}</code><CopyButton value={webhook} /></div>
        {!https && <p className="flash err" style={{ marginTop: 12 }}>Cette adresse n’est pas en HTTPS : Chariow ne pourra pas envoyer ses notifications. Il faut un domaine en https (variable SITE_URL).</p>}
        <p style={{ marginTop: 12 }}>Événement à cocher : <code>successful.sale</code>. Chariow vous donne ensuite un secret commençant par <code>whsec_</code> : collez-le ici. Vous pouvez en ajouter plusieurs (un par Pulse).</p>
        <ul>
          {secrets.map((s) => (
            <li key={s.id}>{s.label} — <code>{maskSecret(s.secret)}</code>
              {s.id !== 'env' && <form action={A.removePulseSecret} style={{ display: 'inline', marginLeft: 8 }}><input type="hidden" name="id" value={s.id} /><button className="btn ghost small" type="submit">Supprimer</button></form>}
            </li>
          ))}
          {secrets.length === 0 && <li className="muted">Aucun secret enregistré : toutes les notifications seront refusées.</li>}
        </ul>
        <form action={A.savePulseSecret}>
          <label htmlFor="label">Nom (pour vous y retrouver)</label><input id="label" name="label" type="text" placeholder="ex. Pulse principal" />
          <label htmlFor="secret">Secret (whsec_…)</label><input id="secret" name="secret" type="password" autoComplete="off" placeholder="whsec_…" required />
          <label htmlFor="pulse_id">Identifiant du Pulse (facultatif)</label><input id="pulse_id" name="pulse_id" type="text" />
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Ajouter le secret</button></p>
        </form>
        <TestButton action={A.testLastPulse} label="Dernier Pulse reçu" />
        <p className="hint">Pour tester : dans Chariow, envoyez un événement de test depuis votre Pulse, puis cliquez sur ce bouton.</p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h2>3. E-mails et site</h2>
        <p>E-mails envoyés : confirmation d’adresse, mot de passe oublié, achat sans compte. Clé Resend : {resend ? <code>{maskSecret(resend)}</code> : <strong>aucune</strong>}</p>
        <form action={A.saveMailSettings}>
          <label htmlFor="resend_api_key">Clé Resend (laisser vide pour ne pas changer)</label><input id="resend_api_key" name="resend_api_key" type="password" autoComplete="off" placeholder="re_…" />
          <label htmlFor="mail_from">Expéditeur</label><input id="mail_from" name="mail_from" type="text" defaultValue={from || ''} placeholder="Africa Money Academy <contact@votredomaine.com>" />
          <p className="hint">Le domaine de l’expéditeur doit être vérifié dans Resend.</p>
          <label htmlFor="support_email">E-mail de contact affiché sur le site</label><input id="support_email" name="support_email" type="email" defaultValue={support || ''} />
          <label htmlFor="site_name">Nom du site</label><input id="site_name" name="site_name" type="text" defaultValue={siteName || ''} placeholder="Africa Money Academy" />
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Enregistrer</button></p>
        </form>
      </section>
    </>
  );
}
