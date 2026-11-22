// Texte d'une leçon (Markdown) transformé en texte lisible à voix haute : sans images, liens, tableaux ni symboles.
export function speechText(md) {
  return String(md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm, ' ')
    .replace(/\|/g, ', ')
    .replace(/^\s{0,3}#{1,6}\s*(.+)$/gm, '$1.')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\bFCFA\b/g, 'francs CFA')
    .replace(/\s*\n\s*/g, '. ')
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Coupe en morceaux courts (certains téléphones arrêtent une lecture trop longue). */
export function speechChunks(text, max = 180) {
  const sentences = String(text).match(/[^.!?…:;]+[.!?…:;]?/g) || [];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) { out.push(cur.trim()); cur = s; } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((c) => (c.length <= max * 1.6 ? [c] : c.match(new RegExp(`.{1,${max}}(\\s|$)`, 'g')).map((x) => x.trim())));
}
