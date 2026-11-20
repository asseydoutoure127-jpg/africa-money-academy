import Link from 'next/link';
import { notFound } from 'next/navigation';
import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { typo } from '@/lib/typo.js';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const course = await store.getCourseBySlug(getDb(), slug);
  return { title: course ? `Extrait : ${course.title}` : 'Extrait', robots: { index: false } };
}

// Garde le début de la leçon : au moins deux parties, environ la moitié du texte, coupé entre deux titres.
export function excerptOf(content) {
  const text = String(content || '');
  const parts = text.split(/\n(?=##\s)/);
  if (parts.length < 3) return { text: parts.slice(0, 1).join('\n'), cut: parts.length > 1 };
  const keep = Math.max(2, Math.ceil(parts.length / 2));
  return { text: parts.slice(0, keep).join('\n'), cut: true };
}

export default async function Extrait({ params }) {
  const { slug } = await params;
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  // Seule la formation gratuite offre un extrait : les formations payantes restent à acheter.
  if (!course || course.status !== 'published' || !course.is_free) notFound();
  const modules = await store.listModulesWithLessons(db, course.id);
  const first = modules.flatMap((m) => m.lessons || [])[0];
  if (!first) notFound();
  const lesson = await store.getLesson(db, first.id);
  const { text, cut } = excerptOf(lesson.content);
  const signup = `/inscription?suite=${encodeURIComponent(`/formations/${slug}`)}`;

  return (
    <main className="doc-page">
      <div className="wrap">
        <p><Link href={`/formations/${slug}`}>← {course.title}</Link></p>
        <article className="paper">
          <header className="paper-head">
            <p className="paper-kicker">Extrait gratuit · Leçon 1</p>
            <h1>{typo(lesson.title)}</h1>
          </header>
          <div className="prose">
            <RichText text={text} />
          </div>
          {cut && <div className="excerpt-fade" aria-hidden="true" />}
        </article>
        <section className="card gold excerpt-cta">
          <h2>Envie de lire la suite ?</h2>
          <p>Créez votre compte gratuit : la leçon complète, l’exercice et toute la formation sont à vous, sans payer.</p>
          <Link className="btn go gold" href={signup}>Créer mon compte gratuit</Link>
        </section>
      </div>
    </main>
  );
}
