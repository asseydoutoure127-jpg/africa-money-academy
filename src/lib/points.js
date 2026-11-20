// Points de classement (remis à zéro chaque mois) et pièces de boutique (cumulées, dépensables).
// Chaque gain est une ligne de `point_events`, unique par (élève, type, référence) : on ne gagne jamais deux fois la même chose.

export const BAREME = {
  signup: 10,
  lessonOpen: 2,
  lessonDone: 20,
  exercise: 20,
  validatedBase: 30,
  validatedPerGrade: 5,
  login: 3,
  readingPerTwoMinutes: 1,
  readingDailyCap: 20,
  referral: 15,
  courseDone: 100,
};
export const STREAK_BONUS = { 3: 10, 7: 30, 14: 60, 30: 150 };
// Les pièces valent autant que les points gagnés (1 pour 1). Elles ne sont jamais remises à zéro.
export const COIN_RATE = 1;

export const KIND_LABELS = {
  signup: 'Inscription',
  lesson_open: 'Leçons ouvertes',
  lesson_done: 'Leçons terminées',
  exercise: 'Exercices rendus',
  validated: 'Exercices validés et notés',
  login: 'Connexions',
  streak: 'Séries',
  reading: 'Temps de lecture',
  referral: 'Parrainage',
  course_done: 'Formations terminées',
};

export const periodOf = (d = new Date()) => d.toISOString().slice(0, 7);
export const dayOf = (d = new Date()) => d.toISOString().slice(0, 10);
export const validatedPoints = (grade) => BAREME.validatedBase + BAREME.validatedPerGrade * Math.max(0, Math.min(10, Number(grade) || 0));
export const readingPoints = (seconds) => Math.min(BAREME.readingDailyCap, Math.floor(Math.max(0, seconds) / 120) * BAREME.readingPerTwoMinutes);

/** Nombre de jours de suite jusqu'à `today` (inclus) présents dans l'ensemble `days` (chaînes AAAA-MM-JJ). */
export function streakFromDays(days, today = dayOf()) {
  const set = new Set(days);
  let n = 0;
  const d = new Date(`${today}T00:00:00Z`);
  while (set.has(d.toISOString().slice(0, 10))) {
    n += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** Nom affiché dans le classement : prénom + initiale du nom (« Ramata K. »). */
export function displayName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Élève';
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts.length > 1 ? `${first} ${parts[parts.length - 1].charAt(0).toUpperCase()}.` : first;
}

const first = (r) => r.rows[0] ?? null;

/** Ajoute un gain. `replace` : met à jour le gain existant (note modifiée, temps de lecture). Renvoie true si c'est un nouveau gain. */
export async function award(db, { userId, kind, ref = '', points, replace = false, now = new Date() }) {
  const coins = Math.round(points * COIN_RATE);
  const r = await db.query(
    `insert into point_events (user_id, kind, ref, points, coins, period) values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, kind, ref) ${replace ? 'do update set points = excluded.points, coins = excluded.coins' : 'do nothing'}
     returning (xmax = 0) as inserted`,
    [userId, kind, ref, points, coins, periodOf(now)],
  );
  return Boolean(r.rows[0]?.inserted);
}

export async function removeAward(db, { userId, kind, ref = '' }) {
  await db.query(`delete from point_events where user_id = $1 and kind = $2 and ref = $3`, [userId, kind, ref]);
}

/** Une erreur de points ne doit jamais empêcher l'élève d'apprendre. */
export async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error('points:', e?.message || e);
    return null;
  }
}

export async function currentStreak(db, userId, today = dayOf()) {
  const rows = (await db.query(`select ref from point_events where user_id = $1 and kind = 'login' and ref >= $2`, [userId, dayOf(new Date(Date.parse(`${today}T00:00:00Z`) - 40 * 86400000))])).rows;
  return streakFromDays(rows.map((r) => r.ref), today);
}

