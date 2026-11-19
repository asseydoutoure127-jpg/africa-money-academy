// Toutes les requêtes SQL de la plateforme. Chaque fonction reçoit `db` (un objet avec
// `query(texte, paramètres) -> { rows }`, par exemple un Pool `pg`).
// Règle : une opération = une seule instruction SQL (atomique), sans transaction manuelle.

const first = (r) => r.rows[0] ?? null;

// ============================ Utilisateurs ============================

export async function createUser(db, { email, name, passwordHash, role = 'learner', verified = false }) {
  const r = await db.query(
    `insert into users (email, name, password_hash, role, email_verified_at)
     values ($1, $2, $3, $4, case when $5::boolean then now() else null end)
     returning id, email, name, role, email_verified_at, blocked_at, created_at`,
    [email.trim(), name.trim(), passwordHash, role, verified],
  );
  return first(r);
}

export async function getUserByEmail(db, email) {
  return first(await db.query(`select * from users where lower(email) = lower($1)`, [email.trim()]));
}

export async function getUserById(db, id) {
  return first(await db.query(`select * from users where id = $1`, [id]));
}

export async function countAdmins(db) {
  return Number(first(await db.query(`select count(*)::int as n from users where role = 'admin'`)).n);
}

export async function markEmailVerified(db, userId) {
  return first(
    await db.query(
      `update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1
       returning id, email, name, email_verified_at`,
      [userId],
    ),
  );
}

export async function setPassword(db, userId, passwordHash) {
  await db.query(`update users set password_hash = $2 where id = $1`, [userId, passwordHash]);
}

export async function setBlocked(db, userId, blocked) {
  await db.query(`update users set blocked_at = case when $2::boolean then now() else null end where id = $1`, [userId, blocked]);
}

export async function deleteUser(db, userId) {
  await db.query(`delete from users where id = $1`, [userId]);
}

export async function listUsers(db, { q = '', limit = 30, offset = 0 } = {}) {
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = (
    await db.query(
      `select id, email, name, role, email_verified_at, blocked_at, created_at
       from users where lower(email) like $1 or lower(name) like $1
       order by created_at desc limit $2 offset $3`,
      [like, limit, offset],
    )
  ).rows;
  const total = Number(first(await db.query(`select count(*)::int as n from users where lower(email) like $1 or lower(name) like $1`, [like])).n);
  return { rows, total };
}

// ============================ Sessions & jetons ============================

export async function createSession(db, { userId, tokenHash, expiresAt, userAgent }) {
  await db.query(
    `insert into sessions (user_id, token_hash, expires_at, user_agent) values ($1, $2, $3, $4)`,
    [userId, tokenHash, expiresAt, userAgent ?? null],
  );
}

export async function getSessionUser(db, tokenHash) {
  return first(
    await db.query(
      `select u.id, u.email, u.name, u.role, u.email_verified_at, u.blocked_at
       from sessions s join users u on u.id = s.user_id
       where s.token_hash = $1 and s.expires_at > now() and u.blocked_at is null`,
      [tokenHash],
    ),
  );
}

export async function deleteSession(db, tokenHash) {
  await db.query(`delete from sessions where token_hash = $1`, [tokenHash]);
}

export async function deleteUserSessions(db, userId) {
  await db.query(`delete from sessions where user_id = $1`, [userId]);
}

export async function createEmailToken(db, { userId, kind, tokenHash, expiresAt }) {
  // Un seul jeton actif par type : on invalide les anciens.
  await db.query(`update email_tokens set used_at = now() where user_id = $1 and kind = $2 and used_at is null`, [userId, kind]);
  await db.query(
    `insert into email_tokens (user_id, kind, token_hash, expires_at) values ($1, $2, $3, $4)`,
    [userId, kind, tokenHash, expiresAt],
  );
}

/** Consomme un jeton à usage unique. Retourne l'identifiant de l'utilisateur, ou null. */
export async function consumeEmailToken(db, { kind, tokenHash }) {
  const row = first(
    await db.query(
      `update email_tokens set used_at = now()
       where token_hash = $1 and kind = $2 and used_at is null and expires_at > now()
       returning user_id`,
      [tokenHash, kind],
    ),
  );
  return row ? row.user_id : null;
}

