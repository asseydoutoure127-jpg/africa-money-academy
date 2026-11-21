'use client';

import { useState } from 'react';
import Link from 'next/link';

function toNumber(v) {
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/ | /g, ' ');

// Petit carnet de calcul : montre dès l'accueil la première habitude enseignée (revenus − dépenses = solde).
// Les chiffres de départ sont un exemple, rien n'est enregistré ni envoyé.
export default function Carnet({ ctaHref = '/formations' }) {
  const [revenu, setRevenu] = useState('60000');
  const [depenses, setDepenses] = useState('45000');
  const solde = toNumber(revenu) - toNumber(depenses);
  const part = toNumber(revenu) > 0 ? Math.round((Math.max(solde, 0) / toNumber(revenu)) * 100) : 0;

  let message = 'Entrez vos chiffres du mois pour voir ce qu’il vous reste.';
  if (toNumber(revenu) > 0) {
    if (solde < 0) message = 'Vous dépensez plus que vous ne gagnez. La formation gratuite commence par là.';
    else if (solde === 0) message = 'Rien ne reste en fin de mois. Un premier objectif : mettre un petit montant de côté.';
    else message = `Vous pouvez mettre de côté environ ${part} % de vos revenus.`;
  }

  return (
    <form className="carnet" onSubmit={(e) => e.preventDefault()} aria-label="Carnet du mois">
      <h2>Votre carnet du mois</h2>
      <p className="hint">Exemple à modifier. Rien n’est enregistré.</p>
      <label htmlFor="carnet-revenu">Ce que j’ai reçu (FCFA)</label>
      <input id="carnet-revenu" type="number" inputMode="numeric" min="0" step="500" value={revenu} onChange={(e) => setRevenu(e.target.value)} />
      <label htmlFor="carnet-depenses">Ce que j’ai dépensé (FCFA)</label>
      <input id="carnet-depenses" type="number" inputMode="numeric" min="0" step="500" value={depenses} onChange={(e) => setDepenses(e.target.value)} />
      <div className="solde" aria-live="polite">
        <span>Il me reste</span>
        <strong className={solde < 0 ? 'neg' : ''}>{solde < 0 ? '−' : ''}{fmt(Math.abs(solde))} FCFA</strong>
      </div>
      <p className="carnet-msg">{message}</p>
      <Link className="btn go gold block" href={ctaHref}>Apprendre à faire son budget : leçon gratuite</Link>
    </form>
  );
}
