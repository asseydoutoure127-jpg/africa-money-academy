import Link from 'next/link';
import Outils from '@/components/Outils.jsx';

export const metadata = {
  title: 'Boîte à outils : calculs gratuits en FCFA',
  description: 'Trois petits outils gratuits : votre budget du mois, votre gain sur une vente, et le temps pour atteindre un objectif.',
};

export default function OutilsPage() {
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <span className="badge gold">Gratuit</span>
        <h1>Boîte à outils</h1>
        <p className="lead">Des calculs simples, en FCFA, pour y voir clair. Rien n’est enregistré : tout se calcule sur votre téléphone.</p>
        <Outils />
        <section className="card gold" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>Aller plus loin</h2>
          <p>Ces outils sont expliqués pas à pas dans nos formations. Commencez par la formation gratuite.</p>
          <Link className="btn gold" href="/formations">Voir les formations</Link>
        </section>
      </div>
    </main>
  );
}
