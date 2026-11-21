'use server';
// Toutes les actions d'administration. Chacune commence par requireAdmin() : un non-admin ne peut rien faire.
import { redirect } from 'next/navigation';
import { getCtx, getChariowClient } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { requireAdmin } from '@/lib/auth.js';
import { getSetting, setSetting, addPulseSecret } from '@/lib/settings.js';
import { createChariowClient, ChariowError, assessProduct } from '@/lib/chariow/client.js';
import { processDeliveryById } from '@/lib/chariow/pulse.js';
import { reconcile } from '@/lib/chariow/reconcile.js';
import { applyPaidSale } from '@/lib/chariow/sales.js';
import { cleanText, slugify, validEmail, httpsUrlOrNull } from '@/lib/validate.js';
import { PAGE_DEFAULTS } from '@/lib/defaults.js';
import { award, removeAward, validatedPoints, safe } from '@/lib/points.js';

const UUID = /^[0-9a-f-]{36}$/i;
const id = (formData, name = 'id') => {
  const v = String(formData.get(name) || '');
  return UUID.test(v) ? v : null;
};
const text = (formData, name, max = 200) => cleanText(formData.get(name), max);
// Texte long : on garde les retours à la ligne.
const longText = (formData, name, max = 60000) => String(formData.get(name) ?? '').replace(/\r\n/g, '\n').slice(0, max);

async function start() {
  const admin = await requireAdmin();
  return { admin, ctx: getCtx() };
}

// ------------------------------------------------------------ Formations

export async function createCourseAction(formData) {
  const { admin, ctx } = await start();
  const title = text(formData, 'title', 150);
  if (title.length < 3) redirect('/admin/formations?m=admin_erreur');
  let slug = slugify(title);
  for (let i = 2; await store.getCourseBySlug(ctx.db, slug); i++) slug = `${slugify(title)}-${i}`;
  const course = await store.createCourse(ctx.db, { slug, title });
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.create', target: course.id, detail: { title } });
  redirect(`/admin/formations/${course.id}`);
}

export async function saveCourse(formData) {
  const { admin, ctx } = await start();
  const courseId = id(formData);
  if (!courseId) redirect('/admin/formations');
  const base = `/admin/formations/${courseId}`;
  const slug = slugify(text(formData, 'slug', 80));
  const other = await store.getCourseBySlug(ctx.db, slug);
  if (other && other.id !== courseId) redirect(`${base}?m=admin_slug`);
  const mode = formData.get('purchase_mode') === 'link' ? 'link' : 'api';
  const level = ['debutant', 'intermediaire', 'avance'].includes(String(formData.get('level'))) ? String(formData.get('level')) : 'debutant';
  const directUrl = text(formData, 'chariow_product_url', 500);
  const image = text(formData, 'image_url', 500);
  const fields = {
    title: text(formData, 'title', 150) || 'Formation sans titre',
    slug,
    summary: text(formData, 'summary', 400),
    description: longText(formData, 'description'),
    objectives: longText(formData, 'objectives', 5000),
    outcome: longText(formData, 'outcome', 300),
    audience: longText(formData, 'audience', 3000),
    prerequisites: longText(formData, 'prerequisites', 3000),
    faq: longText(formData, 'faq', 10000),
    image_url: image ? (/^\/illustrations\/[\w.-]+\.svg$/.test(image) ? image : httpsUrlOrNull(image)) : null,
    level,
    duration_label: text(formData, 'duration_label', 60),
    price_label: text(formData, 'price_label', 60),
    is_free: formData.get('is_free') === 'on',
    purchase_mode: mode,
    chariow_product_ref: text(formData, 'chariow_product_ref', 120) || null,
    chariow_product_url: directUrl ? httpsUrlOrNull(directUrl) : null,
    certificate_enabled: formData.get('certificate_enabled') === 'on',
  };
  const before = await store.getCourseById(ctx.db, courseId);
  // Si la référence Chariow change, l'ancien identifiant vérifié n'est plus fiable : il faut vérifier de nouveau.
  if (before && before.chariow_product_ref !== fields.chariow_product_ref) fields.chariow_product_id = null;
  try {
    await store.updateCourse(ctx.db, courseId, fields);
  } catch {
    // typiquement : une formation publiée dont on retire l'identifiant produit (contrainte en base)
    redirect(`${base}?m=admin_sans_produit`);
  }
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.update', target: courseId, detail: { title: fields.title } });
  redirect(`${base}?m=admin_ok`);
}

