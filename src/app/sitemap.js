import { getSiteUrl } from '@/lib/context.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const base = getSiteUrl();
  const fixed = ['', '/formations', '/parrainage', '/outils', '/classement', '/classement/reglement', '/boutique', '/installer', '/faq', '/contact', '/a-propos', '/legal/cgu', '/legal/confidentialite', '/legal/remboursement', '/inscription', '/connexion'];
  const entries = fixed.map((p) => ({ url: `${base}${p}`, changeFrequency: p === '' || p === '/formations' ? 'weekly' : 'monthly', priority: p === '' ? 1 : p === '/formations' ? 0.9 : 0.5 }));
  try {
    const courses = await store.listPublishedCourses(getDb());
    for (const c of courses) entries.push({ url: `${base}/formations/${c.slug}`, changeFrequency: 'weekly', priority: 0.8 });
  } catch {
    // base indisponible : on garde les pages fixes
  }
  return entries;
}
