import './globals.css';
import { Fraunces, Nunito_Sans } from 'next/font/google';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import BottomNav from '@/components/BottomNav.jsx';
import { InstallBanner } from '@/components/PwaInstall.jsx';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';

const title = Fraunces({ subsets: ['latin'], variable: '--font-title', display: 'swap', style: ['normal', 'italic'] });
const body = Nunito_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap', style: ['normal', 'italic'] });

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  let name = 'Africa Money Academy';
  try {
    name = await getSiteName(getDb());
  } catch {
    // titre par défaut
  }
  return {
    title: { default: name, template: `%s – ${name}` },
    applicationName: 'Africa Money Academy',
    appleWebApp: { capable: true, title: 'Money Academy', statusBarStyle: 'black-translucent' },
    icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon.svg', type: 'image/svg+xml' }], apple: '/icons/apple-touch-icon.png' },
    description: "Apprenez pas à pas à gagner de l'argent sur Internet, en partant de zéro. Formations écrites en français, pensées pour le téléphone.",
  };
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b2a5c' };

export default async function RootLayout({ children }) {
  let loggedIn = false;
  try {
    loggedIn = Boolean(await getCurrentUser());
  } catch {
    // base indisponible : on affiche la barre pour les visiteurs
  }
  return (
    <html lang="fr" className={`${title.variable} ${body.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
        <InstallBanner />
        <BottomNav loggedIn={loggedIn} />
      </body>
    </html>
  );
}
