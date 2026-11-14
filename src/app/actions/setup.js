'use server';
// Création du premier administrateur. Protégé par SETUP_TOKEN, et refusé dès qu'un admin existe.
import { redirect } from 'next/navigation';
import { timingSafeEqual } from 'node:crypto';
import { getCtx } from '@/lib/context.js';
import * as store from '@/lib/store.js';
import { hashPassword } from '@/lib/crypto.js';
import { createLoginSession } from '@/lib/auth.js';
import { cleanText, validEmail, validPassword } from '@/lib/validate.js';

function sameToken(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function createFirstAdmin(formData) {
  const ctx = getCtx();
  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 16) redirect('/setup?e=config');
  if ((await store.countAdmins(ctx.db)) > 0) redirect('/setup?e=deja');
  const rl = await store.rateLimitHit(ctx.db, { key: 'setup', windowSeconds: 900, limit: 10 });
  if (!rl.allowed) redirect('/setup?e=essais');
  if (!sameToken(formData.get('token') || '', expected)) redirect('/setup?e=jeton');
  const name = cleanText(formData.get('name'), 100);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  if (name.length < 2 || !validEmail(email) || !validPassword(password)) redirect('/setup?e=champs');
  let user = await store.getUserByEmail(ctx.db, email);
  if (user) redirect('/setup?e=champs');
  user = await store.createUser(ctx.db, { email, name, passwordHash: await hashPassword(password), role: 'admin', verified: true });
  await store.logAdmin(ctx.db, { adminId: user.id, action: 'setup.first_admin', target: user.id, detail: {} });
  await createLoginSession(user.id, null);
  redirect('/admin');
}
