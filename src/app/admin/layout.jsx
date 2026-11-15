import Link from 'next/link';
import { requireAdmin } from '@/lib/auth.js';

export const metadata = { title: 'Administration', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <main className="admin-area">
      <div className="admin-banner">
        <div className="wrap">
          <strong>Espace administrateur</strong>
          <span>Réservé au propriétaire du site. Les élèves n’y ont jamais accès.</span>
          <Link href="/espace">Voir comme un élève</Link>
        </div>
      </div>
      <div className="wrap">
        <nav className="admin-nav" aria-label="Administration">
          <Link href="/admin">Tableau de bord</Link>
          <Link href="/admin/formations">Formations</Link>
          <Link href="/admin/apprenants">Apprenants</Link>
          <Link href="/admin/paiements">Paiements</Link>
          <Link href="/admin/parrainage">Parrainage</Link>
          <Link href="/admin/reglages">Réglages</Link>
          <Link href="/admin/textes">Textes du site</Link>
          <Link href="/admin/journal">Journal</Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
