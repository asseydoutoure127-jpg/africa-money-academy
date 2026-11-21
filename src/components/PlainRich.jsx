import { Fragment } from 'react';

// Texte écrit par un élève ou une consigne : on garde les retours à la ligne, les listes « - » et le **gras**.
// Rien d'autre (ni lien, ni image, ni HTML) : on n'affiche jamais de contenu externe d'un élève dans l'admin.
function bold(text, key) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : <Fragment key={`${key}-${i}`}>{p}</Fragment>);
}

export default function PlainRich({ text, className = '' }) {
  const blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`plain-rich ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{bold(l.replace(/^\s*[-•*]\s+/, ''), `${i}-${j}`)}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{bold(l, `${i}-${j}`)}</Fragment>)}</p>;
      })}
    </div>
  );
}
