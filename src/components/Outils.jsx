'use client';

import { createContext, useContext, useState } from 'react';

// Boîte à outils : calculs simples en FCFA. Tout se calcule sur le téléphone, rien n'est envoyé ni enregistré.
const num = (v) => {
  const n = Number(String(v).replace(/\s/g, '').replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const fmt = (n) => nf.format(Math.round(n * 100) / 100).replace(/[  ]/g, ' ');
const fcfa = (n) => `${fmt(Math.round(n))} FCFA`;
const EUR_FCFA = 655.957; // parité fixe officielle du franc CFA (XOF et XAF) avec l'euro

const ShowCtx = createContext(false);
const ResetCtx = createContext(() => {});

function Field({ id, label, value, onChange, hint, suffix = 'FCFA', ph = '0' }) {
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="field-suffix">
        <input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} />
        <span>{suffix}</span>
      </div>
      {hint && <p className="hint">{hint}</p>}
    </>
  );
}

// Résultat : phrase claire, puis « Comment c'est calculé » (étapes), puis « Que faire maintenant ? ».
function Result({ ok = true, children, how = [], tip = '' }) {
  const shown = useContext(ShowCtx);
  if (!shown) return null;
  return (
    <div className={`result ${ok ? 'good' : 'bad'}`} role="status">
      <p className="res-main">{children}</p>
      {how.filter(Boolean).length > 0 && (
        <div className="res-how"><strong>Comment c’est calculé</strong><ol>{how.filter(Boolean).map((h, i) => <li key={i}>{h}</li>)}</ol></div>
      )}
      {tip && <div className="res-tip"><strong>Que faire maintenant ?</strong><p>{tip}</p></div>}
    </div>
  );
}

// Carte d'outil : bouton « Calculer » (rien ne s'affiche avant), « Effacer » pour recommencer.
function Card({ id, title, intro, ready = false, children }) {
  const [pressed, setPressed] = useState(false);
  const reset = useContext(ResetCtx);
  return (
    <section className="card tool" id={id}>
      <h2>{title}</h2>
      {intro && <p className="muted">{intro}</p>}
      <ShowCtx.Provider value={pressed && ready}>{children}</ShowCtx.Provider>
      {pressed && !ready && <p className="result bad" role="alert">Remplissez toutes les cases avec des chiffres pour voir le résultat.</p>}
      <div className="tool-actions">
        <button type="button" className="btn small" onClick={() => setPressed(true)}>Calculer</button>
        <button type="button" className="btn ghost small" onClick={reset}>Effacer</button>
      </div>
    </section>
  );
}
function useVals(n) {
  const [v, setV] = useState(Array(n).fill(''));
  const set = (i) => (x) => setV((a) => a.map((y, j) => (j === i ? x : y)));
  return [v.map(num), v, set];
}

