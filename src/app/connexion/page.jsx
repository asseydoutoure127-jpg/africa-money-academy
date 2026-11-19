import Link from 'next/link';
import { redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import PasswordField from '@/components/PasswordField.jsx';
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
      <div className="auth">
        <aside className="auth-side">
          <h2>Content de vous revoir.</h2>
          <ul>
            <li>Reprenez là où vous vous étiez arrêté</li>
            <li>Retrouvez vos formations et vos exercices</li>
            <li>Suivez vos amis parrainés</li>
          </ul>
        </aside>
      <div className="auth-main">
        <h1>Connexion</h1>
        <Flash code={sp.m} />
        <form action={login} className="card">
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          <PasswordField label="Mot de passe" autoComplete="current-password" />
          <p style={{ marginTop: 18 }}>
            <button className="btn gold block" type="submit">
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
      </div>
    </main>
  );
}
