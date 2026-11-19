'use client';

import { useState } from 'react';

// Champ mot de passe avec un bouton « Afficher » : utile sur téléphone, où l'on se trompe vite en tapant.
export default function PasswordField({ id = 'password', name = 'password', label, autoComplete, minLength }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <div className="pw-field">
        <input id={id} name={name} type={shown ? 'text' : 'password'} autoComplete={autoComplete} required minLength={minLength} />
        <button type="button" className="pw-toggle" onClick={() => setShown((v) => !v)} aria-pressed={shown}>
          {shown ? 'Masquer' : 'Afficher'}
        </button>
      </div>
    </>
  );
}
