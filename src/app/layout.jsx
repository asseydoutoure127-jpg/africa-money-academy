import './globals.css';
import { Fraunces, Nunito_Sans } from 'next/font/google';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import BottomNav from '@/components/BottomNav.jsx';
import { InstallBanner } from '@/components/PwaInstall.jsx';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteName, getSiteUrl } from '@/lib/context.js';
import { siteFlags } from '@/lib/flags.js';

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
    title: { default: `${name} – formations pour gagner de l’argent`, template: `%s – ${name}` },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: name,
      title: `${name} – formations pour gagner de l’argent`,
      description: 'Apprenez à faire votre budget, à vendre sur WhatsApp et à lancer une petite activité. Formations en français, à suivre sur téléphone. Une formation gratuite pour commencer.',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: name }],
    },
    twitter: { card: 'summary_large_image', images: ['/og.png'] },
    applicationName: 'Waypoint',
    appleWebApp: { capable: true, title: 'Waypoint', statusBarStyle: 'black-translucent' },
    icons: { icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/icons/apple-touch-icon.png' },
    description: 'Apprenez à faire votre budget, à vendre sur WhatsApp et à lancer une petite activité, en partant de zéro. Formations écrites en français, pensées pour le téléphone.',
  };
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#111111' };

export default async function RootLayout({ children }) {
  let loggedIn = false;
  let flags = { rankingOpen: false, shopOpen: false };
  try {
    loggedIn = Boolean(await getCurrentUser());
    flags = await siteFlags(getDb());
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
        <BottomNav loggedIn={loggedIn} rankingOpen={flags.rankingOpen} />
      </body>
    </html>
  );
}
