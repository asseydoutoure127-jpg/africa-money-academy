'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon.jsx';

// Barre flottante en bas de l'écran (téléphone) : seule la page ouverte montre son nom.
export default function BottomNav({ loggedIn }) {
  const path = usePathname() || '/';
  if (path.startsWith('/admin')) return null; // l'administration a son propre menu
  const items = [
    loggedIn
      ? { href: '/espace', label: 'Accueil', icon: 'home', match: (p) => p.startsWith('/espace') && !p.startsWith('/espace/profil') }
      : { href: '/', label: 'Accueil', icon: 'home', match: (p) => p === '/' },
    { href: '/formations', label: 'Cours', icon: 'grid', match: (p) => p.startsWith('/formations') },
    { href: '/outils', label: 'Outils', icon: 'wrench', match: (p) => p.startsWith('/outils') },
    { href: '/classement', label: 'Classement', icon: 'trophy', match: (p) => p.startsWith('/classement') },
    loggedIn
      ? { href: '/espace/profil', label: 'Profil', icon: 'user', match: (p) => p.startsWith('/espace/profil') }
      : { href: '/connexion', label: 'Connexion', icon: 'user', match: (p) => p.startsWith('/connexion') || p.startsWith('/inscription') },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navigation rapide">
      {items.map((it) => {
        const active = it.match(path);
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined} aria-label={it.label}>
            <Icon name={it.icon} size={22} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
