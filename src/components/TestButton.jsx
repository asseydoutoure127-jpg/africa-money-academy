'use client';
import { useActionState } from 'react';

// Bouton de test : affiche le résultat en vert (OK) ou en rouge (problème), en français.
export default function TestButton({ action, label, children }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} style={{ marginTop: 10 }}>
      {children}
      <button className="btn ghost small" type="submit" disabled={pending}>
        {pending ? 'Test en cours…' : label}
      </button>
      {state && (
        <div className={`result ${state.ok ? 'ok' : 'ko'}`} role="status">
          <strong>{state.ok ? '✓ ' : '✗ '}{state.title}</strong>
          {state.lines?.length > 0 && (
            <ul>
              {state.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
