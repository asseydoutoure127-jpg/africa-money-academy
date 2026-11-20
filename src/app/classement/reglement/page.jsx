import Link from 'next/link';
import { BAREME, STREAK_BONUS } from '@/lib/points.js';
import { getDb } from '@/lib/db.js';
import { rankingConfig, monthLabel } from '@/lib/points.js';

export const metadata = { title: 'Règlement du classement', description: 'Comment on gagne des points et des pièces, et comment le cadeau du mois est attribué.' };

export default async function Reglement() {
  const cfg = await rankingConfig(getDb());
  const B = BAREME;
  const rows = [
    ['Créer votre compte', `${B.signup} points, une seule fois`],
    ['Ouvrir une leçon pour la première fois', `${B.lessonOpen} points`],
    ['Terminer une leçon', `${B.lessonDone} points`],
    ['Rendre un exercice', `${B.exercise} points`],
    ['Exercice validé et noté par l’équipe', `${B.validatedBase} points, plus ${B.validatedPerGrade} points par point de note sur 10 (une note de 8 : ${B.validatedBase + 8 * B.validatedPerGrade} points)`],
    ['Lire une leçon', `${B.readingPerTwoMinutes} point toutes les 2 minutes de lecture active, jusqu’à ${B.readingDailyCap} points par jour`],
    ['Revenir sur le site', `${B.login} points par jour`],
    ['Série de jours de suite', Object.entries(STREAK_BONUS).map(([d, p]) => `${d} jours : +${p}`).join(' · ')],
    ['Un ami s’inscrit avec votre lien', `${B.referral} points`],
    ['Terminer une formation', `${B.courseDone} points`],
  ];
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 820 }}>
        <p><Link href="/classement">← Retour au classement</Link></p>
        <h1>Règlement du classement</h1>
        <h2>Deux sortes de points</h2>
        <p><strong>Les points de classement</strong> servent à vous classer. Ils sont remis à zéro le 1er de chaque mois.</p>
        <p><strong>Les pièces</strong> servent à acheter dans la <Link href="/boutique">boutique</Link>. Elles s’accumulent et ne sont jamais remises à zéro. Chaque point gagné vous rapporte aussi une pièce.</p>

        <h2>Ce qui rapporte des points</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Gain</th></tr></thead>
            <tbody>{rows.map(([a, g]) => <tr key={a}><td>{a}</td><td>{g}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="muted">Le temps de lecture ne compte que si la leçon est affichée à l’écran et que vous faites défiler ou touchez la page. Laisser un téléphone ouvert ne rapporte rien.</p>

        <h2>Le cadeau</h2>
        <p>À la fin de chaque mois, la personne qui a le plus de points reçoit un cadeau. <strong>Le premier classement avec cadeau est celui de {monthLabel(cfg.start)}.</strong> Le mois qui précède est un classement d’essai, sans cadeau.{cfg.prize ? ` Cadeau annoncé : ${cfg.prize}.` : ' Le cadeau sera annoncé avant le début du mois.'}</p>
        <p>En cas d’égalité, la personne qui a atteint ce total en premier gagne. Le classement est arrêté le dernier jour du mois à 23 h 59 (heure de Bamako). Le gagnant est contacté par e-mail et apparaît dans le tableau d’honneur.</p>

        <h2>Les règles du jeu</h2>
        <ul>
          <li>Une seule personne par compte, un seul compte par personne.</li>
          <li>Les points viennent d’actions réelles sur le site. Toute tricherie (faux comptes, réponses recopiées au hasard, parrainages qui ne sont pas de vraies personnes) peut entraîner le retrait des points et l’exclusion du classement.</li>
          <li>La note d’un exercice est donnée par l’équipe. Si vous modifiez votre réponse après validation, la validation est retirée jusqu’à une nouvelle lecture.</li>
          <li>Votre nom apparaît sous la forme « prénom + initiale ». Vous pouvez le masquer depuis la page du classement.</li>
          <li>Les décisions de l’équipe sur le classement sont définitives. Le barème peut évoluer ; tout changement est annoncé ici avant de s’appliquer.</li>
        </ul>
      </div>
    </main>
  );
}
