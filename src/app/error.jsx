'use client';

export default function ErrorPage({ reset }) {
  return (
    <main>
      <div className="narrow center">
        <h1>Un problème est survenu</h1>
        <p>Ce n’est pas de votre faute. Réessayez dans un instant.</p>
        <button className="btn" type="button" onClick={() => reset()}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
