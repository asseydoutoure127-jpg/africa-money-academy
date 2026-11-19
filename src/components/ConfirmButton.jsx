'use client';

// Bouton qui demande « Êtes-vous sûr ? » avant d'envoyer le formulaire.
export default function ConfirmButton({ message, className = 'btn danger small', children }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
