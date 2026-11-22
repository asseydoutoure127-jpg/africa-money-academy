// Tout ce que l'élève a fait sur le site, lu dans les vraies tables (rien n'est inventé).
import { KIND_LABELS, dayOf } from './points.js';

const first = (r) => r.rows[0] ?? null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export const LEVELS = [
  { n: 1, name: 'Débutant', from: 0 },
  { n: 2, name: 'Apprenti', from: 150 },
  { n: 3, name: 'Pratiquant', from: 500 },
  { n: 4, name: 'Confirmé', from: 1200 },
  { n: 5, name: 'Expert', from: 2500 },
  { n: 6, name: 'Maître', from: 5000 },
];

/** Niveau selon le total de points gagnés, et ce qu'il reste avant le suivant. */
export function levelFor(points) {
  const p = Math.max(0, Number(points) || 0);
  let cur = LEVELS[0];
  for (const l of LEVELS) if (p >= l.from) cur = l;
  const next = LEVELS.find((l) => l.from > cur.from) || null;
  return { ...cur, next, toNext: next ? next.from - p : 0, pct: next ? Math.round(((p - cur.from) / (next.from - cur.from)) * 100) : 100 };
}

/** Réussites : chacune a une condition vérifiable et une progression (courant / objectif). */
export function buildAchievements(a) {
  const g = (group, key, title, current, target, hint) => ({ group, key, title, current: Math.min(current, target), target, done: current >= target, hint });
  return [
    g('Apprentissage', 'l1', 'Première leçon terminée', a.lessons, 1, 'Terminez une leçon'),
    g('Apprentissage', 'l5', '5 leçons terminées', a.lessons, 5, 'Terminez 5 leçons'),
    g('Apprentissage', 'l10', '10 leçons terminées', a.lessons, 10, 'Terminez 10 leçons'),
    g('Apprentissage', 'l25', '25 leçons terminées', a.lessons, 25, 'Terminez 25 leçons'),
    g('Apprentissage', 'c1', 'Formation terminée', a.courses, 1, 'Terminez toutes les leçons d’une formation'),
    g('Exercices', 'e1', 'Premier exercice rendu', a.exercises, 1, 'Rendez un exercice'),
    g('Exercices', 'e5', '5 exercices rendus', a.exercises, 5, 'Rendez 5 exercices'),
    g('Exercices', 'v1', 'Premier exercice validé', a.validated, 1, 'Faites valider un exercice'),
    g('Exercices', 'v5', '5 exercices validés', a.validated, 5, 'Faites valider 5 exercices'),
    g('Exercices', 'n8', 'Note de 8/10 ou plus', a.bestGrade >= 8 ? 1 : 0, 1, 'Obtenez au moins 8/10 à un exercice'),
    g('Exercices', 'n10', 'Note parfaite : 10/10', a.bestGrade >= 10 ? 1 : 0, 1, 'Obtenez 10/10 à un exercice'),
    g('Régularité', 's3', '3 jours de suite', a.bestStreak, 3, 'Revenez 3 jours de suite'),
    g('Régularité', 's7', '7 jours de suite', a.bestStreak, 7, 'Revenez 7 jours de suite'),
    g('Régularité', 's14', '14 jours de suite', a.bestStreak, 14, 'Revenez 14 jours de suite'),
    g('Régularité', 's30', '30 jours de suite', a.bestStreak, 30, 'Revenez 30 jours de suite'),
    g('Régularité', 'd30', '30 jours de visite en tout', a.daysActive, 30, 'Visitez le site 30 jours (pas forcément de suite)'),
    g('Lecture', 'r60', '1 heure de lecture', a.readingMinutes, 60, 'Lisez 60 minutes au total'),
    g('Lecture', 'r300', '5 heures de lecture', a.readingMinutes, 300, 'Lisez 300 minutes au total'),
    g('Communauté', 'f1', 'Premier ami parrainé', a.referred, 1, 'Parrainez un ami qui s’inscrit'),
    g('Communauté', 'f5', '5 amis parrainés', a.referred, 5, 'Parrainez 5 amis'),
    g('Boutique', 'b1', 'Premier achat en boutique', a.orders, 1, 'Échangez vos pièces contre un article'),
  ];
}

