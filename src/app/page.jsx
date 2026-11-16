import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import Carnet from '@/components/Carnet.jsx';
import RichText from '@/components/RichText.jsx';
import Icon from '@/components/Icon.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getPageText } from '@/lib/pages.js';

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const published = await store.listPublishedCourses(db);
  const upcoming = await store.listUpcomingCourses(db);
  const counts = await store.courseCounts(db, [...published, ...upcoming].map((c) => c.id));
  const courses = published.slice(0, 3);
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
              <Link className="btn gold" href="/formations">
                Voir les formations
              </Link>
              <Link className="btn ghost" href="/inscription">
                Créer un compte
              </Link>
            </div>
          </div>
          <Carnet />
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

        <section className="section">
          <div className="wrap">
            <h2 className="section-title">Une école pensée pour les débutants</h2>
            <p className="muted" style={{ maxWidth: '60ch' }}>
              Pour celles et ceux qui cherchent une première source de revenu en Afrique francophone, sans diplôme ni capital de départ.
            </p>
            <div className="persona">
              <article>
                <Icon name="book" size={30} />
                <h3>Étudiants</h3>
                <p>Un complément de revenu à construire à côté des cours, avec un petit budget et un téléphone.</p>
              </article>
              <article>
                <Icon name="target" size={30} />
                <h3>Personnes sans emploi</h3>
                <p>Des méthodes concrètes pour démarrer une activité, étape par étape, sans promesse magique.</p>
              </article>
              <article>
                <Icon name="coins" size={30} />
                <h3>Petits commerçants</h3>
                <p>Mieux vendre, mieux encaisser, mieux tenir ses comptes pour que l’activité dure.</p>
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
            <div className="mock-doc" aria-hidden="true">
              <div className="mock-bar" />
              <div className="mock-title" />
              <div className="mock-line" /><div className="mock-line short" /><div className="mock-line" />
              <div className="mock-ex"><span>Exercice</span><div className="mock-line" /><div className="mock-btn" /></div>
            </div>
          </div>
        </section>

        <section className="section tinted">
          <div className="wrap">
            <h2>Comment ça marche</h2>
            <ol className="steps">
              <li>
                <strong>Choisissez une formation</strong> et créez votre compte avec une adresse e-mail que vous utilisez.
              </li>
              <li>
                <strong>Payez en toute sécurité</strong> avec le moyen de paiement proposé dans votre pays. L’accès s’ouvre tout seul après le paiement.
              </li>
              <li>
                <strong>Avancez à votre rythme</strong>, leçon après leçon, et reprenez là où vous vous êtes arrêté.
              </li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap split">
            <div>
              <h2>Invitez vos amis</h2>
              <p className="muted">Chaque compte a un lien personnel. Quand un ami s’inscrit grâce à lui, nous le savons.</p>
              <Link className="btn ghost" href="/inscription">Créer mon compte pour l’obtenir</Link>
            </div>
            <div className="faq-box">
              <h2>Questions fréquentes</h2>
              <RichText text={faq.body} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="cta-band">
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
