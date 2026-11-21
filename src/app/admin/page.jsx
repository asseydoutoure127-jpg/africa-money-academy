import Link from 'next/link';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getSetting } from '@/lib/settings.js';
import { getPulseSecrets } from '@/lib/settings.js';
import { getSiteUrl } from '@/lib/context.js';
import { resolveAlertAction } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

export default async function Dashboard() {
  await requireAdmin();
  const db = getDb();
  const [funnel, stats, alerts, recent, apiKey, secrets, testPulse, courses, resend, smtpUser, activity, signups, lastAnswers] = await Promise.all([
    store.funnelStats(db),
    store.dashboardStats(db),
    store.listOpenAlerts(db),
    store.listRecentEnrollments(db),
    getSetting(db, 'chariow_api_key'),
    getPulseSecrets(db),
    getSetting(db, 'last_test_pulse_at'),
    store.listAllCourses(db),
    getSetting(db, 'resend_api_key'),
    getSetting(db, 'smtp_user'),
    store.activitySummary(db),
    store.signupsByDay(db, 14),
    store.listExerciseAnswers(db, { limit: 4 }),
  ]);
  const maxSignups = Math.max(1, ...signups.map((d) => d.n));
  const siteUrl = getSiteUrl();
  const steps = [
    { ok: Boolean(apiKey), text: 'Clé API Chariow enregistrée', href: '/admin/reglages' },
    { ok: secrets.length > 0, text: 'Secret du Pulse (whsec_…) enregistré', href: '/admin/reglages' },
    { ok: Boolean(testPulse), text: 'Pulse de test reçu depuis Chariow', href: '/admin/reglages' },
    { ok: siteUrl.startsWith('https://'), text: 'Adresse du site en HTTPS (obligatoire pour Chariow)', href: '/admin/reglages' },
    { ok: Boolean(resend || smtpUser), text: 'E-mails configurés (Gmail ou Resend)', href: '/admin/reglages' },
    { ok: courses.length > 0, text: 'Une formation créée', href: '/admin/formations' },
    { ok: stats.published_courses > 0, text: 'Une formation publiée', href: '/admin/formations' },
  ];
  return (
    <>
      <h1>Tableau de bord</h1>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Où s’arrêtent les élèves</h2>
        <table>
          <thead><tr><th>Étape</th><th>Personnes</th><th>Part des inscrits</th></tr></thead>
          <tbody>
            {[
              ['Inscrits', funnel.inscrits],
              ['E-mail confirmé', funnel.confirmes],
              ['Au moins une leçon terminée', funnel.une_lecon],
              ['Au moins un exercice rendu', funnel.un_exercice],
              ['Au moins un achat payé', funnel.acheteurs],
            ].map(([label, n]) => (
              <tr key={label}><td>{label}</td><td><strong>{n}</strong></td><td>{funnel.inscrits ? `${Math.round((n / funnel.inscrits) * 100)} %` : '—'}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Chiffres calculés à partir des comptes inscrits. Les visites de personnes sans compte ne sont pas comptées.</p>
      </section>
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
        <h2>Les 7 derniers jours</h2>
        <div className="grid cols-3">
          <div><p className="big-n">{activity.signups_7d}</p><p className="muted">nouvelles inscriptions</p></div>
          <div><p className="big-n">{activity.active_7d}</p><p className="muted">élèves actifs (leçon ou exercice)</p></div>
          <div><p className="big-n">{activity.lessons_7d}</p><p className="muted">leçon{activity.lessons_7d > 1 ? 's' : ''} terminée{activity.lessons_7d > 1 ? 's' : ''}, {activity.answers_7d} exercice{activity.answers_7d > 1 ? 's' : ''} rendu{activity.answers_7d > 1 ? 's' : ''}</p></div>
        </div>
        <h3 style={{ marginTop: 18 }}>Inscriptions par jour (14 jours)</h3>
        <div className="spark" role="img" aria-label={`Inscriptions par jour : ${signups.map((d) => d.n).join(', ')}`}>
          {signups.map((d) => (
            <div key={d.day} className="spark-col" title={`${d.day} : ${d.n}`}>
              <span className="spark-n">{d.n || ''}</span>
              <i style={{ height: `${Math.max(4, (d.n / maxSignups) * 70)}px` }} />
              <small>{d.day.slice(8)}</small>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>Les visites de personnes sans compte ne sont pas comptées.</p>
      </section>
      <section style={{ marginTop: 20 }}>
        <h2>Derniers exercices rendus</h2>
        {lastAnswers.rows.length === 0 ? <p className="muted">Aucun pour l’instant.</p> : lastAnswers.rows.map((r) => (
          <article className="card answer-card" key={`${r.user_id}-${r.lesson_id}`}>
            <header><strong><Link href={`/admin/apprenants/${r.user_id}`}>{r.name}</Link></strong><span className="muted">{r.lesson_title}</span></header>
            <p className="answer-text">{r.answer.length > 220 ? `${r.answer.slice(0, 220)}…` : r.answer}</p>
          </article>
        ))}
        <p><Link href="/admin/exercices">Voir tous les exercices</Link></p>
      </section>
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
