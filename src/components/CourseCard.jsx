import Link from 'next/link';
import { typo } from '@/lib/typo.js';
import { photoForCourse } from '@/lib/photos.js';

const LEVELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };

export default function CourseCard({ course, counts, upcoming = false }) {
  const img = photoForCourse(course.slug)?.s || course.image_url || '/photos/groupe-s.webp';
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bg" src={img} alt="" loading="lazy" decoding="async" width="720" height="402" />
      <div className="pc-top">
        {course.is_free && <span className="tag gold">Gratuit</span>}
        {upcoming && <span className="tag">Bientôt</span>}
        <span className="tag">{LEVELS[course.level] || 'Débutant'}</span>
      </div>
      <div className="pc-body">
        <h3>{typo(course.title)}</h3>
        <p>{course.summary}</p>
        {course.outcome && <p className="pc-outcome"><strong>À la fin :</strong> {course.outcome}</p>}
        {counts && <p style={{ fontSize: '.82rem', opacity: .85 }}>{counts.modules} modules · {counts.lessons} leçons</p>}
        {upcoming ? (
          <span className="tag">Ouverture prochainement</span>
        ) : (
          <span className="btn go gold">{!course.is_free && course.price_label ? course.price_label : 'Voir la formation'}</span>
        )}
      </div>
    </>
  );
  const cls = `pcard course-card${upcoming ? ' is-upcoming' : ''}`;
  return upcoming ? <article className={cls}>{inner}</article> : <Link className={cls} href={`/formations/${course.slug}`} style={{ textDecoration: 'none' }}>{inner}</Link>;
}
