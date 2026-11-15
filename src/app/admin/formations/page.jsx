import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { createCourseAction } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

const STATUS = { draft: 'Brouillon', published: 'Publiée', hidden: 'Masquée' };

export default async function AdminCourses({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const courses = await store.listAllCourses(getDb());
  return (
    <>
      <h1>Formations</h1>
      <Flash code={sp.m} />
      <form action={createCourseAction} className="card">
        <label htmlFor="title">Nouvelle formation : titre</label>
        <input id="title" name="title" type="text" required minLength={3} maxLength={150} />
        <p style={{ marginTop: 14 }}><button className="btn" type="submit">Créer la formation</button></p>
      </form>
      <div className="table-wrap" style={{ marginTop: 20 }}><table><thead><tr><th>Titre</th><th>Statut</th><th>Type</th><th>Apprenants</th></tr></thead><tbody>
        {courses.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/admin/formations/${c.id}`}>{c.title}</Link></td>
            <td><span className={`badge ${c.status === 'published' ? '' : 'grey'}`}>{STATUS[c.status]}</span></td>
            <td>{c.is_free ? 'Gratuite' : 'Payante'}</td>
            <td>{c.learners}</td>
          </tr>
        ))}
        {courses.length === 0 && <tr><td colSpan={4} className="muted">Aucune formation pour l’instant.</td></tr>}
      </tbody></table></div>
    </>
  );
}
