import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { resetPassword } from '@/app/actions/auth.js';

export const metadata = { title: 'Nouveau mot de passe', robots: { index: false } };

export default async function Reset({ searchParams }) {
  const sp = await searchParams;
  const token = typeof sp.t === 'string' ? sp.t : '';
  return (
    <main>
      <div className="narrow">
        <h1>Choisir un nouveau mot de passe</h1>
        <Flash code={sp.m} />
        {token ? (
          <form action={resetPassword} className="card">
            <input type="hidden" name="t" value={token} />
            <label htmlFor="password">Nouveau mot de passe (8 caractères minimum)</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
            <label htmlFor="confirm">Répétez le mot de passe</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
            <p style={{ marginTop: 18 }}>
              <button className="btn" type="submit">
                Enregistrer
              </button>
            </p>
          </form>
        ) : (
          <p>
            Lien incomplet. <Link href="/mot-de-passe-oublie">Refaire la demande</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
