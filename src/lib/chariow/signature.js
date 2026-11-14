// Vérification de la signature d'un Pulse Chariow.
// Règles (doc officielle « Pulse Security ») :
//  - HMAC-SHA256 du CORPS BRUT (octets reçus), clé = secret `whsec_...` du Pulse ;
//  - en-tête `x-chariow-signature` = `sha256=` + 64 caractères hexadécimaux ;
//  - comparaison en temps constant, après vérification que les longueurs sont égales ;
//  - ne JAMAIS re-sérialiser le JSON pour vérifier.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function computeSignature(rawBody, secret) {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifySignature(rawBody, header, secret) {
  if (typeof header !== 'string' || !header.startsWith('sha256=') || !secret) return false;
  const received = Buffer.from(header);
  const expected = Buffer.from(computeSignature(rawBody, secret));
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Cherche le secret qui valide la signature.
 * `candidates` : [{ id, label, pulse_id, secret }]. Le secret rattaché à l'identifiant
 * `x-pulse-id` reçu est essayé en premier, puis les autres.
 * Retourne le candidat valide, ou null.
 */
export function findValidSecret(rawBody, header, candidates, pulseId) {
  const ordered = [...candidates].sort((a, b) => {
    const am = pulseId && a.pulse_id === pulseId ? 0 : 1;
    const bm = pulseId && b.pulse_id === pulseId ? 0 : 1;
    return am - bm;
  });
  for (const c of ordered) {
    if (verifySignature(rawBody, header, c.secret)) return c;
  }
  return null;
}
