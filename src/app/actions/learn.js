'use server';
// Actions de l'apprenant. Le déblocage des modules est TOUJOURS revérifié ici, côté serveur.
import { redirect } from 'next/navigation';
import { getCtx, getChariowClient } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { requireUser } from '@/lib/auth.js';
import { computeProgress, findUnlockedLesson } from '@/lib/progress.js';
import { verifyMyPurchase } from '@/lib/chariow/reconcile.js';

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

  await store.markLessonDone(ctx.db, user.id, lessonId);
  redirect(`${base}/lecon/${lessonId}?m=lecon_ok`);
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
