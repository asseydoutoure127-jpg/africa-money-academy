import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="narrow center notfound">
        <div className="nf-code" aria-hidden="true">404</div>
        <h1>Cette page est introuvable</h1>
        <p>Le lien est peut-être ancien ou mal écrit. Voici où aller :</p>
        <div className="nf-links">
          <Link className="btn gold" href="/">Retour à l’accueil</Link>
          <Link className="btn ghost-dark" href="/formations">Voir les formations</Link>
          <Link className="btn ghost-dark" href="/outils">Boîte à outils gratuite</Link>
        </div>
      </div>
    </main>
  );
}
