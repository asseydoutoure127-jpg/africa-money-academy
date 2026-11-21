import Link from 'next/link';
import AdminNav from '@/components/AdminNav.jsx';
import { requireAdmin } from '@/lib/auth.js';

export const metadata = { title: 'Administration', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <main className="admin-area">
      <div className="admin-banner">
        <div className="wrap">
          <strong>Espace administrateur</strong>
          <span className="ab-note">Réservé au propriétaire du site.</span>
          <Link href="/espace">Voir comme un élève</Link>
        </div>
      </div>
      <div className="wrap">
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