/* ---------- Budget et épargne ---------- */
function Budget() {
  const [[i, n, w], raw, set] = useVals(3);
  const left = i - n - w;
  return (
    <Card id="budget" title="Mon budget du mois" intro="Notez ce qui entre et ce qui sort. Ce qui reste est ce que vous pouvez mettre de côté." ready={i > 0}>
      <Field id="b-in" label="Argent reçu ce mois" value={raw[0]} onChange={set(0)} ph="Ex. 80 000" hint="Salaire, ventes, aide de la famille, petits travaux…" />
      <Field id="b-needs" label="Dépenses obligatoires" value={raw[1]} onChange={set(1)} ph="Ex. 45 000" hint="Loyer, nourriture, transport, crédit téléphone, école…" />
      <Field id="b-wants" label="Autres dépenses" value={raw[2]} onChange={set(2)} ph="Ex. 15 000" hint="Sorties, vêtements, cadeaux…" />
      <Result ok={left >= 0}
        how={[`Total des dépenses = ${fcfa(n)} + ${fcfa(w)} = ${fcfa(n + w)}`, `Reste = argent reçu − dépenses = ${fcfa(i)} − ${fcfa(n + w)} = ${fcfa(left)}`, i > 0 ? `Vos dépenses représentent ${Math.round(((n + w) / i) * 100)} % de ce que vous recevez.` : '']}
        tip={left >= 0 ? `Mettez ${fcfa(Math.max(0, left * 0.5))} de côté dès le début du mois (la moitié de ce qui reste), avant de dépenser. Ce qui n’est pas mis de côté tout de suite se dépense presque toujours.` : 'Commencez par la ligne « autres dépenses » : réduisez-la d’abord. Ensuite cherchez un petit revenu en plus.'}>
        {left >= 0 ? <>Il vous reste <strong>{fcfa(left)}</strong> ce mois-ci.</> : <>Vous dépensez <strong>{fcfa(-left)}</strong> de plus que ce que vous recevez.</>}
      </Result>
    </Card>
  );
}
function Repartition() {
  const [[i], raw, set] = useVals(1);
  return (
    <Card id="repartition" title="Comment répartir mon argent ?" intro="Une règle simple pour commencer : 50 % pour l’obligatoire, 30 % pour les envies, 20 % pour l’épargne." ready={i > 0}>
      <Field id="r-in" label="Argent reçu ce mois" value={raw[0]} onChange={set(0)} ph="Ex. 100 000" />
      <Result how={[`Obligatoire = 50 % de ${fcfa(i)} = ${fcfa(i * 0.5)}`, `Envies = 30 % de ${fcfa(i)} = ${fcfa(i * 0.3)}`, `Épargne = 20 % de ${fcfa(i)} = ${fcfa(i * 0.2)}`]}
        tip="Comparez avec vos vrais chiffres (outil « Mon budget du mois »). Si vos dépenses obligatoires dépassent 50 %, ce n’est pas une faute : c’est le signe qu’il faut gagner plus, pas seulement dépenser moins.">
        Obligatoire : <strong>{fcfa(i * 0.5)}</strong> · Envies : <strong>{fcfa(i * 0.3)}</strong> · Épargne : <strong>{fcfa(i * 0.2)}</strong>
      </Result>
    </Card>
  );
}
function Objectif() {
  const [[g, m], raw, set] = useVals(2);
  const months = g > 0 && m > 0 ? Math.ceil(g / m) : 0;
  return (
    <Card id="objectif" title="En combien de temps j’atteins mon objectif ?" intro="Un téléphone, un stock, une formation, un petit capital : combien de mois pour y arriver ?" ready={g > 0 && m > 0}>
      <Field id="o-goal" label="Le montant dont j’ai besoin" value={raw[0]} onChange={set(0)} ph="Ex. 150 000" />
      <Field id="o-month" label="Ce que je peux mettre de côté chaque mois" value={raw[1]} onChange={set(1)} ph="Ex. 10 000" />
      <Result how={[`Mois nécessaires = montant ÷ épargne mensuelle = ${fcfa(g)} ÷ ${fcfa(m)} = ${fmt(g / (m || 1))}`, `On arrondit au mois supérieur : ${months} mois.`]}
        tip={months > 6 ? `Pour aller deux fois plus vite, il faudrait mettre ${fcfa(m * 2)} par mois. Cherchez un revenu en plus, c’est le sujet de nos formations.` : 'Notez la date d’arrivée et mettez l’argent à part (pas dans le portefeuille du quotidien).'}>
        Il vous faudra environ <strong>{months} mois</strong>{months >= 12 ? ` (soit ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}${months % 12 ? ` et ${months % 12} mois` : ''})` : ''}.
      </Result>
    </Card>
  );
}
function Urgence() {
  const [[d], raw, set] = useVals(1);
  return (
    <Card id="urgence" title="Mon argent de secours" intro="Pour tenir si un revenu s’arrête (maladie, panne, stock perdu). On conseille de viser 3 à 6 mois de dépenses obligatoires." ready={d > 0}>
      <Field id="u-exp" label="Mes dépenses obligatoires par mois" value={raw[0]} onChange={set(0)} ph="Ex. 45 000" />
      <Result how={[`3 mois = 3 × ${fcfa(d)} = ${fcfa(d * 3)}`, `6 mois = 6 × ${fcfa(d)} = ${fcfa(d * 6)}`]}
        tip="Commencez par un seul mois de dépenses, puis montez. Cet argent ne sert qu’aux vraies urgences, pas aux envies.">
        Minimum : <strong>{fcfa(d * 3)}</strong> (3 mois). Confortable : <strong>{fcfa(d * 6)}</strong> (6 mois).
      </Result>
    </Card>
  );
}
function Epargne() {
  const [[a, n], raw, set] = useVals(2);
  const [per, setPer] = useState('7');
  const days = Number(per);
  const label = days === 7 ? 'semaine' : days === 30 ? 'mois' : 'jour';
  const unit = label === 'mois' ? 'mois' : n > 1 ? `${label}s` : label;
  return (
    <Card id="epargne" title="Combien j’aurai si j’épargne régulièrement ?" intro="Mettre un petit montant de côté, souvent, finit par faire une vraie somme. Ce calcul ne compte pas d’intérêts." ready={a > 0 && n > 0}>
      <Field id="e-amt" label="Montant mis de côté à chaque fois" value={raw[0]} onChange={set(0)} ph="Ex. 1 000" />
      <label htmlFor="e-per">À quel rythme ?</label>
      <select id="e-per" value={per} onChange={(e) => setPer(e.target.value)}><option value="1">Chaque jour</option><option value="7">Chaque semaine</option><option value="30">Chaque mois</option></select>
      <Field id="e-n" label={`Pendant combien de ${label === 'mois' ? 'mois' : `${label}s`} ?`} value={raw[1]} onChange={set(1)} suffix={label === 'mois' ? 'mois' : `${label}s`} ph="Ex. 12" />
      <Result how={[`Total = montant × nombre de versements = ${fcfa(a)} × ${fmt(n)} = ${fcfa(a * n)}`, days === 1 ? `Par mois, cela fait environ ${fcfa(a * 30)}.` : days === 7 ? `Par mois, cela fait environ ${fcfa(a * 4.33)}.` : `Par an, cela fait ${fcfa(a * 12)}.`]}
        tip="Le plus important est le rythme régulier. Programmez le versement le jour où vous recevez de l’argent.">
        Après {fmt(n)} {unit}, vous aurez <strong>{fcfa(a * n)}</strong>.
      </Result>
    </Card>
  );
}
function Tontine() {
  const [[m, c], raw, set] = useVals(2);
  return (
    <Card id="tontine" title="Ma tontine" intro="Chaque membre verse le même montant à chaque tour, et un membre reçoit la cagnotte à tour de rôle." ready={m > 1 && c > 0}>
      <Field id="t-m" label="Nombre de membres" value={raw[0]} onChange={set(0)} suffix="personnes" ph="Ex. 10" />
      <Field id="t-c" label="Cotisation de chaque membre, par tour" value={raw[1]} onChange={set(1)} ph="Ex. 10 000" />
      <Result how={[`Cagnotte d’un tour = membres × cotisation = ${fmt(m)} × ${fcfa(c)} = ${fcfa(m * c)}`, `Nombre de tours = nombre de membres = ${fmt(m)}`, `Chacun verse ${fmt(m)} fois ${fcfa(c)} = ${fcfa(m * c)} au total et reçoit une fois ${fcfa(m * c)}.`]}
        tip="Une tontine ne fait pas gagner d’argent : elle donne une grosse somme d’un coup. Si vous recevez tôt, c’est comme une avance que vous rendrez ensuite ; si vous recevez tard, c’est de l’épargne forcée. Choisissez votre tour selon votre besoin.">
        Cagnotte de <strong>{fcfa(m * c)}</strong> à chaque tour, pendant <strong>{fmt(m)} tours</strong>.
      </Result>
    </Card>
  );
}
function Interets() {
  const [[cap, rate, yrs], raw, set] = useVals(3);
  const simple = cap * (1 + (rate / 100) * yrs);
  const compound = cap * Math.pow(1 + rate / 100, yrs);
  return (
    <Card id="interets" title="Ce que rapporte un placement" intro="Pour comparer une offre d’épargne ou de placement. Méfiez-vous de toute promesse de gain très élevé et très rapide." ready={cap > 0 && rate > 0 && yrs > 0}>
      <Field id="i-cap" label="Somme placée" value={raw[0]} onChange={set(0)} ph="Ex. 100 000" />
      <Field id="i-rate" label="Taux annoncé par an" value={raw[1]} onChange={set(1)} suffix="%" ph="Ex. 5" />
      <Field id="i-yrs" label="Durée" value={raw[2]} onChange={set(2)} suffix="ans" ph="Ex. 2" />
      <Result how={[`Intérêts simples = somme × taux × durée = ${fcfa(cap)} × ${fmt(rate)} % × ${fmt(yrs)} = ${fcfa(simple - cap)}`, `Intérêts composés : chaque année, les intérêts s’ajoutent à la somme. Somme × (1 + taux)^durée = ${fcfa(compound)}`]}
        tip={rate >= 30 ? `Un taux de ${fmt(rate)} % par an est très élevé. Les offres réelles sont bien plus basses. Vérifiez qui propose cela, s’il est reconnu, et ne placez jamais l’argent dont vous avez besoin pour vivre.` : 'Demandez toujours : qui garantit mon argent, puis-je le retirer, et quels sont les frais ? Un bon taux ne sert à rien si vous ne pouvez pas retirer.'}>
        Au bout de {fmt(yrs)} an{yrs > 1 ? 's' : ''} : <strong>{fcfa(simple)}</strong> (intérêts simples) ou <strong>{fcfa(compound)}</strong> (intérêts composés).
      </Result>
    </Card>
  );
}