/** « Vérifier le produit » : lit le produit dans Chariow et dit clairement s'il est utilisable. */
export async function verifyProduct(_prev, formData) {
  const { admin, ctx } = await start();
  const courseId = id(formData);
  const ref = text(formData, 'ref', 120);
  const mode = formData.get('mode') === 'link' ? 'link' : 'api';
  if (!courseId || !ref) return { ok: false, title: 'Collez d’abord l’identifiant du produit (prd_… ou son adresse courte).', lines: [] };
  const client = await getChariowClient(ctx.db);
  if (!client) return { ok: false, title: 'La clé API Chariow n’est pas enregistrée.', lines: ['Allez dans Réglages > Connexions.'] };
  try {
    const product = await client.getProduct(ref);
    const a = assessProduct(product, mode);
    if (a.summary?.id) {
      await store.updateCourse(ctx.db, courseId, { chariow_product_ref: ref, chariow_product_id: a.summary.id });
      await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.verify_product', target: courseId, detail: { product: a.summary.id, ok: a.ok } });
    }
    const s = a.summary;
    const lines = [
      ...(s ? [`Produit : ${s.name} (${s.type}, statut ${s.status})`, `Identifiant enregistré : ${s.id}`] : []),
      ...a.errors.map((e) => `À corriger : ${e}`),
      ...a.warnings.map((w) => `Attention : ${w}`),
    ];
    return { ok: a.ok, title: a.ok ? 'Produit utilisable.' : 'Produit non utilisable pour le moment.', lines };
  } catch (e) {
    if (e instanceof ChariowError) return { ok: false, title: e.message, lines: e.apiMessage ? [`Message de Chariow : ${e.apiMessage}`] : [] };
    return { ok: false, title: 'Erreur inattendue pendant la vérification.', lines: [] };
  }
}

export async function publishCourse(formData) {
  const { admin, ctx } = await start();
  const courseId = id(formData);
  const course = courseId && (await store.getCourseById(ctx.db, courseId));
  if (!course) redirect('/admin/formations');
  const base = `/admin/formations/${course.id}`;
  if (!course.is_free) {
    if (course.purchase_mode === 'link' && !course.chariow_product_url) redirect(`${base}?m=admin_sans_produit`);
    if (!course.chariow_product_id) redirect(`${base}?m=admin_sans_produit`);
    const client = await getChariowClient(ctx.db);
    if (!client) redirect(`${base}?m=admin_api_ko`);
    try {
      const a = assessProduct(await client.getProduct(course.chariow_product_id), course.purchase_mode);
      if (!a.ok) redirect(`${base}?m=admin_produit_ko`);
    } catch (e) {
      if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
      redirect(`${base}?m=${e instanceof ChariowError && e.kind === 'not_found' ? 'admin_produit_ko' : 'admin_api_ko'}`);
    }
  }
  await store.setCourseStatus(ctx.db, course.id, 'published');
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.publish', target: course.id, detail: {} });
  redirect(`${base}?m=admin_publie`);
}

export async function unpublishCourse(formData) {
  const { admin, ctx } = await start();
  const courseId = id(formData);
  if (!courseId) redirect('/admin/formations');
  await store.setCourseStatus(ctx.db, courseId, 'hidden');
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.hide', target: courseId, detail: {} });
  redirect(`/admin/formations/${courseId}?m=admin_ok`);
}

export async function deleteCourseAction(formData) {
  const { admin, ctx } = await start();
  const courseId = id(formData);
  if (!courseId || formData.get('confirmation') !== 'SUPPRIMER') redirect(`/admin/formations/${courseId || ''}?m=admin_erreur`);
  await store.deleteCourse(ctx.db, courseId);
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'course.delete', target: courseId, detail: {} });
  redirect('/admin/formations?m=admin_ok');
}

