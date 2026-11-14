import Link from 'next/link';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';

export default async function Footer() {
  let siteName = 'Africa Money Academy';
  try {
    siteName = await getSiteName(getDb());
  } catch {
    // on affiche quand même le pied de page
  }
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>© {new Date().getFullYear()} {siteName}</span>
        <Link href="/a-propos">À propos</Link>
        <Link href="/faq">Questions fréquentes</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/legal/cgu">Conditions d’utilisation</Link>
        <Link href="/legal/confidentialite">Confidentialité</Link>
        <Link href="/legal/remboursement">Remboursement</Link>
      </div>
    </footer>
  );
}