/* ---------- Vendre ---------- */
function Marge() {
  const [[c, p, q], raw, set] = useVals(3);
  const gain = p - c;
  return (
    <Card id="marge" title="Combien je gagne sur une vente ?" intro="Pour savoir si votre prix est bon. Comptez tout ce que le produit vous coûte : achat, transport, emballage, crédit téléphone." ready={p > 0 && c > 0}>
      <Field id="m-cost" label="Ce que le produit me coûte (par pièce)" value={raw[0]} onChange={set(0)} ph="Ex. 700" />
      <Field id="m-price" label="Mon prix de vente (par pièce)" value={raw[1]} onChange={set(1)} ph="Ex. 1 000" />
      <Field id="m-qty" label="Nombre vendu par mois (facultatif)" value={raw[2]} onChange={set(2)} suffix="pièces" ph="Ex. 100" />
      <Result ok={gain > 0}
        how={[`Gain par pièce = prix de vente − coût = ${fcfa(p)} − ${fcfa(c)} = ${fcfa(gain)}`, p > 0 ? `Part du prix gardée = gain ÷ prix = ${fcfa(gain)} ÷ ${fcfa(p)} = ${Math.round((gain / p) * 100)} %` : '', q > 0 ? `Gain du mois = ${fcfa(gain)} × ${fmt(q)} = ${fcfa(gain * q)}` : '']}
        tip={gain <= 0 ? 'Ne vendez pas à ce prix : chaque vente vous appauvrit. Augmentez le prix un peu, ou cherchez un fournisseur moins cher.' : gain / p < 0.2 ? 'Votre marge est faible : une petite dépense imprévue la fait disparaître. Visez au moins 25 à 30 % du prix (outil « À quel prix vendre ? »).' : 'Bonne marge. Notez bien vos coûts chaque mois pour être sûr qu’elle reste vraie.'}>
        {gain <= 0 ? <>À ce prix, vous <strong>perdez {fcfa(-gain)}</strong> à chaque vente.</> : <>Vous gagnez <strong>{fcfa(gain)}</strong> par pièce, soit <strong>{Math.round((gain / p) * 100)} %</strong> du prix de vente.{q > 0 && <> Avec {fmt(q)} vente{q > 1 ? 's' : ''} par mois : <strong>{fcfa(gain * q)}</strong>.</>}</>}
      </Result>
    </Card>
  );
}
function PrixConseille() {
  const [[c, m], raw, set] = useVals(2);
  const price = m > 0 && m < 100 ? c / (1 - m / 100) : 0;
  return (
    <Card id="prix" title="À quel prix vendre ?" intro="Choisissez la part du prix de vente que vous voulez garder comme gain (la marge). Le calcul donne le prix qui la respecte." ready={c > 0 && m > 0 && m < 100}>
      <Field id="p-cost" label="Ce que le produit me coûte (par pièce)" value={raw[0]} onChange={set(0)} ph="Ex. 700" />
      <Field id="p-marge" label="Part du prix que je veux garder" value={raw[1]} onChange={set(1)} suffix="%" ph="Ex. 30" hint="Entre 1 et 99. Exemple : 30 pour garder 30 % du prix." />
      <Result how={[`Le coût représente ${fmt(100 - m)} % du prix (100 % − ${fmt(m)} %).`, `Prix = coût ÷ ${fmt((100 - m) / 100)} = ${fcfa(c)} ÷ ${fmt((100 - m) / 100)} = ${fcfa(price)}`, `Gain par pièce = ${fcfa(price)} − ${fcfa(c)} = ${fcfa(price - c)}`]}
        tip="Comparez avec les prix de vos concurrents. Si vous êtes bien plus cher, montrez ce que vous apportez en plus (qualité, livraison, conseil). Si vous êtes moins cher, ne baissez pas vos marges pour rien.">
        Vendez à <strong>{fcfa(price)}</strong>, par exemple arrondi à <strong>{fcfa(Math.ceil(price / 50) * 50)}</strong>.
      </Result>
    </Card>
  );
}
function Seuil() {
  const [[fix, p, c], raw, set] = useVals(3);
  const unit = p - c;
  return (
    <Card id="seuil" title="Combien vendre pour ne pas perdre ?" intro="Le seuil de rentabilité : le nombre de ventes à partir duquel vous commencez à gagner de l’argent." ready={fix > 0 && p > 0}>
      <Field id="s-fix" label="Mes frais fixes par mois" value={raw[0]} onChange={set(0)} ph="Ex. 30 000" hint="Loyer de la boutique, abonnement, salaire d’un aide, internet…" />
      <Field id="s-p" label="Prix de vente (par pièce)" value={raw[1]} onChange={set(1)} ph="Ex. 1 000" />
      <Field id="s-c" label="Coût du produit (par pièce)" value={raw[2]} onChange={set(2)} ph="Ex. 600" />
      <Result ok={unit > 0}
        how={[`Gain par pièce = ${fcfa(p)} − ${fcfa(c)} = ${fcfa(unit)}`, unit > 0 ? `Pièces à vendre = frais fixes ÷ gain par pièce = ${fcfa(fix)} ÷ ${fcfa(unit)} = ${fmt(fix / unit)} → ${Math.ceil(fix / unit)}` : 'Le gain par pièce est nul ou négatif : le calcul est impossible.']}
        tip={unit > 0 ? 'Avant ce nombre de ventes, vous travaillez pour payer vos frais. Si ce nombre vous paraît trop grand, baissez les frais fixes ou augmentez la marge.' : 'Revoyez votre prix ou votre coût : chaque pièce vendue vous fait perdre de l’argent.'}>
        {unit > 0 ? <>Il faut vendre au moins <strong>{Math.ceil(fix / unit)} pièces par mois</strong> (environ {Math.ceil(fix / unit / 26)} par jour ouvré).</> : <>Ce prix ne permet jamais de couvrir vos frais.</>}
      </Result>
    </Card>
  );
}
function VentesParJour() {
  const [[goal, gain], raw, set] = useVals(2);
  const [days, setDays] = useState('26');
  const d = num(days) || 26;
  const total = gain > 0 ? goal / gain : 0;
  return (
    <Card id="ventes-jour" title="Combien de ventes par jour pour mon objectif ?" intro="Transformez un revenu visé en un nombre de ventes concret." ready={goal > 0 && gain > 0}>
      <Field id="v-goal" label="Le gain que je veux par mois" value={raw[0]} onChange={set(0)} ph="Ex. 100 000" />
      <Field id="v-gain" label="Mon gain sur une pièce" value={raw[1]} onChange={set(1)} ph="Ex. 400" hint="Prix de vente moins ce que la pièce me coûte." />
      <Field id="v-days" label="Jours où je vends dans le mois" value={days} onChange={setDays} suffix="jours" />
      <Result how={[`Ventes par mois = objectif ÷ gain par pièce = ${fcfa(goal)} ÷ ${fcfa(gain)} = ${Math.ceil(total)}`, `Ventes par jour = ${Math.ceil(total)} ÷ ${fmt(d)} jours = ${(total / d).toFixed(1).replace('.', ',')}`]}
        tip="Si ce chiffre vous paraît irréaliste, il y a trois leviers : plus de clients, un meilleur gain par pièce, ou un objectif plus bas pour commencer. Notez vos ventes chaque jour pour voir où vous en êtes.">
        Il vous faut <strong>{Math.ceil(total)} ventes par mois</strong>, soit environ <strong>{(total / d).toFixed(1).replace('.', ',')} par jour</strong>.
      </Result>
    </Card>
  );
}
function PrixRevient() {
  const [lines, setLines] = useState([{ n: '', v: '' }, { n: '', v: '' }, { n: '', v: '' }]);
  const [qty, setQty] = useState('');
  const set = (i, k, x) => setLines((a) => a.map((l, j) => (j === i ? { ...l, [k]: x } : l)));
  const total = lines.reduce((a, l) => a + num(l.v), 0);
  const q = num(qty);
  return (
    <Card id="revient" title="Combien me coûte vraiment ce que je fabrique ?" intro="Additionnez tout : ingrédients, emballage, gaz, transport, temps payé. Puis divisez par le nombre de pièces obtenues." ready={total > 0 && q > 0}>
      {lines.map((l, i) => (
        <div className="line2" key={i}>
          <input aria-label={`Dépense ${i + 1}`} value={l.n} onChange={(e) => set(i, 'n', e.target.value)} placeholder={['Ex. farine', 'Ex. huile', 'Ex. gaz'][i] || 'Dépense'} />
          <div className="field-suffix"><input aria-label={`Montant ${i + 1}`} inputMode="decimal" value={l.v} onChange={(e) => set(i, 'v', e.target.value)} placeholder="0" /><span>FCFA</span></div>
        </div>
      ))}
      <p><button type="button" className="btn ghost small" onClick={() => setLines((a) => [...a, { n: '', v: '' }])}>+ Ajouter une dépense</button></p>
      <Field id="rv-q" label="Nombre de pièces obtenues" value={qty} onChange={setQty} suffix="pièces" ph="Ex. 50" />
      <Result how={[`Coût total = ${lines.filter((l) => num(l.v) > 0).map((l) => fcfa(num(l.v))).join(' + ')} = ${fcfa(total)}`, `Coût d’une pièce = ${fcfa(total)} ÷ ${fmt(q)} = ${fcfa(total / (q || 1))}`]}
        tip="Vendez à plus que ce coût, avec une marge (outil « À quel prix vendre ? »). Pensez à compter votre temps et ce que vous perdez (pièces ratées).">
        Une pièce vous coûte <strong>{fcfa(total / (q || 1))}</strong> (coût total {fcfa(total)}).
      </Result>
    </Card>
  );
}
function Remise() {
  const [[p, r], raw, set] = useVals(2);
  return (
    <Card id="remise" title="Remise ou augmentation de prix" intro="Calculez un prix après une réduction (ou une hausse) en pourcentage." ready={p > 0 && r > 0}>
      <Field id="d-p" label="Prix de départ" value={raw[0]} onChange={set(0)} ph="Ex. 10 000" />
      <Field id="d-r" label="Pourcentage" value={raw[1]} onChange={set(1)} suffix="%" ph="Ex. 10" />
      <Result how={[`Remise : ${fcfa(p)} × ${fmt(r)} ÷ 100 = ${fcfa(p * r / 100)} d’économie, donc ${fcfa(p)} − ${fcfa(p * r / 100)} = ${fcfa(p * (1 - r / 100))}`, `Augmentation : ${fcfa(p)} + ${fcfa(p * r / 100)} = ${fcfa(p * (1 + r / 100))}`]}
        tip="Avant de faire une remise, vérifiez votre marge : une remise de 10 % peut manger la moitié de votre gain.">
        Avec <strong>{fmt(r)} % de remise</strong> : <strong>{fcfa(p * (1 - r / 100))}</strong>. Avec <strong>{fmt(r)} % d’augmentation</strong> : <strong>{fcfa(p * (1 + r / 100))}</strong>.
      </Result>
    </Card>
  );
}

