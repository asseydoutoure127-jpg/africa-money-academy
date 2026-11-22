import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import PlainRich from '@/components/PlainRich.jsx';
import ValidateExercise from '@/components/ValidateExercise.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const UUID = /^[0-9a-f-]{36}$/i;
const PAGE = 20;

export default async function Exercises({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const courseId = typeof sp.f === 'string' && UUID.test(sp.f) ? sp.f : null;
  const status = ['pending', 'needs_correction', 'validated', 'refused'].includes(sp.s) ? sp.s : '';
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const page = Math.max(1, Number.parseInt(typeof sp.p === 'string' ? sp.p : '1', 10) || 1);
  const [courses, { rows, total, counts }] = await Promise.all([
    store.listAllCourses(db),
    store.listExerciseAnswers(db, { courseId, status, q, limit: PAGE, offset: (page - 1) * PAGE }),
  ]);
  const attempts = await store.listAttemptsFor(db, rows);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (o) => { const u = new URLSearchParams(); const m = { f: courseId || '', s: status, q, ...o }; for (const [k, v] of Object.entries(m)) if (v) u.set(k, v); return u.toString(); };
  const link = (p) => `/admin/exercices?${qs({ p })}`;
  const tab = (s) => `/admin/exercices?${qs({ s, p: '' })}`;
  return (
    <>
      <h1>Exercices des élèves</h1>
      <Flash code={sp.m} />
      <nav className="ex-tabs" aria-label="Statut">
        <Link href={tab('pending')} className={status === 'pending' ? 'on' : ''}>À corriger ({counts.pending})</Link>
        <Link href={tab('needs_correction')} className={status === 'needs_correction' ? 'on' : ''}>Correction demandée ({counts.needs_correction})</Link>
        <Link href={tab('validated')} className={status === 'validated' ? 'on' : ''}>Validés ({counts.validated})</Link>
        <Link href={tab('refused')} className={status === 'refused' ? 'on' : ''}>Refusés ({counts.refused})</Link>
        <Link href={tab('')} className={!status ? 'on' : ''}>Tous</Link>
      </nav>
      <form method="get" className="admin-search">
        {status && <input type="hidden" name="s" value={status} />}
        <label htmlFor="q" className="sr-only">Chercher un élève</label>
        <input id="q" name="q" type="search" placeholder="Nom ou e-mail de l’élève" defaultValue={q} />
        <label htmlFor="f" className="sr-only">Formation</label>
        <select id="f" name="f" defaultValue={courseId || ''}>
          <option value="">Toutes les formations</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className="btn small" type="submit">Filtrer</button>
      </form>
      <p className="muted">{total} réponse{total > 1 ? 's' : ''} · {{ pending: 'à corriger', needs_correction: 'en attente de la correction de l’élève', validated: 'validée' + (total > 1 ? 's' : ''), refused: 'refusée' + (total > 1 ? 's' : '') }[status] || 'au total'}, les non corrigées d’abord.</p>
      {rows.length === 0 && <div className="card"><p>Aucun exercice rendu pour l’instant. Dès qu’un élève en rend un, vous le lisez ici.</p></div>}
      {rows.map((r) => (
        <article className="card answer-card" key={`${r.user_id}-${r.lesson_id}`}>
          <header>
            <strong><Link href={`/admin/apprenants/${r.user_id}`}>{r.name}</Link></strong>
            <span className="muted">{r.course_title} · {r.lesson_title}</span>
            <span className="muted">{fmt(r.updated_at)}</span>
          </header>
          {r.exercise && <p className="muted ex-label">Consigne</p>}
          {r.exercise && <PlainRich text={r.exercise} className="consigne" />}
          <PlainRich text={r.answer} className="answer-text" />
          {(attempts.get(`${r.user_id}:${r.lesson_id}`) || []).length > 1 && (
            <details className="attempts">
              <summary>Tentatives précédentes ({(attempts.get(`${r.user_id}:${r.lesson_id}`) || []).length - 1})</summary>
              {(attempts.get(`${r.user_id}:${r.lesson_id}`) || []).slice(1).map((a, i) => (
                <div key={i} className="attempt"><small className="muted">{fmt(a.submitted_at)}</small><PlainRich text={a.answer} className="answer-text old" /></div>
              ))}
            </details>
          )}
          <ValidateExercise userId={r.user_id} lessonId={r.lesson_id} status={r.status} validatedAt={r.validated_at} reviewedAt={r.reviewed_at} feedback={r.feedback} grade={r.grade} back={link(page)} />
        </article>
      ))}
      {pages > 1 && (
        <p className="pager">
          {page > 1 && <Link href={link(page - 1)}>← Plus récents</Link>} <span>Page {page} / {pages}</span> {page < pages && <Link href={link(page + 1)}>Plus anciens →</Link>}
        </p>
      )}
    </>
  );
}
