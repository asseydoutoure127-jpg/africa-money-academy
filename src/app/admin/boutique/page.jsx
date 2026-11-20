import Flash from '@/components/Flash.jsx';
import ConfirmButton from '@/components/ConfirmButton.jsx';
import { getDb } from '@/lib/db.js';
import { requireAdmin } from '@/lib/auth.js';
import { listShopItems } from '@/lib/points.js';
import { createShopItem, toggleShopItem, deleteShopItem, setOrderStatus } from '@/app/actions/admin-points.js';

const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUS = { pending: 'À livrer', delivered: 'Livrée', cancelled: 'Annulée' };

export default async function AdminShop({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const [items, orders] = await Promise.all([
    listShopItems(db, { onlyActive: false }),
    db.query(`select o.*, u.name, u.email from shop_orders o join users u on u.id = o.user_id order by (o.status = 'pending') desc, o.created_at desc limit 100`).then((r) => r.rows),
  ]);
  return (
    <>
      <h1>Boutique</h1>
      <Flash code={sp.m} />
      <p className="muted">Les élèves paient avec leurs pièces. La boutique est vide tant que vous n’ajoutez pas d’article.</p>
      <details className="card" open={items.length === 0}>
        <summary><strong>Ajouter un article</strong></summary>
        <form action={createShopItem} style={{ marginTop: 12 }}>
          <label htmlFor="title">Nom de l’article</label><input id="title" name="title" required maxLength={120} />
          <label htmlFor="description">Description (facultatif)</label><input id="description" name="description" maxLength={400} />
          <label htmlFor="price">Prix en pièces</label><input id="price" name="price" type="number" min="1" required />
          <label htmlFor="stock">Quantité disponible (vide = illimité)</label><input id="stock" name="stock" type="number" min="0" />
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Ajouter</button></p>
        </form>
      </details>
      <h2 style={{ marginTop: 24 }}>Articles ({items.length})</h2>
      {items.length === 0 ? <p className="muted">Aucun article.</p> : items.map((it) => (
        <div className="card" key={it.id} style={{ marginBottom: 10 }}>
          <strong>{it.title}</strong> — {it.price_coins} pièces{it.stock !== null ? ` · stock ${it.stock}` : ''} {it.active ? <span className="badge ok">en vente</span> : <span className="badge grey">masqué</span>}
          <div className="danger-actions">
            <form action={toggleShopItem}><input type="hidden" name="id" value={it.id} /><button className="btn ghost small" type="submit">{it.active ? 'Masquer' : 'Remettre en vente'}</button></form>
            <form action={deleteShopItem}><input type="hidden" name="id" value={it.id} /><ConfirmButton className="btn danger small" message={`Supprimer « ${it.title} » ? Les commandes déjà passées sont conservées.`}>Supprimer</ConfirmButton></form>
          </div>
        </div>
      ))}
      <h2 style={{ marginTop: 24 }}>Commandes</h2>
      {orders.length === 0 ? <p className="muted">Aucune commande.</p> : (
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Élève</th><th>Article</th><th>Prix</th><th>État</th><th></th></tr></thead><tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{fmt(o.created_at)}</td><td>{o.name}<br /><span className="muted">{o.email}</span></td><td>{o.item_title}</td><td>{o.price_coins}</td><td>{STATUS[o.status]}</td>
              <td>{o.status === 'pending' && (
                <div className="danger-actions" style={{ margin: 0 }}>
                  <form action={setOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="delivered" /><button className="btn small" type="submit">Marquer livrée</button></form>
                  <form action={setOrderStatus}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value="cancelled" /><ConfirmButton className="btn ghost small" message="Annuler la commande ? Les pièces sont rendues à l’élève.">Annuler et rembourser</ConfirmButton></form>
                </div>
              )}</td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </>
  );
}
