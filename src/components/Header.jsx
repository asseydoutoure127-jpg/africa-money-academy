import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';
import { logout } from '@/app/actions/auth.js';

export default async function Header() {
  let user = null;
  let siteName = 'Africa Money Academy';
  try {
    user = await getCurrentUser();
    siteName = await getSiteName(getDb());
  } catch {
    // Base indisponible : le site affiche quand même l'en-tête.
  }
  const [first, ...rest] = siteName.split(' ');
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <b>{first}</b>&nbsp;{rest.join(' ')}
        </Link>
        {user && (
          <Link href="/espace/profil" className="avatar" aria-label="Mon profil">
            {(user.name || '?').trim().charAt(0).toUpperCase()}
          </Link>
        )}
        <nav className="nav" aria-label="Menu principal">
          <Link href="/formations">Formations</Link>
          <Link href="/parrainage">Parrainage</Link>
          {user ? (
            <>
              <Link href="/espace">Mon espace</Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="nav-admin">
                  Administration
                </Link>
              )}
              <form action={logout}>
                <button type="submit" className="link">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/connexion">Connexion</Link>
              <Link href="/inscription">Créer un compte</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
