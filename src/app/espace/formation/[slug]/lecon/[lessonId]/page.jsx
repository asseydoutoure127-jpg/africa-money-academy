import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import RichText, { slugifyHeading } from '@/components/RichText.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress, findUnlockedLesson, flattenLessons } from '@/lib/progress.js';
import { markLessonDone, submitExercise } from '@/app/actions/learn.js';
import { typo } from '@/lib/typo.js';

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

  const lesson = await store.getLesson(db, lessonId);
  const flat = flattenLessons(progress);
  const idx = flat.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 && flat[idx - 1].unlocked ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 && flat[idx + 1].unlocked ? flat[idx + 1] : null;
  const base = `/espace/formation/${slug}`;
  const mark = `${user.email} · Africa Money Academy`;

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
              <img src="/logo-mark.svg" alt="" width="26" height="26" />
              <span>Africa Money Academy</span>
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
            <details className="lesson-tips">
              <summary>Conseils pour réussir cette leçon</summary>
              <ul>
                <li>Lisez en deux fois si vous êtes fatigué : une moitié maintenant, l’autre plus tard.</li>
                <li>Gardez un papier ou une note sur votre téléphone pour y mettre vos vrais chiffres.</li>
                <li>À la fin, faites l’exercice sans attendre : c’est lui qui ancre la leçon.</li>
              </ul>
              <p><Link href="/reussir">Voir toute la méthode pour réussir</Link></p>
            </details>
            <RichText text={lesson.content} />
            {lesson.exercise?.trim() && (
              <section className="exercise" id="exercice">
                <h2>Exercice</h2>
                <RichText text={lesson.exercise} />
                {answer?.validated_at && (
                  <p className="exercise-ok"><span className="badge ok">✓ Exercice validé par votre formateur</span>{answer.feedback ? <> <em>« {answer.feedback} »</em></> : null}</p>
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
                  <button className="btn gold" type="submit">
                    {found.lesson.done ? 'Mettre à jour ma réponse' : 'Envoyer ma réponse et terminer la leçon'}
                  </button>
                </form>
              </section>
            )}
            <p className="licence">
              <img src="/logo-mark.svg" alt="" width="22" height="22" />
              <span>
                © Africa Money Academy. Leçon réservée à {user.email}. Toute copie, diffusion ou revente est interdite et peut
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
                <button className="btn gold" type="submit">
                  J’ai terminé cette leçon
                </button>
              </form>
            ))}
          {lesson.exercise?.trim() && found.lesson.done && <span className="badge">✓ Leçon terminée</span>}
          {prev && (
            <Link className="btn ghost" href={`${base}/lecon/${prev.id}`}>
              ← Précédente
            </Link>
          )}
          {next ? (
            <Link className="btn" href={`${base}/lecon/${next.id}`}>
              Suivante →
            </Link>
          ) : (
            idx < flat.length - 1 && !found.lesson.done && <span className="muted small">Terminez cette leçon pour ouvrir la suivante.</span>
          )}
        </div>
      </div>
    </main>
  );
}