/** Limitation de débit : retourne { allowed, count }. */
export async function rateLimitHit(db, { key, windowSeconds, limit }) {
  const row = first(
    await db.query(
      `insert into rate_limits (key, bucket, count)
       values ($1, to_timestamp(floor(extract(epoch from now()) / $2::int) * $2::int), 1)
       on conflict (key, bucket) do update set count = rate_limits.count + 1
       returning count`,
      [key, windowSeconds],
    ),
  );
  const count = Number(row.count);
  return { allowed: count <= limit, count };
}

export async function purgeOldRateLimits(db) {
  await db.query(`delete from rate_limits where bucket < now() - interval '2 days'`);
  await db.query(`delete from sessions where expires_at < now()`);
  await db.query(`delete from email_tokens where expires_at < now() - interval '7 days'`);
}

// ============================ Formations ============================

const COURSE_COLS = `id, slug, title, summary, description, objectives, audience, prerequisites, faq, image_url, level,
  duration_label, price_label, status, is_free, chariow_product_ref, chariow_product_id, chariow_product_url,
  purchase_mode, certificate_enabled, position, created_at, updated_at`;

export async function listPublishedCourses(db) {
  return (await db.query(`select ${COURSE_COLS} from courses where status = 'published' order by position, created_at`)).rows;
}

/** Formations pas encore ouvertes à la vente mais déjà rédigées : affichées « Bientôt » (jamais leur contenu). */
export async function listUpcomingCourses(db) {
  return (
    await db.query(
      `select ${COURSE_COLS} from courses c
       where status = 'draft'
         and exists (select 1 from modules m join lessons l on l.module_id = m.id where m.course_id = c.id)
       order by position, created_at`,
    )
  ).rows;
}

/** Chiffres réels du catalogue (modules, leçons, exercices) pour une liste de formations. */
export async function courseCounts(db, courseIds) {
  if (!courseIds.length) return new Map();
  const rows = (
    await db.query(
      `select m.course_id,
              count(distinct m.id)::int as modules,
              count(l.id)::int as lessons,
              count(l.id) filter (where l.exercise <> '')::int as exercises,
              coalesce(sum(array_length(regexp_split_to_array(trim(l.content), '\s+'), 1)), 0)::int as words
       from modules m left join lessons l on l.module_id = m.id
       where m.course_id = any($1::uuid[]) group by m.course_id`,
      [courseIds],
    )
  ).rows;
  return new Map(rows.map((r) => [r.course_id, { modules: Number(r.modules), lessons: Number(r.lessons), exercises: Number(r.exercises), pages: Math.max(1, Math.round(Number(r.words) / 300)) }]));
}

export async function listAllCourses(db) {
  return (
    await db.query(
      `select ${COURSE_COLS},
        (select count(*)::int from enrollments e where e.course_id = courses.id and e.status = 'active') as learners
       from courses order by position, created_at`,
    )
  ).rows;
}

export async function getCourseBySlug(db, slug) {
  return first(await db.query(`select ${COURSE_COLS} from courses where slug = $1`, [slug]));
}

export async function getCourseById(db, id) {
  return first(await db.query(`select ${COURSE_COLS} from courses where id = $1`, [id]));
}

/** La formation correspondant à un produit Chariow (identifiant prd_... du Pulse). */
export async function findCourseByChariowProduct(db, productId) {
  return first(
    await db.query(
      `select ${COURSE_COLS} from courses
       where chariow_product_id = $1 or (chariow_product_id is null and chariow_product_ref = $1)
       order by (chariow_product_id = $1) desc nulls last limit 1`,
      [productId],
    ),
  );
}

export async function createCourse(db, { slug, title }) {
  return first(await db.query(`insert into courses (slug, title) values ($1, $2) returning ${COURSE_COLS}`, [slug, title]));
}

