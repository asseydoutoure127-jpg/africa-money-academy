import Link from 'next/link';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

export default function CourseCard({ course, counts, upcoming = false }) {
  const body = (
    <>
      {course.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.image_url} alt="" loading="lazy" decoding="async" />
      )}
      <div>
        <span className="badge">{LEVELS[course.level] || 'Débutant'}</span>{' '}
        {course.is_free && <span className="badge gold">Gratuit</span>}
        {upcoming && <span className="badge grey">Bientôt disponible</span>}
      </div>
      <h3>{course.title}</h3>
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
