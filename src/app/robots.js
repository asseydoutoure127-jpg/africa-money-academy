import { getSiteUrl } from '@/lib/context.js';

export default function robots() {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/espace', '/api/', '/achat/', '/setup', '/r/', '/email/', '/mot-de-passe-reinitialise'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
