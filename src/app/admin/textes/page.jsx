import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { getDb } from '@/lib/db.js';
import { getPageText } from '@/lib/pages.js';
import { PAGE_DEFAULTS } from '@/lib/defaults.js';
import { saveSitePage } from '@/app/actions/admin.js';
import { requireAdmin } from '@/lib/auth.js';

export default async function Texts({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const slugs = Object.keys(PAGE_DEFAULTS);
  const slug = slugs.includes(sp.page) ? sp.page : slugs[0];
  const page = await getPageText(getDb(), slug);
  return (
    <>
      <h1>Textes du site</h1>
      <Flash code={sp.m} />
      <p className="actions">{slugs.map((s) => <Link key={s} className={`btn small ${s === slug ? '' : 'ghost'}`} href={`/admin/textes?page=${s}`}>{PAGE_DEFAULTS[s].title}</Link>)}</p>
      {['cgu', 'confidentialite', 'remboursement'].includes(slug) && <p className="notice">Ce texte est un modèle de départ : faites-le relire par un juriste avant d’ouvrir les ventes.</p>}
      <form action={saveSitePage} className="card">
        <input type="hidden" name="slug" value={slug} />
        <label htmlFor="title">Titre</label><input id="title" name="title" type="text" defaultValue={page.title} />
        <label htmlFor="body">Texte</label><textarea id="body" name="body" defaultValue={page.body} style={{ minHeight: 360 }} />
        <p style={{ marginTop: 12 }}><button className="btn" type="submit">Enregistrer</button></p>
      </form>
      {page.custom && (
        <form action={saveSitePage}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="reset" value="1" />
          <button className="btn ghost small" type="submit">Revenir au texte d’origine</button></form>
      )}
    </>
  );
}
