import './globals.css';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { getDb } from '@/lib/db.js';
import { getSiteName } from '@/lib/context.js';

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

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f5132' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
