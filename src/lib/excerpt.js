// Garde le début de la leçon : au moins deux parties, environ la moitié du texte, coupé entre deux titres.
export function excerptOf(content) {
  const text = String(content || '');
  const parts = text.split(/\n(?=##\s)/);
  if (parts.length < 3) return { text: parts.slice(0, 1).join('\n'), cut: parts.length > 1 };
  const keep = Math.max(2, Math.ceil(parts.length / 2));
  return { text: parts.slice(0, keep).join('\n'), cut: true };
}
