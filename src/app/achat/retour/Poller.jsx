'use client';
import { useEffect, useRef, useState } from 'react';

// Interroge la base toutes les 4 secondes pendant 2 minutes. Ne donne JAMAIS l'accès : elle lit seulement
// l'état déjà enregistré grâce à la notification signée de Chariow.
export default function Poller({ slug }) {
  const [state, setState] = useState('waiting');
  const started = useRef(Date.now());

  useEffect(() => {
    let stopped = false;
    async function tick() {
      try {
        const res = await fetch(`/api/achat/statut?formation=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const data = await res.json();
        if (stopped) return;
        if (data.active) {
          setState('active');
          window.location.assign(`/espace/formation/${slug}?m=achat_trouve`);
          return;
        }
      } catch {
        // on réessaie au prochain tour
      }
      if (Date.now() - started.current > 120000) {
        if (!stopped) setState('late');
        return;
      }
      if (!stopped) setTimeout(tick, 4000);
    }
    tick();
    return () => {
      stopped = true;
    };
  }, [slug]);

  if (state === 'active') return <p className="flash ok">Paiement reçu. Ouverture de votre formation…</p>;
  if (state === 'late')
    return (
      <p className="notice">
        Nous n’avons pas encore reçu la confirmation. Ce n’est pas grave : cliquez sur « J’ai payé, vérifier mon achat » ci-dessous.
      </p>
    );
  return (
    <p className="notice" role="status">
      Nous attendons la confirmation de votre paiement. Cela prend en général quelques secondes. Ne fermez pas cette page.
    </p>
  );
}
