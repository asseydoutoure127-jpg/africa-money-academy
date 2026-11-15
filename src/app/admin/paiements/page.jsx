import Flash from '@/components/Flash.jsx';
import TestButton from '@/components/TestButton.jsx';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { retryDelivery, runReconcileNow, manualSaleCheck } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako' });

export default async function Payments({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const [deliveries, pending, rejections] = await Promise.all([store.listDeliveries(db, { limit: 40 }), store.listPendingPurchases(db), store.countRecentRejections(db, 1440)]);
  return (
    <>
      <h1>Paiements</h1>
      <Flash code={sp.m} />
      {rejections > 0 && <p className="flash err">{rejections} notification(s) rejetée(s) ces dernières 24 h (signature invalide). Vérifiez le secret whsec_ dans Réglages.</p>}
      <div className="card">
        <p style={{ marginTop: 0 }}>Une vente payée n’est pas apparue ? Lancez la vérification : elle relit les ventes payées des 3 derniers jours chez Chariow.</p>
        <TestButton action={runReconcileNow} label="Vérifier les ventes maintenant" />
      </div>
      <form action={manualSaleCheck} className="card" style={{ marginTop: 16 }}>
        <label htmlFor="sale_id">Rattacher une vente précise (identifiant de vente Chariow)</label>
        <input id="sale_id" name="sale_id" type="text" />
        <p style={{ marginTop: 12 }}><button className="btn ghost small" type="submit">Rattacher</button></p>
      </form>
      <h2 style={{ marginTop: 24 }}>Achats en attente d’un compte vérifié ({pending.length})</h2>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>E-mail</th><th>Formation</th></tr></thead><tbody>
        {pending.map((p) => <tr key={p.id}><td>{fmt(p.created_at)}</td><td>{p.email}</td><td>{p.course_title}</td></tr>)}
        {pending.length === 0 && <tr><td colSpan={3} className="muted">Aucun.</td></tr>}
      </tbody></table></div>
      <h2 style={{ marginTop: 24 }}>Notifications Chariow reçues</h2>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Événement</th><th>Statut</th><th>Résultat</th><th>E-mail</th><th></th></tr></thead><tbody>
        {deliveries.map((d) => (
          <tr key={d.id}><td>{fmt(d.received_at)}</td><td>{d.event}</td><td>{d.status}</td><td>{d.result || d.error || ''}</td><td>{d.customer_email || ''}</td>
            <td>{['failed', 'ignored'].includes(d.status) && <form action={retryDelivery}><input type="hidden" name="id" value={d.id} /><button className="btn ghost small" type="submit">Rejouer</button></form>}</td></tr>
        ))}
        {deliveries.length === 0 && <tr><td colSpan={6} className="muted">Aucune notification reçue pour l’instant.</td></tr>}
      </tbody></table></div>
    </>
  );
}