const COURSE_EDITABLE = [
  'title', 'summary', 'description', 'objectives', 'audience', 'prerequisites', 'faq', 'image_url', 'level',
  'duration_label', 'price_label', 'is_free', 'chariow_product_ref', 'chariow_product_id', 'chariow_product_url',
  'purchase_mode', 'certificate_enabled', 'position', 'slug',
];

export async function updateCourse(db, id, fields) {
  const keys = Object.keys(fields).filter((k) => COURSE_EDITABLE.includes(k));
  if (keys.length === 0) return getCourseById(db, id);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  return first(
    await db.query(`update courses set ${sets}, updated_at = now() where id = $1 returning ${COURSE_COLS}`, [id, ...keys.map((k) => fields[k])]),
  );
}

export async function setCourseStatus(db, id, status) {
  return first(await db.query(`update courses set status = $2, updated_at = now() where id = $1 returning ${COURSE_COLS}`, [id, status]));
}

export async function deleteCourse(db, id) {
  await db.query(`delete from courses where id = $1`, [id]);
}

// ---- Modules et leçons ----

export async function listModulesWithLessons(db, courseId) {
  const modules = (await db.query(`select id, course_id, title, description, position from modules where course_id = $1 order by position, title`, [courseId])).rows;
  const lessons = (
    await db.query(
      `select l.id, l.module_id, l.title, l.duration_min, l.position
       from lessons l join modules m on m.id = l.module_id where m.course_id = $1 order by l.position, l.title`,
      [courseId],
    )
  ).rows;
  return modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.module_id === m.id) }));
}

export async function createModule(db, { courseId, title }) {
  return first(
    await db.query(
      `insert into modules (course_id, title, position)
       values ($1, $2, coalesce((select max(position) + 1 from modules where course_id = $1), 0)) returning *`,
      [courseId, title],
    ),
  );
}

export async function updateModule(db, id, { title, description, position }) {
  return first(
    await db.query(
      `update modules set title = coalesce($2, title), description = coalesce($3, description), position = coalesce($4, position)
       where id = $1 returning *`,
      [id, title ?? null, description ?? null, position ?? null],
    ),
  );
}

export async function deleteModule(db, id) {
  await db.query(`delete from modules where id = $1`, [id]);
}

export async function createLesson(db, { moduleId, title }) {
  return first(
    await db.query(
      `insert into lessons (module_id, title, position)
       values ($1, $2, coalesce((select max(position) + 1 from lessons where module_id = $1), 0)) returning *`,
      [moduleId, title],
    ),
  );
}

export async function getLesson(db, id) {
  return first(
    await db.query(
      `select l.*, m.course_id, m.title as module_title, m.position as module_position
       from lessons l join modules m on m.id = l.module_id where l.id = $1`,
      [id],
    ),
  );
}

export async function updateLesson(db, id, { title, content, durationMin, position, exercise }) {
  return first(
    await db.query(
      `update lessons set title = coalesce($2, title), content = coalesce($3, content),
         duration_min = coalesce($4, duration_min), position = coalesce($5, position),
         exercise = coalesce($6, exercise)
       where id = $1 returning *`,
      [id, title ?? null, content ?? null, durationMin ?? null, position ?? null, exercise ?? null],
    ),
  );
}

export async function deleteLesson(db, id) {
  await db.query(`delete from lessons where id = $1`, [id]);
}

// ---- Progression ----

export async function listCompletedLessonIds(db, userId, courseId) {
  const rows = (
    await db.query(
      `select p.lesson_id from lesson_progress p
       join lessons l on l.id = p.lesson_id join modules m on m.id = l.module_id
       where p.user_id = $1 and m.course_id = $2`,
      [userId, courseId],
    )
  ).rows;
  return new Set(rows.map((r) => r.lesson_id));
}

export async function getExerciseAnswer(db, userId, lessonId) {
  return first(await db.query(`select answer, submitted_at, updated_at, validated_at, feedback from lesson_exercises where user_id = $1 and lesson_id = $2`, [userId, lessonId]));
}

