import Link from 'next/link';
import { notFound } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import RichText from '@/components/RichText.jsx';
import Icon from '@/components/Icon.jsx';
import { getDb } from '@/lib/db.js';
import { getCurrentUser } from '@/lib/auth.js';
import * as store from '@/lib/store.js';
import { httpsUrlOrNull } from '@/lib/validate.js';
import { enrollFree } from '@/app/actions/learn.js';
import { photoForCourse } from '@/lib/photos.js';
import { typo } from '@/lib/typo.js';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

// Schéma de méthode affiché dans la page de présentation, selon la formation.

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
      <section className="hero-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bg" src={photoForCourse(course.slug)?.l || (course.image_url || '/photos/groupe.jpg').replace('/cover-', '/scene-')} alt="" fetchPriority="high" />
        <div className="wrap">
          <Flash code={sp.m} />
          {course.status !== 'published' && <p className="notice" style={{ color: '#12172b' }}>Aperçu administrateur : cette formation n’est pas publiée (statut : {course.status}).</p>}
          <span className="tag">{LEVELS[course.level] || 'Débutant'}</span>{' '}
          {course.duration_label && <span className="tag">{course.duration_label}</span>}{' '}
          {course.is_free && <span className="tag gold">Gratuit</span>}
          <h1>{typo(course.title)}</h1>
        </div>
      </section>
      <section className="sheet">
        <div className="wrap">
          {counts && (
            <ul className="statrow" aria-label="Contenu de la formation">
              <li><strong>{counts.modules}</strong>modules</li>
              <li><strong>{counts.lessons}</strong>leçons</li>
              <li><strong>{counts.exercises}</strong>exercices</li>
            </ul>
          )}
          {course.summary && <p style={{ fontSize: '1.05rem' }}>{course.summary}</p>}
          {course.outcome && <p className="outcome"><strong>À la fin de la formation, vous avez :</strong> {course.outcome}</p>}
          <div className="price-row sale-cta">
            {course.is_free ? (
              <div className="price-tag">Gratuit<small>Aucun paiement</small></div>
            ) : course.price_label ? (
              <div className="price-tag">{course.price_label}<small>Paiement unique, sécurisé</small></div>
            ) : null}
              {hasAccess ? (
              <Link className="btn go" href={`/espace/formation/${course.slug}`}>Accéder à la formation</Link>
            ) : course.is_free ? (
              user ? (
                <form action={enrollFree}>
                  <input type="hidden" name="slug" value={course.slug} />
                  <button className="btn go" type="submit">S’inscrire gratuitement</button>
                </form>
              ) : (
                <Link className="btn go" href={`/inscription?suite=${encodeURIComponent(next)}`}>Commencer gratuitement</Link>
              )
            ) : course.purchase_mode === 'api' ? (
              <Link className="btn go" href={`/achat/${course.slug}`}>Acheter cette formation</Link>
            ) : directUrl ? (
              <a className="btn go" href={directUrl} rel="noopener noreferrer">Acheter cette formation</a>
            ) : null}
            {course.is_free && !hasAccess && <Link className="btn ghost pill" href={`/formations/${slug}/extrait`}>Lire un extrait</Link>}
            <a className="btn ghost pill" href="#programme">Voir le programme</a>
          </div>
          <ul className="trust">
            <li>Accès ouvert automatiquement après paiement</li>
            <li>Lisible sur téléphone</li>
            <li>Exercices dans chaque leçon</li>
          </ul>
        </div>
      </section>

      <div className="wrap course-body">
        <div>
            <section>
              <h2>Ce que vous recevez</h2>
              <div className="benefits">
                <div className="benefit"><span className="ico"><Icon name="book" size={24} /></span><div><h3>{counts ? `${counts.lessons} leçons au format document` : 'Des leçons au format document'}</h3><p>Des textes clairs de plusieurs pages, avec exemples en FCFA, à lire sur votre téléphone.</p></div></div>
                <div className="benefit"><span className="ico"><Icon name="pen" size={24} /></span><div><h3>{counts ? `${counts.exercises} exercices à faire` : 'Des exercices à faire'}</h3><p>Chaque leçon se termine par un exercice concret. Vous passez à la suivante quand il est fait.</p></div></div>
                <div className="benefit"><span className="ico"><Icon name="target" size={24} /></span><div><h3>Un parcours pas à pas</h3><p>Les leçons s’ouvrent dans l’ordre : vous ne vous perdez pas et vous voyez votre progression.</p></div></div>
                <div className="benefit"><span className="ico"><Icon name="shield" size={24} /></span><div><h3>Un accès personnel</h3><p>Votre accès est lié à votre compte. Les leçons sont réservées aux personnes qui ont acheté.</p></div></div>
              </div>
            </section>
            {course.objectives && (
              <section className="objectives">
                <h2>Ce que vous allez apprendre</h2>
                <RichText text={course.objectives} />
              </section>
            )}
            {course.audience && (
              <section className="panel p-saffron">
                <h2>À qui s’adresse cette formation</h2>
                <RichText text={course.audience} />
              </section>
            )}
            {course.prerequisites && (
              <section className="panel p-indigo">
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

            <section id="programme">
              <h2>Programme</h2>
              {modules.length === 0 ? (
                <p className="muted">Le programme sera publié bientôt.</p>
              ) : (
                modules.map((m, i) => (
                  <article key={m.id} className="program-module">
                    <h3><span className="mod-n">{i + 1}</span><span>{String(m.title).replace(/^Module\s*\d+\s*:\s*/i, '')}</span></h3>
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

            {!course.is_free && !hasAccess && (
              <section>
                <h2>Comment ça se passe</h2>
                <ol className="how-steps">
                  <li><strong>Créez votre compte</strong>Gratuit, avec votre adresse e-mail.</li>
                  <li><strong>Payez en toute sécurité</strong>Le paiement se fait sur la page de paiement Chariow.</li>
                  <li><strong>Commencez tout de suite</strong>Votre accès s’ouvre automatiquement avec la même adresse e-mail.</li>
                </ol>
              </section>
            )}

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
              {!course.is_free && (
                <Link className="ref-promo" href="/parrainage">
                  <Icon name="gift" size={24} />
                  <span><strong>Parrainez un ami, gagnez 50 %.</strong> Voir comment ça marche.</span>
                </Link>
              )}
            </div>

        </aside>
      </div>
      {!hasAccess && !course.is_free && course.price_label && (course.purchase_mode === 'api' || directUrl) && (
        <div className="buy-bar">
          <span className="price">{course.price_label}</span>
          {course.purchase_mode === 'api' ? (
            <Link className="btn gold" href={`/achat/${course.slug}`}>Acheter</Link>
          ) : (
            <a className="btn gold" href={directUrl} rel="noopener noreferrer">Acheter</a>
          )}
        </div>
      )}
    </main>
  );
}
