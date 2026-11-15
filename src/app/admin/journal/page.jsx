import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { requireAdmin } from '@/lib/auth.js';

export default async function Journal() {
  await requireAdmin();
  const rows = await store.listAdminLog(getDb(), { limit: 100 });
  return (
    <>
      <h1>Journal des actions</h1>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Administrateur</th><th>Action</th><th>Cible</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td>{new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako' })}</td><td>{r.admin_name || '—'}</td><td>{r.action}</td><td className="mono">{r.target || ''}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={4} className="muted">Rien pour l’instant.</td></tr>}
      </tbody></table></div>
    </>
  );
}
