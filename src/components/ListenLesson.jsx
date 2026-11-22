'use client';

import { useEffect, useRef, useState } from 'react';
import { speechChunks } from '@/lib/speech-text.js';

// « Écouter la leçon » : lecture à voix haute par la voix française du téléphone (aucun fichier, aucun envoi de données).
export default function ListenLesson({ title, text }) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState('idle'); // idle | playing | paused
  const [rate, setRate] = useState(1);
  const [pos, setPos] = useState(0);
  const chunks = useRef([]);
  const idx = useRef(0);
  const live = useRef(false);
  const rateRef = useRef(1);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    chunks.current = speechChunks(`${title}. ${text}`);
    return () => { live.current = false; try { window.speechSynthesis.cancel(); } catch {} };
  }, [title, text]);

  function next() {
    if (!live.current) return;
    if (idx.current >= chunks.current.length) { live.current = false; setState('idle'); idx.current = 0; setPos(0); return; }
    const u = new SpeechSynthesisUtterance(chunks.current[idx.current]);
    u.lang = 'fr-FR';
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
    if (voice) u.voice = voice;
    u.rate = rateRef.current;
    const advance = () => { if (!live.current) return; idx.current += 1; setPos(idx.current); next(); };
    u.onend = advance;
    u.onerror = advance;
    window.speechSynthesis.speak(u);
  }
  function play() {
    window.speechSynthesis.cancel();
    live.current = true;
    setState('playing');
    next();
  }
  function pause() { live.current = false; window.speechSynthesis.cancel(); setState('paused'); }
  function stop() { live.current = false; window.speechSynthesis.cancel(); idx.current = 0; setPos(0); setState('idle'); }
  function changeRate(v) { rateRef.current = v; setRate(v); }

  if (!supported || chunks.current.length === 0) return null;
  const total = chunks.current.length;
  const pct = Math.min(100, Math.round((pos / total) * 100));
  return (
    <section className="listen" aria-label="Écouter la leçon">
      <div className="listen-row">
        {state === 'playing'
          ? <button type="button" className="btn small" onClick={pause}>⏸ Pause</button>
          : <button type="button" className="btn small" onClick={play}>{state === 'paused' ? '▶ Reprendre' : '🔊 Écouter la leçon'}</button>}
        {state !== 'idle' && <button type="button" className="btn ghost small" onClick={stop}>■ Arrêter</button>}
        <label className="listen-speed">Vitesse
          <select value={rate} onChange={(e) => changeRate(Number(e.target.value))}>
            <option value={0.8}>Lente</option><option value={1}>Normale</option><option value={1.25}>Rapide</option>
          </select>
        </label>
      </div>
      {state !== 'idle' && <div className="lesson-progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></div>}
      <small className="muted">Lecture par la voix de votre téléphone. Sa qualité dépend de l’appareil.</small>
    </section>
  );
}