// ------------------------------------------------------------ Modules et leçons

export async function addModule(formData) {
  const { ctx } = await start();
  const courseId = id(formData, 'courseId');
  const title = text(formData, 'title', 150);
  if (!courseId || !title) redirect(`/admin/formations/${courseId || ''}?m=admin_erreur`);
  await store.createModule(ctx.db, { courseId, title });
  redirect(`/admin/formations/${courseId}?m=admin_ok#programme`);
}

export async function saveModule(formData) {
  const { ctx } = await start();
  const moduleId = id(formData);
  const courseId = id(formData, 'courseId');
  if (!moduleId || !courseId) redirect('/admin/formations');
  const pos = Number.parseInt(String(formData.get('position') ?? ''), 10);
  await store.updateModule(ctx.db, moduleId, {
    title: text(formData, 'title', 150) || null,
    description: text(formData, 'description', 400),
    position: Number.isFinite(pos) ? pos : null,
  });
  redirect(`/admin/formations/${courseId}?m=admin_ok#programme`);
}

export async function deleteModuleAction(formData) {
  const { ctx } = await start();
  const moduleId = id(formData);
  const courseId = id(formData, 'courseId');
  if (moduleId) await store.deleteModule(ctx.db, moduleId);
  redirect(`/admin/formations/${courseId || ''}?m=admin_ok#programme`);
}

export async function addLesson(formData) {
  const { ctx } = await start();
  const moduleId = id(formData, 'moduleId');
  const courseId = id(formData, 'courseId');
  const title = text(formData, 'title', 150);
  if (!moduleId || !title) redirect(`/admin/formations/${courseId || ''}?m=admin_erreur`);
  const lesson = await store.createLesson(ctx.db, { moduleId, title });
  redirect(`/admin/lecons/${lesson.id}`);
}

export async function saveLesson(formData) {
  const { ctx } = await start();
  const lessonId = id(formData);
  if (!lessonId) redirect('/admin/formations');
  const duration = Number.parseInt(String(formData.get('duration_min') ?? ''), 10);
  const pos = Number.parseInt(String(formData.get('position') ?? ''), 10);
  await store.updateLesson(ctx.db, lessonId, {
    title: text(formData, 'title', 150) || null,
    content: longText(formData, 'content'),
    exercise: longText(formData, 'exercise', 5000),
    durationMin: Number.isFinite(duration) && duration >= 0 ? duration : null,
    position: Number.isFinite(pos) ? pos : null,
  });
  redirect(`/admin/lecons/${lessonId}?m=admin_ok`);
}

export async function deleteLessonAction(formData) {
  const { ctx } = await start();
  const lessonId = id(formData);
  const courseId = id(formData, 'courseId');
  if (lessonId) await store.deleteLesson(ctx.db, lessonId);
  redirect(`/admin/formations/${courseId || ''}?m=admin_ok#programme`);
}

// ------------------------------------------------------------ Apprenants

export async function grantManual(formData) {
  const { admin, ctx } = await start();
  const email = text(formData, 'email', 255);
  const courseId = id(formData, 'courseId');
  const back = '/admin/apprenants';
  if (!validEmail(email) || !courseId) redirect(`${back}?m=admin_erreur`);
  const user = await store.getUserByEmail(ctx.db, email);
  if (!user) redirect(`${back}?m=admin_erreur`);
  const out = await store.grantAccess(ctx.db, { userId: user.id, courseId, source: 'manual', grantedBy: admin.id });
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'access.grant', target: user.id, detail: { courseId, result: out.action } });
  redirect(`${back}?m=admin_ok`);
}

export async function revokeManual(formData) {
  const { admin, ctx } = await start();
  const userId = id(formData, 'userId');
  const courseId = id(formData, 'courseId');
  if (userId && courseId) {
    await store.revokeAccess(ctx.db, { userId, courseId, reason: 'Retiré par un administrateur' });
    await store.logAdmin(ctx.db, { adminId: admin.id, action: 'access.revoke', target: userId, detail: { courseId } });
  }
  redirect('/admin/apprenants?m=admin_ok');
}

