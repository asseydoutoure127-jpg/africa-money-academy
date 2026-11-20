import Link from 'next/link';
import { InstallPanel } from '@/components/PwaInstall.jsx';
import Icon from '@/components/Icon.jsx';

export const metadata = {
  title: 'Installer l’application',
  description: 'Ajoutez Waypoint sur l’écran d’accueil de votre téléphone, en 3 gestes.',
};

export default function Installer() {
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <span className="badge gold">Application</span>
        <h1>Installer l’application sur votre téléphone</h1>
        <p className="lead">
          Une icône sur votre écran d’accueil, comme n’importe quelle application. Pas de boutique à ouvrir, rien à télécharger : c’est gratuit et ça prend 10 secondes.
        </p>

        <InstallPanel />

        <section>
          <h2>Sur Android (Chrome)</h2>
          <ol className="how-steps">
            <li><strong>Ouvrez le site dans Chrome</strong>Si une fenêtre « Installer l’application » apparaît, appuyez dessus.</li>
            <li><strong>Sinon, appuyez sur les trois points ⋮</strong>En haut à droite du navigateur.</li>
            <li><strong>Choisissez « Installer l’application »</strong>Ou « Ajouter à l’écran d’accueil ». Confirmez : l’icône apparaît.</li>
          </ol>
        </section>

        <section>
          <h2>Sur iPhone et iPad (Safari)</h2>
          <ol className="how-steps">
            <li><strong>Ouvrez le site dans Safari</strong>L’installation ne marche pas depuis les autres navigateurs sur iPhone.</li>
            <li><strong>Appuyez sur le bouton Partager</strong>Le carré avec une flèche vers le haut, en bas de l’écran.</li>
            <li><strong>Choisissez « Sur l’écran d’accueil »</strong>Puis « Ajouter » : l’icône apparaît.</li>
          </ol>
        </section>

        <section>
          <h2>Sur ordinateur (Chrome ou Edge)</h2>
          <p>Cliquez sur l’icône d’installation à droite de la barre d’adresse, puis sur « Installer ».</p>
        </section>

        <section className="card soft">
          <h2 style={{ marginTop: 0 }}><Icon name="shield" size={22} /> À savoir</h2>
          <ul className="ref-rules">
            <li>C’est le même site : votre compte et votre progression sont les mêmes.</li>
            <li>Il faut une connexion Internet pour lire les leçons.</li>
            <li>Vous pouvez supprimer l’icône quand vous voulez, comme une application normale.</li>
          </ul>
        </section>

        <p><Link className="btn" href="/formations">Voir les formations</Link></p>
      </div>
    </main>
  );
}
