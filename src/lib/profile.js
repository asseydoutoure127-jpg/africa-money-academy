// Tout ce que l'élève a fait sur le site, lu dans les vraies tables (rien n'est inventé).
import { KIND_LABELS, dayOf } from './points.js';

const first = (r) => r.rows[0] ?? null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function profileData(db, userId) {
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
    `select l.title as lesson_title, c.title as course_title, x.grade, x.validated_at, x.feedback, x.submitted_at, x.updated_at
       from lesson_exercises x join lessons l on l.id = x.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id
      where x.user_id = $1 order by x.updated_at desc limit 20`, [userId])).rows;
  const orders = (await db.query(`select item_title, price_coins, status, created_at from shop_orders where user_id = $1 order by created_at desc limit 20`, [userId])).rows;
  const me = first(await db.query(`select created_at, referral_code from users where id = $1`, [userId]));
  const t = totals;
  const best = bestStreak(loginDays);
  const achievements = [
    { key: 'first_lesson', title: 'Première leçon terminée', done: t.lessons_done >= 1 },
    { key: 'five_lessons', title: '5 leçons terminées', done: t.lessons_done >= 5 },
    { key: 'first_exercise', title: 'Premier exercice rendu', done: t.exercises_sent >= 1 },
    { key: 'first_validated', title: 'Premier exercice validé', done: t.exercises_validated >= 1 },
    { key: 'streak3', title: '3 jours de suite', done: best >= 3 },
    { key: 'streak7', title: '7 jours de suite', done: best >= 7 },
    { key: 'streak30', title: '30 jours de suite', done: best >= 30 },
    { key: 'course', title: 'Formation terminée', done: t.courses_done >= 1 },
  ];
  return {
    memberSince: me?.created_at, totals: t, gradeAvg: grade?.n ? Number(grade.avg) : null, gradeCount: grade?.n || 0,
    readingMinutes: Math.round((reading?.s || 0) / 60), bestStreak: best, months, recent, exercises, orders, achievements,
    today: dayOf(),
  };
}