export async function toggleBlock(formData) {
  const { admin, ctx } = await start();
  const userId = id(formData, 'userId');
  if (!userId || userId === admin.id) redirect('/admin/apprenants?m=admin_erreur');
  const block = formData.get('block') === '1';
  await store.setBlocked(ctx.db, userId, block);
  if (block) await store.deleteUserSessions(ctx.db, userId);
  await store.logAdmin(ctx.db, { adminId: admin.id, action: block ? 'user.block' : 'user.unblock', target: userId, detail: {} });
  redirect('/admin/apprenants?m=admin_ok');
}

// Valider (ou annuler la validation d') l'exercice d'un élève. `back` : page où revenir (liste blanche).
export async function validateExercise(formData) {
  const { admin, ctx } = await start();
  const userId = id(formData, 'userId');
  const lessonId = id(formData, 'lessonId');
  const validated = formData.get('validated') === '1';
  const back = String(formData.get('back') || '');
  const dest = /^\/admin\/(exercices|apprenants)[A-Za-z0-9/?=&_-]*$/.test(back) ? back : '/admin/exercices';
  if (!userId || !lessonId) redirect(`${dest}${dest.includes('?') ? '&' : '?'}m=admin_erreur`);
  const feedback = longText(formData, 'feedback', 600).trim();
  const gradeRaw = String(formData.get('grade') ?? '');
  const grade = /^(10|[0-9])$/.test(gradeRaw) ? Number(gradeRaw) : null;
  // Valider demande une note sur 10 : le classement en dépend.
  if (validated && grade === null) redirect(`${dest}${dest.includes('?') ? '&' : '?'}m=note_requise`);
  const done = await store.setExerciseValidated(ctx.db, { userId, lessonId, adminId: admin.id, validated, feedback, grade });
  if (done) {
    await safe(() => (validated
      ? award(ctx.db, { userId, kind: 'validated', ref: lessonId, points: validatedPoints(grade), replace: true })
      : removeAward(ctx.db, { userId, kind: 'validated', ref: lessonId })));
  }
  if (done) await store.logAdmin(ctx.db, { adminId: admin.id, action: validated ? 'exercise.validate' : 'exercise.unvalidate', target: userId, detail: { lessonId, grade } });
  redirect(`${dest}${dest.includes('?') ? '&' : '?'}m=${done ? 'admin_ok' : 'admin_erreur'}`);
}

// ------------------------------------------------------------ Paiements

export async function retryDelivery(formData) {
  const { admin, ctx } = await start();
  const deliveryId = id(formData);
  if (deliveryId) {
    await ctx.db.query(`update pulse_deliveries set status = 'failed', attempts = 0 where id = $1 and status in ('failed', 'ignored')`, [deliveryId]);
    await processDeliveryById(ctx, deliveryId);
    await store.logAdmin(ctx.db, { adminId: admin.id, action: 'pulse.retry', target: deliveryId, detail: {} });
  }
  redirect('/admin/paiements?m=admin_ok');
}

export async function resolveAlertAction(formData) {
  const { ctx } = await start();
  const alertId = Number.parseInt(String(formData.get('id')), 10) || String(formData.get('id') || '');
  if (alertId) await store.resolveAlertById(ctx.db, alertId);
  redirect(String(formData.get('back') || '/admin').startsWith('/admin') ? String(formData.get('back') || '/admin') : '/admin');
}

/** Rattrape maintenant les ventes des 3 derniers jours (même tâche que la réconciliation automatique). */
export async function runReconcileNow(_prev) {
  const { ctx } = await start();
  const s = await reconcile(ctx, await getChariowClient(ctx.db));
  if (s.skipped === 'no_api_key') return { ok: false, title: 'La clé API Chariow n’est pas enregistrée.', lines: [] };
  if (s.apiError) return { ok: false, title: 'La vérification a échoué : problème avec l’API Chariow.', lines: [`Détail : ${s.apiError}`] };
  return {
    ok: true,
    title: 'Vérification terminée.',
    lines: [`${s.sales} vente(s) payée(s) lue(s) sur 3 jours`, `${s.newAccess} nouvel accès`, `${s.newPending} achat(s) en attente d’un compte`, `${s.retried} notification(s) rejouée(s)`, `${s.revoked} accès retiré(s) (remboursement)`],
  };
}

