import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import CourseCard from '@/components/CourseCard.jsx';
import Carnet from '@/components/Carnet.jsx';
import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { getPageText } from '@/lib/pages.js';

export default async function Home({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const courses = (await store.listPublishedCourses(db)).slice(0, 3);
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
        <section className="section">
          <div className="wrap">
            <h2 className="section-title">Une école pensée pour les débutants</h2>
            <p className="muted" style={{ maxWidth: '60ch' }}>
              Pour les jeunes, les étudiants et celles et ceux qui cherchent une première source de revenu en Afrique
              francophone. Chaque formation avance par étapes courtes, et vous voyez votre progression.
            </p>
            <div className="facts">
              <div>
                <strong>Écrit pour le téléphone</strong>Des leçons lisibles même avec une connexion lente.
              </div>
              <div>
                <strong>Des exemples d’ici</strong>Des montants en FCFA et des situations que vous connaissez.
              </div>
              <div>
                <strong>Une action par leçon</strong>Vous appliquez tout de suite ce que vous venez d’apprendre.
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2>Nos formations</h2>
            {courses.length === 0 ? (
              <div className="card soft">
                <p style={{ margin: 0 }}>
                  <strong>Les premières formations arrivent bientôt.</strong> Créez votre compte pour être prêt le jour de
                  l’ouverture.
                </p>
              </div>
            ) : (
              <>
                <div className="grid cols-3">
                  {courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </div>
                <p style={{ marginTop: 16 }}>
                  <Link href="/formations">Toutes les formations</Link>
                </p>
              </>
            )}
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2>Comment ça marche</h2>
            <ol className="steps">
              <li>
                <strong>Choisissez une formation</strong> et créez votre compte avec une adresse e-mail que vous utilisez.
              </li>
              <li>
                <strong>Payez en toute sécurité</strong> avec le moyen de paiement proposé dans votre pays. L’accès s’ouvre tout
                seul après le paiement.
              </li>
              <li>
                <strong>Avancez à votre rythme</strong>, module après module, et reprenez là où vous vous êtes arrêté.
              </li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <h2>Questions fréquentes</h2>
            <RichText text={faq.body} />
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
