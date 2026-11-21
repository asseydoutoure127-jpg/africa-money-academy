import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';
import { photoForCourse } from '@/lib/photos.js';
import NextCourseCard from '@/components/NextCourseCard.jsx';

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
  const nextCourse = course.is_free && course.next_slug ? await store.getCourseBySlug(db, course.next_slug) : null;
  const progress = computeProgress(modules, await store.listCompletedLessonIds(db, user.id, course.id));
  return (
    <main>
      <div className="wrap">
        <article className="pcard" style={{ minHeight: 280, marginBottom: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bg" src={photoForCourse(slug)?.s || course.image_url || '/photos/groupe-s.webp'} alt="" />
          <div className="pc-top"><Link href="/espace" className="tag">← Accueil</Link><span className="tag gold">{progress.percent} %</span></div>
          <div className="pc-body">
            <h1 style={{ color: '#fff', fontSize: '1.45rem', margin: '0 0 8px' }}>{course.title}</h1>
            <div className="pbar" aria-hidden="true"><span style={{ width: `${progress.percent}%` }} /></div>
            <p>{progress.doneLessons} leçon{progress.doneLessons > 1 ? 's' : ''} terminée{progress.doneLessons > 1 ? 's' : ''} sur {progress.totalLessons}</p>
            {progress.nextLesson && (
              <Link className="btn go gold" href={`/espace/formation/${slug}/lecon/${progress.nextLesson.lessonId}`}>
                {progress.doneLessons > 0 ? 'Continuer où j’en étais' : 'Commencer la formation'}
              </Link>
            )}
          </div>
        </article>
        <Flash code={sp.m} />
        {progress.complete && <p className="flash ok">Bravo, vous avez terminé toutes les leçons !</p>}
        {progress.complete && nextCourse && nextCourse.status === 'published' && <NextCourseCard course={nextCourse} pitch={course.next_pitch} finished />}
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
