'use server';
// Actions de l'apprenant. Le déblocage des modules est TOUJOURS revérifié ici, côté serveur.
import { redirect } from 'next/navigation';
import { getCtx, getChariowClient } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { requireUser } from '@/lib/auth.js';
import { computeProgress, findUnlockedLesson } from '@/lib/progress.js';
import { verifyMyPurchase } from '@/lib/chariow/reconcile.js';
import { award, awardLessonDone, removeAward, safe, BAREME } from '@/lib/points.js';

// Points après une leçon terminée (et bonus si la formation est finie).
async function pointsForLessonDone(ctx, userId, lessonId, courseId) {
  const modules = await store.listModulesWithLessons(ctx.db, courseId);
  const after = computeProgress(modules, await store.listCompletedLessonIds(ctx.db, userId, courseId));
  await awardLessonDone(ctx.db, { userId, lessonId, courseId, percentAfter: after.percent });
}

export async function markLessonDone(formData) {
  const ctx = getCtx();
  const lessonId = String(formData.get('lessonId') || '');
  const user = await requireUser('/espace');
  const lesson = /^[0-9a-f-]{36}$/i.test(lessonId) ? await store.getLesson(ctx.db, lessonId) : null;
  if (!lesson) redirect('/espace');
  const course = await store.getCourseById(ctx.db, lesson.course_id);
  const base = `/espace/formation/${course.slug}`;
  if (!(await store.hasActiveAccess(ctx.db, user.id, course.id))) redirect(`/formations/${course.slug}`);

  const modules = await store.listModulesWithLessons(ctx.db, course.id);
  const progress = computeProgress(modules, await store.listCompletedLessonIds(ctx.db, user.id, course.id));
  const found = findUnlockedLesson(progress, lessonId);
  if (!found || found.locked) redirect(`${base}?m=acces_verrouille`);

  // Une leçon avec exercice ne se termine qu'en envoyant la réponse (action submitExercise).
  if (String(lesson.exercise || '').trim()) redirect(`${base}/lecon/${lessonId}?m=exercice_requis#exercice`);

  await store.markLessonDone(ctx.db, user.id, lessonId);
  await safe(() => pointsForLessonDone(ctx, user.id, lessonId, course.id));
  redirect(`${base}/lecon/${lessonId}?m=lecon_ok`);
}

const EXERCISE_MIN = 20;
const EXERCISE_MAX = 5000;

/** Envoie la réponse à l'exercice : l'enregistre, puis termine la leçon (ce qui ouvre la suivante). */
export async function submitExercise(formData) {
  const ctx = getCtx();
  const lessonId = String(formData.get('lessonId') || '');
  const user = await requireUser('/espace');
  const lesson = /^[0-9a-f-]{36}$/i.test(lessonId) ? await store.getLesson(ctx.db, lessonId) : null;
  if (!lesson) redirect('/espace');
  const course = await store.getCourseById(ctx.db, lesson.course_id);
  const base = `/espace/formation/${course.slug}`;
  if (!(await store.hasActiveAccess(ctx.db, user.id, course.id))) redirect(`/formations/${course.slug}`);

  const modules = await store.listModulesWithLessons(ctx.db, course.id);
  const progress = computeProgress(modules, await store.listCompletedLessonIds(ctx.db, user.id, course.id));
  const found = findUnlockedLesson(progress, lessonId);
  if (!found || found.locked) redirect(`${base}?m=acces_verrouille`);
  if (!String(lesson.exercise || '').trim()) redirect(`${base}/lecon/${lessonId}`);

  const answer = String(formData.get('answer') || '').replace(/\r\n/g, '\n').trim().slice(0, EXERCISE_MAX);
  if (answer.length < EXERCISE_MIN) redirect(`${base}/lecon/${lessonId}?m=exercice_court#exercice`);

  await store.saveExerciseAnswer(ctx.db, user.id, lessonId, answer);
  await store.markLessonDone(ctx.db, user.id, lessonId);
  await safe(async () => {
    await award(ctx.db, { userId: user.id, kind: 'exercise', ref: lessonId, points: BAREME.exercise });
    // Réponse modifiée : la validation tombe, donc les points de validation aussi (jusqu'à nouvelle validation).
    const saved = await store.getExerciseAnswer(ctx.db, user.id, lessonId);
    if (!saved?.validated_at) await removeAward(ctx.db, { userId: user.id, kind: 'validated', ref: lessonId });
    await pointsForLessonDone(ctx, user.id, lessonId, course.id);
  });
  redirect(`${base}/lecon/${lessonId}?m=exercice_ok`);
}

export async function enrollFree(formData) {
  const ctx = getCtx();
  const slug = String(formData.get('slug') || '');
  const user = await requireUser(`/formations/${slug}`);
  const course = await store.getCourseBySlug(ctx.db, slug);
  if (!course || course.status !== 'published' || !course.is_free) redirect(`/formations/${slug}`);
  const out = await store.grantAccess(ctx.db, { userId: user.id, courseId: course.id, source: 'free' });
  redirect(`/espace/formation/${slug}?m=${out.action === 'granted' ? 'gratuit_ok' : 'deja_acces'}`);
}

/** Bouton « J'ai payé, vérifier mon achat ». 3 essais par 10 minutes. */
export async function verifyPurchase(formData) {
  const ctx = getCtx();
  const slug = String(formData.get('slug') || '');
  const back = slug ? `/achat/retour?formation=${encodeURIComponent(slug)}` : '/espace';
  const user = await requireUser(back);
  const rl = await store.rateLimitHit(ctx.db, { key: `verifpay:${user.id}`, windowSeconds: 600, limit: 3 });
  if (!rl.allowed) redirect(`${back}${back.includes('?') ? '&' : '?'}m=verif_trop`);

  const sep = back.includes('?') ? '&' : '?';
  const out = await verifyMyPurchase(ctx, user, await getChariowClient(ctx.db));
  if (!out.ok) {
    const m = out.reason === 'email_not_verified' ? 'verif_email' : 'verif_indispo';
    redirect(`${back}${sep}m=${m}`);
  }
  if (out.granted > 0) redirect(`/espace?m=achat_trouve`);
  if (out.found > 0) redirect(`/espace?m=achat_deja`);
  redirect(`${back}${sep}m=achat_introuvable`);
}
