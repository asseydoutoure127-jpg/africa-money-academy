import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import CourseCard from '@/components/CourseCard.jsx';
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
        <div className="wrap">
          <Flash code={sp.m} />
          <h1>Apprenez à gagner de l’argent sur Internet, en partant de zéro.</h1>
          <p>
            Des formations écrites en français, avec des mots simples, à suivre pas à pas depuis votre téléphone. Pas de
            promesse magique : des méthodes concrètes et un travail régulier.
          </p>
          <div className="actions">
            <Link className="btn gold" href="/formations">
              Voir les formations
            </Link>
            <Link className="btn ghost" style={{ color: '#fff', borderColor: '#fff' }} href="/inscription">
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      <main style={{ padding: 0 }}>
        <section className="section">
          <div className="wrap">
            <h2>Une école pensée pour les débutants</h2>
            <p className="muted" style={{ maxWidth: '60ch' }}>
              Africa Money Academy s’adresse aux jeunes, aux étudiants et aux entrepreneurs débutants d’Afrique francophone qui
              n’ont jamais travaillé sur Internet. Chaque formation avance par étapes courtes, et vous voyez votre progression.
            </p>
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
                  <Link href="/formations">Toutes les formations →</Link>
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
            <div className="card soft center">
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
