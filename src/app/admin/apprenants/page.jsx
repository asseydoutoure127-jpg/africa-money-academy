import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import ConfirmButton from '@/components/ConfirmButton.jsx';
import { grantManual } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' }) : '—');

export default async function Learners({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const PAGE = 20;
  const page = Math.max(1, Math.min(500, parseInt(sp.p, 10) || 1));
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const filter = ['unconfirmed', 'nocourse', 'active'].includes(sp.s) ? sp.s : '';
  const { rows, total } = await store.listLearnersOverview(db, { q, filter, limit: PAGE, offset: (page - 1) * PAGE });
  const [courses, stats] = await Promise.all([store.listAllCourses(db), store.learnerStats(db)]);
  const link = (p) => `/admin/apprenants?${new URLSearchParams({ ...(q ? { q } : {}), ...(filter ? { s: filter } : {}), p: String(p) })}`;
  return (
    <>
      <h1>Apprenants</h1>
      <Flash code={sp.m} />
      <div className="stat-chips">
        <Link href="/admin/apprenants" className={!filter ? 'on' : ''}><strong>{stats.total}</strong> élèves</Link>
        <Link href="/admin/apprenants?s=active" className={filter === 'active' ? 'on' : ''}><strong>{stats.active7}</strong> actifs (7 jours)</Link>
        <Link href="/admin/apprenants?s=unconfirmed" className={filter === 'unconfirmed' ? 'on' : ''}><strong>{stats.unconfirmed}</strong> e-mail non confirmé</Link>
        <Link href="/admin/apprenants?s=nocourse" className={filter === 'nocourse' ? 'on' : ''}><strong>{stats.nocourse}</strong> sans formation</Link>
        <Link href="/admin/exercices?s=pending"><strong>{stats.pending_ex}</strong> exercices à corriger</Link>
      </div>
      <form method="get" className="admin-search">
        {filter && <input type="hidden" name="s" value={filter} />}
        <label htmlFor="q" className="sr-only">Chercher par nom ou e-mail</label>
        <input id="q" name="q" type="search" placeholder="Chercher par nom ou e-mail" defaultValue={q} />
        <button className="btn small" type="submit">Chercher</button>
      </form>
      <details className="card" style={{ marginBottom: 16 }}>
        <summary><strong>Accorder un accès à une formation</strong></summary>
        <form action={grantManual} style={{ marginTop: 12 }}>
          <label htmlFor="email">E-mail du compte</label><input id="email" name="email" type="email" required />
          <label htmlFor="courseId">Formation</label>
          <select id="courseId" name="courseId" required defaultValue="">
            <option value="" disabled>Choisir…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <p style={{ marginTop: 12 }}><ConfirmButton className="btn" message="Accorder cet accès gratuitement ? Le compte pourra ouvrir la formation tout de suite. L’action est notée dans le journal à votre nom.">Accorder l’accès</ConfirmButton></p>
        </form>
      </details>
      <p className="muted">{total} compte{total > 1 ? 's' : ''}{filter ? ' dans ce filtre' : ''}{q ? ` pour « ${q} »` : ''}. Cliquez sur un nom pour voir sa progression et lire ses exercices.</p>
      {rows.length === 0 && <p>Aucun compte trouvé.</p>}
      <div className="learner-list compact">
        {rows.map((u) => {
          const active = u.courses.filter((c) => c.status === 'active');
          const main = [...(active.length ? active : u.courses)].sort((x, y) => (y.done / (y.lessons || 1)) - (x.done / (x.lessons || 1)))[0];
          const pct = main && main.lessons ? Math.round((main.done / main.lessons) * 100) : 0;
          return (
            <Link className="lrow" key={u.id} href={`/admin/apprenants/${u.id}`}>
              <span className="lr-avatar" aria-hidden="true">{(u.name || '?').slice(0, 1).toUpperCase()}</span>
              <span className="lr-main">
                <strong>{u.name}</strong>
                <small>{u.email}</small>
                <span className="lr-badges">
                  {u.role !== 'learner' && <span className="badge gold">{u.role}</span>}
                  {!u.email_verified_at && <span className="badge red">e-mail non confirmé</span>}
                  {u.blocked_at && <span className="badge red">bloqué</span>}
                  {!main && <span className="badge grey">sans formation</span>}
                </span>
                {main && (
                  <span className="lr-course">
                    <span className="lr-ct">{main.title}{u.courses.length > 1 ? ` · +${u.courses.length - 1} autre${u.courses.length > 2 ? 's' : ''}` : ''}{main.status !== 'active' ? ' · accès retiré' : ''}</span>
                    <span className="lesson-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></span>
                  </span>
                )}
                <small>Activité : {fmt(u.last_activity)} · inscrit le {fmt(u.created_at)}</small>
              </span>
              <span className="lr-pct">{main ? `${pct} %` : '—'}</span>
            </Link>
          );
        })}
      </div>
      {(page > 1 || total > page * PAGE) && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn ghost small" href={link(page - 1)}>← Précédents</Link> : <span />}
          <span className="muted">Page {page} sur {Math.max(1, Math.ceil(total / PAGE))}</span>
          {total > page * PAGE ? <Link className="btn ghost small" href={link(page + 1)}>Suivants →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
