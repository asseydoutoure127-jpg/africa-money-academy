import Link from 'next/link';
import { typo } from '@/lib/typo.js';
import { photoForCourse } from '@/lib/photos.js';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

export default function CourseCard({ course, counts, upcoming = false }) {
  const body = (
    <>
      <div className="thumb">
        {(photoForCourse(course.slug) || course.image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoForCourse(course.slug)?.s || course.image_url} alt="" loading="lazy" decoding="async" width="720" height="402" />
        )}
        <div className="thumb-badges">
          {course.is_free && <span className="badge gold">Gratuit · Commencez ici</span>}
          {upcoming && <span className="badge grey">Bientôt disponible</span>}
          <span className="badge">{LEVELS[course.level] || 'Débutant'}</span>
        </div>
      </div>
      <h3>{typo(course.title)}</h3>
      <p className="grow muted">{course.summary}</p>
      {counts && (
        <ul className="stats-line" aria-label="Contenu de la formation">
          <li><strong>{counts.modules}</strong> modules</li>
          <li><strong>{counts.lessons}</strong> leçons</li>
          <li><strong>{counts.pages}</strong> pages</li>
        </ul>
      )}
      <div className="actions">
        {!upcoming && !course.is_free && course.price_label && <span className="price">{course.price_label}</span>}
        {upcoming ? (
          <span className="muted small">Ouverture prochainement</span>
        ) : (
          <Link className="btn small" href={`/formations/${course.slug}`}>
            Voir la formation
          </Link>
        )}
      </div>
    </>
  );
  return <article className={`card course-card${course.is_free ? ' is-free' : ''}${upcoming ? ' is-upcoming' : ''}`}>{body}</article>;
}
