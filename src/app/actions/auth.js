'use server';
// Actions de compte : inscription, connexion, e-mail, mot de passe, profil.
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { award, safe, BAREME } from '@/lib/points.js';
import { getCtx } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { hashPassword, verifyPassword, newToken, hashToken } from '@/lib/crypto.js';
import { createLoginSession, destroySession, requireUser, getCurrentUser } from '@/lib/auth.js';
import { claimPendingForUser } from '@/lib/chariow/sales.js';
import { registerReferral, REF_COOKIE } from '@/lib/referral.js';
import { cleanText, validEmail, validPassword, safeInternalPath, clientIp } from '@/lib/validate.js';
import { signupFingerprint } from '@/lib/referral.js';

const HOUR = 3600;

async function ipKey(prefix) {
  const h = await headers();
  return `${prefix}:${clientIp(h) || 'inconnue'}`;
}

function suite(formData) {
  const s = safeInternalPath(formData.get('suite'), '');
  return s ? `&suite=${encodeURIComponent(s)}` : '';
}

async function sendVerification(ctx, user) {
  const token = newToken();
  await store.createEmailToken(ctx.db, {
    userId: user.id,
    kind: 'verify',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
  });
  await ctx.notify('verifyEmail', { to: user.email, name: user.name, link: `${ctx.siteUrl}/email/confirmer?t=${token}` });
}

export async function signup(formData) {
  const ctx = getCtx();
  const name = cleanText(formData.get('name'), 100);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = suite(formData);
  const back = (m) => redirect(`/inscription?m=${m}${next}`);

  if (!(await store.rateLimitHit(ctx.db, { key: await ipKey('signup'), windowSeconds: HOUR, limit: 10 })).allowed) back('trop_essais');
  if (name.length < 2) back('nom_invalide');
  if (!validEmail(email)) back('email_invalide');
  if (!validPassword(password)) back('mdp_court');
  if (formData.get('cgu') !== 'on') back('cgu_requis');
  if (await store.getUserByEmail(ctx.db, email)) back('compte_existe');

  let user;
  try {
    user = await store.createUser(ctx.db, { email, name, passwordHash: await hashPassword(password) });
  } catch (e) {
    if (e?.code === '23505') back('compte_existe');
    throw e;
  }
  await safe(() => award(ctx.db, { userId: user.id, kind: 'signup', points: BAREME.signup }));
  await sendVerification(ctx, user);
  // Empreinte d'inscription (jamais lisible) : sert seulement à signaler à l'administrateur un possible auto-parrainage.
  await safe(async () => {
    const h = await headers();
    await ctx.db.query(`update users set signup_fp = $2 where id = $1`, [user.id, signupFingerprint(clientIp(h), h.get('user-agent'))]);
  });
  // Parrainage : le lien /r/CODE a laissé un cookie. Une erreur ici ne doit jamais empêcher l'inscription.
  try {
    const jar = await cookies();
    const refCode = jar.get(REF_COOKIE)?.value;
    if (refCode) {
      const referrer = await registerReferral(ctx.db, user, refCode);
      if (referrer) await safe(() => award(ctx.db, { userId: referrer.id, kind: 'referral', ref: user.id, points: BAREME.referral }));
      jar.delete(REF_COOKIE);
    }
  } catch {
    // ignoré volontairement
  }
  await createLoginSession(user.id, (await headers()).get('user-agent'));
  const dest = safeInternalPath(formData.get('suite'), '/espace');
  redirect(`${dest}${dest.includes('?') ? '&' : '?'}m=inscrit`);
}

export async function login(formData) {
  const ctx = getCtx();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = suite(formData);
  const fail = (m) => redirect(`/connexion?m=${m}${next}`);

  const ip = await store.rateLimitHit(ctx.db, { key: await ipKey('login'), windowSeconds: 15 * 60, limit: 30 });
  const mail = await store.rateLimitHit(ctx.db, { key: `login-mail:${email.toLowerCase()}`, windowSeconds: 15 * 60, limit: 8 });
  if (!ip.allowed || !mail.allowed) fail('trop_essais');

  const user = validEmail(email) ? await store.getUserByEmail(ctx.db, email) : null;
  // On vérifie toujours un mot de passe (même factice) pour ne pas révéler si le compte existe.
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : (await verifyPassword(password, 'scrypt$15$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='), false);
  if (!user || !ok || user.blocked_at) fail('identifiants');

  await createLoginSession(user.id, (await headers()).get('user-agent'));
  // Un achat déjà payé attend peut-être cette adresse.
  if (user.email_verified_at) await claimPendingForUser(ctx, user);
  redirect(safeInternalPath(formData.get('suite'), user.role === 'admin' ? '/admin' : '/espace'));
}

export async function logout() {
  await destroySession();
  redirect('/?m=deconnecte');
}

