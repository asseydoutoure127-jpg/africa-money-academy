import { getDb } from '@/lib/db.js';
import { listReferrers, listReferredWithPurchases } from '@/lib/referral.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako' });

export default async function Parrainage() {
  await requireAdmin();
  const db = getDb();
  const parrains = await listReferrers(db);
  const details = [];
  for (const p of parrains) details.push({ p, filleuls: await listReferredWithPurchases(db, p.id) });
  return (
    <>
      <h1>Parrainage</h1>
      <p className="muted">
        Ici : qui a amené qui, et qui a acheté. Les commissions sont calculées et payées à la main. Seuls les achats payés comptent (pas les accès donnés à la main).
      </p>
      {details.length === 0 && <p className="card soft">Personne ne s’est encore inscrit par un lien de parrainage.</p>}
      {details.map(({ p, filleuls }) => (
        <section className="card" key={p.id} style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>
            {p.name} <span className="muted small">({p.email}) — code {p.referral_code}</span>
          </h2>
          <p>
            <strong>{p.filleuls}</strong> filleul{p.filleuls > 1 ? 's' : ''}, dont <strong>{p.filleuls_acheteurs}</strong> ayant acheté.
          </p>
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
                    </td>
                    <td>{fmt(f.referred_at)}</td>
                    <td>{f.achats.length === 0 ? <span className="muted">aucun</span> : f.achats.map((a, i) => <div key={i}>{a.titre} — {fmt(a.date)}</div>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
