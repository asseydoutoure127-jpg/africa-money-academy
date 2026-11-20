// Affiché tout de suite quand on change de page, pendant que le serveur prépare la suivante.
export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Chargement">
      <div className="wrap">
        <div className="skeleton sk-title" />
        <div className="skeleton sk-card" />
        <div className="skeleton sk-line" />
        <div className="skeleton sk-line short" />
      </div>
    </main>
  );
}
