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
