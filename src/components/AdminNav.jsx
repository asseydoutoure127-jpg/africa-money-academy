'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/admin', 'Tableau de bord'], ['/admin/formations', 'Formations'], ['/admin/apprenants', 'Apprenants'], ['/admin/exercices', 'Exercices'],
  ['/admin/classement', 'Classement'], ['/admin/boutique', 'Boutique'], ['/admin/paiements', 'Paiements'], ['/admin/parrainage', 'Parrainage'],
  ['/admin/reglages', 'Réglages'], ['/admin/textes', 'Textes du site'], ['/admin/journal', 'Journal'],
];

// Sur téléphone : un seul menu déroulant qui montre la rubrique en cours. Sur grand écran : la liste complète.
export default function AdminNav() {
  const path = usePathname() || '/admin';
  const on = (h) => (h === '/admin' ? path === '/admin' : path === h || path.startsWith(`${h}/`));
  const current = ITEMS.find(([h]) => on(h));
  return (
    <>
      <nav className="admin-nav desk" aria-label="Administration">
        {ITEMS.map(([h, l]) => <Link key={h} href={h} className={on(h) ? 'on' : ''} aria-current={on(h) ? 'page' : undefined}>{l}</Link>)}
      </nav>
      <details className="admin-menu">
        <summary>Menu admin : <strong>{current ? current[1] : 'Administration'}</strong></summary>
        <nav aria-label="Administration (mobile)">
          {ITEMS.map(([h, l]) => <Link key={h} href={h} className={on(h) ? 'on' : ''} aria-current={on(h) ? 'page' : undefined}>{l}</Link>)}
        </nav>
      </details>
    </>
  );
}
