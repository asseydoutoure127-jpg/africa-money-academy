import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import RichText from '@/components/RichText.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress, findUnlockedLesson, flattenLessons } from '@/lib/progress.js';
import { markLessonDone } from '@/app/actions/learn.js';

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

  return (
    <main>
      <div className="wrap">
        <p>
          <Link href={base}>← {course.title}</Link>
        </p>
        <p className="muted small">{found.module.title}</p>
        <h1>{lesson.title}</h1>
        <Flash code={sp.m} />
        <div className="protected">
          <div className="wm" aria-hidden="true">
            {Array.from({ length: 60 }, (_, i) => (
              <span key={i}>{mark}</span>
            ))}
          </div>
          <RichText text={lesson.content} />
          <p className="licence">
            <img src="/logo-mark.svg" alt="" width="22" height="22" />
            <span>
              © Africa Money Academy. Leçon réservée à {user.email}. Toute copie, diffusion ou revente est interdite et peut
              donner lieu à des poursuites.
            </span>
          </p>
        </div>
        <div className="actions" style={{ marginTop: 28 }}>
          {found.lesson.done ? (
            <span className="badge">✓ Leçon terminée</span>
          ) : (
            <form action={markLessonDone}>
              <input type="hidden" name="lessonId" value={lessonId} />
              <button className="btn gold" type="submit">
                J’ai terminé cette leçon
              </button>
            </form>
          )}
          {prev && (
            <Link className="btn ghost" href={`${base}/lecon/${prev.id}`}>
              ← Précédente
            </Link>
          )}
          {next && (
            <Link className="btn" href={`${base}/lecon/${next.id}`}>
              Suivante →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