/** Visite du jour : +3 points, et un bonus quand la série atteint 3, 7, 14 ou 30 jours. */
export async function touchDaily(db, userId) {
  const today = dayOf();
  const isNew = await award(db, { userId, kind: 'login', ref: today, points: BAREME.login });
  if (!isNew) return null;
  const streak = await currentStreak(db, userId, today);
  const bonus = STREAK_BONUS[streak];
  if (bonus) await award(db, { userId, kind: 'streak', ref: `${streak}:${today}`, points: bonus });
  return { streak, bonus: bonus || 0 };
}


/** Semaine en cours (lundi à dimanche) : jours de visite + missions du jour, calculés sur les vrais événements. */
export async function weekOverview(db, userId, now = new Date()) {
  const today = dayOf(now);
  const dow = (now.getUTCDay() + 6) % 7; // 0 = lundi
  const monday = dayOf(new Date(Date.parse(`${today}T00:00:00Z`) - dow * 86400000));
  const rows = (await db.query(
    `select kind, ref, points from point_events where user_id = $1 and ((kind = 'login' and ref >= $2) or (kind in ('lesson_open','lesson_done','exercise','reading') and created_at >= $3::date))`,
    [userId, monday, today],
  )).rows;
  const visited = new Set(rows.filter((r) => r.kind === 'login').map((r) => r.ref));
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, i) => {
    const d = dayOf(new Date(Date.parse(`${monday}T00:00:00Z`) + i * 86400000));
    return { label, done: visited.has(d), today: d === today, future: d > today };
  });
  const todayRows = rows.filter((r) => r.kind !== 'login');
  const has = (k) => todayRows.some((r) => r.kind === k);
  const readPts = todayRows.filter((r) => r.kind === 'reading').reduce((a, r) => a + r.points, 0);
  const missions = [
    { key: 'visit', label: 'Venir sur le site', done: visited.has(today), value: visited.has(today) ? 1 : 0, goal: 1, reward: BAREME.login },
    { key: 'open', label: 'Ouvrir une leçon', done: has('lesson_open'), value: has('lesson_open') ? 1 : 0, goal: 1, reward: BAREME.lessonOpen },
    { key: 'done', label: 'Terminer une leçon', done: has('lesson_done'), value: has('lesson_done') ? 1 : 0, goal: 1, reward: BAREME.lessonDone },
    { key: 'read', label: 'Lire 10 minutes', done: readPts >= 5, value: Math.min(10, readPts * 2), goal: 10, reward: 5, unit: 'min' },
  ];
  return { days, missions };
}

/** Leçon terminée : +20, et +100 si c'est la dernière de la formation. */
export async function awardLessonDone(db, { userId, lessonId, courseId, percentAfter }) {
  await award(db, { userId, kind: 'lesson_done', ref: lessonId, points: BAREME.lessonDone });
  if (percentAfter >= 100) await award(db, { userId, kind: 'course_done', ref: courseId, points: BAREME.courseDone });
}

/** Ajoute une minute de lecture (si la précédente date de plus de ~50 s) et recalcule les points du jour. */
export async function addReadingMinute(db, userId) {
  const r = first(
    await db.query(
      `insert into reading_days (user_id, day, seconds, last_ping) values ($1, $2::date, 60, now())
       on conflict (user_id, day) do update set seconds = reading_days.seconds + 60, last_ping = now()
       where reading_days.last_ping < now() - interval '50 seconds' and reading_days.seconds < 14400
       returning seconds`,
      [userId, dayOf()],
    ),
  );
  if (!r) return null;
  const pts = readingPoints(r.seconds);
  if (pts > 0) await award(db, { userId, kind: 'reading', ref: dayOf(), points: pts, replace: true });
  return { seconds: r.seconds, points: pts };
}

// ------------------------------------------------------------ Lecture : classement, solde, boutique