/* ---------- Argent et banque ---------- */
function Pret() {
  const [[cap, rate, n], raw, set] = useVals(3);
  const i = rate / 100 / 12;
  const mens = cap > 0 && n > 0 ? (i > 0 ? (cap * i) / (1 - Math.pow(1 + i, -n)) : cap / n) : 0;
  return (
    <Card id="pret" title="Ce que me coûte un prêt" intro="Avant d’emprunter, voyez combien vous rendrez en tout. Le calcul suppose des mensualités identiques." ready={cap > 0 && n > 0}>
      <Field id="l-cap" label="Somme empruntée" value={raw[0]} onChange={set(0)} ph="Ex. 500 000" />
      <Field id="l-rate" label="Taux annuel" value={raw[1]} onChange={set(1)} suffix="%" ph="0" hint="Mettez 0 si le prêt est sans intérêt." />
      <Field id="l-n" label="Durée" value={raw[2]} onChange={set(2)} suffix="mois" ph="Ex. 12" />
      <Result how={[i > 0 ? `Taux par mois = ${fmt(rate)} % ÷ 12 = ${fmt(rate / 12)} %` : 'Sans intérêt : mensualité = somme ÷ durée.', `Mensualité = ${fcfa(mens)}`, `Total remboursé = ${fcfa(mens)} × ${fmt(n)} = ${fcfa(mens * n)}`, `Coût du prêt = ${fcfa(mens * n)} − ${fcfa(cap)} = ${fcfa(mens * n - cap)}`]}
        tip={`Demandez-vous : mon gain par mois couvre-t-il ${fcfa(mens)} sans que je manque du nécessaire ? Si non, empruntez moins ou plus longtemps. N’empruntez pas pour des dépenses qui ne rapportent rien.`}>
        Vous paierez <strong>{fcfa(mens)} par mois</strong>, soit <strong>{fcfa(mens * n)}</strong> en tout (dont <strong>{fcfa(mens * n - cap)}</strong> de coût du prêt).
      </Result>
    </Card>
  );
}
function Devises() {
  const [[a, rate], raw, set] = useVals(2);
  const [mode, setMode] = useState('eur');
  const r = mode === 'eur' ? EUR_FCFA : rate;
  return (
    <Card id="devises" title="Convertir en FCFA" intro="L’euro est lié au franc CFA à un taux fixe : 1 euro = 655,957 FCFA. Pour une autre monnaie (dollar, livre…), saisissez le taux du jour donné par votre banque ou votre application." ready={a > 0 && r > 0}>
      <label htmlFor="c-mode">Monnaie de départ</label>
      <select id="c-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="eur">Euro (taux fixe)</option><option value="autre">Autre monnaie (je saisis le taux)</option></select>
      <Field id="c-a" label="Montant dans cette monnaie" value={raw[0]} onChange={set(0)} suffix={mode === 'eur' ? '€' : 'unités'} ph="Ex. 100" />
      {mode === 'autre' && <Field id="c-r" label="1 unité de cette monnaie = combien de FCFA ?" value={raw[1]} onChange={set(1)} ph="Ex. 600" />}
      <Result how={[`Résultat = montant × taux = ${fmt(a)} × ${fmt(r)} = ${fcfa(a * r)}`]}
        tip="Les frais de change ou de transfert ne sont pas inclus : comptez-les avec l’outil « Frais de transfert d’argent ». Pour vendre un service à l’étranger, calculez votre prix en FCFA d’abord, puis convertissez.">
        {fmt(a)} {mode === 'eur' ? '€' : 'unités'} = <strong>{fcfa(a * r)}</strong>.
      </Result>
    </Card>
  );
}
function Frais() {
  const [[a, pct, fixe], raw, set] = useVals(3);
  const fee = (a * pct) / 100 + fixe;
  const gross = pct < 100 ? (a + fixe) / (1 - pct / 100) : 0;
  return (
    <Card id="frais" title="Frais de transfert d’argent" intro="Mobile money, banque, agence : combien arrive vraiment, et combien envoyer pour que l’autre reçoive le bon montant. Saisissez les frais indiqués par votre opérateur." ready={a > 0 && (pct > 0 || fixe > 0) && pct < 100}>
      <Field id="f-a" label="Montant" value={raw[0]} onChange={set(0)} ph="Ex. 50 000" />
      <Field id="f-p" label="Frais en pourcentage" value={raw[1]} onChange={set(1)} suffix="%" ph="Ex. 1" />
      <Field id="f-f" label="Frais fixes (facultatif)" value={raw[2]} onChange={set(2)} ph="0" />
      <Result how={[`Frais = ${fcfa(a)} × ${fmt(pct)} % + ${fcfa(fixe)} = ${fcfa(fee)}`, `Reçu = ${fcfa(a)} − ${fcfa(fee)} = ${fcfa(a - fee)}`, `Pour que l’autre reçoive ${fcfa(a)} : (montant + frais fixes) ÷ (1 − ${fmt(pct)} %) = ${fcfa(gross)}`]}
        tip="Comparez deux ou trois moyens d’envoi avant de choisir. Pour de gros montants, les frais en pourcentage pèsent plus que les frais fixes.">
        Si vous envoyez {fcfa(a)}, l’autre reçoit <strong>{fcfa(a - fee)}</strong>. Pour qu’elle reçoive {fcfa(a)}, envoyez <strong>{fcfa(gross)}</strong>.
      </Result>
    </Card>
  );
}

