import Flash from '@/components/Flash.jsx';
import ConfirmButton from '@/components/ConfirmButton.jsx';
import { getDb } from '@/lib/db.js';
import { requireAdmin } from '@/lib/auth.js';
import { pointsBreakdown, ranking, rankingConfig, periodOf, monthLabel, KIND_LABELS } from '@/lib/points.js';
import { saveRankingSettings, closeMonth } from '@/app/actions/admin-points.js';

const COLS = ['signup', 'lesson_open', 'lesson_done', 'exercise', 'validated', 'reading', 'login', 'streak', 'referral', 'course_done'];

export default async function AdminRanking({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const current = periodOf();
  const period = typeof sp.p === 'string' && /^\d{4}-\d{2}$/.test(sp.p) ? sp.p : current;
  const cfg = await rankingConfig(db);
  const [{ all }, detail] = await Promise.all([ranking(db, period, { limit: 0 }), pointsBreakdown(db, period)]);
  const byUser = new Map();
  for (const d of detail) {
    if (!byUser.has(d.id)) byUser.set(d.id, { name: d.name, email: d.email, kinds: {} });
    byUser.get(d.id).kinds[d.kind] = d.pts;
  }
  const prev = (() => { const [y, m] = period.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 15)); return d.toISOString().slice(0, 7); })();
  return (
    <>
      <h1>Classement</h1>
      <Flash code={sp.m} />
      <section className="card">
        <h2>Réglages du concours</h2>
        <form action={saveRankingSettings}>
          <label htmlFor="start">Premier mois avec cadeau (AAAA-MM)</label>
          <input id="start" name="start" defaultValue={cfg.start} pattern="\d{4}-\d{2}" required />
          <label htmlFor="prize">Cadeau annoncé (affiché aux élèves, facultatif)</label>
          <input id="prize" name="prize" defaultValue={cfg.prize} maxLength={200} placeholder="Ex. : un téléphone, 25 000 FCFA, une formation offerte…" />
          <p style={{ marginTop: 12 }}><button className="btn" type="submit">Enregistrer</button></p>
        </form>
      </section>
      <p style={{ marginTop: 20 }}>
        Mois affiché : <strong>{monthLabel(period)}</strong> · <a href={`/admin/classement?p=${prev}`}>mois précédent</a>{period !== current && <> · <a href="/admin/classement">mois en cours</a></>}
      </p>
      {period < current && (
        <form action={closeMonth} className="card" style={{ marginBottom: 16 }}>
          <input type="hidden" name="period" value={period} />
          <p style={{ marginTop: 0 }}>Ce mois est terminé. Clôturez-le pour inscrire les 3 premiers au tableau d’honneur.</p>
          <label htmlFor="cl-prize">Cadeau remis au premier (affiché dans le tableau d’honneur)</label>
          <input id="cl-prize" name="prize" defaultValue={cfg.prize} maxLength={200} />
          <p style={{ marginTop: 12 }}><ConfirmButton className="btn gold small" message={`Clôturer ${monthLabel(period)} et publier les trois premiers au tableau d’honneur ?`}>Clôturer {monthLabel(period)}</ConfirmButton></p>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Élève</th>{COLS.map((k) => <th key={k}>{KIND_LABELS[k]}</th>)}<th>Total</th></tr></thead>
          <tbody>
            {all.map((r) => {
              const d = byUser.get(r.id);
              return (
                <tr key={r.id}>
                  <td>{r.rank}</td>
                  <td>{d ? d.name : '—'}<br /><span className="muted">{d?.email}</span></td>
                  {COLS.map((k) => <td key={k}>{d?.kinds[k] ?? ''}</td>)}
                  <td><strong>{r.points}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>Les comptes administrateurs et les comptes bloqués ne figurent pas au classement. Détail des points par type d’action, pour vérifier le gagnant avant de remettre le cadeau.</p>
    </>
  );
}
