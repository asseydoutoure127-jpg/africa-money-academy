'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon.jsx';

// Installation du site comme application. Aucune page n'est gardée hors ligne (voir public/sw.js).
let deferred = null; // l'invitation d'installation fournie par le navigateur (Android, ordinateur)
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());
let started = false;

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function usePwa() {
  const [state, setState] = useState({ ready: false, canPrompt: false, ios: false, installed: false });
  useEffect(() => {
    start();
    const update = () => setState({ ready: true, canPrompt: Boolean(deferred), ios: isIos(), installed: isStandalone() });
    update();
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);
  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice.catch(() => null);
    deferred = null;
    emit();
    return choice?.outcome === 'accepted';
  };
  return { ...state, install };
}

const DISMISS_KEY = 'ama_install_dismissed';
const DAYS = 14;
function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && Date.now() - t < DAYS * 86400000;
  } catch {
    return false;
  }
}

/** Petit bandeau « Installer l'application » en bas de l'écran, que l'on peut fermer. */
export function InstallBanner() {
  const pwa = usePwa();
  const path = usePathname() || '/';
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(dismissedRecently());
  }, []);
  if (!pwa.ready || pwa.installed || hidden) return null;
  if (path.startsWith('/admin') || path.startsWith('/installer') || path.startsWith('/espace/formation')) return null;
  if (!pwa.canPrompt && !pwa.ios) return null;
  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // tant pis : le bandeau reviendra
    }
    setHidden(true);
  };
  return (
    <aside className="install-banner" aria-label="Installer l’application">
      <img src="/icons/icon-192.png" alt="" width="44" height="44" />
      <div className="txt">
        <strong>Installer l’application</strong>
        <span>Un accès direct depuis votre écran d’accueil.</span>
      </div>
      {pwa.canPrompt ? (
        <button className="btn small gold" type="button" onClick={async () => { await pwa.install(); }}>Installer</button>
      ) : (
        <Link className="btn small gold" href="/installer">Comment ?</Link>
      )}
      <button className="close" type="button" onClick={close} aria-label="Fermer">×</button>
    </aside>
  );
}

/** Bouton et explications de la page /installer. */
export function InstallPanel() {
  const pwa = usePwa();
  if (!pwa.ready) return null;
  if (pwa.installed) {
    return <p className="flash ok">L’application est déjà installée sur cet appareil. Ouvrez-la depuis votre écran d’accueil.</p>;
  }
  if (pwa.canPrompt) {
    return (
      <div className="card gold">
        <p style={{ marginTop: 0 }}>Votre navigateur peut installer l’application tout de suite.</p>
        <button className="btn gold" type="button" onClick={async () => { await pwa.install(); }}>
          <Icon name="phone" size={20} /> Installer l’application
        </button>
      </div>
    );
  }
  return (
    <div className="card soft">
      <p style={{ margin: 0 }}>
        {pwa.ios
          ? 'Sur iPhone et iPad, l’installation se fait depuis Safari : suivez les étapes « iPhone » ci-dessous.'
          : 'Si le bouton d’installation n’apparaît pas, suivez les étapes ci-dessous pour votre appareil.'}
      </p>
    </div>
  );
}
