// Typographie française : apostrophe courbe, espace insécable avant « ? ! : ; » et autour des guillemets.
export function typo(text) {
  return String(text ?? '')
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/«\s/g, '« ');
}
