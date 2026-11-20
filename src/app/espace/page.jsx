import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';
import { resendVerification } from '@/app/actions/auth.js';
import { enrollFree } from '@/app/actions/learn.js';
import { ensureReferralCode, countReferred } from '@/lib/referral.js';
import { touchDaily, safe, myStanding, coinBalance, currentStreak, periodOf, weekOverview } from '@/lib/points.js';
import Icon from '@/components/Icon.jsx';
import { photoForCourse } from '@/lib/photos.js';

export const metadata = { title: 'Mon espace' };

export default async function Espace({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace');
  const db = getDb();
  await safe(() => touchDaily(db, user.id));
  const enrollments = await store.listUserEnrollments(db, user.id);
  const standing = await safe(() => myStanding(db, user.id, periodOf()));
  const coins = (await safe(() => coinBalance(db, user.id))) ?? 0;
  const streak = (await safe(() => currentStreak(db, user.id))) ?? 0;
  const week = await safe(() => weekOverview(db, user.id));
  await ensureReferralCode(db, user.id);
  const referred = await countReferred(db, user.id);
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
  const nextPaid = published.find((c) => !c.is_free && !owned.has(c.slug)) || null;
  const imgOf = (slug, fallback) => photoForCourse(slug)?.s || fallback || '/photos/groupe-s.jpg';
  const current = rows.find((r) => r.progress.percent < 100) || null;
  const first = user.name.split(' ')[0];
  return (
    <main>
      <div className="wrap">
        <div className="app-top">
          <div className="who">
            <small>Bonjour,</small>
            <h1>{first}</h1>
          </div>
        </div>
        <Flash code={sp.m} />
        {!user.email_verified_at && (
          <div className="notice">
            <p style={{ marginTop: 0 }}>
              <strong>Confirmez votre adresse e-mail.</strong> Sans cela, un paiement fait avec cette adresse ne peut pas ouvrir votre accès. Nous vous avons envoyé un lien à l’inscription.
            </p>
            <form action={resendVerification}>
              <button className="btn small pill" type="submit">Renvoyer l’e-mail de confirmation</button>
            </form>
          </div>
        )}

        <div className="kpis" aria-label="Mes points">
          <Link href="/classement" className="kpi"><Icon name="trophy" size={22} /><strong>{standing ? standing.points : 0}</strong><span>points ce mois-ci</span></Link>
          <Link href="/classement" className="kpi"><Icon name="users" size={22} /><strong>{standing ? `${standing.rank}ᵉ` : '—'}</strong><span>au classement</span></Link>
          <Link href="/boutique" className="kpi"><Icon name="coins" size={22} /><strong>{coins}</strong><span>pièces boutique</span></Link>
        </div>

        {current ? (
          <article className="pcard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bg" src={imgOf(current.e.slug, current.e.image_url)} alt="" />
            <div className="pc-top"><span className="tag gold">{current.progress.doneLessons > 0 ? 'Continuer' : 'À commencer'}</span><span className="tag">{current.progress.percent} %</span></div>
            <div className="pc-body">
              <h2>{current.e.title}</h2>
              <div className="pbar" aria-hidden="true"><span style={{ width: `${current.progress.percent}%` }} /></div>
              <p>{current.progress.doneLessons} leçon{current.progress.doneLessons > 1 ? 's' : ''} terminée{current.progress.doneLessons > 1 ? 's' : ''} sur {current.progress.totalLessons}</p>
              <Link className="btn go gold" href={`/espace/formation/${current.e.slug}`}>{current.progress.doneLessons > 0 ? 'Reprendre la leçon' : 'Commencer'}</Link>
            </div>
          </article>
        ) : free && !freeRow ? (
          <article className="pcard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bg" src={imgOf(free.slug, free.image_url)} alt="" />
            <div className="pc-top"><span className="tag gold">Gratuit · Commencez ici</span></div>
            <div className="pc-body">
              <h2>{free.title}</h2>
              <p>La première formation à suivre : vous lisez, vous faites un exercice, puis la leçon suivante s’ouvre.</p>
              <form action={enrollFree}>
                <input type="hidden" name="slug" value={free.slug} />
                <button className="btn go gold" type="submit">Commencer gratuitement</button>
              </form>
            </div>
          </article>
        ) : freeDone && nextPaid ? (
          <article className="pcard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bg" src={imgOf(nextPaid.slug, nextPaid.image_url)} alt="" />
            <div className="pc-top"><span className="tag gold">Prochaine étape</span></div>
            <div className="pc-body">
              <h2>Bravo, les bases sont acquises.</h2>
              <p>Nous vous conseillons : {nextPaid.title}{nextPaid.price_label ? ` (${nextPaid.price_label})` : ''}.</p>
              <Link className="btn go gold" href={`/formations/${nextPaid.slug}`}>Voir cette formation</Link>
            </div>
          </article>
        ) : null}

        <Link href="/parrainage" className="promo-ref">
          <span className="ic"><Icon name="gift" size={26} /></span>
          <span><strong>Parrainez vos amis, gagnez 50 %</strong><small>{referred === 0 ? 'Votre lien personnel vous attend.' : `${referred} ami${referred > 1 ? 's' : ''} inscrit${referred > 1 ? 's' : ''} avec votre lien.`}</small></span>
        </Link>

        {week && (
          <>
            <div className="sec-title"><h2>Ma semaine</h2><span className="muted small">{streak} jour{streak > 1 ? 's' : ''} de suite</span></div>
            <div className="weekrow" aria-label="Jours de la semaine où vous êtes venu">
              {week.days.map((d, i) => (
                <div key={i} className={`${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}>
                  {d.label}
                  <i>{d.done ? <Icon name="check" size={18} /> : '·'}</i>
                </div>
              ))}
            </div>
            <div className="sec-title"><h2>Missions du jour</h2><Link href="/classement/reglement">Les points</Link></div>
            <ul className="missions">
              {week.missions.map((m) => (
                <li key={m.key} className={m.done ? 'done' : ''}>
                  <span className="ic"><Icon name={m.done ? 'check' : m.key === 'read' ? 'clock' : m.key === 'visit' ? 'flame' : 'book'} size={22} /></span>
                  <div>
                    <strong>{m.label}</strong>
                    <div className="pbar dark" aria-hidden="true"><span style={{ width: `${Math.round((m.value / m.goal) * 100)}%`, background: m.done ? 'var(--ok)' : 'var(--saffron)' }} /></div>
                  </div>
                  <span className="rw">+{m.reward}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="sec-title"><h2>Mes formations</h2><Link href="/formations">Toutes</Link></div>
        {rows.length === 0 ? (
          <div className="card soft">
            <p style={{ marginTop: 0 }}>Vous n’avez pas encore de formation.</p>
            <Link className="btn go" href="/formations">Voir les formations</Link>
          </div>
        ) : (
          <div className="hlist">
            {rows.map(({ e, progress }) => (
              <Link key={e.id} href={`/espace/formation/${e.slug}`} className="pcard" style={{ minHeight: 210, textDecoration: 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="bg" src={imgOf(e.slug, e.image_url)} alt="" loading="lazy" />
                <div className="pc-top"><span className="tag">{progress.percent} %</span></div>
                <div className="pc-body">
                  <h3>{e.title}</h3>
                  <div className="pbar" aria-hidden="true" style={{ marginBottom: 0 }}><span style={{ width: `${progress.percent}%` }} /></div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="sec-title"><h2>Pour aller plus loin</h2></div>
        <div className="tiles">
          <Link href="/parrainage" className="tile"><span className="ic"><Icon name="gift" size={22} /></span><strong>Parrainage</strong><span>{referred === 0 ? 'Gagnez 50 % quand un ami achète.' : `${referred} ami${referred > 1 ? 's' : ''} inscrit${referred > 1 ? 's' : ''}.`}</span></Link>
          <Link href="/outils" className="tile"><span className="ic"><Icon name="target" size={22} /></span><strong>Boîte à outils</strong><span>Calculs gratuits.</span></Link>
          <Link href="/boutique" className="tile"><span className="ic"><Icon name="bag" size={22} /></span><strong>Boutique</strong><span>Dépensez vos pièces.</span></Link>
          <Link href="/espace/profil" className="tile"><span className="ic"><Icon name="user" size={22} /></span><strong>Mon profil</strong><span>Infos et mot de passe.</span></Link>
        </div>
      </div>
    </main>
  );
}
