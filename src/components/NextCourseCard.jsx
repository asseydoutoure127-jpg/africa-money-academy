import Link from 'next/link';

/** Invitation vers la formation suivante, affichée à la fin d'un module ou d'une formation gratuite. */
export default function NextCourseCard({ course, pitch, finished = false }) {
  if (!course) return null;
  return (
    <aside className="card gold next-course">
      <p className="next-kicker">{finished ? 'Vous avez terminé cette formation. Et maintenant ?' : 'Module terminé. Et si vous alliez plus loin ?'}</p>
      <h2 style={{ marginTop: 0 }}>{course.title}</h2>
      {pitch && <p>{pitch}</p>}
      {course.outcome && <p className="small"><strong>À la fin :</strong> {course.outcome}</p>}
      <p>
        <Link className="btn go gold" href={`/formations/${course.slug}`}>
          Découvrir la formation{course.price_label ? ` · ${course.price_label}` : ''}
        </Link>
      </p>
    </aside>
  );
}
