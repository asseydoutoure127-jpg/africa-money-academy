// Garde le début de la leçon : au moins deux parties, environ la moitié du texte, coupé entre deux titres.
export function excerptOf(content) {
  const text = String(content || '');
  const parts = text.split(/\n(?=##\s)/);
  if (parts.length < 3) return { text: parts.slice(0, 1).join('\n'), cut: parts.length > 1 };
  const keep = Math.max(2, Math.ceil(parts.length / 2));
  return { text: parts.slice(0, keep).join('\n'), cut: true };
}

/** Aperçu court pour l'accueil : coupe toujours entre deux paragraphes, jamais au milieu d'une phrase. */
export function previewOf(content, maxChars = 1100) {
  const paras = String(content || '').split(/\n{2,}/);
  const out = [];
  let size = 0;
  for (const p of paras) {
    const isHeading = /^##\s/.test(p);
    // On s'arrête avant un nouveau titre ou dès que la taille est atteinte, après au moins un titre et deux paragraphes.
    const body = out.filter((x) => !/^##\s/.test(x)).length;
    if (body >= 2 && (isHeading || size + p.length > maxChars)) break;
    out.push(p);
    size += p.length;
  }
  return { text: out.join('\n\n'), cut: out.length < paras.length };
}
