import './globals.css';
import { Fraunces, Nunito_Sans } from 'next/font/google';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import BottomNav from '@/components/BottomNav.jsx';
import { InstallBanner } from '@/components/PwaInstall.jsx';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteName, getSiteUrl } from '@/lib/context.js';

const title = Fraunces({ subsets: ['latin'], variable: '--font-title', display: 'swap', style: ['normal', 'italic'] });
const body = Nunito_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap', style: ['normal', 'italic'] });

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  let name = 'Waypoint';
  try {
    name = await getSiteName(getDb());
  } catch {
    // titre par défaut
  }
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: name, template: `%s – ${name}` },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: name,
      title: name,
      description: 'Formations en français pour apprendre, pas à pas, à gagner de l’argent depuis votre téléphone. Gratuit pour commencer.',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: name }],
    },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
    applicationName: 'Waypoint',
    appleWebApp: { capable: true, title: 'Waypoint', statusBarStyle: 'black-translucent' },
    icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
    description: 'Apprenez pas à pas à gagner de l’argent sur Internet, en partant de zéro. Formations écrites en français, pensées pour le téléphone.',
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
