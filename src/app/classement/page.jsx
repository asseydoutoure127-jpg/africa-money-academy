import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { ranking, listHonor, rankingConfig, periodOf, monthLabel, monthEndLabel, touchDaily, safe } from '@/lib/points.js';
import { toggleRankHidden } from '@/app/actions/points.js';

export const metadata = {
  title: 'Classement du mois',
  description: 'Gagnez des points en apprenant. Le premier du classement à la fin du mois reçoit un cadeau.',
};

const STATUS_CLASS = { 'Exercice validé': 'ok', 'En cours': '', 'A commencé': 'grey', Inscrit: 'grey' };

export default async function Classement() {
  const db = getDb();
  const user = await getCurrentUser();
  if (user) await safe(() => touchDaily(db, user.id));
  const period = periodOf();
  const cfg = await rankingConfig(db);
  const trial = period < cfg.start;
  const { top, all, total } = await ranking(db, period, { limit: 10 });
  const me = user ? all.find((r) => r.id === user.id) : null;
  const meInTop = me ? top.some((r) => r.id === me.id) : false;
  const honor = await listHonor(db);
  return (
    <main>
      <div className="wrap board-page">
        <span className="badge gold">Classement du mois</span>
        <h1>{monthLabel(period).replace(/^./, (c) => c.toUpperCase())}</h1>
        <section className="card gold board-intro">
          <h2 style={{ marginTop: 0 }}>Comment ça marche</h2>
          <p>
            Chaque action sur le site vous rapporte des <strong>points de classement</strong> : vous inscrire, ouvrir une leçon, la terminer, rendre un exercice,
            lire, revenir plusieurs jours de suite. Quand l’exercice que vous rendez est validé et noté par l’équipe, c’est là que vous gagnez le plus.
          </p>
          {trial ? (
            <p><strong>Ce mois-ci, c’est un classement d’essai : il n’y a pas de cadeau.</strong> Le premier vrai classement, avec un cadeau, est celui de {monthLabel(cfg.start)}. Les points de {monthLabel(period)} ne sont pas reportés.</p>
          ) : (
            <p><strong>À la fin du mois ({monthEndLabel(period)}), la première personne du classement reçoit un cadeau.</strong>{cfg.prize ? ` Ce mois-ci : ${cfg.prize}.` : ''}</p>
          )}
          <p className="muted">Les points sont remis à zéro le 1er de chaque mois. À côté, vous gagnez aussi des <strong>pièces</strong> qui, elles, s’accumulent pour la <Link href="/boutique">boutique</Link>. <Link href="/classement/reglement">Lire le règlement complet</Link>.</p>
        </section>

        {total === 0 || top.every((r) => r.points === 0) ? (
          <p className="card">Personne n’a encore de points ce mois-ci. Soyez le premier : <Link href={user ? '/espace' : '/inscription'}>{user ? 'ouvrez une leçon' : 'créez votre compte'}</Link>.</p>
        ) : null}

        <ol className="board" aria-label="Les dix premiers du classement">
          {top.map((r) => (
            <li key={r.id} className={`${me && r.id === me.id ? 'me' : ''} ${r.rank <= 3 ? `top${r.rank}` : ''}`}>
              <span className="rk">{r.rank}</span>
              <span className="nm">{r.name}{me && r.id === me.id ? ' (vous)' : ''}</span>
              <span className={`badge ${STATUS_CLASS[r.status] || ''}`}>{r.status}</span>
              <strong className="pt">{r.points} pts</strong>
            </li>
          ))}
        </ol>
        {me && !meInTop && (
          <p className="board-me card">Vous êtes <strong>{me.rank}{me.rank === 1 ? 'er' : 'e'}</strong> sur {total}, avec <strong>{me.points} points</strong>. <Link href="/classement/reglement">Voir comment gagner des points</Link></p>
        )}
        {user && (
          <form action={toggleRankHidden} className="board-hide">
            <button className="btn ghost small" type="submit">{me?.hidden ? 'Afficher mon nom dans le classement' : 'Masquer mon nom dans le classement'}</button>
          </form>
        )}
        {!user && <p><Link className="btn gold" href="/inscription">Créer mon compte et entrer dans le classement</Link></p>}

        <section className="honor">
          <h2>Tableau d’honneur</h2>
          {honor.length === 0 ? (
            <p className="muted">Il s’ouvrira avec le premier gagnant, à la fin de {monthLabel(cfg.start)}.</p>
          ) : (
            <ul>
              {honor.map((h) => (
                <li key={`${h.period}-${h.rank}`}><strong>{monthLabel(h.period)}</strong> · {h.rank === 1 ? '1er' : `${h.rank}e`} : {h.display_name} ({h.points} pts){h.prize && h.rank === 1 ? ` · ${h.prize}` : ''}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
