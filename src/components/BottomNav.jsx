'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon.jsx';

// Barre d'icônes en bas de l'écran (téléphone) : chaque page a sa petite icône.
export default function BottomNav({ loggedIn }) {
  const path = usePathname() || '/';
  if (path.startsWith('/admin')) return null; // l'administration a son propre menu
  const items = [
    { href: '/', label: 'Accueil', icon: 'home', match: (p) => p === '/' },
    { href: '/formations', label: 'Formations', icon: 'grid', match: (p) => p.startsWith('/formations') },
    { href: loggedIn ? '/espace' : '/connexion', label: loggedIn ? 'Mon espace' : 'Connexion', icon: 'book', match: (p) => p.startsWith('/espace') && !p.startsWith('/espace/profil') || p.startsWith('/connexion') },
    { href: '/parrainage', label: 'Parrainage', icon: 'gift', match: (p) => p.startsWith('/parrainage') },
    { href: loggedIn ? '/espace/profil' : '/inscription', label: loggedIn ? 'Profil' : 'S’inscrire', icon: 'user', match: (p) => p.startsWith('/espace/profil') || p.startsWith('/inscription') },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navigation rapide">
      {items.map((it) => {
        const active = it.match(path);
        return (
          <Link key={it.href} href={it.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
            <Icon name={it.icon} size={24} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