export async function saveExerciseAnswer(db, userId, lessonId, answer) {
  await db.query(
    `insert into lesson_exercises (user_id, lesson_id, answer) values ($1, $2, $3)
     on conflict (user_id, lesson_id) do update set
       validated_at = case when lesson_exercises.answer is distinct from excluded.answer then null else lesson_exercises.validated_at end,
       validated_by = case when lesson_exercises.answer is distinct from excluded.answer then null else lesson_exercises.validated_by end,
       answer = excluded.answer, updated_at = now()`,
    [userId, lessonId, answer],
  );
}

export async function markLessonDone(db, userId, lessonId) {
  await db.query(`insert into lesson_progress (user_id, lesson_id) values ($1, $2) on conflict do nothing`, [userId, lessonId]);
}

// ============================ Accès (enrollments) ============================

export async function getEnrollment(db, userId, courseId) {
  return first(await db.query(`select * from enrollments where user_id = $1 and course_id = $2`, [userId, courseId]));
}

export async function hasActiveAccess(db, userId, courseId) {
  const e = await getEnrollment(db, userId, courseId);
  return Boolean(e && e.status === 'active');
}

export async function listUserEnrollments(db, userId) {
  return (
    await db.query(
      `select e.*, c.slug, c.title, c.image_url, c.status as course_status
       from enrollments e join courses c on c.id = e.course_id
       where e.user_id = $1 and e.status = 'active' order by e.granted_at desc`,
      [userId],
    )
  ).rows;
}

/**
 * Donne l'accès. Retourne { action, enrollment } où action vaut :
 *  - 'granted'          : nouvel accès (ou accès rétabli après un retrait) ;
 *  - 'unchanged'        : l'accès était déjà actif ;
 *  - 'blocked_revoked'  : cette MÊME vente avait été retirée (remboursement) : un Pulse rejoué ou la
 *                         réconciliation ne rétablissent pas l'accès tout seuls. Seul l'admin le peut ('manual').
 */
export async function grantAccess(db, { userId, courseId, source, saleId = null, grantedBy = null }) {
  const existing = await getEnrollment(db, userId, courseId);
  if (existing && existing.status === 'active') {
    if (saleId && !existing.chariow_sale_id) {
      await db.query(`update enrollments set chariow_sale_id = $2 where id = $1`, [existing.id, saleId]);
    }
    return { action: 'unchanged', enrollment: existing };
  }
  if (existing && existing.status === 'revoked' && source !== 'manual' && saleId && existing.chariow_sale_id === saleId) {
    return { action: 'blocked_revoked', enrollment: existing };
  }
  const enrollment = first(
    await db.query(
      `insert into enrollments (user_id, course_id, status, source, chariow_sale_id, granted_by)
       values ($1, $2, 'active', $3, $4, $5)
       on conflict (user_id, course_id) do update
         set status = 'active', revoked_at = null, revoke_reason = null, source = excluded.source,
             chariow_sale_id = coalesce(excluded.chariow_sale_id, enrollments.chariow_sale_id),
             granted_by = excluded.granted_by, granted_at = now()
       returning *`,
      [userId, courseId, source, saleId, grantedBy],
    ),
  );
  return { action: 'granted', enrollment };
}

export async function revokeAccess(db, { userId, courseId, reason }) {
  return first(
    await db.query(
      `update enrollments set status = 'revoked', revoked_at = now(), revoke_reason = $3
       where user_id = $1 and course_id = $2 and status = 'active' returning *`,
      [userId, courseId, reason],
    ),
  );
}

export async function listCourseEnrollments(db, userId) {
  return (
    await db.query(
      `select e.*, c.title, c.slug from enrollments e join courses c on c.id = e.course_id
       where e.user_id = $1 order by e.granted_at desc`,
      [userId],
    )
  ).rows;
}

/** Accès venant de Chariow à re-vérifier (remboursements), les moins récemment vérifiés d'abord. */
export async function listEnrollmentsToCheck(db, limit) {
  return (
    await db.query(
      `select id, user_id, course_id, chariow_sale_id from enrollments
       where status = 'active' and chariow_sale_id is not null and source in ('pulse', 'reconciliation')
       order by chariow_checked_at asc nulls first limit $1`,
      [limit],
    )
  ).rows;
}

