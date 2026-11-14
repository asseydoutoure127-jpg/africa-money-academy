import { notFound } from 'next/navigation';
import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import { getPageText } from '@/lib/pages.js';

const ALLOWED = ['cgu', 'confidentialite', 'remboursement'];

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = ALLOWED.includes(slug) ? await getPageText(getDb(), slug) : null;
  return { title: page?.title || 'Page introuvable' };
}

export default async function LegalPage({ params }) {
  const { slug } = await params;
  if (!ALLOWED.includes(slug)) notFound();
  const page = await getPageText(getDb(), slug);
  return (
    <main>
      <div className="wrap">
        <h1>{page.title}</h1>
        <RichText text={page.body} />
      </div>
    </main>
  );
}
