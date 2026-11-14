// Traitement d'un Pulse Chariow DÉJÀ authentifié (signature vérifiée) et DÉJÀ enregistré.
// Ordre voulu par le prompt : on enregistre d'abord, on répond 200 vite, puis on traite ici.
import * as store from '../store.js';
import { PAID_STATUSES, applyPaidSale } from './sales.js';

/** Extrait les champs utiles d'un `successful.sale` (noms de champs : doc « Pulses »). */
export function extractSale(payload) {
  const sale = payload?.sale ?? {};
  const product = payload?.product ?? {};
  const customer = payload?.customer ?? {};
  const ids = [sale.id, product.id, customer.id].map((x) => String(x ?? ''));
  const name =
    customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || null;
  return {
    saleId: sale.id ? String(sale.id) : null,
    status: sale.status ? String(sale.status) : null,
    productId: product.id ? String(product.id) : null,
    email: customer.email ? String(customer.email).trim() : null,
    customerName: name,
    // Pulse de test Chariow : identifiants préfixés `test_`. Il ne donne JAMAIS d'accès.
    isTest: ids.some((x) => x.startsWith('test_')),
  };
}

/**
 * Traite le contenu d'une livraison. Retourne { status, result } à écrire dans le journal.
 * ctx : { db, notify, siteUrl }
 */
export async function handleEvent(ctx, event, payload) {
  const { db } = ctx;

  if (event === 'successful.sale') {
    const s = extractSale(payload);
    if (s.isTest) {
      await store.putSetting(db, { key: 'last_test_pulse_at', value: new Date().toISOString(), encrypted: false, userId: null });
      await store.resolveAlerts(db, 'pulse_signature');
      return { status: 'done', result: 'test' };
    }
    if (!s.saleId || !s.productId || !s.email) {
      await store.raiseAlert(db, { kind: 'bad_payload', message: `Un Pulse « successful.sale » est arrivé sans identifiant de vente, de produit ou d'e-mail (vente ${s.saleId ?? 'inconnue'}).` });
      return { status: 'ignored', result: 'payload_incomplete' };
    }
    if (!PAID_STATUSES.includes(s.status)) {
      return { status: 'ignored', result: `sale_status_${s.status ?? 'unknown'}` };
    }
    const out = await applyPaidSale(ctx, {
      saleId: s.saleId,
      productId: s.productId,
      email: s.email,
      customerName: s.customerName,
      source: 'pulse',
    });
    await store.resolveAlerts(db, 'pulse_inactive');
    await store.resolveAlerts(db, 'pulse_signature');
    return { status: out.result === 'unknown_product' ? 'ignored' : 'done', result: out.result };
  }

  if (event === 'failed.sale' || event === 'abandoned.sale') {
    return { status: 'done', result: 'logged' };
  }

  if (event === 'license.revoked') {
    // La doc ne décrit pas le contenu de cet événement : on ne retire l'accès que si l'e-mail
    // et le produit sont présents ET correspondent à une formation. Sinon, simple journal.
    const email = payload?.customer?.email ?? payload?.license?.customer?.email ?? null;
    const productId = payload?.product?.id ?? payload?.license?.product?.id ?? null;
    if (email && productId) {
      const course = await store.findCourseByChariowProduct(db, String(productId));
      const user = await store.getUserByEmail(db, String(email));
      if (course && user) {
        const r = await store.revokeAccess(db, { userId: user.id, courseId: course.id, reason: 'Licence révoquée côté Chariow' });
        if (r) return { status: 'done', result: 'revoked' };
      }
    }
    return { status: 'done', result: 'logged' };
  }

  if (typeof event === 'string' && event.startsWith('license.')) {
    return { status: 'done', result: 'logged' };
  }

  return { status: 'ignored', result: 'unknown_event' };
}

/** Prend une livraison enregistrée, la traite, écrit le résultat. Ne lève jamais d'erreur. */
export async function processDeliveryById(ctx, id) {
  const { db } = ctx;
  const row = await store.claimDelivery(db, id);
  if (!row) return { skipped: true };
  try {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const out = await handleEvent(ctx, row.event, payload);
    await store.finishDelivery(db, id, out);
    return out;
  } catch (e) {
    await store.failDelivery(db, id, e?.message || 'erreur inconnue');
    if (Number(row.attempts) >= 3) {
      await store.raiseAlert(db, {
        kind: 'delivery_failed',
        message: `Le Pulse ${row.delivery_id} (${row.event}) n'a pas pu être traité après ${row.attempts} essais. Ouvrez Paiements pour le relancer, ou donnez l'accès à la main.`,
      });
    }
    return { status: 'failed', result: 'error' };
  }
}