/** Plus longue série de jours de suite parmi des jours AAAA-MM-JJ. */
export function bestStreak(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    prev = t;
    if (run > best) best = run;
  }
  return best;
}

export async function profileData(db, userId, { referred = 0 } = {}) {
  const ev = first(await db.query(
    `select coalesce(sum(points), 0)::int as points_total,
            count(*) filter (where kind = 'course_done')::int as courses_done,
            count(*) filter (where kind = 'login')::int as days_active
       from point_events where user_id = $1`, [userId]));
  // Leçons et exercices : lus dans leurs vraies tables (ils existent même s'ils datent d'avant les points).
  const real = first(await db.query(
    `select (select count(*)::int from lesson_progress where user_id = $1) as lessons_done,
            (select count(*)::int from lesson_exercises where user_id = $1) as exercises_sent,
            (select count(*)::int from lesson_exercises where user_id = $1 and validated_at is not null) as exercises_validated`, [userId]));
  const totals = { ...ev, ...real };
  const grade = first(await db.query(`select round(avg(grade)::numeric, 1) as avg, count(grade)::int as n from lesson_exercises where user_id = $1 and grade is not null`, [userId]));
  const reading = first(await db.query(`select coalesce(sum(seconds), 0)::int as s from reading_days where user_id = $1`, [userId]));
  const loginDays = (await db.query(`select ref from point_events where user_id = $1 and kind = 'login'`, [userId])).rows.map((r) => r.ref);
  const months = (await db.query(
    `select period, sum(points)::int as pts from point_events where user_id = $1 group by period order by period desc limit 6`, [userId])).rows.reverse();
  const recentRaw = (await db.query(
    `select e.kind, e.points, e.created_at, e.ref, l.title as lesson_title
       from point_events e left join lessons l on (e.ref ~* '^[0-9a-f-]{36}$' and e.kind in ('lesson_open','lesson_done','exercise','validated') and l.id::text = e.ref)
      where e.user_id = $1 order by e.created_at desc limit 15`, [userId])).rows;
  const recent = recentRaw.map((r) => ({
    label: (KIND_LABELS[r.kind] || r.kind).replace(/s$/, (m) => m) ,
    kind: r.kind, points: r.points, at: r.created_at, lesson: r.lesson_title || null,
  }));
  const exercises = (await db.query(
    `select l.title as lesson_title, c.title as course_title, x.grade, x.validated_at, x.status, x.feedback, x.submitted_at, x.updated_at
       from lesson_exercises x join lessons l on l.id = x.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id
      where x.user_id = $1 order by x.updated_at desc limit 20`, [userId])).rows;
  const orders = (await db.query(`select item_title, price_coins, status, created_at from shop_orders where user_id = $1 order by created_at desc limit 20`, [userId])).rows;
  const me = first(await db.query(`select created_at, referral_code from users where id = $1`, [userId]));
  const t = totals;
  const best = bestStreak(loginDays);
  const bestGrade = Number(first(await db.query(`select coalesce(max(grade), 0)::int as g from lesson_exercises where user_id = $1`, [userId])).g);
  const perCourse = (await db.query(
    `select c.id as course_id, count(*)::int as sent, count(*) filter (where x.status = 'validated')::int as validated, round(avg(x.grade)::numeric, 1) as avg
       from lesson_exercises x join lessons l on l.id = x.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id
      where x.user_id = $1 group by c.id`, [userId])).rows;
  const activityDays = loginDays.filter((d) => typeof d === 'string');
  const achievements = buildAchievements({
    lessons: t.lessons_done, courses: t.courses_done, exercises: t.exercises_sent, validated: t.exercises_validated, bestGrade,
    bestStreak: best, daysActive: t.days_active, readingMinutes: Math.round((reading?.s || 0) / 60), referred, orders: orders.length,
  });
  return {
    memberSince: me?.created_at, totals: t, gradeAvg: grade?.n ? Number(grade.avg) : null, gradeCount: grade?.n || 0,
    readingMinutes: Math.round((reading?.s || 0) / 60), bestStreak: best, months, recent, exercises, orders, achievements, level: levelFor(t.points_total), activityDays, perCourse,
    today: dayOf(),
  };
}
