import { getDb } from '@/lib/db.js';
import { listReferrers, listReferredWithPurchases, paidTotal, summarizeCommissions, isMature, commissionFor, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT } from '@/lib/referral.js';
import { requireAdmin } from '@/lib/auth.js';
import { recordReferralPayout } from '@/app/actions/admin.js';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako' });
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ')} FCFA`;

export default async function Parrainage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const parrains = await listReferrers(db);
  const details = [];
  for (const p of parrains) {
    const filleuls = await listReferredWithPurchases(db, p.id);
    details.push({ p, filleuls, sum: summarizeCommissions(filleuls, await paidTotal(db, p.id)) });
  }
  return (
    <>
      <h1>Parrainage</h1>
      {sp.m === 'verse' && <p className="notice">Versement enregistré.</p>}
      {sp.m === 'montant' && <p className="notice">Montant refusé : il doit être au moins de {fcfa(REFERRAL_MIN_PAYOUT)} et ne pas dépasser le montant dû.</p>}
      <p className="muted">
        Règles appliquées : une commission n’est <strong>due qu’{REFERRAL_HOLD_DAYS} jours après l’achat</strong> (7 jours de remboursement + 3 jours de marge) ; un achat remboursé disparaît de la liste ;
        le versement minimum est de <strong>{fcfa(REFERRAL_MIN_PAYOUT)}</strong>. Les versements se font à la main : enregistrez-les ici pour ne jamais payer deux fois.
      </p>
      {details.length === 0 && <p className="card soft">Personne ne s’est encore inscrit par un lien de parrainage.</p>}
      {details.map(({ p, filleuls, sum }) => (
        <section className="card" key={p.id} style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>
            {p.name} <span className="muted small">({p.email}) — code {p.referral_code}</span>
          </h2>
          <p>
            <strong>{p.filleuls}</strong> filleul{p.filleuls > 1 ? 's' : ''}, dont <strong>{p.filleuls_acheteurs}</strong> ayant acheté.
          </p>
          <p>
            Commissions : <strong>{fcfa(sum.due)} à verser</strong> · {fcfa(sum.pending)} en attente (délai de {REFERRAL_HOLD_DAYS} jours) · {fcfa(sum.paid)} déjà versés
            {sum.due > 0 && !sum.canPay && <span className="badge"> sous le minimum de {fcfa(REFERRAL_MIN_PAYOUT)}</span>}
          </p>
          {sum.canPay && (
            <form action={recordReferralPayout} className="inline-form">
              <input type="hidden" name="id" value={p.id} />
              <label>Montant versé (FCFA) <input name="amount" inputMode="numeric" defaultValue={sum.due} /></label>
              <label>Note (moyen de paiement, numéro…) <input name="note" maxLength={200} /></label>
              <button className="btn small" type="submit">Enregistrer le versement</button>
            </form>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Filleul</th>
                  <th>Inscrit le</th>
                  <th>Achats payés</th>
                </tr>
              </thead>
              <tbody>
                {filleuls.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.name} <span className="muted small">({f.email})</span>
                      {f.meme_empreinte && <div><span className="badge red">même appareil ou réseau que le parrain : à vérifier</span></div>}
                    </td>
                    <td>{fmt(f.referred_at)}</td>
                    <td>
                      {f.achats.length === 0 ? (
                        <span className="muted">aucun</span>
                      ) : (
                        f.achats.map((a, i) => (
                          <div key={i}>
                            {a.titre} — {fmt(a.date)} — {isMature(a.date) ? <strong>due : {fcfa(commissionFor(a.prix) || 0)}</strong> : <span className="muted">en attente</span>}
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="hint">
        « Même appareil ou réseau » : un signal, pas une preuve. Beaucoup de gens partagent le même réseau mobile ; regardez le dossier avant de refuser une commission. Le numéro de paiement n’est pas enregistré sur le site : il n’est visible que dans Chariow.
      </p>
    </>
  );
}
