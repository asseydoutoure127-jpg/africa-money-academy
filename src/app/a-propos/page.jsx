import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import { getPageText } from '@/lib/pages.js';

export const metadata = { title: 'À propos' };

export default async function About() {
  const page = await getPageText(getDb(), 'a-propos');
  return (
    <main>
      <div className="wrap">
        <h1>{page.title}</h1>
        <RichText text={page.body} />
      </div>
    </main>
  );
}
