'use server';
// Actions de l'élève liées aux points, au classement et à la boutique.
import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/context.js';
import { requireUser } from '@/lib/auth.js';
import { addReadingMinute, buyItem, safe } from '@/lib/points.js';

/** Appelée toutes les minutes par la page de leçon, seulement quand la page est affichée et que l'élève bouge. */
export async function pingReading() {
  const user = await requireUser('/espace');
  const ctx = getCtx();
  const out = await safe(() => addReadingMinute(ctx.db, user.id));
  return { counted: Boolean(out) };
}

export async function buyShopItem(formData) {
  const user = await requireUser('/boutique');
  const ctx = getCtx();
  const itemId = String(formData.get('itemId') || '');
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) redirect('/boutique');
  const out = await buyItem(ctx.db, { userId: user.id, itemId });
  redirect(`/boutique?m=${out.ok ? 'achat_ok' : out.reason === 'solde' ? 'achat_solde' : 'achat_epuise'}`);
}

export async function toggleRankHidden() {
  const user = await requireUser('/classement');
  const ctx = getCtx();
  await ctx.db.query(`update users set rank_hidden = not rank_hidden where id = $1`, [user.id]);
  redirect('/classement');
}
