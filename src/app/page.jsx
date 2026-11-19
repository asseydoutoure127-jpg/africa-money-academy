import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import Carnet from '@/components/Carnet.jsx';
import PhoneMock from '@/components/PhoneMock.jsx';
import LessonMock from '@/components/LessonMock.jsx';
import RichText from '@/components/RichText.jsx';
import Icon from '@/components/Icon.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getPageText } from '@/lib/pages.js';
import { PHOTOS, COURSE_PHOTOS } from '@/lib/photos.js';

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const published = await store.listPublishedCourses(db);
  const upcoming = await store.listUpcomingCourses(db);
  const counts = await store.courseCounts(db, [...published, ...upcoming].map((c) => c.id));
  const courses = published.slice(0, 3);
  const freeCourse = published.find((c) => c.is_free) || null;
  const total = [...counts.values()].reduce((a, c) => ({ lessons: a.lessons + c.lessons, exercises: a.exercises + c.exercises }), { lessons: 0, exercises: 0 });
  const faq = await getPageText(db, 'faq');
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <Flash code={sp.m} />
            <h1>Apprenez à gagner de l’argent, en partant de zéro.</h1>
            <p>
              Des formations en français, avec des mots simples, à suivre depuis votre téléphone. Pas de promesse magique : des
              méthodes concrètes, appliquées à votre quotidien.
            </p>
            <div className="actions">
              <Link className="btn gold" href={freeCourse ? `/formations/${freeCourse.slug}` : '/formations'}>
                {freeCourse ? 'Commencer gratuitement' : 'Voir les formations'}
              </Link>
              <Link className="btn ghost" href="/formations">
                Voir les formations
              </Link>
            </div>
            <ul className="hero-proof">
              <li>Gratuit pour commencer</li>
              <li>Prix affichés en FCFA</li>
              <li>Un exercice à chaque leçon</li>
            </ul>
            <p className="install-hint"><Link href="/installer">Installer l’application sur mon téléphone</Link></p>
          </div>
          <PhoneMock />
        </div>
        <div className="pattern" aria-hidden="true" />
      </section>

      <main style={{ padding: 0 }}>
        <section className="strip" aria-label="Ce que vous trouverez sur le site">
          <div className="wrap strip-grid">
            <div><Icon name="book" /><strong>{published.length + upcoming.length} formations</strong><span>{published.length} ouverte{published.length > 1 ? 's' : ''}, {upcoming.length} à venir</span></div>
            <div><Icon name="pen" /><strong>{total.exercises} exercices</strong><span>à faire pour avancer</span></div>
            <div><Icon name="phone" /><strong>Sur téléphone</strong><span>lisible avec une connexion lente</span></div>
            <div><Icon name="coins" /><strong>Exemples en FCFA</strong><span>des situations que vous connaissez</span></div>
          </div>
        </section>

        <section className="section tinted">
          <div className="wrap split try-it">
            <div>
              <h2>Essayez tout de suite</h2>
              <p className="muted">
                Voici la première habitude que nous enseignons : <strong>ce que vous recevez, moins ce que vous dépensez, égale ce qu’il vous reste</strong>. Changez les chiffres pour voir.
              </p>
              <Link className="btn ghost" href="/outils">Voir tous les outils gratuits</Link>
            </div>
            <Carnet />
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
                <div><h3>Personnes sans emploi</h3><p>Des méthodes concrètes pour démarrer une activité, étape par étape, sans promesse magique.</p></div>
              </article>
              <article>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={COURSE_PHOTOS['lancer-une-petite-activite-rentable'].s} alt="Un jeune commerçant emballe une commande" loading="lazy" width="720" height="402" />
                <div><h3>Petits commerçants</h3><p>Mieux vendre, mieux encaisser, mieux tenir ses comptes pour que l’activité dure.</p></div>
              </article>
            </div>
          </div>
        </section>

        <section className="section tinted">
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
                  {upcoming.slice(0, Math.max(0, 6 - courses.length)).map((c) => (
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

        <section className="section">
          <div className="wrap split">
            <div>
              <h2>Une leçon, c’est un vrai document</h2>
              <p className="muted">Chaque leçon se lit comme un chapitre : un sommaire, des explications simples, des exemples en FCFA, puis un exercice à faire.</p>
              <ul className="ticks">
                <li><Icon name="check" size={20} /> Environ 3 à 4 pages par leçon</li>
                <li><Icon name="pen" size={20} /> Un exercice avec votre propre réponse</li>
                <li><Icon name="lock" size={20} /> La leçon suivante s’ouvre quand l’exercice est envoyé</li>
                <li><Icon name="shield" size={20} /> Votre progression est enregistrée</li>
              </ul>
            </div>
            <LessonMock />
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

        <section className="section ref-feature">
          <div className="wrap split">
            <div>
              <span className="badge gold">Parrainage</span>
              <h2>Invitez un ami. Gagnez 50 %.</h2>
              <p className="muted">Chaque compte a un lien personnel. Quand un ami s’inscrit avec votre lien puis achète une formation, vous recevez la moitié du prix.</p>
              <p className="ref-example"><span>Un ami achète une formation à 10 000 FCFA</span><strong>Vous gagnez 5 000 FCFA</strong></p>
              <Link className="btn gold" href="/parrainage">Voir comment ça marche</Link>
            </div>
            <div className="ref-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PHOTOS.amis.l} alt="Des amis regardent ensemble un téléphone et un ordinateur" loading="lazy" width="1400" height="781" />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap faq-box" style={{ maxWidth: 820 }}>
            <h2>Questions fréquentes</h2>
            <RichText text={faq.body} />
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="cta-band has-photo" style={{ backgroundImage: `linear-gradient(rgba(14, 18, 48, .78), rgba(14, 18, 48, .86)), url(${PHOTOS.bureau.l})` }}>
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