/* ---------- Gagner de l'argent ---------- */
function Revenu() {
  const [[day, d], raw, set] = useVals(2);
  return (
    <Card id="revenu" title="Mon revenu par jour, par mois, par an" intro="Si vous gagnez un montant par jour, combien cela fait-il sur un mois, sur une année ?" ready={day > 0 && d > 0 && d <= 7}>
      <Field id="g-d" label="Gain par jour travaillé" value={raw[0]} onChange={set(0)} ph="Ex. 3 000" />
      <Field id="g-n" label="Jours travaillés par semaine" value={raw[1]} onChange={set(1)} suffix="jours" ph="Ex. 6" hint="Entre 1 et 7." />
      <Result how={[`Par semaine = ${fcfa(day)} × ${fmt(d)} jours = ${fcfa(day * d)}`, `Par mois = semaine × 4,33 = ${fcfa(day * d * 4.33)}`, `Par an = semaine × 52 = ${fcfa(day * d * 52)}`]}
        tip="Retirez vos frais (transport, crédit, matériel) pour connaître ce qui vous reste vraiment. Un jour sans vente compte aussi : calculez avec les jours où vous travaillez vraiment.">
        Par mois : <strong>{fcfa(day * d * 4.33)}</strong> · par an : <strong>{fcfa(day * d * 52)}</strong>.
      </Result>
    </Card>
  );
}
function Horaire() {
  const [[total, hours], raw, set] = useVals(2);
  return (
    <Card id="horaire" title="Combien je gagne par heure ?" intro="Utile pour un travail à la tâche (freelance, couture, livraison) : est-ce que ça vaut mon temps ?" ready={total > 0 && hours > 0}>
      <Field id="h-t" label="Ce que j’ai gagné pour ce travail" value={raw[0]} onChange={set(0)} ph="Ex. 15 000" />
      <Field id="h-h" label="Heures passées (préparation, échanges, livraison compris)" value={raw[1]} onChange={set(1)} suffix="heures" ph="Ex. 5" />
      <Result how={[`Gain par heure = gain ÷ heures = ${fcfa(total)} ÷ ${fmt(hours)} = ${fcfa(total / (hours || 1))}`]}
        tip="Comptez toutes les heures, pas seulement le travail lui-même. Si le gain par heure est très bas, augmentez votre prix ou prenez moins de temps par commande.">
        Vous gagnez <strong>{fcfa(total / (hours || 1))}</strong> de l’heure.
      </Result>
    </Card>
  );
}

