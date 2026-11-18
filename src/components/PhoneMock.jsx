// Aperçu de l'application dans un téléphone, dessiné en HTML/CSS (aucune image). Les chiffres sont un exemple.
export default function PhoneMock() {
  return (
    <div className="phone-wrap" aria-hidden="true">
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="ps-bar"><span>Les bases de l’argent</span><b>2 / 12</b></div>
          <div className="ps-progress"><i style={{ width: '17%' }} /></div>
          <h4>Ce que vous recevez, ce que vous dépensez</h4>
          <p>Chaque mois, de l’argent entre et de l’argent sort. Ce qui reste, c’est ce que vous pouvez mettre de côté.</p>
          <div className="ps-example">
            <div><span>Reçu</span><strong>60 000</strong></div>
            <div><span>Dépensé</span><strong>45 000</strong></div>
            <div className="rest"><span>Il reste</span><strong>15 000 FCFA</strong></div>
          </div>
          <div className="ps-exo">
            <span>Exercice</span>
            <i /><i className="short" />
            <b>Envoyer ma réponse</b>
          </div>
        </div>
      </div>
      <div className="chip chip-a"><span className="ok">✓</span> Exercice envoyé<small>La leçon 3 s’ouvre</small></div>
      <div className="chip chip-b">Gratuit pour commencer</div>
    </div>
  );
}
