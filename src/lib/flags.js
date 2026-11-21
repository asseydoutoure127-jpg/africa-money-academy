import { cache } from 'react';

// Le classement ne s'affiche que lorsqu'il y a assez d'élèves : avec 3 inscrits, il aurait l'air vide.
export const RANKING_MIN_LEARNERS = 10;

// Mis en cache le temps d'une requête (le menu, le pied de page et la page le demandent chacun).
export const siteFlags = cache(async (db) => {
  try {
    const [learners, shop] = await Promise.all([
      db.query(`select count(*)::int as n from users where role = 'learner' and blocked_at is null`),
      db.query(`select count(*)::int as n from shop_items where active`),
    ]);
    return { learners: learners.rows[0].n, rankingOpen: learners.rows[0].n >= RANKING_MIN_LEARNERS, shopOpen: shop.rows[0].n > 0 };
  } catch {
    return { learners: 0, rankingOpen: false, shopOpen: false };
  }
});
