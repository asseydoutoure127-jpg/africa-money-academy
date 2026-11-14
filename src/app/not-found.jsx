import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="narrow center">
        <h1>Page introuvable</h1>
        <p>Cette page n’existe pas ou n’est plus disponible.</p>
        <Link className="btn" href="/">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
