'use client';
import { useEffect, useRef } from 'react';
import { pingReading } from '@/app/actions/points.js';

// Compte le temps de lecture réel : la page doit être affichée ET l'élève doit avoir bougé (défilé, touché, tapé)
// dans la dernière minute. Une minute comptée = un envoi au serveur ; le serveur plafonne les points par jour.
export default function ReadingTimer() {
  const last = useRef(Date.now());
  useEffect(() => {
    const touch = () => { last.current = Date.now(); };
    const events = ['scroll', 'touchstart', 'pointerdown', 'keydown'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    let active = 0;
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last.current < 60000) {
        active += 1;
        if (active >= 2) {
          active = 0;
          pingReading().catch(() => {});
        }
      }
    }, 30000);
    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, []);
  return null;
}
