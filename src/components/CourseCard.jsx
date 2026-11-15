import Link from 'next/link';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

export default function CourseCard({ course }) {
  return (
    <article className={`card course-card${course.is_free ? ' is-free' : ''}`}>
      {course.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.image_url} alt="" loading="lazy" decoding="async" />
      )}
      <div>
        <span className="badge">{LEVELS[course.level] || 'Débutant'}</span>{' '}
        {course.is_free && <span className="badge gold">Gratuit</span>}
      </div>
      <h3>{course.title}</h3>
      <p className="grow muted">{course.summary}</p>
      <div className="actions">
        {!course.is_free && course.price_label && <span className="price">{course.price_label}</span>}
        <Link className="btn small" href={`/formations/${course.slug}`}>
          Voir la formation
        </Link>
      </div>
    </article>
  );
}
