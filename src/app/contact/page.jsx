import RichText from '@/components/RichText.jsx';
import { getDb } from '@/lib/db.js';
import { getPageText } from '@/lib/pages.js';
import { getSetting } from '@/lib/settings.js';

export const metadata = { title: 'Contact' };

export default async function Contact() {
  const db = getDb();
  const page = await getPageText(db, 'contact');
  const email = await getSetting(db, 'support_email');
  return (
    <main>
      <div className="wrap">
        <h1>{page.title}</h1>
        <RichText text={page.body} />
        {email ? (
          <p>
            <a className="btn" href={`mailto:${email}`}>
              Écrire à {email}
            </a>
          </p>
        ) : (
          <p className="muted">L’adresse de contact sera bientôt indiquée ici.</p>
        )}
      </div>
    </main>
  );
}
