// Réception d'un Pulse, dans l'ordre exigé par le prompt (section 6.7) :
//  1. corps BRUT lu avant tout parsing JSON (fait par l'appelant : `rawBody` est un Buffer) ;
//  2. signature vérifiée avec chaque secret enregistré (celui de `x-pulse-id` d'abord) ;
//  3. `x-pulse-delivery-id` déjà vu => 200 et on s'arrête ;
//  4. on ENREGISTRE la livraison, puis on répond 200 tout de suite, puis on traite en arrière-plan ;
//  5. tout est journalisé (jamais de secret dans le journal).
// Si le traitement échoue après le 200, Chariow ne renverra rien : la livraison reste en base
// (statut `received` ou `failed`) et la réconciliation la retraite.
import * as store from '../store.js';
import { findValidSecret } from './signature.js';

function headerGetter(headers) {
  return (name) => (typeof headers.get === 'function' ? headers.get(name) : headers[name]) ?? null;
}

/**
 * @param {{ db: any, rawBody: Buffer, headers: Headers|Record<string,string>,
 *           secrets: Array<{id:string,label:string,pulse_id:string|null,secret:string}>,
 *           schedule: (fn: () => Promise<any>) => void, process: (deliveryId: number) => Promise<any> }} args
 * @returns {Promise<{status: number, body: string}>}
 */
export async function receivePulse({ db, rawBody, headers, secrets, schedule, process }) {
  const get = headerGetter(headers);
  const signature = get('x-chariow-signature');
  const pulseId = get('x-pulse-id');
  const deliveryId = get('x-pulse-delivery-id');
  const headerEvent = get('x-pulse-event');

  if (!secrets || secrets.length === 0) {
    await store.addRejection(db, { reason: 'no_secret_configured', pulseId });
    await store.raiseAlert(db, {
      kind: 'pulse_signature',
      message: "Chariow envoie un Pulse mais aucun secret de signature (whsec_...) n'est enregistré. Collez-le dans Réglages > Connexions.",
    });
    return { status: 401, body: 'Invalid signature' };
  }

  const match = findValidSecret(rawBody, signature, secrets, pulseId);
  if (!match) {
    await store.addRejection(db, { reason: signature ? 'invalid_signature' : 'missing_signature', pulseId });
    if ((await store.countRecentRejections(db, 60)) >= 3) {
      await store.raiseAlert(db, {
        kind: 'pulse_signature',
        message: "Plusieurs Pulses sont refusés car leur signature est invalide. Le secret a peut-être été renouvelé dans Chariow : copiez le nouveau secret (whsec_...) dans Réglages > Connexions.",
      });
    }
    return { status: 401, body: 'Invalid signature' };
  }

  if (!deliveryId) return { status: 400, body: 'Missing x-pulse-delivery-id' };

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { status: 400, body: 'Invalid JSON' };
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 400, body: 'Invalid JSON' };
  }

  const event = String(payload.event || headerEvent || 'unknown');
  const id = await store.insertDelivery(db, { deliveryId, pulseId, event, payload });
  if (id === null) return { status: 200, body: 'OK' }; // doublon : déjà reçu

  schedule(() => process(id));
  return { status: 200, body: 'OK' };
}
