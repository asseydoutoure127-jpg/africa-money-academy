// Aperçu d'une vraie page de leçon (texte d'exemple), dessiné en HTML/CSS.
export default function LessonMock() {
  return (
    <div className="lesson-mock" aria-hidden="true">
      <div className="lm-head"><span>Les bases de l’argent</span><b>Leçon 3 · 4 pages</b></div>
      <h3>Faire son budget du mois</h3>
      <ol className="lm-toc"><li>Ce que vous recevez</li><li>Ce que vous devez payer</li><li>Ce qu’il reste</li></ol>
      <p>Prenez une feuille. À gauche, écrivez tout l’argent reçu ce mois-ci. À droite, tout ce que vous avez dépensé, même les petites choses : crédit, transport, thé.</p>
      <div className="lm-note"><strong>À retenir</strong> Ce n’est pas le montant qui compte au début. C’est de savoir où va l’argent.</div>
      <div className="lm-ex"><span>Exercice</span><p>Notez vos 5 plus grosses dépenses de la semaine passée.</p><div className="lm-input" /><b>Envoyer ma réponse</b></div>
      <div className="lm-lock">Leçon 4 · s’ouvre après l’exercice</div>
    </div>
  );
}
