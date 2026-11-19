import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { grantManual } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' }) : '—');

export default async function Learners({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const { rows, total } = await store.listLearnersOverview(db, { q, limit: 50 });
  const courses = await store.listAllCourses(db);
  return (
    <>
      <h1>Apprenants</h1>
      <Flash code={sp.m} />
      <form method="get" className="admin-search">
        <label htmlFor="q" className="sr-only">Chercher par nom ou e-mail</label>
        <input id="q" name="q" type="search" placeholder="Chercher par nom ou e-mail" defaultValue={q} />
        <button className="btn small" type="submit">Chercher</button>
      </form>
      <details className="card" style={{ marginBottom: 16 }}>
        <summary><strong>Donner un accès à la main</strong></summary>
        <form action={grantManual} style={{ marginTop: 12 }}>
          <label htmlFor="email">E-mail du compte</label><input id="email" name="email" type="email" required />
          <label htmlFor="courseId">Formation</label>
          <select id="courseId" name="courseId" required defaultValue="">
            <option value="" disabled>Choisir…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Donner l’accès</button></p>
        </form>
      </details>
      <p className="muted">{total} compte{total > 1 ? 's' : ''}{q ? ` pour « ${q} »` : ''}. Cliquez sur un nom pour voir sa progression et lire ses exercices.</p>
      {rows.length === 0 && <p>Aucun compte trouvé.</p>}
      <div className="learner-list">
        {rows.map((u) => (
          <article className="card learner" key={u.id}>
            <header>
              <div>
                <h2><Link href={`/admin/apprenants/${u.id}`}>{u.name}</Link></h2>
                <p className="muted">{u.email}</p>
              </div>
              <div className="learner-badges">
                {u.role !== 'learner' && <span className="badge gold">{u.role}</span>}
                {!u.email_verified_at && <span className="badge red">e-mail non confirmé</span>}
                {u.blocked_at && <span className="badge red">bloqué</span>}
              </div>
            </header>
            {u.courses.length === 0 ? (
              <p className="muted">Aucune formation.</p>
            ) : u.courses.map((c) => {
              const pct = c.lessons ? Math.round((c.done / c.lessons) * 100) : 0;
              return (
                <div className="learner-course" key={c.course_id}>
                  <div className="lc-top"><span>{c.title}{c.status !== 'active' && <span className="badge grey" style={{ marginLeft: 8 }}>accès retiré</span>}</span><strong>{pct} %</strong></div>
                  <div className="lesson-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></div>
                  <p className="muted">{c.done} / {c.lessons} leçons · {c.answers} exercice{c.answers > 1 ? 's' : ''} rendu{c.answers > 1 ? 's' : ''}</p>
                </div>
              );
            })}
            <footer className="muted">Inscrit le {fmt(u.created_at)} · dernière activité : {fmt(u.last_activity)}</footer>
          </article>
        ))}
      </div>
    </>
  );
}
