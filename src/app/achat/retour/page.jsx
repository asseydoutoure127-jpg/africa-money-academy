import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { verifyPurchase } from '@/app/actions/learn.js';
import Poller from './Poller.jsx';

export const metadata = { title: 'Confirmation du paiement', robots: { index: false } };

export default async function Retour({ searchParams }) {
  const sp = await searchParams;
  const slug = typeof sp.formation === 'string' ? sp.formation.slice(0, 80) : '';
  const user = await requireUser(`/achat/retour?formation=${encodeURIComponent(slug)}`);
  return (
    <main>
      <div className="narrow">
        <h1>Votre paiement</h1>
        <Flash code={sp.m} />
        {slug && <Poller slug={slug} />}
        {!user.email_verified_at && (
          <p className="notice">
            Pensez à confirmer votre adresse e-mail (lien reçu à l’inscription) : l’accès s’ouvre dès qu’elle est confirmée.
          </p>
        )}
        <form action={verifyPurchase} className="card">
          <input type="hidden" name="slug" value={slug} />
          <p style={{ marginTop: 0 }}>Vous avez payé mais rien ne s’ouvre ?</p>
          <button className="btn" type="submit">
            J’ai payé, vérifier mon achat
          </button>
        </form>
        <p>
          <Link href="/espace">Aller à mon espace</Link>
        </p>
      </div>
    </main>
  );
}
