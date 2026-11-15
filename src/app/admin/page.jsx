import Link from 'next/link';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getSetting } from '@/lib/settings.js';
import { getPulseSecrets } from '@/lib/settings.js';
import { getSiteUrl } from '@/lib/context.js';
import { resolveAlertAction } from '@/app/actions/admin.js';

export default async function Dashboard() {
  const db = getDb();
  const [stats, alerts, recent, apiKey, secrets, testPulse, courses, resend] = await Promise.all([
    store.dashboardStats(db),
    store.listOpenAlerts(db),
    store.listRecentEnrollments(db),
    getSetting(db, 'chariow_api_key'),
    getPulseSecrets(db),
    getSetting(db, 'last_test_pulse_at'),
    store.listAllCourses(db),
    getSetting(db, 'resend_api_key'),
  ]);
  const siteUrl = getSiteUrl();
  const steps = [
    { ok: Boolean(apiKey), text: 'Clé API Chariow enregistrée', href: '/admin/reglages' },
    { ok: secrets.length > 0, text: 'Secret du Pulse (whsec_…) enregistré', href: '/admin/reglages' },
    { ok: Boolean(testPulse), text: 'Pulse de test reçu depuis Chariow', href: '/admin/reglages' },
    { ok: siteUrl.startsWith('https://'), text: 'Adresse du site en HTTPS (obligatoire pour Chariow)', href: '/admin/reglages' },
    { ok: Boolean(resend), text: 'E-mails (Resend) configurés', href: '/admin/reglages' },
    { ok: courses.length > 0, text: 'Une formation créée', href: '/admin/formations' },
    { ok: stats.published_courses > 0, text: 'Une formation publiée', href: '/admin/formations' },
  ];
  return (
    <>
      <h1>Tableau de bord</h1>
      {alerts.length > 0 && (
        <section>
          <h2>À traiter et nouveautés</h2>
          {alerts.map((a) => (
            <div key={a.id} className={a.kind === 'referral' ? 'flash ok' : 'flash err'}>
              <p style={{ margin: 0 }}>{a.message}</p>
              <form action={resolveAlertAction} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={String(a.id)} />
                <input type="hidden" name="back" value="/admin" />
                <button className="btn ghost small" type="submit">Marquer comme traité</button>
              </form>
            </div>
          ))}
        </section>
      )}
      <div className="grid cols-3">
        <div className="card"><h3>Apprenants</h3><p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.learners}</p></div>
        <div className="card"><h3>Accès actifs</h3><p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.active_enrollments}</p></div>
        <div className="card"><h3>Achats en attente de compte</h3><p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.pending_purchases}</p></div>
      </div>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Mise en route</h2>
        <ul className="checklist">
          {steps.map((s) => (
            <li key={s.text} className={s.ok ? 'ok' : 'ko'}>
              <span className="dot" aria-hidden="true" />
              <span>{s.text} — <Link href={s.href}>{s.ok ? 'voir' : 'faire'}</Link></span>
            </li>
          ))}
        </ul>
      </section>
      <section style={{ marginTop: 20 }}>
        <h2>Derniers accès donnés</h2>
        {recent.length === 0 ? <p className="muted">Aucun pour l’instant.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Date</th><th>Apprenant</th><th>Formation</th><th>Origine</th></tr></thead><tbody>
            {recent.map((r, i) => (<tr key={i}><td>{new Date(r.granted_at).toLocaleString('fr-FR')}</td><td>{r.name} ({r.email})</td><td>{r.title}</td><td>{r.source}</td></tr>))}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