// ------------------------------------------------------------ Réglages > Connexions

export async function saveApiKey(formData) {
  const { admin, ctx } = await start();
  const key = String(formData.get('api_key') || '').trim();
  if (!key.startsWith('sk_')) redirect('/admin/reglages?m=cle_invalide');
  await setSetting(ctx.db, 'chariow_api_key', key, admin.id);
  await store.resolveAlerts(ctx.db, 'api_key');
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'settings.api_key', target: null, detail: {} });
  redirect('/admin/reglages?m=admin_ok');
}

export async function savePulseSecret(formData) {
  const { admin, ctx } = await start();
  const secret = String(formData.get('secret') || '').trim();
  if (!secret.startsWith('whsec_')) redirect('/admin/reglages?m=secret_invalide');
  const label = text(formData, 'label', 80) || 'Pulse';
  const pulseId = text(formData, 'pulse_id', 80) || null;
  await addPulseSecret(ctx.db, { label, pulseId, secret });
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'settings.pulse_secret', target: null, detail: { label } });
  redirect('/admin/reglages?m=secret_ajoute');
}

export async function removePulseSecret(formData) {
  const { admin, ctx } = await start();
  const secretId = id(formData);
  if (secretId) {
    await store.deletePulseSecret(ctx.db, secretId);
    await store.logAdmin(ctx.db, { adminId: admin.id, action: 'settings.pulse_secret_delete', target: secretId, detail: {} });
  }
  redirect('/admin/reglages?m=admin_ok');
}

export async function saveMailSettings(formData) {
  const { admin, ctx } = await start();
  const resend = String(formData.get('resend_api_key') || '').trim();
  if (resend) await setSetting(ctx.db, 'resend_api_key', resend, admin.id);
  const from = text(formData, 'mail_from', 200);
  if (from) await setSetting(ctx.db, 'mail_from', from, admin.id);
  const support = text(formData, 'support_email', 255);
  if (support && validEmail(support)) await setSetting(ctx.db, 'support_email', support, admin.id);
  const siteName = text(formData, 'site_name', 80);
  if (siteName) await setSetting(ctx.db, 'site_name', siteName, admin.id);
  await store.resolveAlerts(ctx.db, 'mail_failed');
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'settings.mail', target: null, detail: {} });
  redirect('/admin/reglages?m=admin_ok');
}

/** « Tester la clé API » : appelle vraiment Chariow, une autorisation à la fois. */
export async function testApiKey() {
  const { ctx } = await start();
  const apiKey = await getSetting(ctx.db, 'chariow_api_key');
  if (!apiKey) return { ok: false, title: 'Aucune clé API enregistrée.', lines: ['Collez la clé (sk_…) ci-dessus puis enregistrez.'] };
  const r = await createChariowClient({ apiKey }).testKey();
  const lines = r.checks.map((c) => (c.ok ? `OK : ${c.scope}` : `Échec : ${c.scope} — ${c.message}${c.missingScopes?.length ? ` (manque : ${c.missingScopes.join(', ')})` : ''}`));
  lines.push('Non testable sans créer une vente : checkout.write (si elle manque, le premier paiement affichera une erreur claire).');
  if (r.ok) await store.resolveAlerts(ctx.db, 'api_key');
  return { ok: r.ok, title: r.ok ? 'La clé fonctionne.' : 'La clé a un problème.', lines };
}

