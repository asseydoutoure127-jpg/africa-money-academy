import CourseCard from '@/components/CourseCard.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';

export const metadata = { title: 'Formations', description: 'Toutes les formations Africa Money Academy.' };

export default async function Catalogue() {
  const courses = await store.listPublishedCourses(getDb());
  return (
    <main>
      <div className="wrap">
        <h1>Nos formations</h1>
        {courses.length === 0 ? (
          <div className="card soft">
            <p style={{ margin: 0 }}>
              <strong>Aucune formation n’est ouverte pour le moment.</strong> Revenez bientôt : les premières formations
              arrivent.
            </p>
          </div>
        ) : (
          <div className="grid cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
