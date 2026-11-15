import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { grantManual, revokeManual, toggleBlock } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

export default async function Learners({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const { rows, total } = await store.listUsers(db, { q, limit: 40 });
  const courses = await store.listAllCourses(db);
  const withAccess = [];
  for (const u of rows) withAccess.push({ u, enr: await store.listCourseEnrollments(db, u.id) });
  return (
    <>
      <h1>Apprenants</h1>
      <Flash code={sp.m} />
      <form method="get" className="card">
        <label htmlFor="q">Chercher (nom ou e-mail)</label>
        <input id="q" name="q" type="text" defaultValue={q} />
        <p style={{ marginTop: 12 }}><button className="btn small" type="submit">Chercher</button></p>
      </form>
      <form action={grantManual} className="card" style={{ marginTop: 16 }}>
        <h2>Donner un accès à la main</h2>
        <label htmlFor="email">E-mail du compte</label><input id="email" name="email" type="email" required />
        <label htmlFor="courseId">Formation</label>
        <select id="courseId" name="courseId" required defaultValue="">
          <option value="" disabled>Choisir…</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <p style={{ marginTop: 12 }}><button className="btn" type="submit">Donner l’accès</button></p>
      </form>
      <h2 style={{ marginTop: 24 }}>{total} compte{total > 1 ? 's' : ''}</h2>
      {withAccess.map(({ u, enr }) => (
        <div className="card" key={u.id} style={{ marginBottom: 12 }}>
          <strong>{u.name}</strong> — {u.email} {u.role !== 'learner' && <span className="badge gold">{u.role}</span>}{' '}
          {!u.email_verified_at && <span className="badge red">e-mail non confirmé</span>} {u.blocked_at && <span className="badge red">bloqué</span>}
          <ul>
            {enr.map((e) => (
              <li key={e.id}>
                {e.title} — {e.status === 'active' ? 'actif' : `retiré (${e.revoke_reason || ''})`} ({e.source})
                {e.status === 'active' && (
                  <form action={revokeManual} style={{ display: 'inline', marginLeft: 8 }}>
                    <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="courseId" value={e.course_id} />
                    <button className="btn ghost small" type="submit">Retirer l’accès</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {u.role !== 'admin' && (
            <form action={toggleBlock}>
              <input type="hidden" name="userId" value={u.id} /><input type="hidden" name="block" value={u.blocked_at ? '0' : '1'} />
              <button className="btn ghost small" type="submit">{u.blocked_at ? 'Débloquer' : 'Bloquer'} ce compte</button>
            </form>
          )}
        </div>
      ))}
    </>
  );
}
