import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import Icon from '@/components/Icon.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { computeProgress } from '@/lib/progress.js';
import { siteFlags } from '@/lib/flags.js';
import { safe, myStanding, coinBalance, currentStreak, periodOf, monthLabel, KIND_LABELS } from '@/lib/points.js';
import { countReferred, ensureReferralCode } from '@/lib/referral.js';
import { profileData } from '@/lib/profile.js';
import { updateProfile, changePassword, deleteAccount, logout } from '@/app/actions/auth.js';

export const metadata = { title: 'Mon profil' };

const day = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const dayShort = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' }) : '—');
const ORDER = { pending: 'En préparation', delivered: 'Livré', cancelled: 'Annulé' };
const ACTION = { signup: 'Inscription', lesson_open: 'Leçon ouverte', lesson_done: 'Leçon terminée', exercise: 'Exercice rendu', validated: 'Exercice validé et noté', login: 'Visite du jour', streak: 'Bonus de série', reading: 'Temps de lecture', referral: 'Ami parrainé', course_done: 'Formation terminée' };

export default async function Profil({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace/profil');
  const nameErr = sp.m === 'nom_invalide';
  const pwErr = ['mdp_actuel', 'mdp_court', 'mdp_different'].includes(sp.m);
  const delErr = ['suppression_confirmation', 'dernier_admin'].includes(sp.m);
  const db = getDb();
  const flags = await siteFlags(db);
  const [standing, coins, streak, referred, data, enrollments] = await Promise.all([
    safe(() => myStanding(db, user.id, periodOf())),
    safe(() => coinBalance(db, user.id)),
    safe(() => currentStreak(db, user.id)),
    countReferred(db, user.id),
    profileData(db, user.id),
    store.listUserEnrollments(db, user.id),
  ]);
  await ensureReferralCode(db, user.id);
  const courses = [];
  for (const e of enrollments) {
    const modules = await store.listModulesWithLessons(db, e.course_id);
    courses.push({ e, progress: computeProgress(modules, await store.listCompletedLessonIds(db, user.id, e.course_id)) });
  }
  const t = data.totals;
  const maxMonth = Math.max(1, ...data.months.map((m) => m.pts));
  const rankText = flags.rankingOpen ? (standing ? `${standing.rank}ᵉ` : '—') : '—';
  return (
    <main>
      <div className="narrow">
        <Flash code={sp.m} />
        <section className="profile-head">
          <span className="avatar-lg big" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
          <h1>{user.name}</h1>
          <p className="muted">
            {user.email} {user.email_verified_at ? <span className="badge">Confirmée</span> : <span className="badge red">À confirmer</span>}
          </p>
          <p className="muted">Membre depuis le {day(data.memberSince)}</p>
        </section>

        <section className="pf-hero" aria-label="Mes chiffres">
          <div><Icon name="trophy" size={22} /><strong>{standing ? standing.points : 0}</strong><span>points ce mois-ci</span></div>
          <div><Icon name="coins" size={22} /><strong>{coins ?? 0}</strong><span>pièces</span></div>
          <div><Icon name="flame" size={22} /><strong>{streak ?? 0}</strong><span>jour{(streak ?? 0) > 1 ? 's' : ''} de suite</span></div>
          <div><Icon name="users" size={22} /><strong>{rankText}</strong><span>{flags.rankingOpen ? 'au classement' : 'classement : bientôt'}</span></div>
        </section>
        {!flags.rankingOpen && <p className="muted pf-note">Le classement n’a pas encore commencé. Vos points s’accumulent déjà et seront comptés.</p>}

        <h2 className="pf-h">Mes statistiques</h2>
        <section className="pf-stats">
          <div><strong>{t.points_total}</strong><span>points gagnés en tout</span></div>
          <div><strong>{t.lessons_done}</strong><span>leçon{t.lessons_done > 1 ? 's' : ''} terminée{t.lessons_done > 1 ? 's' : ''}</span></div>
          <div><strong>{t.exercises_sent}</strong><span>exercice{t.exercises_sent > 1 ? 's' : ''} rendu{t.exercises_sent > 1 ? 's' : ''}</span></div>
          <div><strong>{t.exercises_validated}</strong><span>validé{t.exercises_validated > 1 ? 's' : ''}</span></div>
          <div><strong>{data.gradeAvg !== null ? `${String(data.gradeAvg).replace('.', ',')}/10` : '—'}</strong><span>note moyenne</span></div>
          <div><strong>{data.bestStreak}</strong><span>meilleure série (jours)</span></div>
          <div><strong>{t.days_active}</strong><span>jour{t.days_active > 1 ? 's' : ''} de visite</span></div>
          <div><strong>{data.readingMinutes}</strong><span>min de lecture</span></div>
        </section>

        <h2 className="pf-h">Mes formations</h2>
        {courses.length === 0 ? (
          <div className="card"><p>Vous n’avez pas encore de formation. <Link href="/formations">Voir les formations</Link></p></div>
        ) : courses.map(({ e, progress }) => (
          <Link key={e.slug} href={`/espace/formation/${e.slug}`} className="pf-course">
            <div className="lc-top"><strong>{e.title}</strong><span>{progress.percent} %</span></div>
            <div className="lesson-progress" aria-hidden="true"><i style={{ width: `${progress.percent}%` }} /></div>
            <small className="muted">{progress.doneLessons} / {progress.totalLessons} leçons{e.status !== 'active' ? ' · accès retiré' : ''}</small>
          </Link>
        ))}

        <h2 className="pf-h">Mes réussites</h2>
        <ul className="pf-badges">
          {data.achievements.map((a) => (
            <li key={a.key} className={a.done ? 'on' : ''}>
              <span aria-hidden="true">{a.done ? '✓' : '○'}</span>{a.title}<small>{a.done ? 'obtenue' : 'à débloquer'}</small>
            </li>
          ))}
        </ul>

        <h2 className="pf-h">Mes exercices et les retours reçus</h2>
        {data.exercises.length === 0 ? (
          <div className="card"><p className="muted">Aucun exercice rendu pour l’instant. Chaque leçon en propose un.</p></div>
        ) : data.exercises.map((x, i) => (
          <article key={i} className="card pf-ex">
            <div className="lc-top"><strong>{x.lesson_title}</strong>
              {x.status === 'validated' ? <span className="badge ok">Validé{x.grade !== null ? ` · ${x.grade}/10` : ''}</span> : x.status === 'needs_correction' ? <span className="badge gold">Correction demandée</span> : x.status === 'refused' ? <span className="badge red">À refaire</span> : <span className="badge grey">En attente de correction</span>}</div>
            <small className="muted">{x.course_title} · rendu le {dayShort(x.submitted_at)}</small>
            {x.feedback && <p className="pf-fb">« {x.feedback} »</p>}
          </article>
        ))}

        <h2 className="pf-h">Mes points mois par mois</h2>
        {data.months.length === 0 ? (
          <div className="card"><p className="muted">Pas encore de points. Ouvrez une leçon pour commencer.</p></div>
        ) : (
          <section className="card pf-months">
            {data.months.map((m) => (
              <div key={m.period}><span>{monthLabel(m.period)}</span><div className="bar"><i style={{ width: `${Math.round((m.pts / maxMonth) * 100)}%` }} /></div><strong>{m.pts}</strong></div>
            ))}
          </section>
        )}

        <h2 className="pf-h">Mon activité récente</h2>
        {data.recent.length === 0 ? (
          <div className="card"><p className="muted">Rien pour l’instant.</p></div>
        ) : (
          <ul className="pf-feed">
            {data.recent.map((r, i) => (
              <li key={i}><span>{ACTION[r.kind] || KIND_LABELS[r.kind] || r.kind}{r.lesson ? ` : ${r.lesson}` : ''}<small>{dayShort(r.at)}</small></span><strong>{r.points > 0 ? `+${r.points}` : r.points}</strong></li>
            ))}
          </ul>
        )}

        {(flags.shopOpen || data.orders.length > 0) && (
          <>
            <h2 className="pf-h">Mes achats en boutique</h2>
            {data.orders.length === 0 ? (
              <div className="card"><p className="muted">Aucun achat. <Link href="/boutique">Voir la boutique</Link></p></div>
            ) : (
              <ul className="pf-feed">
                {data.orders.map((o, i) => <li key={i}><span>{o.item_title}<small>{dayShort(o.created_at)} · {ORDER[o.status] || o.status}</small></span><strong>−{o.price_coins}</strong></li>)}
              </ul>
            )}
          </>
        )}

        <h2 className="pf-h">Parrainage</h2>
        <Link href="/parrainage" className="card pf-ref"><Icon name="gift" size={22} /><span><strong>{referred} ami{referred > 1 ? 's' : ''} inscrit{referred > 1 ? 's' : ''}</strong><small className="muted">Voir mon lien et mes gains</small></span></Link>

        <h2 className="pf-h">Réglages du compte</h2>

        <div className="settings">
          <details open={nameErr}>
            <summary><span className="ic"><Icon name="user" size={20} /></span><span>Modifier mon nom</span></summary>
            <form action={updateProfile}>
              <label htmlFor="name">Prénom et nom</label>
              <input id="name" name="name" type="text" defaultValue={user.name} required minLength={2} maxLength={100} />
              <p><button className="btn go" type="submit">Enregistrer le nom</button></p>
            </form>
          </details>
          <details open={pwErr}>
            <summary><span className="ic"><Icon name="lock" size={20} /></span><span>Changer le mot de passe</span></summary>
            <form action={changePassword}>
              <label htmlFor="current">Mot de passe actuel</label>
              <input id="current" name="current" type="password" autoComplete="current-password" required />
              <label htmlFor="password">Nouveau mot de passe</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
              <label htmlFor="confirm">Répétez le nouveau mot de passe</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
              <p><button className="btn go" type="submit">Changer le mot de passe</button></p>
            </form>
          </details>
          <Link href="/classement/reglement" className="srow"><span className="ic"><Icon name="trophy" size={20} /></span><span>Règlement du classement</span><span className="chev" aria-hidden="true">›</span></Link>
          <Link href="/parrainage" className="srow"><span className="ic"><Icon name="gift" size={20} /></span><span>Mon lien de parrainage</span><span className="chev" aria-hidden="true">›</span></Link>
        </div>

        <form action={logout} style={{ marginTop: 22 }}>
          <button className="btn ghost pill block" type="submit">Me déconnecter</button>
        </form>
        <details className="danger-zone" open={delErr}>
          <summary>Supprimer mon compte</summary>
          <form action={deleteAccount}>
            <p>Cette action est définitive : votre compte, votre progression et vos accès seront effacés.</p>
            <label htmlFor="confirmation">Écrivez SUPPRIMER pour confirmer</label>
            <input id="confirmation" name="confirmation" type="text" autoComplete="off" required />
            <label htmlFor="pw">Votre mot de passe</label>
            <input id="pw" name="password" type="password" autoComplete="current-password" required />
            <p><button className="btn danger pill" type="submit">Supprimer définitivement</button></p>
          </form>
        </details>
      </div>
    </main>
  );
}
