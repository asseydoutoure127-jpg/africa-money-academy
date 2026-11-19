import Link from 'next/link';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const UUID = /^[0-9a-f-]{36}$/i;
const PAGE = 30;

export default async function Exercises({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const courseId = typeof sp.f === 'string' && UUID.test(sp.f) ? sp.f : null;
  const page = Math.max(1, Number.parseInt(typeof sp.p === 'string' ? sp.p : '1', 10) || 1);
  const [courses, { rows, total }] = await Promise.all([
    store.listAllCourses(db),
    store.listExerciseAnswers(db, { courseId, limit: PAGE, offset: (page - 1) * PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (p) => `/admin/exercices?${courseId ? `f=${courseId}&` : ''}p=${p}`;
  return (
    <>
      <h1>Exercices des élèves</h1>
      <form method="get" className="admin-search">
        <label htmlFor="f" className="sr-only">Formation</label>
        <select id="f" name="f" defaultValue={courseId || ''}>
          <option value="">Toutes les formations</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <button className="btn small" type="submit">Filtrer</button>
      </form>
      <p className="muted">{total} réponse{total > 1 ? 's' : ''}, les plus récentes d’abord.</p>
      {rows.length === 0 && <div className="card"><p>Aucun exercice rendu pour l’instant. Dès qu’un élève en rend un, vous le lisez ici.</p></div>}
      {rows.map((r) => (
        <article className="card answer-card" key={`${r.user_id}-${r.lesson_id}`}>
          <header>
            <strong><Link href={`/admin/apprenants/${r.user_id}`}>{r.name}</Link></strong>
            <span className="muted">{r.course_title} · {r.lesson_title}</span>
            <span className="muted">{fmt(r.updated_at)}</span>
          </header>
          {r.exercise && <p className="muted"><strong>Consigne :</strong> {r.exercise}</p>}
          <p className="answer-text">{r.answer}</p>
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
