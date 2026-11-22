import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import PlainRich from '@/components/PlainRich.jsx';
import ValidateExercise from '@/components/ValidateExercise.jsx';
import ConfirmButton from '@/components/ConfirmButton.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { revokeManual, toggleBlock } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => (d ? new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const UUID = /^[0-9a-f-]{36}$/i;

export default async function LearnerPage({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const data = await store.getLearnerDetail(getDb(), id);
  if (!data) notFound();
  const { user, enrollments, lessons } = data;
  return (
    <>
      <p><Link href="/admin/apprenants">← Tous les apprenants</Link></p>
      <Flash code={sp.m} />
      <h1>{user.name}</h1>
      <p className="muted">{user.email} · inscrit le {fmt(user.created_at)}{' '}
        {!user.email_verified_at && <span className="badge red">e-mail non confirmé</span>} {user.blocked_at && <span className="badge red">bloqué</span>}
      </p>
      {enrollments.length === 0 && <p>Cet élève n’a aucune formation.</p>}
      {enrollments.map((e) => {
        const ls = lessons.filter((l) => l.course_id === e.course_id);
        const done = ls.filter((l) => l.completed_at).length;
        const pct = ls.length ? Math.round((done / ls.length) * 100) : 0;
        return (
          <section className="card" key={e.id} style={{ marginBottom: 16 }}>
            <h2>{e.title}</h2>
            <p className="muted">
              {e.status === 'active' ? 'Accès actif' : `Accès retiré (${e.revoke_reason || 'sans motif'})`} · origine : {e.source} · depuis le {fmt(e.granted_at)}
            </p>
            <div className="lc-top"><span>{done} / {ls.length} leçons terminées</span><strong>{pct} %</strong></div>
            <div className="lesson-progress"><i style={{ width: `${pct}%` }} /></div>
            <ol className="learner-lessons">
              {ls.map((l) => (
                <li key={l.id} className={l.completed_at ? 'done' : ''}>
                  <div className="ll-head">
                    <span className="ll-state" aria-hidden="true">{l.completed_at ? '✓' : '○'}</span>
                    <strong>{l.title}</strong>
                    <span className="muted">{l.completed_at ? `terminée le ${fmt(l.completed_at)}` : 'pas terminée'}</span>
                  </div>
                  {l.answer ? (
                    <div className="answer">
                      {l.exercise && <PlainRich text={l.exercise} className="consigne" />}
                      <PlainRich text={l.answer} className="answer-text" />
                      <ValidateExercise userId={user.id} lessonId={l.id} status={l.status} validatedAt={l.validated_at} reviewedAt={l.validated_at} feedback={l.feedback} grade={l.grade} back={`/admin/apprenants/${user.id}`} />
                      <p className="muted">Rendu le {fmt(l.submitted_at)}{l.updated_at && String(l.updated_at) !== String(l.submitted_at) ? ` · modifié le ${fmt(l.updated_at)}` : ''}</p>
                    </div>
                  ) : l.exercise ? <p className="muted ll-none">Exercice pas encore rendu.</p> : null}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      <section className="card danger-zone">
        <h2>Actions sensibles</h2>
        <p className="muted">Chaque action demande une confirmation. Elle est notée dans le journal.</p>
        <div className="danger-actions">
          {enrollments.filter((e) => e.status === 'active').map((e) => (
            <form action={revokeManual} key={e.id}>
              <input type="hidden" name="userId" value={user.id} /><input type="hidden" name="courseId" value={e.course_id} />
              <ConfirmButton className="btn ghost small" message={`Retirer l’accès à « ${e.title} » pour ${user.name} ? Il ne pourra plus ouvrir les leçons.`}>Retirer l’accès à « {e.title} »</ConfirmButton>
            </form>
          ))}
          {user.role !== 'admin' && (
            <form action={toggleBlock}>
              <input type="hidden" name="userId" value={user.id} /><input type="hidden" name="block" value={user.blocked_at ? '0' : '1'} />
              <ConfirmButton className="btn danger small" message={user.blocked_at ? `Débloquer le compte de ${user.name} ?` : `Bloquer le compte de ${user.name} ? Il sera déconnecté tout de suite.`}>
                {user.blocked_at ? 'Débloquer ce compte' : 'Bloquer ce compte'}
              </ConfirmButton>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
