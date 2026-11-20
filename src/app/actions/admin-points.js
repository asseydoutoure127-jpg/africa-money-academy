'use server';
// Actions d'administration : classement du mois, cadeau, boutique.
import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { requireAdmin } from '@/lib/auth.js';
import { setSetting } from '@/lib/settings.js';
import { ranking, periodOf } from '@/lib/points.js';
import { cleanText } from '@/lib/validate.js';

const UUID = /^[0-9a-f-]{36}$/i;
const PERIOD = /^\d{4}-\d{2}$/;
async function start() {
  const admin = await requireAdmin();
  return { admin, ctx: getCtx() };
}

export async function saveRankingSettings(formData) {
  const { admin, ctx } = await start();
  const prize = cleanText(formData.get('prize'), 200);
  const startP = String(formData.get('start') || '').trim();
  if (!PERIOD.test(startP)) redirect('/admin/classement?m=admin_erreur');
  await setSetting(ctx.db, 'ranking_prize', prize, admin.id);
  await setSetting(ctx.db, 'ranking_start', startP, admin.id);
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'ranking.settings', target: null, detail: { prize, start: startP } });
  redirect('/admin/classement?m=admin_ok');
}

/** Clôture un mois : les 3 premiers entrent au tableau d'honneur (le cadeau est noté sur le premier). */
export async function closeMonth(formData) {
  const { admin, ctx } = await start();
  const period = String(formData.get('period') || '');
  if (!PERIOD.test(period) || period >= periodOf()) redirect('/admin/classement?m=admin_erreur');
  const prize = cleanText(formData.get('prize'), 200);
  const { all } = await ranking(ctx.db, period, { limit: 0 });
  const podium = all.filter((r) => r.points > 0).slice(0, 3);
  for (const r of podium) {
    const u = await store.getUserById(ctx.db, r.id);
    await ctx.db.query(
      `insert into honor_board (period, rank, user_id, display_name, points, prize) values ($1, $2, $3, $4, $5, $6)
       on conflict (period, rank) do update set user_id = excluded.user_id, display_name = excluded.display_name, points = excluded.points, prize = excluded.prize`,
      [period, r.rank, r.id, u && !u.rank_hidden ? r.name : 'Élève (nom masqué)', r.points, r.rank === 1 ? prize : ''],
    );
  }
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'ranking.close', target: period, detail: { podium: podium.map((r) => r.id) } });
  redirect(`/admin/classement?p=${period}&m=admin_ok`);
}

export async function createShopItem(formData) {
  const { admin, ctx } = await start();
  const title = cleanText(formData.get('title'), 120);
  const description = cleanText(formData.get('description'), 400);
  const price = Number.parseInt(String(formData.get('price') || ''), 10);
  const stockRaw = String(formData.get('stock') || '').trim();
  const stock = stockRaw === '' ? null : Number.parseInt(stockRaw, 10);
  if (title.length < 2 || !(price > 0) || (stock !== null && !(stock >= 0))) redirect('/admin/boutique?m=admin_erreur');
  const row = (await ctx.db.query(`insert into shop_items (title, description, price_coins, stock) values ($1, $2, $3, $4) returning id`, [title, description, price, stock])).rows[0];
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'shop.create', target: row.id, detail: { title, price } });
  redirect('/admin/boutique?m=admin_ok');
}

export async function toggleShopItem(formData) {
  const { admin, ctx } = await start();
  const id = String(formData.get('id') || '');
  if (!UUID.test(id)) redirect('/admin/boutique?m=admin_erreur');
  await ctx.db.query(`update shop_items set active = not active where id = $1`, [id]);
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'shop.toggle', target: id, detail: {} });
  redirect('/admin/boutique?m=admin_ok');
}

export async function deleteShopItem(formData) {
  const { admin, ctx } = await start();
  const id = String(formData.get('id') || '');
  if (!UUID.test(id)) redirect('/admin/boutique?m=admin_erreur');
  await ctx.db.query(`delete from shop_items where id = $1`, [id]);
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'shop.delete', target: id, detail: {} });
  redirect('/admin/boutique?m=admin_ok');
}

/** Livrer une commande, ou l'annuler (les pièces sont rendues à l'élève et le stock remis). */
export async function setOrderStatus(formData) {
  const { admin, ctx } = await start();
  const id = String(formData.get('id') || '');
  const status = String(formData.get('status') || '');
  if (!UUID.test(id) || !['delivered', 'cancelled'].includes(status)) redirect('/admin/boutique?m=admin_erreur');
  const r = await ctx.db.query(`update shop_orders set status = $2, updated_at = now() where id = $1 and status = 'pending' returning item_id`, [id, status]);
  if (r.rows[0] && status === 'cancelled' && r.rows[0].item_id) {
    await ctx.db.query(`update shop_items set stock = stock + 1 where id = $1 and stock is not null`, [r.rows[0].item_id]);
  }
  await store.logAdmin(ctx.db, { adminId: admin.id, action: `shop.order.${status}`, target: id, detail: {} });
  redirect('/admin/boutique?m=admin_ok');
}