export async function ranking(db, period, { limit = 10 } = {}) {
  const rows = (
    await db.query(
      `select u.id, u.name, u.rank_hidden, coalesce(sum(e.points), 0)::int as pts,
              count(*) filter (where e.kind = 'validated')::int as n_validated,
              count(*) filter (where e.kind in ('lesson_done', 'exercise'))::int as n_done,
              count(*) filter (where e.kind = 'lesson_open')::int as n_open,
              max(e.created_at) as last_at
       from users u left join point_events e on e.user_id = u.id and e.period = $1
       where u.role = 'learner' and u.blocked_at is null
       group by u.id
       order by pts desc, last_at asc nulls last, u.created_at asc`,
      [period],
    )
  ).rows;
  const statusOf = (r) => (r.n_validated > 0 ? 'Exercice validé' : r.n_done > 0 ? 'En cours' : r.n_open > 0 ? 'A commencé' : 'Inscrit');
  const all = rows.map((r, i) => ({ id: r.id, rank: i + 1, name: r.rank_hidden ? 'Élève masqué' : displayName(r.name), points: r.pts, status: statusOf(r), hidden: r.rank_hidden }));
  return { top: all.slice(0, limit), all, total: all.length };
}

export async function myStanding(db, userId, period) {
  const { all } = await ranking(db, period, { limit: 0 });
  return all.find((r) => r.id === userId) || null;
}

export async function coinBalance(db, userId) {
  const r = first(
    await db.query(
      `select (select coalesce(sum(coins), 0) from point_events where user_id = $1)
            - (select coalesce(sum(price_coins), 0) from shop_orders where user_id = $1 and status <> 'cancelled') as balance`,
      [userId],
    ),
  );
  return Number(r.balance);
}

export async function pointsBreakdown(db, period) {
  return (
    await db.query(
      `select u.id, u.name, u.email, e.kind, sum(e.points)::int as pts
       from point_events e join users u on u.id = e.user_id
       where e.period = $1 and u.role = 'learner' group by u.id, u.name, u.email, e.kind`,
      [period],
    )
  ).rows;
}

export async function listHonor(db, limit = 24) {
  return (await db.query(`select period, rank, display_name, points, prize from honor_board order by period desc, rank asc limit $1`, [limit])).rows;
}

/** Achat atomique : le solde est vérifié et le stock retiré dans la même transaction. */
export async function buyItem(db, { userId, itemId }) {
  const client = await db.connect();
  try {
    await client.query('begin');
    await client.query(`select id from users where id = $1 for update`, [userId]);
    const item = first(await client.query(`select id, title, price_coins, stock, active from shop_items where id = $1 for update`, [itemId]));
    if (!item || !item.active) { await client.query('rollback'); return { ok: false, reason: 'indisponible' }; }
    if (item.stock !== null && item.stock <= 0) { await client.query('rollback'); return { ok: false, reason: 'epuise' }; }
    const bal = first(await client.query(
      `select (select coalesce(sum(coins), 0) from point_events where user_id = $1)
            - (select coalesce(sum(price_coins), 0) from shop_orders where user_id = $1 and status <> 'cancelled') as balance`,
      [userId],
    ));
    if (Number(bal.balance) < item.price_coins) { await client.query('rollback'); return { ok: false, reason: 'solde' }; }
    if (item.stock !== null) await client.query(`update shop_items set stock = stock - 1 where id = $1`, [itemId]);
    await client.query(`insert into shop_orders (user_id, item_id, item_title, price_coins) values ($1, $2, $3, $4)`, [userId, itemId, item.title, item.price_coins]);
    await client.query('commit');
    return { ok: true, title: item.title };
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------ Réglages et affichage

import { getSetting } from './settings.js';

export async function rankingConfig(db) {
  const prize = ((await getSetting(db, 'ranking_prize')) || '').trim();
  const startRaw = ((await getSetting(db, 'ranking_start')) || '2026-12').trim();
  return { prize, start: /^\d{4}-\d{2}$/.test(startRaw) ? startRaw : '2026-12' };
}

export function monthLabel(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function monthEndLabel(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export async function listShopItems(db, { onlyActive = true } = {}) {
  return (await db.query(`select * from shop_items ${onlyActive ? 'where active' : ''} order by position, created_at`)).rows;
}
