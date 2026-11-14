import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// La page de retour de paiement interroge cette adresse. Elle ne DONNE jamais l'accès :
// elle dit seulement si notre base (alimentée par le Pulse signé) l'a déjà donné.
export async function GET(request) {
  const headers = { 'cache-control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ active: false, login: true }, { status: 401, headers });
  const slug = new URL(request.url).searchParams.get('formation') || '';
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  if (!course) return Response.json({ active: false }, { status: 404, headers });
  const active = await store.hasActiveAccess(db, user.id, course.id);
  return Response.json({ active }, { headers });
}
