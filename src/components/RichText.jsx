import { Fragment } from 'react';

// Affichage sûr du texte des leçons et des pages : on construit des éléments React (jamais de HTML brut),
// donc aucun script ne peut passer. Syntaxe : # Titre, ## Sous-titre, - liste, > encadré, **gras**,
// [texte](https://lien), ![description](https://image ou /illustrations/nom.svg), @video https://youtube.com/watch?v=... (YouTube ou Vimeo).

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

function inline(text, keyBase) {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">
          {link[1]}
        </a>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function videoEmbedUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  let id = null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    id = u.pathname === '/watch' ? u.searchParams.get('v') : (u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,20})/) || [])[1];
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'youtu.be') {
    id = u.pathname.slice(1);
    if (/^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (host === 'vimeo.com') {
    id = u.pathname.slice(1);
    if (/^\d{5,12}$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }
  return null;
}

export default function RichText({ text }) {
  const blocks = String(text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="prose">
      {blocks.map((block, i) => {
        const key = `b${i}`;
        const h = block.match(/^(#{1,3})\s+(.+)$/);
        if (h && !block.includes('\n')) {
          const Tag = `h${h[1].length + 1}`;
          return <Tag key={key}>{inline(h[2], key)}</Tag>;
        }
        if (block.split('\n').every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={key}>
              {block.split('\n').map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-*]\s+/, ''), `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        const img = block.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+|\/illustrations\/[\w.-]+\.svg)\)$/);
        if (img) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={key} src={img[2]} alt={img[1]} loading="lazy" decoding="async" />;
        }
        const vid = block.match(/^@video\s+(\S+)$/);
        if (vid) {
          const src = videoEmbedUrl(vid[1]);
          return src ? (
            <div key={key} className="video">
              <iframe src={src} title="Vidéo de la leçon" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ) : (
            <p key={key}>Vidéo non reconnue (seuls YouTube et Vimeo sont acceptés).</p>
          );
        }
        if (block.startsWith('>')) {
          return (
            <blockquote key={key}>
              {inline(block.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' '), key)}
            </blockquote>
          );
        }
        return (
          <p key={key}>
            {block.split('\n').map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${key}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
