import './globals.css';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';

const title = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-title', display: 'swap' });
const body = Public_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

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
    description: "Apprenez pas à pas à gagner de l'argent sur Internet, en partant de zéro. Formations écrites en français, pensées pour le téléphone.",
  };
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b2a5c' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${title.variable} ${body.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