export async function touchEnrollmentChecked(db, id) {
  await db.query(`update enrollments set chariow_checked_at = now() where id = $1`, [id]);
}

// ============================ Achats en attente ============================

/** Enregistre un achat pour une adresse sans compte vérifié. Retourne true si c'est nouveau. */
export async function addPendingPurchase(db, { email, courseId, saleId, customerName, source }) {
  const r = await db.query(
    `insert into pending_purchases (email, course_id, chariow_sale_id, customer_name, source)
     values (lower($1), $2, $3, $4, $5) on conflict (chariow_sale_id) do nothing returning id`,
    [email.trim(), courseId, saleId, customerName ?? null, source],
  );
  return r.rows.length === 1;
}

/** Rattache les achats en attente d'une adresse à un compte DONT L'E-MAIL EST VÉRIFIÉ. */
export async function claimPendingPurchases(db, { userId, email }) {
  const row = first(
    await db.query(
      `with claimed as (
         update pending_purchases set claimed_at = now(), claimed_user_id = $1::uuid
         where lower(email) = lower($2) and claimed_at is null
         returning course_id, chariow_sale_id
       ), granted as (
         insert into enrollments (user_id, course_id, status, source, chariow_sale_id)
         select distinct on (course_id) $1::uuid, course_id, 'active', 'pulse', chariow_sale_id from claimed order by course_id
         on conflict (user_id, course_id) do update
           set status = 'active', revoked_at = null, revoke_reason = null,
               chariow_sale_id = excluded.chariow_sale_id, granted_at = now()
           where enrollments.status = 'revoked' and enrollments.chariow_sale_id is distinct from excluded.chariow_sale_id
         returning course_id
       )
       select (select count(*) from claimed)::int as claimed, (select count(*) from granted)::int as granted`,
      [userId, email],
    ),
  );
  return { claimed: Number(row.claimed), granted: Number(row.granted) };
}

export async function listPendingPurchases(db, { limit = 50 } = {}) {
  return (
    await db.query(
      `select p.*, c.title as course_title from pending_purchases p join courses c on c.id = p.course_id
       where p.claimed_at is null order by p.created_at desc limit $1`,
      [limit],
    )
  ).rows;
}

export async function countPendingPurchases(db) {
  return Number(first(await db.query(`select count(*)::int as n from pending_purchases where claimed_at is null`)).n);
}

// ============================ Pulses ============================

/** Enregistre une livraison authentique. Retourne l'id, ou null si c'est un doublon (x-pulse-delivery-id déjà vu). */
export async function insertDelivery(db, { deliveryId, pulseId, event, payload }) {
  const row = first(
    await db.query(
      `insert into pulse_deliveries (delivery_id, pulse_id, event, payload)
       values ($1, $2, $3, $4::jsonb) on conflict (delivery_id) do nothing returning id`,
      [deliveryId, pulseId ?? null, event, JSON.stringify(payload)],
    ),
  );
  return row ? Number(row.id) : null;
}

/** Prend une livraison à traiter (une seule fois à la fois). */
export async function claimDelivery(db, id) {
  return first(
    await db.query(
      `update pulse_deliveries set status = 'processing', attempts = attempts + 1
       where id = $1 and status in ('received', 'failed') returning *`,
      [id],
    ),
  );
}

export async function finishDelivery(db, id, { status, result }) {
  await db.query(
    `update pulse_deliveries set status = $2, result = $3, error = null, processed_at = now() where id = $1`,
    [id, status, result],
  );
}

export async function failDelivery(db, id, error) {
  await db.query(`update pulse_deliveries set status = 'failed', error = $2 where id = $1`, [id, String(error).slice(0, 500)]);
}

/** Livraisons restées bloquées (plantage après la réponse 200) ou en échec, à retraiter. */
export async function listRetryableDeliveries(db, { maxAttempts = 5, limit = 50 } = {}) {
  return (
    await db.query(
      `select id from pulse_deliveries
       where attempts < $1 and (
         (status = 'received' and received_at < now() - interval '2 minutes')
         or status = 'failed'
         or (status = 'processing' and received_at < now() - interval '10 minutes')
       ) order by received_at limit $2`,
      [maxAttempts, limit],
    )
  ).rows.map((r) => Number(r.id));
}

