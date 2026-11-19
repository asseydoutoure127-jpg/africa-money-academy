import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import PasswordField from '@/components/PasswordField.jsx';
import { signup } from '@/app/actions/auth.js';
import { getCurrentUser } from '@/lib/auth.js';
import { redirect } from 'next/navigation';
import { safeInternalPath } from '@/lib/validate.js';

export const metadata = { title: 'Créer un compte' };

export default async function Inscription({ searchParams }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect('/espace');
  const suite = safeInternalPath(sp.suite, '');
  return (
    <main>
      <div className="auth">
        <aside className="auth-side">
          <h2>Un compte gratuit, tout de suite.</h2>
          <ul>
            <li>La formation « Les bases de l’argent » est gratuite</li>
            <li>Votre progression est enregistrée</li>
            <li>Vous gagnez 50 % en invitant vos amis</li>
            <li>Vous ne payez que si vous choisissez une formation</li>
          </ul>
        </aside>
      <div className="auth-main">
        <h1>Créer mon compte</h1>
        <p className="auth-lead">C’est gratuit. La formation « Les bases de l’argent » vous est offerte.</p>
        <Flash code={sp.m} />
        <form action={signup} className="card">
          <input type="hidden" name="suite" value={suite} />
          <label htmlFor="name">Prénom et nom</label>
          <input id="name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={100} />
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          <p className="hint">Utilisez la même adresse pour payer : c’est elle qui ouvre votre accès. Nous vous écrirons pour la confirmer : le message peut arriver dans vos spams.</p>
          <PasswordField label="Mot de passe (8 caractères minimum)" autoComplete="new-password" minLength={8} />
          <label className="check" htmlFor="cgu">
            <input id="cgu" name="cgu" type="checkbox" required />
            <span>
              J’accepte les <Link href="/legal/cgu">conditions d’utilisation</Link> et la{' '}
              <Link href="/legal/confidentialite">politique de confidentialité</Link>.
            </span>
          </label>
          <p style={{ marginTop: 18 }}>
            <button className="btn gold block" type="submit">
              Créer mon compte
            </button>
          </p>
        </form>
        <p>
          Déjà inscrit ? <Link href={`/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ''}`}>Se connecter</Link>
        </p>
      </div>
      </div>
    </main>
  );
}
