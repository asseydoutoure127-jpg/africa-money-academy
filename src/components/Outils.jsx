'use client';

import { useState } from 'react';

const num = (v) => {
  const n = Number(String(v).replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/[  ]/g, ' ')} FCFA`;

function Field({ id, label, value, onChange, hint, suffix = 'FCFA' }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="field-suffix">
        <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
        <span>{suffix}</span>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </>
  );
}

function Budget() {
  const [income, setIncome] = useState('');
  const [needs, setNeeds] = useState('');
  const [wants, setWants] = useState('');
  const i = num(income), n = num(needs), w = num(wants);
  const left = i - n - w;
  return (
    <section className="card tool" id="budget">
      <h2>Mon budget du mois</h2>
      <p className="muted">Notez ce qui entre et ce qui sort. Ce qui reste est ce que vous pouvez mettre de côté.</p>
      <Field id="b-in" label="Argent reçu ce mois" value={income} onChange={setIncome} hint="Salaire, ventes, aide de la famille, petits travaux…" />
      <Field id="b-needs" label="Dépenses obligatoires" value={needs} onChange={setNeeds} hint="Loyer, nourriture, transport, crédit téléphone, école…" />
      <Field id="b-wants" label="Autres dépenses" value={wants} onChange={setWants} hint="Sorties, vêtements, cadeaux…" />
      {i > 0 && (
        <p className={`result ${left < 0 ? 'bad' : 'good'}`} role="status">
          {left >= 0 ? <>Il vous reste <strong>{fcfa(left)}</strong> ce mois-ci.</> : <>Vous dépensez <strong>{fcfa(-left)}</strong> de plus que ce que vous recevez. Cherchez où réduire, ou comment gagner un peu plus.</>}
          {left > 0 && <><br />Pensez à en mettre une partie de côté <strong>dès le début du mois</strong>, pas à la fin.</>}
        </p>
      )}
    </section>
  );
}

function Marge() {
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const c = num(cost), p = num(price), q = num(qty);
  const gain = p - c;
  return (
    <section className="card tool" id="marge">
      <h2>Combien je gagne sur une vente ?</h2>
      <p className="muted">Pour savoir si votre prix est bon. Comptez tout ce que le produit vous coûte : achat, transport, emballage, crédit téléphone.</p>
      <Field id="m-cost" label="Ce que le produit me coûte (par pièce)" value={cost} onChange={setCost} />
      <Field id="m-price" label="Mon prix de vente (par pièce)" value={price} onChange={setPrice} />
      <Field id="m-qty" label="Nombre vendu par mois (facultatif)" value={qty} onChange={setQty} suffix="pièces" />
      {p > 0 && c > 0 && (
        <p className={`result ${gain <= 0 ? 'bad' : 'good'}`} role="status">
          {gain <= 0 ? (
            <>Attention : à ce prix, vous <strong>perdez {fcfa(-gain)}</strong> à chaque vente. Augmentez le prix ou baissez vos coûts.</>
          ) : (
            <>Vous gagnez <strong>{fcfa(gain)}</strong> par pièce, soit <strong>{Math.round((gain / p) * 100)} %</strong> du prix de vente.</>
          )}
          {gain > 0 && q > 0 && <><br />Avec {q} vente{q > 1 ? 's' : ''} par mois : <strong>{fcfa(gain * q)}</strong> de gain.</>}
        </p>
      )}
    </section>
  );
}

function Objectif() {
  const [goal, setGoal] = useState('');
  const [monthly, setMonthly] = useState('');
  const g = num(goal), m = num(monthly);
  const months = g > 0 && m > 0 ? Math.ceil(g / m) : 0;
  return (
    <section className="card tool" id="objectif">
      <h2>En combien de temps j’atteins mon objectif ?</h2>
      <p className="muted">Un téléphone, un stock, une formation, un petit capital : combien de mois pour y arriver ?</p>
      <Field id="o-goal" label="Le montant dont j’ai besoin" value={goal} onChange={setGoal} />
      <Field id="o-month" label="Ce que je peux mettre de côté chaque mois" value={monthly} onChange={setMonthly} />
      {months > 0 && (
        <p className="result good" role="status">
          Il vous faudra environ <strong>{months} mois</strong>{months >= 12 ? ` (soit ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}${months % 12 ? ` et ${months % 12} mois` : ''})` : ''}.
          {months > 6 && <><br />Pour aller plus vite, cherchez un petit revenu en plus : c’est le sujet de nos formations.</>}
        </p>
      )}
    </section>
  );
}

export default function Outils() {
  return (
    <div className="tools-grid">
      <Budget />
      <Marge />
      <Objectif />
    </div>
  );
}
