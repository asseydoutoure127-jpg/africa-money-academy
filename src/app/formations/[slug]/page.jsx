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

  return (
    <main>
      <div className="wrap">
        <Flash code={sp.m} />
        {course.status !== 'published' && <p className="notice">Aperçu administrateur : cette formation n’est pas publiée (statut : {course.status}).</p>}
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div>
            <span className="badge">{LEVELS[course.level] || 'Débutant'}</span>{' '}
            {course.duration_label && <span className="badge grey">{course.duration_label}</span>}{' '}
            {course.is_free && <span className="badge gold">Gratuit</span>}
            <h1 style={{ marginTop: 10 }}>{course.title}</h1>
            {course.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.image_url} alt="" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', marginBottom: 16 }} />
            )}
            {course.summary && <p style={{ fontSize: '1.1rem' }}>{course.summary}</p>}

            <div className="card gold" style={{ margin: '18px 0' }}>
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

            {course.objectives && (
              <section>
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
                <ol style={{ paddingLeft: '1.2em' }}>
                  {modules.map((m) => (
                    <li key={m.id} style={{ marginBottom: 10 }}>
                      <strong>{m.title}</strong>
                      <span className="muted"> — {m.lessons.length} leçon{m.lessons.length > 1 ? 's' : ''}</span>
                      {m.description && <div className="muted small">{m.description}</div>}
                    </li>
                  ))}
                </ol>
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
        </div>
      </div>
    </main>
  );
}
