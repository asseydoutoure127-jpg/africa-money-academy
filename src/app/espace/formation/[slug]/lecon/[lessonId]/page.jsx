import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import RichText, { slugifyHeading } from '@/components/RichText.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import NextCourseCard from '@/components/NextCourseCard.jsx';
import { computeProgress, findUnlockedLesson, flattenLessons } from '@/lib/progress.js';
import { markLessonDone, submitExercise } from '@/app/actions/learn.js';
import { typo } from '@/lib/typo.js';
import ReadingTimer from '@/components/ReadingTimer.jsx';
import { award, touchDaily, safe, BAREME } from '@/lib/points.js';

export const metadata = { title: 'Leçon' };

export default async function LessonPage({ params, searchParams }) {
  const { slug, lessonId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/espace/formation/${slug}/lecon/${lessonId}`);
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  if (!course) notFound();
  if (!(await store.hasActiveAccess(db, user.id, course.id))) redirect(`/formations/${slug}`);

  const modules = await store.listModulesWithLessons(db, course.id);
  const progress = computeProgress(modules, await store.listCompletedLessonIds(db, user.id, course.id));
  const found = /^[0-9a-f-]{36}$/i.test(lessonId) ? findUnlockedLesson(progress, lessonId) : null;
  if (!found) notFound();
  if (found.locked) redirect(`/espace/formation/${slug}?m=acces_verrouille`);
  // Formation gratuite : à la fin d'un module terminé, on propose la formation payante qui suit.
  const lastOfModule = found.module.lessons[found.module.lessons.length - 1]?.id === lessonId;
  const nextCourse = course.is_free && course.next_slug && lastOfModule && found.lesson.done ? await store.getCourseBySlug(db, course.next_slug) : null;

  const lesson = await store.getLesson(db, lessonId);
  await safe(async () => {
    await touchDaily(db, user.id);
    await award(db, { userId: user.id, kind: 'lesson_open', ref: lessonId, points: BAREME.lessonOpen });
  });
  const flat = flattenLessons(progress);
  const idx = flat.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 && flat[idx - 1].unlocked ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 && flat[idx + 1].unlocked ? flat[idx + 1] : null;
  const base = `/espace/formation/${slug}`;
  const mark = `${user.email} · Waypoint`;

  const answer = lesson.exercise?.trim() ? await store.getExerciseAnswer(db, user.id, lessonId) : null;
  const words = String(lesson.content || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').split(/\s+/).filter(Boolean).length;
  const pages = Math.max(1, Math.round(words / 300));
  const toc = String(lesson.content || '')
    .split('\n')
    .map((l) => l.match(/^##\s+(.+)$/))
    .filter(Boolean)
    .map((m) => m[1].trim());
  const moduleLabel = String(found.module.title).replace(/^Module\s*\d+\s*:\s*/i, '');
  const lessonNumber = idx + 1;

  return (
    <main className="doc-page">
      <div className="wrap">
        <p>
          <Link href={base}>← {course.title}</Link>
        </p>
        <article className="paper">
          <header className="paper-head">
            <div className="paper-brand">
              <img src="/brand/mark.png" alt="" width="48" height="26" />
              <span>Waypoint</span>
            </div>
            <p className="paper-kicker">
              Leçon {lessonNumber} sur {flat.length} · {moduleLabel}
            </p>
            <div className="lesson-progress" role="img" aria-label={`Leçon ${lessonNumber} sur ${flat.length}`}><i style={{ width: `${Math.round((lessonNumber / flat.length) * 100)}%` }} /></div>
            <h1>{typo(lesson.title)}</h1>
            <p className="paper-meta">
              Environ {pages} {pages > 1 ? 'pages' : 'page'} · {lesson.duration_min || Math.max(2, Math.round(words / 200))} min de lecture
              {lesson.exercise?.trim() ? ' · avec exercice' : ''}
            </p>
          </header>
          <Flash code={sp.m} />
          {toc.length > 2 && (
            <nav className="toc" aria-label="Sommaire">
              <strong>Dans cette leçon</strong>
              <ol>
                {toc.map((t) => (
                  <li key={t}>
                    <a href={`#${slugifyHeading(t)}`}>{t}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="protected">
            <div className="wm" aria-hidden="true">
              {Array.from({ length: 60 }, (_, i) => (
                <span key={i}>{mark}</span>
              ))}
            </div>
            <ReadingTimer />
            <RichText text={lesson.content} />
            {lesson.exercise?.trim() && (
              <section className="exercise" id="exercice">
                <h2>Exercice</h2>
                <RichText text={lesson.exercise} />
                {answer?.status === 'needs_correction' && (
                  <p className="exercise-fix"><span className="badge gold">Correction demandée</span> {answer.feedback ? <em>« {answer.feedback} »</em> : null}<br />Reprenez votre réponse ci-dessous, puis renvoyez-la.</p>
                )}
                {answer?.status === 'refused' && (
                  <p className="exercise-fix"><span className="badge red">À refaire</span> {answer.feedback ? <em>« {answer.feedback} »</em> : null}<br />Vous pouvez écrire une nouvelle réponse ci-dessous.</p>
                )}
                {answer && answer.status === 'pending' && (
                  <p className="exercise-wait"><span className="badge grey">En attente de correction</span></p>
                )}
                {answer?.validated_at && (
                  <p className="exercise-ok"><span className="badge ok">✓ Exercice validé{answer.grade !== null && answer.grade !== undefined ? ` · note ${answer.grade}/10` : ''}</span>{answer.feedback ? <> <em>« {answer.feedback} »</em></> : null}</p>
                )}
                <form action={submitExercise}>
                  <input type="hidden" name="lessonId" value={lessonId} />
                  <label htmlFor="answer">Votre réponse</label>
                  <textarea id="answer" name="answer" defaultValue={answer?.answer || ''} minLength={20} maxLength={5000} required placeholder="Écrivez ici, avec vos propres mots (20 caractères au minimum)." />
                  <p className="hint">
                    {found.lesson.done
                      ? 'Vous avez déjà terminé cette leçon. Vous pouvez modifier votre réponse.'
                      : 'La leçon suivante s’ouvre dès que vous envoyez votre réponse.'}
                  </p>
                  <button className="btn go gold" type="submit">
                    {found.lesson.done ? 'Mettre à jour ma réponse' : 'Envoyer ma réponse et terminer la leçon'}
                  </button>
                </form>
              </section>
            )}
            <p className="licence">
              <img src="/brand/mark.png" alt="" width="40" height="22" />
              <span>
                © Waypoint · Africa Money Academy. Leçon réservée à {user.email}. Toute copie, diffusion ou revente est interdite et peut
                donner lieu à des poursuites.
              </span>
            </p>
          </div>
        </article>
        <div className="actions lesson-nav">
          {!lesson.exercise?.trim() &&
            (found.lesson.done ? (
              <span className="badge">✓ Leçon terminée</span>
            ) : (
              <form action={markLessonDone}>
                <input type="hidden" name="lessonId" value={lessonId} />
                <button className="btn go gold" type="submit">
                  J’ai terminé cette leçon
                </button>
              </form>
            ))}
          {lesson.exercise?.trim() && found.lesson.done && <span className="badge">✓ Leçon terminée</span>}
          {prev && (
            <Link className="btn ghost pill" href={`${base}/lecon/${prev.id}`}>
              ← Précédente
            </Link>
          )}
          {next ? (
            <Link className="btn go" href={`${base}/lecon/${next.id}`}>
              Leçon suivante
            </Link>
          ) : (
            idx < flat.length - 1 && !found.lesson.done && <span className="muted small">Terminez cette leçon pour ouvrir la suivante.</span>
          )}
        </div>
        {nextCourse && nextCourse.status === 'published' && <NextCourseCard course={nextCourse} pitch={course.next_pitch} finished={false} />}
      </div>
    </main>
  );
}
