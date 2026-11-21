import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import Carnet from '@/components/Carnet.jsx';
import RichText from '@/components/RichText.jsx';
import FaqAccordion from '@/components/FaqAccordion.jsx';
import Icon from '@/components/Icon.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getPageText } from '@/lib/pages.js';
import { PHOTOS, COURSE_PHOTOS } from '@/lib/photos.js';
import { previewOf } from '@/lib/excerpt.js';
import { typo } from '@/lib/typo.js';

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const published = await store.listPublishedCourses(db);
  const upcoming = await store.listUpcomingCourses(db);
  const counts = await store.courseCounts(db, [...published, ...upcoming].map((c) => c.id));
  const courses = published;
  const freeCourse = published.find((c) => c.is_free) || null;
  const total = [...counts.values()].reduce((a, c) => ({ lessons: a.lessons + c.lessons, exercises: a.exercises + c.exercises, pages: a.pages + c.pages }), { lessons: 0, exercises: 0, pages: 0 });
  const faq = await getPageText(db, 'faq');
  let sample = null;
  if (freeCourse) {
    try {
      const mods = await store.listModulesWithLessons(db, freeCourse.id);
      const first = mods.flatMap((m) => m.lessons || [])[0];
      if (first) {
        const l = await store.getLesson(db, first.id);
        sample = { title: l.title, ...previewOf(l.content) };
      }
    } catch {
      sample = null;
    }
  }
  const tryHref = freeCourse ? `/formations/${freeCourse.slug}` : '/formations';
  return (
    <>
      <section className="hero hero-app">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bg" src={PHOTOS.groupe.l} alt="" fetchPriority="high" />
        <div className="wrap hero-inner">
          <Flash code={sp.m} />
          <div className="chips-row">
            <span className="tag">Gratuit pour commencer</span>
            <span className="tag">Prix en FCFA</span>
          </div>
          <h1>Apprenez à gagner de l’argent, en partant de zéro.</h1>
          <p>Des formations en français, avec des mots simples, à suivre depuis votre téléphone. Chaque leçon se termine par un exercice à faire vous-même.</p>
          <div className="hero-cta">
            <Link className="btn go gold" href={freeCourse ? `/formations/${freeCourse.slug}` : '/formations'}>
              {freeCourse ? 'Commencer gratuitement' : 'Voir les formations'}
            </Link>
          </div>
        </div>
      </section>

      <main style={{ padding: 0 }}>
        <section className="strip" aria-label="Ce que vous trouverez sur le site">
          <div className="wrap strip-grid">
            <div><Icon name="book" /><strong>{published.length} formations</strong><span>dont {published.filter((c) => c.is_free).length} gratuite</span></div>
            <div><Icon name="pen" /><strong>{total.lessons} leçons</strong><span>chacune avec un exercice</span></div>
            <div><Icon name="check" /><strong>≈ {total.pages} pages</strong><span>de cours à lire sur téléphone</span></div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2 className="section-title">Une école pensée pour les débutants</h2>
            <p className="muted" style={{ maxWidth: '60ch' }}>
              Pour celles et ceux qui cherchent une première source de revenu en Afrique francophone, sans diplôme ni capital de départ.
            </p>
            <div className="persona persona-ill">
              <article>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={PHOTOS.groupe.s} alt="Des étudiants travaillent ensemble" loading="lazy" width="720" height="402" />
                <div><h3>Étudiants</h3><p>Un complément de revenu à construire à côté des cours, avec un petit budget et un téléphone.</p></div>
              </article>
              <article>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COURSE_PHOTOS['freelance-vendre-ses-competences-en-ligne'].s} alt="Une jeune femme travaille sur son ordinateur" loading="lazy" width="720" height="402" />
                <div><h3>Personnes sans emploi</h3><p>Des méthodes concrètes pour démarrer une activité, étape par étape.</p></div>
              </article>
              <article>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COURSE_PHOTOS['lancer-une-petite-activite-rentable'].s} alt="Un jeune commerçant emballe une commande" loading="lazy" width="720" height="402" />
                <div><h3>Petits commerçants</h3><p>Mieux vendre, mieux encaisser, mieux tenir ses comptes pour que l’activité dure.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2>Nos formations</h2>
            {courses.length === 0 && upcoming.length === 0 ? (
              <div className="card soft">
                <p style={{ margin: 0 }}>
                  <strong>Les premières formations arrivent bientôt.</strong> Créez votre compte pour être prêt le jour de l’ouverture.
                </p>
              </div>
            ) : (
              <>
                <div className="grid cols-3">
                  {courses.map((c) => (
                    <CourseCard key={c.id} course={c} counts={counts.get(c.id)} />
                  ))}
                  {upcoming.map((c) => (
                    <CourseCard key={c.id} course={c} upcoming />
                  ))}
                </div>
                <p style={{ marginTop: 18 }}>
                  <Link href="/formations">Toutes les formations</Link>
                </p>
              </>
            )}
          </div>
        </section>

        {sample && (
          <section className="section">
            <div className="wrap">
              <h2>Lisez un vrai extrait</h2>
              <p className="muted" style={{ maxWidth: '60ch' }}>Voici le début de la première leçon gratuite, tel que vous le lirez sur votre téléphone.</p>
              <article className="paper">
                <header className="paper-head">
                  <p className="paper-kicker">Formation gratuite · Leçon 1</p>
                  <h3>{typo(sample.title)}</h3>
                </header>
                <div className="prose">
                  <RichText text={sample.text} />
                </div>
                {sample.cut && <div className="excerpt-fade" aria-hidden="true" />}
                <div className="excerpt-cta in-paper">
                  <Link className="btn go gold" href={`/formations/${freeCourse.slug}/extrait`}>Lire la suite gratuitement</Link>
                </div>
              </article>
            </div>
          </section>
        )}

        <section className="section tinted">
          <div className="wrap split try-it">
            <div>
              <h2>Essayez tout de suite</h2>
              <p className="muted">
                Voici la première habitude que nous enseignons : <strong>ce que vous recevez, moins ce que vous dépensez, égale ce qu’il vous reste</strong>. Changez les chiffres pour voir.
              </p>
              <Link className="btn ghost" href="/outils">Voir tous les outils gratuits</Link>
            </div>
            <Carnet ctaHref={tryHref} />
          </div>
        </section>

        <section className="section tinted">
          <div className="wrap">
            <h2>Comment ça marche</h2>
            <ol className="steps steps-color">
              <li className="s1">
                <span className="s-ico"><Icon name="book" size={26} /></span>
                <strong>Choisissez une formation.</strong> Créez votre compte avec une adresse e-mail que vous utilisez.
              </li>
              <li className="s2">
                <span className="s-ico"><Icon name="lock" size={26} /></span>
                <strong>Payez en toute sécurité.</strong> Utilisez le moyen de paiement proposé dans votre pays. L’accès s’ouvre tout seul après le paiement.
              </li>
              <li className="s3">
                <span className="s-ico"><Icon name="target" size={26} /></span>
                <strong>Avancez à votre rythme.</strong> Leçon après leçon, et reprenez là où vous vous êtes arrêté.
              </li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap faq-box" style={{ maxWidth: 820 }}>
            <h2>Questions fréquentes</h2>
            <FaqAccordion text={faq.body} />
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="cta-band has-photo" style={{ backgroundImage: `linear-gradient(rgba(31, 31, 31, .78), rgba(31, 31, 31, .86)), url(${PHOTOS.bureau.l})` }}>
              <h2>Prêt à commencer ?</h2>
              <p>Créez votre compte gratuitement, vous ne payez que si vous choisissez une formation.</p>
              <Link className="btn gold" href="/inscription">
                Créer mon compte
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
