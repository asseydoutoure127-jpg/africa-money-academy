import Link from 'next/link';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';
import { siteFlags } from '@/lib/flags.js';

export default async function Footer() {
  let siteName = 'Waypoint';
  let flags = { rankingOpen: false, shopOpen: false };
  try {
    flags = await siteFlags(getDb());
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
          <img className="footer-logo" src="/brand/lockup-light.png" alt={siteName} width="190" height="124" />
          <p>Apprendre à gagner de l’argent, pas à pas, en français et depuis votre téléphone.</p>
          <p className="footer-by">Waypoint est édité par Africa Money Academy.</p>
        </div>
        <nav aria-label="Formations">
          <strong>Apprendre</strong>
          <Link href="/formations">Toutes les formations</Link>
          {flags.rankingOpen && <Link href="/classement">Classement du mois</Link>}
          {flags.shopOpen && <Link href="/boutique">Boutique</Link>}
          <Link href="/outils">Boîte à outils gratuite</Link>
          <Link href="/parrainage">Parrainage : gagnez 50 %</Link>
          <Link href="/installer">Installer l’application</Link>
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
