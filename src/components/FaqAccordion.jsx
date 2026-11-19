import RichText from './RichText.jsx';
import { typo } from '@/lib/typo.js';

// Transforme un texte « # Question » + réponse en liste de questions qui s'ouvrent au toucher.
export default function FaqAccordion({ text }) {
  const items = [];
  for (const block of String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)) {
    const q = block.match(/^#{1,3}\s+(.+)$/);
    if (q && !block.includes('\n')) items.push({ q: q[1], a: [] });
    else if (items.length) items[items.length - 1].a.push(block);
  }
  if (items.length === 0) return <RichText text={text} />;
  return (
    <div className="faq-list">
      {items.map((it, i) => (
        <details key={i} className="faq">
          <summary>{typo(it.q)}</summary>
          <RichText text={it.a.join('\n\n')} />
        </details>
      ))}
    </div>
  );
}
