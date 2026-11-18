import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';
import { resendVerification } from '@/app/actions/auth.js';
import { ensureReferralCode, countReferred } from '@/lib/referral.js';

export const metadata = { title: 'Mon espace' };

export default async function Espace({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace');
  const db = getDb();
  const enrollments = await store.listUserEnrollments(db, user.id);
  await ensureReferralCode(db, user.id);
  const referred = await countReferred(db, user.id);
  const rows = [];
  for (const e of enrollments) {
    const modules = await store.listModulesWithLessons(db, e.course_id);
    const progress = computeProgress(modules, await store.listCompletedLessonIds(db, user.id, e.course_id));
    rows.push({ e, progress });
  }
  return (
    <main>
      <div className="wrap">
        <h1>Bonjour {user.name.split(' ')[0]}</h1>
        <Flash code={sp.m} />
        {!user.email_verified_at && (
          <div className="notice">
            <p style={{ marginTop: 0 }}>
              <strong>Confirmez votre adresse e-mail.</strong> Sans cela, un paiement fait avec cette adresse ne peut pas ouvrir votre accès. Nous vous avons envoyé un lien à l’inscription.
            </p>
            <form action={resendVerification}>
              <button className="btn small" type="submit">
                Renvoyer l’e-mail de confirmation
              </button>
            </form>
          </div>
        )}
        <h2>Mes formations</h2>
        {rows.length === 0 ? (
          <div className="card soft">
            <p style={{ marginTop: 0 }}>Vous n’avez pas encore de formation.</p>
            <Link className="btn" href="/formations">
              Voir les formations
            </Link>
          </div>
        ) : (
          <div className="grid cols-2">
            {rows.map(({ e, progress }) => (
              <article className="card my-course" key={e.id}>
                {e.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.image_url} alt="" loading="lazy" />
                )}
                <div className="my-body">
                <h3>{e.title}</h3>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="muted small">
                  {progress.doneLessons} leçon{progress.doneLessons > 1 ? 's' : ''} terminée{progress.doneLessons > 1 ? 's' : ''} sur {progress.totalLessons} ({progress.percent} %)
                </p>
                <Link className="btn small" href={`/espace/formation/${e.slug}`}>
                  {progress.doneLessons > 0 ? 'Continuer' : 'Commencer'}
                </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        <section className="card gold" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Parrainez vos amis, gagnez 50 %</h2>
          <p>Quand un ami s’inscrit avec votre lien et achète une formation, vous recevez la moitié du prix.</p>
          <p style={{ marginBottom: 0 }}>
            <Link className="btn gold small" href="/parrainage">Voir mon lien et les détails</Link>{' '}
            <span className="muted small">{referred === 0 ? 'Aucun ami inscrit pour l’instant.' : `${referred} ami${referred > 1 ? 's' : ''} inscrit${referred > 1 ? 's' : ''}.`}</span>
          </p>
        </section>
        <p style={{ marginTop: 24 }}>
          <Link href="/espace/profil">Mon profil</Link>
        </p>
      </div>
    </main>
  );
}
