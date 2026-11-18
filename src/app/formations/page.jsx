import Link from 'next/link';
import CourseCard from '@/components/CourseCard.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';

export const metadata = { title: 'Formations', description: 'Toutes les formations Africa Money Academy.' };

export default async function Catalogue() {
  const db = getDb();
  const courses = await store.listPublishedCourses(db);
  const upcoming = await store.listUpcomingCourses(db);
  const counts = await store.courseCounts(db, [...courses, ...upcoming].map((c) => c.id));
  return (
    <main>
      <div className="wrap">
        <header className="page-head">
          <h1>Nos formations</h1>
          <p className="muted">
            Des parcours pour apprendre à gagner de l’argent pas à pas, avec des exemples en FCFA et un exercice à chaque leçon.
          </p>
        </header>
        {courses.some((c) => c.is_free) && (
          <section className="card soft where-start">
            <h2 style={{ marginTop: 0 }}>Par où commencer ?</h2>
            <ol>
              <li><strong>Commencez par la formation gratuite</strong> : « {courses.find((c) => c.is_free).title} ». Elle explique les bases, sans rien payer.</li>
              <li><strong>Ensuite, choisissez</strong> la formation qui correspond à ce que vous voulez faire : vendre, travailler en freelance, lancer une activité ou créer un produit.</li>
              <li><strong>Utilisez la <Link href="/outils">boîte à outils</Link></strong> pour faire vos calculs en FCFA.</li>
            </ol>
          </section>
        )}
        {courses.length === 0 && upcoming.length === 0 ? (
          <div className="card soft">
            <p style={{ margin: 0 }}>
              <strong>Aucune formation n’est ouverte pour le moment.</strong> Revenez bientôt : les premières formations arrivent.
            </p>
          </div>
        ) : (
          <>
            {courses.length > 0 && (
              <>
                <h2>Ouvertes maintenant</h2>
                <div className="grid cols-3">
                  {courses.map((c) => (
                    <CourseCard key={c.id} course={c} counts={counts.get(c.id)} />
                  ))}
                </div>
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <h2 style={{ marginTop: 40 }}>Prochainement</h2>
                <div className="grid cols-3">
                  {upcoming.map((c) => (
                    <CourseCard key={c.id} course={c} upcoming />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
