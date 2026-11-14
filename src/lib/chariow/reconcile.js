// Filets de sécurité : « J'ai payé, vérifier mon achat », réconciliation périodique, détection des retraits.
import * as store from '../store.js';
import { ChariowError } from './client.js';
import { applyPaidSale } from './sales.js';
import { processDeliveryById } from './pulse.js';

const ymd = (d) => d.toISOString().slice(0, 10);

/**
 * Bouton « J'ai payé, vérifier mon achat ».
 * L'API Chariow n'a pas de filtre par e-mail ni par produit : on cherche le client par e-mail,
 * puis ses ventes payées, puis on applique celles qui correspondent à une formation.
 * Seule une adresse e-mail VÉRIFIÉE peut réclamer des achats.
 */
export async function verifyMyPurchase(ctx, user, client) {
  if (!user.email_verified_at) return { ok: false, reason: 'email_not_verified' };
  if (!client) return { ok: false, reason: 'not_configured' };
  let sales;
  try {
    sales = await client.findPaidSalesByEmail(user.email);
  } catch (e) {
    return { ok: false, reason: e instanceof ChariowError ? e.kind : 'unexpected' };
  }
  let granted = 0;
  let found = 0;
  for (const sale of sales) {
    const productId = sale.product?.id;
    if (!productId || !sale.id) continue;
    const out = await applyPaidSale(ctx, {
      saleId: String(sale.id),
      productId: String(productId),
      email: user.email,
      customerName: user.name,
      source: 'reconciliation',
    });
    if (out.result === 'granted') granted++;
    if (['granted', 'already_active', 'blocked_revoked'].includes(out.result)) found++;
  }
  return { ok: true, granted, found };
}

/** Remboursements : demande à Chariow si l'accès d'une vente a été retiré (`is_access_revoked`). */
export async function syncRevocations(ctx, client, limit = 40) {
  const rows = await store.listEnrollmentsToCheck(ctx.db, limit);
  let revoked = 0;
  let checked = 0;
  for (const e of rows) {
    try {
      const sale = await client.getSale(e.chariow_sale_id);
      checked++;
      if (sale?.is_access_revoked === true) {
        const r = await store.revokeAccess(ctx.db, {
          userId: e.user_id,
          courseId: e.course_id,
          reason: 'Accès retiré côté Chariow (remboursement)',
        });
        if (r) revoked++;
      }
      await store.touchEnrollmentChecked(ctx.db, e.id);
    } catch (err) {
      if (err instanceof ChariowError && (err.kind === 'rate_limited' || err.kind === 'network' || err.kind === 'missing_key' || err.kind === 'unauthorized')) break;
      if (err instanceof ChariowError && err.kind === 'not_found') await store.touchEnrollmentChecked(ctx.db, e.id);
    }
  }
  return { checked, revoked };
}

/**
 * Tâche automatique (Vercel Cron) et bouton « Lancer la réconciliation » de l'admin.
 *  1. relance les livraisons de Pulse bloquées ou en échec ;
 *  2. récupère les ventes payées récentes et crée les accès manquants ;
 *  3. détecte les accès retirés côté Chariow.
 */
export async function reconcile(ctx, client, { days = 3, now = new Date() } = {}) {
  const { db } = ctx;
  const summary = { retried: 0, sales: 0, newAccess: 0, newPending: 0, missedByPulse: 0, revoked: 0, apiError: null, skipped: null };

  await store.resetStuckProcessing(db);
  for (const id of await store.listRetryableDeliveries(db)) {
    const out = await processDeliveryById(ctx, id);
    if (!out.skipped) summary.retried++;
  }

  if (!client) {
    summary.skipped = 'no_api_key';
    return summary;
  }

  try {
    const from = ymd(new Date(now.getTime() - days * 24 * 3600 * 1000));
    const sales = await client.listPaidSalesSince(from);
    summary.sales = sales.length;
    for (const sale of sales) {
      const productId = sale.product?.id;
      const email = sale.customer?.email;
      if (!sale.id || !productId || !email) continue;
      // Un produit qui n'est pas une formation (autre vente de la boutique) est ignoré sans alerte.
      if (!(await store.findCourseByChariowProduct(db, String(productId)))) continue;
      const out = await applyPaidSale(ctx, {
        saleId: String(sale.id),
        productId: String(productId),
        email: String(email),
        customerName: sale.customer?.name ?? null,
        source: 'reconciliation',
      });
      const isNew = out.result === 'granted' || out.result === 'pending';
      if (out.result === 'granted') summary.newAccess++;
      if (out.result === 'pending') summary.newPending++;
      if (isNew && !(await store.hasDeliveryForSale(db, String(sale.id)))) summary.missedByPulse++;
    }
    if (summary.missedByPulse > 0) {
      await store.raiseAlert(db, {
        kind: 'pulse_inactive',
        message: `${summary.missedByPulse} vente(s) payée(s) n'ont pas été notifiées par Chariow. Votre Pulse est peut-être désactivé : vérifiez Automatisations > Pulses dans Chariow (il se désactive après 5 échecs).`,
      });
    }
    await store.resolveAlerts(db, 'api_key');
    const rev = await syncRevocations(ctx, client);
    summary.revoked = rev.revoked;
  } catch (e) {
    if (e instanceof ChariowError) {
      summary.apiError = e.kind;
      if (e.kind === 'unauthorized' || e.kind === 'forbidden') {
        await store.raiseAlert(db, { kind: 'api_key', message: `${e.message}` });
      }
    } else {
      summary.apiError = 'unexpected';
    }
  }
  return summary;
}