export async function resetStuckProcessing(db) {
  await db.query(`update pulse_deliveries set status = 'failed', error = 'Traitement interrompu' where status = 'processing' and received_at < now() - interval '10 minutes'`);
}

export async function listDeliveries(db, { limit = 30, offset = 0 } = {}) {
  return (
    await db.query(
      `select id, delivery_id, pulse_id, event, status, result, error, attempts, received_at, processed_at,
              payload #>> '{sale,id}' as sale_id, payload #>> '{customer,email}' as customer_email
       from pulse_deliveries order by received_at desc limit $1 offset $2`,
      [limit, offset],
    )
  ).rows;
}

export async function getLastDelivery(db) {
  return first(await db.query(`select id, event, status, result, received_at from pulse_deliveries order by received_at desc limit 1`));
}

export async function getLastSaleDelivery(db) {
  return first(
    await db.query(`select received_at from pulse_deliveries where event = 'successful.sale' and result <> 'test' order by received_at desc limit 1`),
  );
}

export async function hasDeliveryForSale(db, saleId) {
  const r = await db.query(`select 1 from pulse_deliveries where payload #>> '{sale,id}' = $1 limit 1`, [saleId]);
  return r.rows.length > 0;
}

export async function addRejection(db, { reason, pulseId }) {
  await db.query(`insert into webhook_rejections (reason, pulse_id) values ($1, $2)`, [reason, pulseId ?? null]);
  await db.query(`delete from webhook_rejections where received_at < now() - interval '30 days'`);
}

export async function countRecentRejections(db, minutes = 60) {
  return Number(first(await db.query(`select count(*)::int as n from webhook_rejections where received_at > now() - ($1::int * interval '1 minute')`, [minutes])).n);
}

export async function getLastRejection(db) {
  return first(await db.query(`select reason, received_at from webhook_rejections order by received_at desc limit 1`));
}

// ============================ Réglages ============================

export async function getSettingRow(db, key) {
  return first(await db.query(`select key, value, encrypted, updated_at from settings where key = $1`, [key]));
}

export async function putSetting(db, { key, value, encrypted, userId }) {
  await db.query(
    `insert into settings (key, value, encrypted, updated_by) values ($1, $2, $3, $4)
     on conflict (key) do update set value = excluded.value, encrypted = excluded.encrypted, updated_at = now(), updated_by = excluded.updated_by`,
    [key, value, encrypted, userId ?? null],
  );
}

export async function deleteSetting(db, key) {
  await db.query(`delete from settings where key = $1`, [key]);
}

export async function listPulseSecretRows(db) {
  return (await db.query(`select id, label, pulse_id, secret_enc, created_at from pulse_secrets order by created_at`)).rows;
}

export async function addPulseSecret(db, { label, pulseId, secretEnc }) {
  return first(await db.query(`insert into pulse_secrets (label, pulse_id, secret_enc) values ($1, $2, $3) returning id`, [label, pulseId || null, secretEnc]));
}

export async function deletePulseSecret(db, id) {
  await db.query(`delete from pulse_secrets where id = $1`, [id]);
}

// ============================ Alertes, journal, pages ============================

/** Crée une alerte, sauf si la même est déjà ouverte. */
export async function raiseAlert(db, { kind, message }) {
  await db.query(
    `insert into alerts (kind, message)
     select $1, $2 where not exists (select 1 from alerts where kind = $1 and message = $2 and resolved_at is null)`,
    [kind, message.slice(0, 500)],
  );
}

export async function resolveAlerts(db, kind) {
  await db.query(`update alerts set resolved_at = now() where kind = $1 and resolved_at is null`, [kind]);
}

export async function resolveAlertById(db, id) {
  await db.query(`update alerts set resolved_at = now() where id = $1`, [id]);
}

