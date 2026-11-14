// Sessions : jeton aléatoire dans un cookie httpOnly ; seule son empreinte est en base.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDb } from './db.js';
import * as store from './store.js';
import { hashToken, newToken } from './crypto.js';

const COOKIE = 'ama_session';
const DAYS = 30;

export async function createLoginSession(userId, userAgent) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + DAYS * 24 * 3600 * 1000);
  await store.createSession(getDb(), { userId, tokenHash: hashToken(token), expiresAt, userAgent });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await store.deleteSession(getDb(), hashToken(token));
  jar.delete(COOKIE);
}

/** Utilisateur connecté (ou null). Mis en cache pendant une même requête. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return store.getSessionUser(getDb(), hashToken(token));
});

export async function requireUser(returnTo = '/espace') {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Réservé aux administrateurs : tout autre visiteur voit une page introuvable. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?suite=%2Fadmin');
  if (user.role !== 'admin') notFound();
  return user;
}