const GROUPS = [
  { key: 'epargne', label: 'Budget et épargne', tools: [Budget, Repartition, Objectif, Urgence, Epargne, Tontine, Interets] },
  { key: 'vendre', label: 'Vendre', tools: [Marge, PrixConseille, Seuil, VentesParJour, PrixRevient, Remise] },
  { key: 'banque', label: 'Argent et banque', tools: [Pret, Devises, Frais] },
  { key: 'gagner', label: 'Gagner de l’argent', tools: [Revenu, Horaire] },
];

function Frame({ T }) {
  const [k, setK] = useState(0);
  return <ResetCtx.Provider value={() => setK((x) => x + 1)}><T key={k} /></ResetCtx.Provider>;
}

export default function Outils() {
  const [group, setGroup] = useState('epargne');
  const g = GROUPS.find((x) => x.key === group) || GROUPS[0];
  const total = GROUPS.reduce((a, x) => a + x.tools.length, 0);
  return (
    <div>
      <p className="muted">{total} outils, classés en {GROUPS.length} familles.</p>
      <div className="tool-tabs" role="tablist" aria-label="Familles d’outils">
        {GROUPS.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={x.key === group} className={x.key === group ? 'on' : ''} onClick={() => setGroup(x.key)}>
            {x.label} <small>{x.tools.length}</small>
          </button>
        ))}
      </div>
      <div className="tools-grid">
        {g.tools.map((T, i) => <Frame key={`${g.key}-${i}`} T={T} />)}
      </div>
    </div>
  );
}