export async function listOpenAlerts(db) {
  return (await db.query(`select id, kind, message, created_at from alerts where resolved_at is null order by created_at desc limit 50`)).rows;
}

export async function logAdmin(db, { adminId, action, target, detail }) {
  await db.query(`insert into admin_log (admin_id, action, target, detail) values ($1, $2, $3, $4::jsonb)`, [
    adminId ?? null,
    action,
    target ?? null,
    JSON.stringify(detail ?? {}),
  ]);
}

export async function listAdminLog(db, { limit = 50, offset = 0 } = {}) {
  return (
    await db.query(
      `select l.id, l.action, l.target, l.detail, l.created_at, u.name as admin_name
       from admin_log l left join users u on u.id = l.admin_id order by l.created_at desc limit $1 offset $2`,
      [limit, offset],
    )
  ).rows;
}

export async function getSitePage(db, slug) {
  return first(await db.query(`select slug, title, body, updated_at from site_pages where slug = $1`, [slug]));
}

export async function putSitePage(db, { slug, title, body }) {
  await db.query(
    `insert into site_pages (slug, title, body) values ($1, $2, $3)
     on conflict (slug) do update set title = excluded.title, body = excluded.body, updated_at = now()`,
    [slug, title, body],
  );
}

export async function dashboardStats(db) {
  const r = first(
    await db.query(
      `select
        (select count(*)::int from users where role = 'learner') as learners,
        (select count(*)::int from enrollments where status = 'active') as active_enrollments,
        (select count(*)::int from courses where status = 'published') as published_courses,
        (select count(*)::int from pending_purchases where claimed_at is null) as pending_purchases`,
    ),
  );
  return r;
}

export async function listRecentEnrollments(db, limit = 8) {
  return (
    await db.query(
      `select e.granted_at, e.source, u.name, u.email, c.title
       from enrollments e join users u on u.id = e.user_id join courses c on c.id = e.course_id
       where e.status = 'active' order by e.granted_at desc limit $1`,
      [limit],
    )
  ).rows;
}

// ============================ Admin : suivi des élèves (lecture seule) ============================

// Pour chaque élève : formations suivies, leçons terminées / total, exercices rendus, dernière activité.
export async function listLearnersOverview(db, { q = '', limit = 40, offset = 0 } = {}) {
  const like = `%${q.trim().toLowerCase()}%`;
  const users = (
    await db.query(
      `select u.id, u.email, u.name, u.role, u.email_verified_at, u.blocked_at, u.created_at,
        (select max(t) from (
           select max(completed_at) as t from lesson_progress where user_id = u.id
           union all select max(updated_at) from lesson_exercises where user_id = u.id
         ) x) as last_activity
       from users u where lower(u.email) like $1 or lower(u.name) like $1
       order by u.created_at desc limit $2 offset $3`,
      [like, limit, offset],
    )
  ).rows;
  const total = Number(first(await db.query(`select count(*)::int as n from users u where lower(u.email) like $1 or lower(u.name) like $1`, [like])).n);
  if (!users.length) return { rows: [], total };
  const ids = users.map((u) => u.id);
  const prog = (
    await db.query(
      `select e.user_id, c.id as course_id, c.title, e.status,
        (select count(*)::int from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) as lessons,
        (select count(*)::int from lesson_progress p join lessons l on l.id = p.lesson_id join modules m on m.id = l.module_id
           where m.course_id = c.id and p.user_id = e.user_id) as done,
        (select count(*)::int from lesson_exercises x join lessons l on l.id = x.lesson_id join modules m on m.id = l.module_id
           where m.course_id = c.id and x.user_id = e.user_id) as answers
       from enrollments e join courses c on c.id = e.course_id
       where e.user_id = any($1::uuid[]) order by e.granted_at desc`,
      [ids],
    )
  ).rows;
  const byUser = new Map();
  for (const p of prog) {
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, []);
    byUser.get(p.user_id).push(p);
  }
  return { rows: users.map((u) => ({ ...u, courses: byUser.get(u.id) || [] })), total };
}

