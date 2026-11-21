import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';
import { logout } from '@/app/actions/auth.js';

export default async function Header() {
  let user = null;
  let siteName = 'Waypoint';
  try {
    user = await getCurrentUser();
    siteName = await getSiteName(getDb());
  } catch {
    // Base indisponible : le site affiche quand même l'en-tête.
  }
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label={siteName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/brand/mark-sm.png" alt="" width="52" height="28" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-word" src="/brand/wordmark-sm.png" alt={siteName} width="134" height="18" />
        </Link>
        {user && (
          <Link href="/espace/profil" className="avatar" aria-label="Mon profil">
            {(user.name || '?').trim().charAt(0).toUpperCase()}
          </Link>
        )}
        <nav className="nav" aria-label="Menu principal">
          <Link href="/formations">Formations</Link>
          {!user && <Link href="/contact">Contact</Link>}
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
