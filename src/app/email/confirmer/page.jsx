import Link from 'next/link';
import { confirmEmail } from '@/app/actions/auth.js';

export const metadata = { title: 'Confirmer mon adresse', robots: { index: false } };

export default async function Confirm({ searchParams }) {
  const sp = await searchParams;
  const token = typeof sp.t === 'string' ? sp.t : '';
  return (
    <main>
      <div className="narrow center">
        <h1>Confirmer mon adresse e-mail</h1>
        {token ? (
          <form action={confirmEmail}>
            <input type="hidden" name="t" value={token} />
            <p>Un dernier clic pour confirmer votre adresse.</p>
            <button className="btn gold" type="submit">
              Oui, je confirme
            </button>
          </form>
        ) : (
          <p>
            Lien incomplet. <Link href="/connexion">Retour à la connexion</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