// Fiche d'un élève : pour chaque formation, chaque leçon avec état et réponse à l'exercice.
export async function getLearnerDetail(db, userId) {
  const user = first(await db.query(`select id, email, name, role, email_verified_at, blocked_at, created_at from users where id = $1`, [userId]));
  if (!user) return null;
  const enrollments = await listCourseEnrollments(db, userId);
  const lessons = (
    await db.query(
      `select m.course_id, m.title as module_title, m.position as mpos, l.id, l.title, l.position as lpos, l.exercise,
              p.completed_at, x.answer, x.submitted_at, x.updated_at, x.validated_at, x.feedback
       from lessons l join modules m on m.id = l.module_id
       left join lesson_progress p on p.lesson_id = l.id and p.user_id = $1
       left join lesson_exercises x on x.lesson_id = l.id and x.user_id = $1
       where m.course_id = any($2::uuid[]) order by m.position, l.position`,
      [userId, enrollments.map((e) => e.course_id)],
    )
  ).rows;
  return { user, enrollments, lessons };
}

// Toutes les réponses aux exercices, les plus récentes d'abord (filtre par formation possible).
export async function listExerciseAnswers(db, { courseId = null, limit = 50, offset = 0 } = {}) {
  const params = [limit, offset];
  let where = '';
  if (courseId) { params.push(courseId); where = 'where c.id = $3'; }
  const rows = (
    await db.query(
      `select x.user_id, x.lesson_id, x.answer, x.submitted_at, x.updated_at, x.validated_at, x.feedback, u.name, u.email,
              l.title as lesson_title, l.exercise, c.title as course_title
       from lesson_exercises x join users u on u.id = x.user_id join lessons l on l.id = x.lesson_id
       join modules m on m.id = l.module_id join courses c on c.id = m.course_id
       ${where} order by x.updated_at desc limit $1 offset $2`,
      params,
    )
  ).rows;
  const total = Number(first(await db.query(`select count(*)::int as n from lesson_exercises x join lessons l on l.id = x.lesson_id join modules m on m.id = l.module_id join courses c on c.id = m.course_id ${courseId ? 'where c.id = $1' : ''}`, courseId ? [courseId] : [])).n);
  return { rows, total };
}

// Inscriptions des 14 derniers jours (pour le tableau de bord).
export async function signupsByDay(db, days = 14) {
  return (
    await db.query(
      `select to_char(d::date, 'YYYY-MM-DD') as day, coalesce(n, 0)::int as n
       from generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
       left join (select created_at::date as j, count(*) as n from users where role = 'learner' group by 1) s on s.j = d::date
       order by d`,
      [days],
    )
  ).rows;
}

export async function activitySummary(db) {
  return first(
    await db.query(
      `select
        (select count(*)::int from lesson_progress where completed_at > now() - interval '7 days') as lessons_7d,
        (select count(*)::int from lesson_exercises where updated_at > now() - interval '7 days') as answers_7d,
        (select count(distinct user_id)::int from (
           select user_id from lesson_progress where completed_at > now() - interval '7 days'
           union select user_id from lesson_exercises where updated_at > now() - interval '7 days') a) as active_7d,
        (select count(*)::int from users where role = 'learner' and created_at > now() - interval '7 days') as signups_7d`,
    ),
  );
}

// Valide (ou annule la validation d') la réponse d'un élève à un exercice.
export async function setExerciseValidated(db, { userId, lessonId, adminId, validated, feedback = '' }) {
  return first(
    await db.query(
      `update lesson_exercises
         set validated_at = case when $4::boolean then now() else null end,
             validated_by = case when $4::boolean then $3::uuid else null end,
             feedback = case when $4::boolean then $5 else '' end
       where user_id = $1 and lesson_id = $2 returning user_id`,
      [userId, lessonId, adminId, validated, feedback],
    ),
  );
}

// Date de la dernière leçon terminée par un élève (pour l'encourager à garder son rythme).
export async function lastLessonDoneAt(db, userId) {
  const r = first(await db.query(`select max(completed_at) as t from lesson_progress where user_id = $1`, [userId]));
  return r && r.t ? new Date(r.t) : null;
}
