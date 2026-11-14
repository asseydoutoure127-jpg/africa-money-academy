'use client';
import { useState } from 'react';

export default function CopyButton({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt('Copiez ce texte :', value);
        }
      }}
    >
      {done ? 'Copié ✓' : 'Copier'}
    </button>
  );
}
