import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';
import { resendVerification } from '@/app/actions/auth.js';
import { enrollFree } from '@/app/actions/learn.js';
import { ensureReferralCode, countReferred } from '@/lib/referral.js';

export const metadata = { title: 'Mon espace' };

export default async function Espace({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace');
  const db = getDb();
  const enrollments = await store.listUserEnrollments(db, user.id);
  await ensureReferralCode(db, user.id);
  const referred = await countReferred(db, user.id);
  const lastDone = await store.lastLessonDoneAt(db, user.id);
  const rows = [];
  for (const e of enrollments) {
    const modules = await store.listModulesWithLessons(db, e.course_id);
    const progress = computeProgress(modules, await store.listCompletedLessonIds(db, user.id, e.course_id));
    rows.push({ e, progress });
  }
  // Parcours conseillé : 1) la formation gratuite, 2) une formation payante, 3) le parrainage.
  const published = await store.listPublishedCourses(db);
  const free = published.find((c) => c.is_free) || null;
  const freeRow = free ? rows.find((r) => r.e.slug === free.slug) : null;
  const freeDone = Boolean(freeRow && freeRow.progress.totalLessons > 0 && freeRow.progress.percent >= 100);
  const freeStarted = Boolean(freeRow && freeRow.progress.doneLessons > 0);
  const owned = new Set(rows.map((r) => r.e.slug));
  const ownsPaid = rows.some((r) => !published.find((c) => c.slug === r.e.slug)?.is_free);
  const nextPaid = published.find((c) => !c.is_free && !owned.has(c.slug)) || null;
  // Encouragement selon le rythme : seulement pour quelqu'un qui a déjà terminé une leçon et n'a pas fini.
  const inProgress = rows.find((r) => r.progress.doneLessons > 0 && r.progress.percent < 100) || null;
  const daysAway = lastDone ? Math.floor((Date.now() - lastDone.getTime()) / 86400000) : null;
  const rhythm = inProgress && daysAway !== null
    ? daysAway === 0
      ? { tone: 'ok', title: 'Bravo, vous avez avancé aujourd’hui.', text: 'Revenez demain pour la leçon suivante : c’est la régularité qui fait réussir.' }
      : daysAway >= 3
        ? { tone: 'back', title: `Cela fait ${daysAway} jours.`, text: 'Dix minutes aujourd’hui suffisent pour reprendre. Vous n’avez rien perdu, vos réponses sont gardées.' }
        : null
    : null;
  const steps = [
    { n: 1, title: 'Apprendre les bases', text: 'La formation gratuite, pour partir du bon pied.', state: freeDone ? 'done' : freeStarted ? 'now' : 'todo' },
    { n: 2, title: 'Choisir votre formation', text: 'Celle qui correspond à ce que vous voulez faire.', state: ownsPaid ? 'done' : freeDone ? 'now' : 'todo' },
    { n: 3, title: 'Inviter vos amis', text: 'Gagnez 50 % quand un ami achète.', state: referred > 0 ? 'done' : 'todo' },
  ];
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
        {rhythm && (
          <section className={`card rhythm ${rhythm.tone}`}>
            <div>
              <strong>{rhythm.title}</strong>
              <p>{rhythm.text}</p>
            </div>
            <Link className="btn small gold" href={`/espace/formation/${inProgress.e.slug}`}>Continuer ma formation</Link>
          </section>
        )}
        {free && !freeStarted && (
          <section className="card gold start-card">
            <span className="badge gold">Commencez ici</span>
            <h2>{free.title}</h2>
            <p>C’est la formation gratuite, la première à suivre. Elle explique les bases dont tout le reste dépend. Vous lisez, vous faites un exercice, puis la leçon suivante s’ouvre.</p>
            {freeRow ? (
              <Link className="btn gold" href={`/espace/formation/${free.slug}`}>Commencer la première leçon</Link>
            ) : (
              <form action={enrollFree}>
                <input type="hidden" name="slug" value={free.slug} />
                <button className="btn gold" type="submit">Commencer gratuitement</button>
              </form>
            )}
          </section>
        )}
        {freeDone && nextPaid && (
          <section className="card gold start-card">
            <span className="badge gold">Prochaine étape</span>
            <h2>Bravo, vous avez terminé les bases.</h2>
            <p>Pour aller plus loin, nous vous conseillons : <strong>{nextPaid.title}</strong>{nextPaid.price_label ? ` (${nextPaid.price_label})` : ''}.</p>
            <Link className="btn gold" href={`/formations/${nextPaid.slug}`}>Voir cette formation</Link>
          </section>
        )}
        <ol className="path" aria-label="Votre parcours">
          {steps.map((st) => (
            <li key={st.n} className={st.state}>
              <span className="dot">{st.state === 'done' ? '✓' : st.n}</span>
              <div><strong>{st.title}</strong><span>{st.text}</span></div>
            </li>
          ))}
        </ol>
        <p>
          <Link className="btn ghost small" href="/outils">Ouvrir la boîte à outils (calculs gratuits)</Link>{' '}
          <Link className="btn ghost small" href="/reussir">Conseils pour réussir</Link>
        </p>
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
