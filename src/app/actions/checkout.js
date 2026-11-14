'use server';
// Démarre un paiement Chariow (mode « api »). L'accès n'est JAMAIS donné ici : il vient du Pulse signé
// (ou du bouton « J'ai payé »). Cette action ne fait que créer la vente et envoyer la personne payer.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCtx, getChariowClient } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { requireUser } from '@/lib/auth.js';
import { ChariowError } from '@/lib/chariow/client.js';
import { verifyMyPurchase } from '@/lib/chariow/reconcile.js';
import { cleanText, normalizePhone, httpsUrlOrNull, clientIp } from '@/lib/validate.js';

export async function startCheckout(formData) {
  const ctx = getCtx();
  const slug = String(formData.get('slug') || '');
  const page = `/achat/${slug}`;
  const user = await requireUser(page);
  const back = (m) => redirect(`${page}?m=${m}`);

  const course = await store.getCourseBySlug(ctx.db, slug);
  if (!course || course.status !== 'published' || course.is_free) redirect('/formations');
  if (course.purchase_mode !== 'api' || !course.chariow_product_id) back('achat_mode');
  if (await store.hasActiveAccess(ctx.db, user.id, course.id)) redirect(`/espace/formation/${slug}?m=deja_acces`);

  const rl = await store.rateLimitHit(ctx.db, { key: `checkout:${user.id}`, windowSeconds: 60, limit: 5 });
  if (!rl.allowed) back('achat_trop');

  const first = cleanText(formData.get('first_name'), 50);
  const last = cleanText(formData.get('last_name'), 50);
  if (!first || !last) back('achat_champs');
  const phone = normalizePhone(formData.get('phone'), String(formData.get('country') || ''));
  if (!phone.ok) back(phone.error === 'number' ? 'achat_telephone' : 'achat_champs');

  const client = await getChariowClient(ctx.db);
  if (!client) back('achat_indispo');

  const payload = {
    product_id: course.chariow_product_id,
    email: user.email,
    first_name: first,
    last_name: last,
    phone: { number: phone.number, country_code: phone.country_code },
    redirect_url: `${ctx.siteUrl}/achat/retour?formation=${encodeURIComponent(slug)}`,
    custom_metadata: { source: 'africa-money-academy', course: slug },
  };
  const ip = clientIp(await headers());
  if (ip) payload.customer_ip = ip;
  const code = cleanText(formData.get('discount_code'), 100);
  if (code) payload.discount_code = code;

  let data;
  try {
    data = await client.initCheckout(payload);
  } catch (e) {
    if (!(e instanceof ChariowError)) throw e;
    const phoneIssue = e.fieldErrors && Object.keys(e.fieldErrors).some((k) => k.startsWith('phone'));
    if (e.kind === 'validation') back(phoneIssue ? 'achat_telephone' : 'achat_champs');
    if (e.kind === 'rate_limited') back('achat_trop');
    try {
      await store.raiseAlert(ctx.db, { kind: 'checkout_failed', message: `Le paiement n'a pas pu démarrer : ${e.message}` });
    } catch {
      // alerte facultative
    }
    back('achat_indispo');
  }

  if (data.step === 'payment') {
    const url = httpsUrlOrNull(data.payment?.checkout_url);
    if (url) redirect(url);
    back('achat_indispo');
  }
  if (data.step === 'already_purchased') {
    // Chariow dit qu'il a déjà cette vente : on la rattache (e-mail vérifié obligatoire).
    const out = await verifyMyPurchase(ctx, user, client);
    redirect(out.ok && out.found > 0 ? '/espace?m=achat_trouve' : `/achat/retour?formation=${encodeURIComponent(slug)}`);
  }
  // 'completed' : vente créée sans paiement (réduction à 100 %). Le Pulse suit ; la page de retour attend.
  redirect(`/achat/retour?formation=${encodeURIComponent(slug)}`);
}