/** « Vérifier les produits » : contrôle chaque formation payante liée à Chariow. */
export async function testProducts() {
  const { ctx } = await start();
  const client = await getChariowClient(ctx.db);
  if (!client) return { ok: false, title: 'Aucune clé API enregistrée.', lines: [] };
  const courses = (await store.listAllCourses(ctx.db)).filter((c) => !c.is_free);
  if (courses.length === 0) return { ok: true, title: 'Aucune formation payante à vérifier.', lines: [] };
  let allOk = true;
  const lines = [];
  for (const c of courses) {
    const ref = c.chariow_product_id || c.chariow_product_ref;
    if (!ref) {
      allOk = false;
      lines.push(`${c.title} : aucun produit Chariow renseigné.`);
      continue;
    }
    try {
      const a = assessProduct(await client.getProduct(ref), c.purchase_mode);
      if (!a.ok) allOk = false;
      lines.push(`${c.title} : ${a.ok ? 'OK' : a.errors.join(' ')}`);
    } catch (e) {
      allOk = false;
      lines.push(`${c.title} : ${e instanceof ChariowError ? e.message : 'erreur inattendue'}`);
    }
  }
  return { ok: allOk, title: allOk ? 'Tous les produits sont utilisables.' : 'Certains produits posent problème.', lines };
}

/** « Dernier Pulse reçu » : dit si le Pulse de test envoyé depuis Chariow est bien arrivé et reconnu. */
export async function testLastPulse() {
  const { ctx } = await start();
  const last = await store.getLastDelivery(ctx.db);
  const testAt = await getSetting(ctx.db, 'last_test_pulse_at');
  const rej = await store.getLastRejection(ctx.db);
  const fmt = (d) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Bamako' });
  const lines = [];
  if (last) lines.push(`Dernière notification reçue : ${last.event} le ${fmt(last.received_at)} (statut : ${last.status}).`);
  else lines.push('Aucune notification reçue pour le moment.');
  if (testAt) lines.push(`Dernier Pulse de test reconnu : ${fmt(testAt)}.`);
  if (rej) lines.push(`Dernier rejet : ${rej.reason} le ${fmt(rej.received_at)}.`);
  if (testAt) return { ok: true, title: 'Un Pulse de test signé a bien été reçu.', lines };
  return {
    ok: false,
    title: 'Aucun Pulse de test reçu pour le moment.',
    lines: [...lines, 'Dans Chariow, ouvrez votre Pulse et envoyez un événement de test, puis cliquez de nouveau ici.'],
  };
}

// ------------------------------------------------------------ Textes du site

export async function saveSitePage(formData) {
  const { admin, ctx } = await start();
  const slug = String(formData.get('slug') || '');
  if (!PAGE_DEFAULTS[slug]) redirect('/admin/textes');
  if (formData.get('reset') === '1') {
    await ctx.db.query(`delete from site_pages where slug = $1`, [slug]);
  } else {
    await store.putSitePage(ctx.db, { slug, title: text(formData, 'title', 150) || PAGE_DEFAULTS[slug].title, body: longText(formData, 'body') });
  }
  await store.logAdmin(ctx.db, { adminId: admin.id, action: 'page.save', target: slug, detail: {} });
  redirect(`/admin/textes?page=${slug}&m=admin_ok`);
}

// ------------------------------------------------------------ Première installation

export async function manualSaleCheck(formData) {
  // Rattache à la main une vente dont on connaît l'identifiant (secours si tout le reste échoue).
  const { admin, ctx } = await start();
  const saleId = text(formData, 'sale_id', 120);
  const client = await getChariowClient(ctx.db);
  if (!saleId || !client) redirect('/admin/paiements?m=admin_api_ko');
  try {
    const sale = await client.getSale(saleId);
    const productId = sale?.product?.id;
    const email = sale?.customer?.email;
    if (!productId || !email) redirect('/admin/paiements?m=admin_erreur');
    await applyPaidSale(ctx, { saleId: String(sale.id), productId: String(productId), email: String(email), customerName: sale.customer?.name ?? null, source: 'reconciliation' });
    await store.logAdmin(ctx.db, { adminId: admin.id, action: 'sale.manual_check', target: saleId, detail: {} });
  } catch (e) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
    redirect('/admin/paiements?m=admin_erreur');
  }
  redirect('/admin/paiements?m=admin_ok');
}