export async function resendVerification() {
  const ctx = getCtx();
  const user = await requireUser('/espace');
  if (user.email_verified_at) redirect('/espace');
  const rl = await store.rateLimitHit(ctx.db, { key: `verif:${user.id}`, windowSeconds: HOUR, limit: 3 });
  if (!rl.allowed) redirect('/espace?m=verif_limite');
  await sendVerification(ctx, user);
  redirect('/espace?m=verif_envoyee');
}

/** Appelé par le bouton de la page /email/confirmer (un clic est nécessaire : un robot qui ouvre le lien ne le consomme pas). */
export async function confirmEmail(formData) {
  const ctx = getCtx();
  const token = String(formData.get('t') || '');
  const userId = token ? await store.consumeEmailToken(ctx.db, { kind: 'verify', tokenHash: hashToken(token) }) : null;
  if (!userId) redirect('/connexion?m=email_lien');
  const user = await store.markEmailVerified(ctx.db, userId);
  if (user) await claimPendingForUser(ctx, user);
  const current = await getCurrentUser();
  redirect(current ? '/espace?m=email_ok' : '/connexion?m=email_ok');
}

export async function forgotPassword(formData) {
  const ctx = getCtx();
  const email = String(formData.get('email') || '').trim();
  const rl = await store.rateLimitHit(ctx.db, { key: await ipKey('forgot'), windowSeconds: HOUR, limit: 8 });
  const rlMail = await store.rateLimitHit(ctx.db, { key: `forgot-mail:${email.toLowerCase()}`, windowSeconds: HOUR, limit: 3 });
  if (rl.allowed && rlMail.allowed && validEmail(email)) {
    const user = await store.getUserByEmail(ctx.db, email);
    if (user && !user.blocked_at) {
      const token = newToken();
      await store.createEmailToken(ctx.db, {
        userId: user.id,
        kind: 'reset',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });
      await ctx.notify('resetPassword', { to: user.email, name: user.name, link: `${ctx.siteUrl}/mot-de-passe-reinitialise?t=${token}` });
    }
  }
  // Même réponse que le compte existe ou non.
  redirect('/mot-de-passe-oublie?m=reset_envoye');
}

export async function resetPassword(formData) {
  const ctx = getCtx();
  const token = String(formData.get('t') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  const back = (m) => redirect(`/mot-de-passe-reinitialise?t=${encodeURIComponent(token)}&m=${m}`);
  if (!validPassword(password)) back('mdp_court');
  if (password !== confirm) back('mdp_different');
  const userId = token ? await store.consumeEmailToken(ctx.db, { kind: 'reset', tokenHash: hashToken(token) }) : null;
  if (!userId) redirect('/mot-de-passe-oublie?m=reset_lien');
  await store.setPassword(ctx.db, userId, await hashPassword(password));
  await store.deleteUserSessions(ctx.db, userId); // on déconnecte tous les appareils
  redirect('/connexion?m=mdp_ok');
}

export async function updateProfile(formData) {
  const ctx = getCtx();
  const user = await requireUser('/espace/profil');
  const name = cleanText(formData.get('name'), 100);
  if (name.length < 2) redirect('/espace/profil?m=nom_invalide');
  await ctx.db.query(`update users set name = $2 where id = $1`, [user.id, name]);
  redirect('/espace/profil?m=profil_ok');
}

export async function changePassword(formData) {
  const ctx = getCtx();
  const user = await requireUser('/espace/profil');
  const current = String(formData.get('current') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  const full = await store.getUserById(ctx.db, user.id);
  if (!(await verifyPassword(current, full.password_hash))) redirect('/espace/profil?m=mdp_actuel');
  if (!validPassword(password)) redirect('/espace/profil?m=mdp_court');
  if (password !== confirm) redirect('/espace/profil?m=mdp_different');
  await store.setPassword(ctx.db, user.id, await hashPassword(password));
  await store.deleteUserSessions(ctx.db, user.id);
  await createLoginSession(user.id, (await headers()).get('user-agent'));
  redirect('/espace/profil?m=mdp_change');
}

export async function deleteAccount(formData) {
  const ctx = getCtx();
  const user = await requireUser('/espace/profil');
  const confirmation = String(formData.get('confirmation') || '').trim();
  const full = await store.getUserById(ctx.db, user.id);
  if (confirmation !== 'SUPPRIMER' || !(await verifyPassword(String(formData.get('password') || ''), full.password_hash))) {
    redirect('/espace/profil?m=suppression_confirmation');
  }
  if (user.role === 'admin' && (await store.countAdmins(ctx.db)) <= 1) redirect('/espace/profil?m=dernier_admin');
  await destroySession();
  await store.deleteUser(ctx.db, user.id);
  redirect('/?m=compte_supprime');
}
