// Lien de parrainage : /r/CODE. Mémorise le code 30 jours puis envoie vers l'inscription.
import { NextResponse } from 'next/server';
import { REF_COOKIE, REF_CODE_RE } from '@/lib/referral.js';
import { getSiteUrl } from '@/lib/context.js';

export async function GET(_request, { params }) {
  const { code } = await params;
  const clean = String(code || '').toUpperCase();
  const res = NextResponse.redirect(new URL('/inscription?m=parrain', getSiteUrl()));
  if (REF_CODE_RE.test(clean)) {
    res.cookies.set(REF_COOKIE, clean, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600,
    });
  }
  return res;
}
