// Logique commune : « une vente PAYÉE existe pour cet e-mail et ce produit ».
// Utilisée par le Pulse, le bouton « J'ai payé », la réconciliation. L'accès est basé sur la VENTE,
// pas sur la licence (le Pulse de vente ne contient pas de clé de licence).
import * as store from '../store.js';

/** Statuts de vente qui prouvent un paiement : `completed`, et `settled` (fonds reversés) qui en est la suite. */
export const PAID_STATUSES = ['completed', 'settled'];

/**
 * ctx : { db, notify(template, { to, name, courseTitle, link }) -> Promise<void> (ne lève jamais), siteUrl }
 * Retourne { result, ... } avec result parmi :
 *  granted | already_active | blocked_revoked | pending | pending_duplicate | unknown_product
 */
export async function applyPaidSale(ctx, { saleId, productId, email, customerName, source }) {
  const { db } = ctx;
  const course = await store.findCourseByChariowProduct(db, productId);
  if (!course) {
    await store.raiseAlert(db, {
      kind: 'unknown_product',
      message: `Un produit Chariow (${productId}) a été vendu mais aucune formation ne lui correspond. Si c'est une formation, collez son identifiant dans la fiche formation. Sinon, limitez le Pulse aux produits de vos formations dans Chariow.`,
    });
    return { result: 'unknown_product' };
  }

  const user = await store.getUserByEmail(db, email);
  const canGrant = user && user.email_verified_at && !user.blocked_at;

  if (canGrant) {
    const g = await store.grantAccess(db, { userId: user.id, courseId: course.id, source, saleId });
    if (g.action === 'granted') {
      await ctx.notify('purchaseConfirmed', {
        to: user.email,
        name: user.name,
        courseTitle: course.title,
        link: `${ctx.siteUrl}/espace/formation/${course.slug}`,
      });
      return { result: 'granted', userId: user.id, courseId: course.id };
    }
    if (g.action === 'blocked_revoked') {
      await store.raiseAlert(db, {
        kind: 'blocked_revoked',
        message: `La vente ${saleId} avait été retirée (remboursement ?). L'accès n'a pas été rétabli automatiquement : faites-le à la main depuis la fiche de l'apprenant si c'est voulu.`,
      });
      return { result: 'blocked_revoked', userId: user.id, courseId: course.id };
    }
    return { result: 'already_active', userId: user.id, courseId: course.id };
  }

  // Pas de compte, compte non vérifié ou bloqué : on garde l'achat en attente.
  const isNew = await store.addPendingPurchase(db, { email, courseId: course.id, saleId, customerName, source });
  if (isNew) {
    if (user && user.blocked_at) {
      await store.raiseAlert(db, { kind: 'pending_blocked', message: `Achat reçu de ${email}, dont le compte est bloqué : l'accès reste en attente.` });
    } else if (user) {
      await ctx.notify('purchasePendingVerification', {
        to: user.email,
        name: user.name,
        courseTitle: course.title,
        link: `${ctx.siteUrl}/connexion`,
      });
    } else {
      await ctx.notify('purchaseNoAccount', {
        to: email,
        name: customerName,
        courseTitle: course.title,
        link: `${ctx.siteUrl}/inscription?email=${encodeURIComponent(email)}`,
      });
    }
  }
  return { result: isNew ? 'pending' : 'pending_duplicate', courseId: course.id };
}

/** Quand un compte est créé ou son e-mail confirmé : rattache les achats en attente de cette adresse. */
export async function claimPendingForUser(ctx, user) {
  if (!user.email_verified_at || user.blocked_at) return { claimed: 0, granted: 0 };
  const out = await store.claimPendingPurchases(ctx.db, { userId: user.id, email: user.email });
  if (out.granted > 0) {
    await ctx.notify('purchaseConfirmed', {
      to: user.email,
      name: user.name,
      courseTitle: null,
      link: `${ctx.siteUrl}/espace`,
    });
  }
  return out;
}
