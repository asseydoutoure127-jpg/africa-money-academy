import { after } from 'next/server';
import { getCtx } from '@/lib/context.js';
import { getPulseSecrets } from '@/lib/settings.js';
import { receivePulse } from '@/lib/chariow/webhook.js';
import { processDeliveryById } from '@/lib/chariow/pulse.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Réception des Pulses Chariow. La logique est dans src/lib/chariow/webhook.js (testée).
// Le corps est lu en OCTETS BRUTS avant tout parsing : c'est ce que la signature protège.
export async function POST(request) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  try {
    const ctx = getCtx();
    const secrets = await getPulseSecrets(ctx.db);
    const res = await receivePulse({
      db: ctx.db,
      rawBody,
      headers: request.headers,
      secrets,
      schedule: (fn) => after(fn),
      process: (id) => processDeliveryById(ctx, id),
    });
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  } catch (e) {
    // Base indisponible, etc. : on répond 5xx pour que Chariow RÉESSAIE (5 tentatives).
    console.error('[webhook chariow]', e?.message);
    return new Response('Server error', { status: 500 });
  }
}

export function GET() {
  return new Response('Point de réception des Pulses Chariow (POST uniquement).', { status: 405 });
}
