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
      <div className="pattern" aria-hidden="true" />
      <div className="wrap footer-grid">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-clair.svg" alt={siteName} width="200" height="40" />
          <p>Apprendre à gagner de l’argent, pas à pas, en français et depuis votre téléphone.</p>
        </div>
        <nav aria-label="Formations">
          <strong>Apprendre</strong>
          <Link href="/formations">Toutes les formations</Link>
          <Link href="/inscription">Créer un compte</Link>
          <Link href="/connexion">Connexion</Link>
        </nav>
        <nav aria-label="Aide">
          <strong>Aide</strong>
          <Link href="/faq">Questions fréquentes</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/a-propos">À propos</Link>
        </nav>
        <nav aria-label="Informations légales">
          <strong>Informations</strong>
          <Link href="/legal/cgu">Conditions d’utilisation</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href="/legal/remboursement">Remboursement</Link>
        </nav>
      </div>
      <div className="wrap footer-end">© {new Date().getFullYear()} {siteName}. Tous droits réservés. Contenus protégés : toute copie ou revente est interdite.</div>
    </footer>
  );
}
