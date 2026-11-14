import Link from 'next/link';
import { redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import { login } from '@/app/actions/auth.js';
import { getCurrentUser } from '@/lib/auth.js';
import { safeInternalPath } from '@/lib/validate.js';

export const metadata = { title: 'Connexion' };

export default async function Connexion({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const suite = safeInternalPath(sp.suite, '');
  if (user) redirect(suite || '/espace');
  return (
    <main>
      <div className="narrow">
        <h1>Connexion</h1>
        <Flash code={sp.m} />
        <form action={login} className="card">
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <p style={{ marginTop: 18 }}>
            <button className="btn" type="submit">
              Me connecter
            </button>
          </p>
        </form>
        <p>
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </p>
        <p>
          Pas encore de compte ? <Link href={`/inscription${suite ? `?suite=${encodeURIComponent(suite)}` : ''}`}>Créer un compte</Link>
        </p>
      </div>
    </main>
  );
}
