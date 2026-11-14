import { timingSafeEqual } from 'node:crypto';
import { getCtx, getChariowClient } from '@/lib/context.js';
import { reconcile } from '@/lib/chariow/reconcile.js';
import { purgeOldRateLimits } from '@/lib/store.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sans secret, la tâche est fermée
  const given = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Appelée chaque jour par Vercel Cron (vercel.json). Rattrape les Pulses perdus.
export async function GET(request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
  const ctx = getCtx();
  const client = await getChariowClient(ctx.db);
  const summary = await reconcile(ctx, client, { days: 3 });
  await purgeOldRateLimits(ctx.db);
  return Response.json({ ok: true, summary });
}
