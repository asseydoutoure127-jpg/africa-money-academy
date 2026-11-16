import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import { getCurrentUser } from '@/lib/auth.js';
import * as store from '@/lib/store.js';
import { httpsUrlOrNull } from '@/lib/validate.js';
import { enrollFree } from '@/app/actions/learn.js';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

async function loadCourse(slug) {
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  const user = await getCurrentUser();
  if (!course) return { notFound: true };
  if (course.status !== 'published' && user?.role !== 'admin') return { notFound: true };
  return { db, course, user };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const r = await loadCourse(slug);
  if (r.notFound) return { title: 'Formation introuvable' };
  return { title: r.course.title, description: r.course.summary || undefined };
}

export default async function CoursePage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await loadCourse(slug);
  if (r.notFound) notFound();
  const { db, course, user } = r;
  const modules = await store.listModulesWithLessons(db, course.id);
  const hasAccess = user ? await store.hasActiveAccess(db, user.id, course.id) : false;
  const directUrl = httpsUrlOrNull(course.chariow_product_url);
  const next = `/formations/${course.slug}`;

  const counts = (await store.courseCounts(db, [course.id])).get(course.id);

  return (
    <main style={{ padding: 0 }}>
      <section className="course-hero">
        <div className="wrap">
          <div>
            <Flash code={sp.m} />
            {course.status !== 'published' && <p className="notice" style={{ color: '#12172b' }}>Aperçu administrateur : cette formation n’est pas publiée (statut : {course.status}).</p>}
            <div>
              <span className="badge">{LEVELS[course.level] || 'Débutant'}</span>{' '}
              {course.duration_label && <span className="badge">{course.duration_label}</span>}{' '}
              {course.is_free && <span className="badge gold">Gratuit</span>}
            </div>
            <h1 style={{ marginTop: 12 }}>{course.title}</h1>
            {course.summary && <p style={{ fontSize: '1.08rem' }}>{course.summary}</p>}
            {counts && (
              <ul className="stats-line" aria-label="Contenu de la formation">
                <li><strong>{counts.modules}</strong> modules</li>
                <li><strong>{counts.lessons}</strong> leçons</li>
                <li><strong>{counts.exercises}</strong> exercices</li>
                <li><strong>{counts.pages}</strong> pages</li>
              </ul>
            )}
          </div>
          {course.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.image_url} alt="" />
          )}
          <div className="pattern" aria-hidden="true" />
        </div>
      </section>

      <div className="wrap course-body">
        <div>
            {course.objectives && (
              <section className="objectives">
                <h2>Ce que vous allez apprendre</h2>
                <RichText text={course.objectives} />
              </section>
            )}
            {course.audience && (
              <section>
                <h2>À qui s’adresse cette formation</h2>
                <RichText text={course.audience} />
              </section>
            )}
            {course.prerequisites && (
              <section>
                <h2>Ce qu’il faut avoir</h2>
                <RichText text={course.prerequisites} />
              </section>
            )}
            {course.description && (
              <section>
                <h2>Présentation</h2>
                <RichText text={course.description} />
              </section>
            )}

            <section>
              <h2>Programme</h2>
              {modules.length === 0 ? (
                <p className="muted">Le programme sera publié bientôt.</p>
              ) : (
                modules.map((m, i) => (
                  <article key={m.id} className="program-module">
                    <h3>Module {i + 1} : {String(m.title).replace(/^Module\s*\d+\s*:\s*/i, '')}</h3>
                    {m.description && <p className="muted small" style={{ margin: 0 }}>{m.description}</p>}
                    <ol>
                      {m.lessons.map((l) => (
                        <li key={l.id}>{l.title}</li>
                      ))}
                    </ol>
                  </article>
                ))
              )}
              <p className="hint">Le contenu des leçons est réservé aux personnes qui ont accès à la formation.</p>
            </section>

            {course.faq && (
              <section>
                <h2>Questions sur cette formation</h2>
                <RichText text={course.faq} />
              </section>
            )}
        </div>
        <aside>
            <div className="card gold buy-card">
              {!course.is_free && course.price_label && (
                <p style={{ fontSize: '1.4rem', margin: '0 0 10px' }}>
                  <strong>{course.price_label}</strong>
                </p>
              )}
              {hasAccess ? (
                <Link className="btn" href={`/espace/formation/${course.slug}`}>
                  Accéder à la formation
                </Link>
              ) : course.is_free ? (
                user ? (
                  <form action={enrollFree}>
                    <input type="hidden" name="slug" value={course.slug} />
                    <button className="btn gold" type="submit">
                      S’inscrire gratuitement
                    </button>
                  </form>
                ) : (
                  <Link className="btn gold" href={`/inscription?suite=${encodeURIComponent(next)}`}>
                    Créer un compte pour s’inscrire
                  </Link>
                )
              ) : course.purchase_mode === 'api' ? (
                <>
                  <Link className="btn gold" href={`/achat/${course.slug}`}>
                    Acheter cette formation
                  </Link>
                  <p className="hint">Paiement sécurisé. L’accès s’ouvre automatiquement après le paiement.</p>
                </>
              ) : directUrl ? (
                <>
                  <a className="btn gold" href={directUrl} rel="noopener noreferrer">
                    Acheter cette formation
                  </a>
                  <p className="hint">
                    <strong>Important :</strong> utilisez la même adresse e-mail que votre compte{user ? <> (<strong>{user.email}</strong>)</> : ''} pour que l’accès s’ouvre tout seul.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0 }}>L’achat sera bientôt disponible.</p>
              )}
            </div>

        </aside>
      </div>
    </main>
  );
}
