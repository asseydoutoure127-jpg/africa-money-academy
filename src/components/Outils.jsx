'use client';

import { useState } from 'react';

// Boîte à outils : calculs simples en FCFA. Tout se calcule sur le téléphone, rien n'est envoyé ni enregistré.
const num = (v) => {
  const n = Number(String(v).replace(/\s/g, '').replace(/[^0-9.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const fmt = (n) => nf.format(Math.round(n * 100) / 100).replace(/[  ]/g, ' ');
const fcfa = (n) => `${fmt(Math.round(n))} FCFA`;
const EUR_FCFA = 655.957; // parité fixe officielle du franc CFA (XOF et XAF) avec l'euro

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
function Result({ ok = true, children }) {
  return <p className={`result ${ok ? 'good' : 'bad'}`} role="status">{children}</p>;
}
function Card({ id, title, intro, children }) {
  return (
    <section className="card tool" id={id}>
      <h2>{title}</h2>
      {intro && <p className="muted">{intro}</p>}
      {children}
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
    <Card id="budget" title="Mon budget du mois" intro="Notez ce qui entre et ce qui sort. Ce qui reste est ce que vous pouvez mettre de côté.">
      <Field id="b-in" label="Argent reçu ce mois" value={raw[0]} onChange={set(0)} hint="Salaire, ventes, aide de la famille, petits travaux…" />
      <Field id="b-needs" label="Dépenses obligatoires" value={raw[1]} onChange={set(1)} hint="Loyer, nourriture, transport, crédit téléphone, école…" />
      <Field id="b-wants" label="Autres dépenses" value={raw[2]} onChange={set(2)} hint="Sorties, vêtements, cadeaux…" />
      {i > 0 && (
        <Result ok={left >= 0}>
          {left >= 0 ? <>Il vous reste <strong>{fcfa(left)}</strong> ce mois-ci.</> : <>Vous dépensez <strong>{fcfa(-left)}</strong> de plus que ce que vous recevez. Cherchez où réduire, ou comment gagner un peu plus.</>}
          {left > 0 && <><br />Pensez à en mettre une partie de côté <strong>dès le début du mois</strong>, pas à la fin.</>}
        </Result>
      )}
    </Card>
  );
}
function Repartition() {
  const [[i], raw, set] = useVals(1);
  return (
    <Card id="repartition" title="Comment répartir mon argent ?" intro="Une règle simple pour commencer : 50 % pour l’obligatoire, 30 % pour les envies, 20 % pour l’épargne. Adaptez-la à votre situation.">
      <Field id="r-in" label="Argent reçu ce mois" value={raw[0]} onChange={set(0)} />
      {i > 0 && (
        <Result>
          Obligatoire (50 %) : <strong>{fcfa(i * 0.5)}</strong><br />
          Envies (30 %) : <strong>{fcfa(i * 0.3)}</strong><br />
          Épargne (20 %) : <strong>{fcfa(i * 0.2)}</strong>
        </Result>
      )}
    </Card>
  );
}
function Objectif() {
  const [[g, m], raw, set] = useVals(2);
  const months = g > 0 && m > 0 ? Math.ceil(g / m) : 0;
  return (
    <Card id="objectif" title="En combien de temps j’atteins mon objectif ?" intro="Un téléphone, un stock, une formation, un petit capital : combien de mois pour y arriver ?">
      <Field id="o-goal" label="Le montant dont j’ai besoin" value={raw[0]} onChange={set(0)} />
      <Field id="o-month" label="Ce que je peux mettre de côté chaque mois" value={raw[1]} onChange={set(1)} />
      {months > 0 && (
        <Result>
          Il vous faudra environ <strong>{months} mois</strong>{months >= 12 ? ` (soit ${Math.floor(months / 12)} an${months >= 24 ? 's' : ''}${months % 12 ? ` et ${months % 12} mois` : ''})` : ''}.
          {months > 6 && <><br />Pour aller plus vite, cherchez un petit revenu en plus : c’est le sujet de nos formations.</>}
        </Result>
      )}
    </Card>
  );
}
function Urgence() {
  const [[d], raw, set] = useVals(1);
  return (
    <Card id="urgence" title="Mon argent de secours" intro="Pour tenir si un revenu s’arrête (maladie, panne, stock perdu). On conseille de viser 3 à 6 mois de dépenses obligatoires.">
      <Field id="u-exp" label="Mes dépenses obligatoires par mois" value={raw[0]} onChange={set(0)} />
      {d > 0 && <Result>Objectif minimum : <strong>{fcfa(d * 3)}</strong> (3 mois). Objectif confortable : <strong>{fcfa(d * 6)}</strong> (6 mois).</Result>}
    </Card>
  );
}
function Epargne() {
  const [[a, n], raw, set] = useVals(2);
  const [per, setPer] = useState('7');
  const days = Number(per);
  const label = days === 7 ? 'semaine' : days === 30 ? 'mois' : 'jour';
  const plural = n > 1 && label !== 'mois';
  return (
    <Card id="epargne" title="Combien j’aurai si j’épargne régulièrement ?" intro="Mettre un petit montant de côté, souvent, finit par faire une vraie somme. Ce calcul ne compte pas d’intérêts : seulement ce que vous versez.">
      <Field id="e-amt" label="Montant mis de côté à chaque fois" value={raw[0]} onChange={set(0)} />
      <label htmlFor="e-per">À quel rythme ?</label>
      <select id="e-per" value={per} onChange={(e) => setPer(e.target.value)}><option value="1">Chaque jour</option><option value="7">Chaque semaine</option><option value="30">Chaque mois</option></select>
      <Field id="e-n" label={`Pendant combien de ${label}${label === 'mois' ? '' : 's'} ?`} value={raw[1]} onChange={set(1)} suffix={label === 'mois' ? 'mois' : `${label}s`} />
      {a > 0 && n > 0 && <Result>Après {fmt(n)} {label === 'mois' ? 'mois' : plural ? `${label}s` : label}, vous aurez <strong>{fcfa(a * n)}</strong>{days === 30 && n >= 12 ? ` (environ ${fcfa((a * n) / (n / 12))} par an)` : ''}.</Result>}
    </Card>
  );
}
function Tontine() {
  const [[m, c], raw, set] = useVals(2);
  return (
    <Card id="tontine" title="Ma tontine" intro="Chaque membre verse le même montant à chaque tour, et un membre reçoit la cagnotte à tour de rôle.">
      <Field id="t-m" label="Nombre de membres" value={raw[0]} onChange={set(0)} suffix="personnes" />
      <Field id="t-c" label="Cotisation de chaque membre, par tour" value={raw[1]} onChange={set(1)} />
      {m > 1 && c > 0 && <Result>Chaque tour, la cagnotte est de <strong>{fcfa(m * c)}</strong>. Il faut <strong>{m} tours</strong> pour que tout le monde reçoive une fois. Chacun aura versé <strong>{fcfa(m * c)}</strong> au total et reçu <strong>{fcfa(m * c)}</strong> : l’avantage est d’obtenir une grosse somme d’un coup, pas de gagner de l’argent.</Result>}
    </Card>
  );
}
function Interets() {
  const [[cap, rate, yrs], raw, set] = useVals(3);
  const simple = cap * (1 + (rate / 100) * yrs);
  const compound = cap * Math.pow(1 + rate / 100, yrs);
  return (
    <Card id="interets" title="Ce que rapporte un placement" intro="Pour comparer une offre d’épargne ou de placement. Méfiez-vous de toute promesse de gain très élevé et très rapide.">
      <Field id="i-cap" label="Somme placée" value={raw[0]} onChange={set(0)} />
      <Field id="i-rate" label="Taux annoncé par an" value={raw[1]} onChange={set(1)} suffix="%" />
      <Field id="i-yrs" label="Durée" value={raw[2]} onChange={set(2)} suffix="ans" />
      {cap > 0 && rate > 0 && yrs > 0 && (
        <Result>
          Intérêts simples : <strong>{fcfa(simple)}</strong> au bout de {fmt(yrs)} an{yrs > 1 ? 's' : ''} (gain {fcfa(simple - cap)}).<br />
          Intérêts composés (les intérêts rapportent à leur tour) : <strong>{fcfa(compound)}</strong> (gain {fcfa(compound - cap)}).
          {rate >= 30 && <><br /><strong>Attention :</strong> un taux de {fmt(rate)} % par an est très élevé. Vérifiez que l’offre est réelle avant de donner de l’argent.</>}
        </Result>
      )}
    </Card>
  );
}

/* ---------- Vendre ---------- */
function Marge() {
  const [[c, p, q], raw, set] = useVals(3);
  const gain = p - c;
  return (
    <Card id="marge" title="Combien je gagne sur une vente ?" intro="Pour savoir si votre prix est bon. Comptez tout ce que le produit vous coûte : achat, transport, emballage, crédit téléphone.">
      <Field id="m-cost" label="Ce que le produit me coûte (par pièce)" value={raw[0]} onChange={set(0)} />
      <Field id="m-price" label="Mon prix de vente (par pièce)" value={raw[1]} onChange={set(1)} />
      <Field id="m-qty" label="Nombre vendu par mois (facultatif)" value={raw[2]} onChange={set(2)} suffix="pièces" />
      {p > 0 && c > 0 && (
        <Result ok={gain > 0}>
          {gain <= 0 ? <>Attention : à ce prix, vous <strong>perdez {fcfa(-gain)}</strong> à chaque vente. Augmentez le prix ou baissez vos coûts.</> : <>Vous gagnez <strong>{fcfa(gain)}</strong> par pièce, soit <strong>{Math.round((gain / p) * 100)} %</strong> du prix de vente.</>}
          {gain > 0 && q > 0 && <><br />Avec {fmt(q)} vente{q > 1 ? 's' : ''} par mois : <strong>{fcfa(gain * q)}</strong> de gain.</>}
        </Result>
      )}
    </Card>
  );
}
function PrixConseille() {
  const [[c, m], raw, set] = useVals(2);
  const price = m > 0 && m < 100 ? c / (1 - m / 100) : 0;
  return (
    <Card id="prix" title="À quel prix vendre ?" intro="Choisissez la part du prix de vente que vous voulez garder comme gain (la marge). Le calcul donne le prix qui la respecte.">
      <Field id="p-cost" label="Ce que le produit me coûte (par pièce)" value={raw[0]} onChange={set(0)} />
      <Field id="p-marge" label="Part du prix que je veux garder" value={raw[1]} onChange={set(1)} suffix="%" hint="Exemple : 30 pour garder 30 % du prix de vente." />
      {c > 0 && price > 0 && <Result>Vendez à <strong>{fcfa(price)}</strong> pour gagner <strong>{fcfa(price - c)}</strong> par pièce.<br />Arrondissez à un prix simple, par exemple <strong>{fcfa(Math.ceil(price / 50) * 50)}</strong>.</Result>}
      {m >= 100 && <Result ok={false}>La part gardée doit être inférieure à 100 %.</Result>}
    </Card>
  );
}
function Seuil() {
  const [[fix, p, c], raw, set] = useVals(3);
  const unit = p - c;
  return (
    <Card id="seuil" title="Combien vendre pour ne pas perdre ?" intro="Le seuil de rentabilité : le nombre de ventes à partir duquel vous commencez à gagner de l’argent.">
      <Field id="s-fix" label="Mes frais fixes par mois" value={raw[0]} onChange={set(0)} hint="Loyer de la boutique, abonnement, salaire d’un aide, internet…" />
      <Field id="s-p" label="Prix de vente (par pièce)" value={raw[1]} onChange={set(1)} />
      <Field id="s-c" label="Coût du produit (par pièce)" value={raw[2]} onChange={set(2)} />
      {fix > 0 && p > 0 && (unit > 0
        ? <Result>Il faut vendre au moins <strong>{Math.ceil(fix / unit)} pièces par mois</strong> (environ {Math.ceil(fix / unit / 26)} par jour ouvré) pour couvrir vos frais. Au-delà, c’est du gain.</Result>
        : <Result ok={false}>Chaque pièce vendue vous fait perdre de l’argent : le seuil ne peut pas être atteint. Revoyez le prix ou le coût.</Result>)}
    </Card>
  );
}
function VentesParJour() {
  const [[goal, gain], raw, set] = useVals(2);
  const [days, setDays] = useState('26');
  const d = num(days) || 26;
  const total = gain > 0 ? goal / gain : 0;
  return (
    <Card id="ventes-jour" title="Combien de ventes par jour pour mon objectif ?" intro="Transformez un revenu visé en un nombre de ventes concret.">
      <Field id="v-goal" label="Le gain que je veux par mois" value={raw[0]} onChange={set(0)} />
      <Field id="v-gain" label="Mon gain sur une pièce" value={raw[1]} onChange={set(1)} hint="Prix de vente moins ce que la pièce me coûte." />
      <Field id="v-days" label="Jours où je vends dans le mois" value={days} onChange={setDays} suffix="jours" />
      {goal > 0 && gain > 0 && <Result>Il vous faut <strong>{Math.ceil(total)} ventes par mois</strong>, soit environ <strong>{(total / d).toFixed(1).replace('.', ',')} par jour</strong>.</Result>}
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
    <Card id="revient" title="Combien me coûte vraiment ce que je fabrique ?" intro="Additionnez tout : ingrédients, emballage, gaz, transport, temps payé. Puis divisez par le nombre de pièces obtenues.">
      {lines.map((l, i) => (
        <div className="line2" key={i}>
          <input aria-label={`Dépense ${i + 1}`} value={l.n} onChange={(e) => set(i, 'n', e.target.value)} placeholder="Ex. farine" />
          <div className="field-suffix"><input aria-label={`Montant ${i + 1}`} inputMode="decimal" value={l.v} onChange={(e) => set(i, 'v', e.target.value)} placeholder="0" /><span>FCFA</span></div>
        </div>
      ))}
      <p><button type="button" className="btn ghost small" onClick={() => setLines((a) => [...a, { n: '', v: '' }])}>+ Ajouter une dépense</button></p>
      <Field id="rv-q" label="Nombre de pièces obtenues" value={qty} onChange={setQty} suffix="pièces" />
      {total > 0 && <Result>Coût total : <strong>{fcfa(total)}</strong>.{q > 0 && <> Une pièce vous coûte <strong>{fcfa(total / q)}</strong>.</>}</Result>}
    </Card>
  );
}
function Remise() {
  const [[p, r], raw, set] = useVals(2);
  return (
    <Card id="remise" title="Remise ou augmentation de prix" intro="Calculez un prix après une réduction (ou une hausse) en pourcentage.">
      <Field id="d-p" label="Prix de départ" value={raw[0]} onChange={set(0)} />
      <Field id="d-r" label="Pourcentage" value={raw[1]} onChange={set(1)} suffix="%" />
      {p > 0 && r > 0 && <Result>Avec <strong>{fmt(r)} % de remise</strong> : <strong>{fcfa(p * (1 - r / 100))}</strong> (vous économisez {fcfa(p * r / 100)}).<br />Avec <strong>{fmt(r)} % d’augmentation</strong> : <strong>{fcfa(p * (1 + r / 100))}</strong>.</Result>}
    </Card>
  );
}

/* ---------- Argent et banque ---------- */
function Pret() {
  const [[cap, rate, n], raw, set] = useVals(3);
  const i = rate / 100 / 12;
  const mens = cap > 0 && n > 0 ? (i > 0 ? (cap * i) / (1 - Math.pow(1 + i, -n)) : cap / n) : 0;
  return (
    <Card id="pret" title="Ce que me coûte un prêt" intro="Avant d’emprunter, voyez combien vous rendrez en tout. Le calcul suppose des mensualités identiques.">
      <Field id="l-cap" label="Somme empruntée" value={raw[0]} onChange={set(0)} />
      <Field id="l-rate" label="Taux annuel" value={raw[1]} onChange={set(1)} suffix="%" hint="Mettez 0 si le prêt est sans intérêt." />
      <Field id="l-n" label="Durée" value={raw[2]} onChange={set(2)} suffix="mois" />
      {mens > 0 && <Result>Mensualité : <strong>{fcfa(mens)}</strong>.<br />Total remboursé : <strong>{fcfa(mens * n)}</strong>, dont <strong>{fcfa(mens * n - cap)}</strong> de coût du prêt.<br />Demandez-vous : mon gain mensuel couvre-t-il cette mensualité ?</Result>}
    </Card>
  );
}
function Devises() {
  const [[a, rate], raw, set] = useVals(2);
  const [mode, setMode] = useState('eur');
  return (
    <Card id="devises" title="Convertir en FCFA" intro="L’euro est lié au franc CFA à un taux fixe : 1 euro = 655,957 FCFA. Pour une autre monnaie (dollar, livre…), saisissez le taux du jour que vous donne votre banque ou votre application.">
      <label htmlFor="c-mode">Monnaie de départ</label>
      <select id="c-mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="eur">Euro (taux fixe)</option><option value="autre">Autre monnaie (je saisis le taux)</option></select>
      <Field id="c-a" label="Montant dans cette monnaie" value={raw[0]} onChange={set(0)} suffix={mode === 'eur' ? '€' : 'unités'} />
      {mode === 'autre' && <Field id="c-r" label="1 unité de cette monnaie = combien de FCFA ?" value={raw[1]} onChange={set(1)} />}
      {a > 0 && (mode === 'eur' || rate > 0) && <Result>{fmt(a)} {mode === 'eur' ? '€' : 'unités'} = <strong>{fcfa(a * (mode === 'eur' ? EUR_FCFA : rate))}</strong>.<br /><span className="muted">Les frais de change ou de transfert ne sont pas inclus.</span></Result>}
    </Card>
  );
}
function Frais() {
  const [[a, pct, fixe], raw, set] = useVals(3);
  const fee = (a * pct) / 100 + fixe;
  const gross = pct < 100 ? (a + fixe) / (1 - pct / 100) : 0;
  return (
    <Card id="frais" title="Frais de transfert d’argent" intro="Mobile money, banque, agence : combien arrive vraiment, et combien envoyer pour que l’autre reçoive le bon montant. Saisissez les frais indiqués par votre opérateur.">
      <Field id="f-a" label="Montant" value={raw[0]} onChange={set(0)} />
      <Field id="f-p" label="Frais en pourcentage" value={raw[1]} onChange={set(1)} suffix="%" />
      <Field id="f-f" label="Frais fixes (facultatif)" value={raw[2]} onChange={set(2)} />
      {a > 0 && (pct > 0 || fixe > 0) && <Result>Si vous envoyez {fcfa(a)}, les frais sont de <strong>{fcfa(fee)}</strong> : l’autre personne reçoit <strong>{fcfa(a - fee)}</strong>.<br />Pour qu’elle reçoive exactement {fcfa(a)}, envoyez environ <strong>{fcfa(gross)}</strong>.</Result>}
    </Card>
  );
}

/* ---------- Gagner de l'argent ---------- */
function Revenu() {
  const [[day, d], raw, set] = useVals(2);
  return (
    <Card id="revenu" title="Mon revenu par jour, par mois, par an" intro="Si vous gagnez un montant par jour, combien cela fait-il sur un mois, sur une année ?">
      <Field id="g-d" label="Gain par jour travaillé" value={raw[0]} onChange={set(0)} />
      <Field id="g-n" label="Jours travaillés par semaine" value={raw[1]} onChange={set(1)} suffix="jours" hint="Entre 1 et 7." />
      {day > 0 && d > 0 && d <= 7 && <Result>Par semaine : <strong>{fcfa(day * d)}</strong><br />Par mois (environ 4,3 semaines) : <strong>{fcfa(day * d * 4.33)}</strong><br />Par an : <strong>{fcfa(day * d * 52)}</strong></Result>}
    </Card>
  );
}
function Horaire() {
  const [[total, hours], raw, set] = useVals(2);
  return (
    <Card id="horaire" title="Combien je gagne par heure ?" intro="Utile pour un travail à la tâche (freelance, couture, livraison) : est-ce que ça vaut mon temps ?">
      <Field id="h-t" label="Ce que j’ai gagné pour ce travail" value={raw[0]} onChange={set(0)} />
      <Field id="h-h" label="Heures passées (préparation, échanges, livraison compris)" value={raw[1]} onChange={set(1)} suffix="heures" />
      {total > 0 && hours > 0 && <Result>Vous gagnez <strong>{fcfa(total / hours)}</strong> de l’heure.</Result>}
    </Card>
  );
}

const GROUPS = [
  { key: 'epargne', label: 'Budget et épargne', tools: [Budget, Repartition, Objectif, Urgence, Epargne, Tontine, Interets] },
  { key: 'vendre', label: 'Vendre', tools: [Marge, PrixConseille, Seuil, VentesParJour, PrixRevient, Remise] },
  { key: 'banque', label: 'Argent et banque', tools: [Pret, Devises, Frais] },
  { key: 'gagner', label: 'Gagner de l’argent', tools: [Revenu, Horaire] },
];

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
        {g.tools.map((T, i) => <T key={`${g.key}-${i}`} />)}
      </div>
    </div>
  );
}
