import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';

export const metadata = { title: 'Ma formation' };

export default async function CourseSpace({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/espace/formation/${slug}`);
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  if (!course) notFound();
  // Accès vérifié côté serveur à chaque affichage.
  if (!(await store.hasActiveAccess(db, user.id, course.id))) redirect(`/formations/${slug}`);

  const modules = await store.listModulesWithLessons(db, course.id);
  const progress = computeProgress(modules, await store.listCompletedLessonIds(db, user.id, course.id));
  return (
    <main>
      <div className="wrap">
        <p>
          <Link href="/espace">← Mes formations</Link>
        </p>
        <h1>{course.title}</h1>
        <Flash code={sp.m} />
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="muted">Progression : {progress.percent} %</p>
        {progress.nextLesson && (
          <p>
            <Link className="btn gold" href={`/espace/formation/${slug}/lecon/${progress.nextLesson.lessonId}`}>
              {progress.doneLessons > 0 ? 'Continuer où j’en étais' : 'Commencer la formation'}
            </Link>
          </p>
        )}
        {progress.complete && <p className="flash ok">Bravo, vous avez terminé toutes les leçons !</p>}
        {progress.modules.length === 0 && <p className="muted">Le contenu arrive bientôt.</p>}
        {progress.modules.map((m, i) => (
          <section key={m.id} className={`module${m.unlocked ? '' : ' locked'}`}>
            <h2 style={{ fontSize: '1.15rem' }}>
              Module {i + 1} : {String(m.title).replace(/^Module\s*\d+\s*:\s*/i, '')} {m.finished && <span className="badge">Terminé</span>}
              {!m.unlocked && <span className="badge grey">Verrouillé</span>}
            </h2>
            {m.description && <p className="muted small">{m.description}</p>}
            {!m.unlocked && <p className="small">Terminez le module précédent pour ouvrir celui-ci.</p>}
            {m.unlocked && !m.finished && <p className="small muted">Chaque leçon s’ouvre quand la précédente est terminée (exercice envoyé).</p>}
            <ul className="lesson-list">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  {l.unlocked ? (
                    <Link href={`/espace/formation/${slug}/lecon/${l.id}`} className="row-lesson">
                      <span>{l.title}</span>
                      {l.done ? <span className="tick">✓ Fait</span> : <span className="muted small">{l.duration_min ? `${l.duration_min} min` : ''}</span>}
                    </Link>
                  ) : (
                    <span className="row-lesson locked-lesson">
                      <span>{l.title}</span>
                      <span className="badge grey">🔒 Verrouillée</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
