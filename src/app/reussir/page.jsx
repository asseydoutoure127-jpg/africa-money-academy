import Link from 'next/link';
import { PHOTOS } from '@/lib/photos.js';

export const metadata = {
  title: 'Réussir sa formation : la méthode',
  description: 'Vingt minutes par jour, un exercice à chaque leçon, une action cette semaine. La méthode simple pour aller au bout d’une formation et gagner de l’argent.',
};

const RULES = [
  { t: 'Vingt minutes par jour valent mieux que trois heures le dimanche', p: 'Une leçon fait trois à quatre pages. Lisez-en une par jour, à la même heure : après la prière, dans le bus, avant de dormir. Ce qui compte, c’est de ne pas laisser passer plusieurs jours.', c: 'saffron' },
  { t: 'Faites l’exercice, même imparfait', p: 'Lire donne l’impression de savoir. Écrire sa réponse oblige à décider. Votre réponse peut être courte et fausse : elle vous apprend plus qu’une leçon lue trois fois. La leçon suivante s’ouvre dès que vous l’envoyez.', c: 'indigo' },
  { t: 'Utilisez vos vrais chiffres', p: 'Prenez ce que vous gagnez vraiment, ce que vous dépensez vraiment, le prix de votre vrai produit. Un exemple inventé ne change rien dans votre vie ; un chiffre vrai, si.', c: 'saffron' },
  { t: 'Une action par semaine, pas dix idées', p: 'À la fin d’une leçon, choisissez une seule chose à faire avant la prochaine : noter vos dépenses, écrire à un client, fixer un prix. Petite, mais faite.', c: 'indigo' },
  { t: 'Commencez petit, avec ce que vous avez', p: 'Vous n’avez pas besoin d’argent de départ pour appliquer la première formation. Elle est gratuite et elle commence par ce qui entre et ce qui sort de votre poche, pas par un investissement.', c: 'saffron' },
];

const WEEK = [
  ['Jour 1', 'Créez votre compte, ouvrez « Les bases de l’argent » et lisez la première leçon.'],
  ['Jour 2', 'Faites l’exercice de la leçon 1 avec vos vrais chiffres, puis lisez la leçon 2.'],
  ['Jours 3 et 4', 'Une leçon par jour. Notez chaque dépense du jour dans un cahier ou sur votre téléphone.'],
  ['Jour 5', 'Relisez vos réponses. Calculez ce qu’il vous reste à la fin de la semaine avec la boîte à outils.'],
  ['Jours 6 et 7', 'Reposez-vous ou rattrapez un retard. Choisissez une seule chose à changer la semaine prochaine.'],
];

const BLOCKS = [
  ['« Je n’ai pas le temps »', 'Visez dix minutes, pas une heure. Lisez la moitié de la leçon aujourd’hui, l’autre moitié demain. Garder le rythme compte plus que la durée.'],
  ['« Je n’ai pas d’argent pour démarrer »', 'Commencez par la formation gratuite. Elle apprend à voir où part votre argent, ce qui ne coûte rien et libère souvent de quoi démarrer.'],
  ['« J’ai peur de me tromper »', 'Les exercices ne sont pas notés. Une mauvaise réponse n’enlève rien : vous pouvez la modifier quand vous voulez.'],
  ['« La leçon suivante est verrouillée »', 'Les leçons s’ouvrent dans l’ordre, après l’envoi de votre réponse à l’exercice. Envoyez-la et la suivante s’ouvre.'],
  ['« Je n’ai pas reçu l’e-mail de confirmation »', 'Regardez dans les courriers indésirables (spams). Il peut mettre jusqu’à quelques minutes. Sinon écrivez-nous depuis la page Contact avec l’adresse utilisée pour l’inscription.'],
  ['« J’ai payé mais je n’ai pas d’accès »', 'Connectez-vous avec la même adresse e-mail que celle de l’achat. Si l’accès n’apparaît pas, nous le réglons sous 24 heures : écrivez-nous depuis la page Contact.'],
];

export default function Reussir() {
  return (
    <main className="reussir">
      <section className="re-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTOS.groupe.l} alt="" className="re-hero-img" />
        <div className="re-hero-shade" />
        <div className="wrap re-hero-text">
          <span className="badge gold">Pour aller au bout</span>
          <h1>Réussir sa formation, <br />c’est une habitude.</h1>
          <p className="lead">La plupart des gens qui abandonnent n’ont pas manqué d’intelligence. Ils ont manqué d’un rythme. Voici celui qui marche, en cinq règles simples.</p>
          <Link className="btn gold" href="/inscription">Commencer gratuitement</Link>
        </div>
      </section>

      <div className="wrap re-body">
        <section aria-labelledby="regles">
          <h2 id="regles">Cinq règles pour ne pas lâcher</h2>
          <div className="re-rules">
            {RULES.map((r) => (
              <article key={r.t} className={`re-rule ${r.c}`}>
                <h3>{r.t}</h3>
                <p>{r.p}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="semaine" className="re-week">
          <h2 id="semaine">Votre première semaine</h2>
          <p className="muted">Un plan simple pour la formation gratuite. Adaptez-le à votre vie.</p>
          <ol>
            {WEEK.map(([d, t]) => (
              <li key={d}><strong>{d}</strong><span>{t}</span></li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="bloque">
          <h2 id="bloque">Si vous êtes bloqué</h2>
          <div className="re-blocks">
            {BLOCKS.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="re-cta">
          <h2>Prêt pour la première leçon ?</h2>
          <p>La formation « Les bases de l’argent » est gratuite. Elle vous prend vingt minutes par jour.</p>
          <div className="actions">
            <Link className="btn gold" href="/inscription">Créer mon compte</Link>
            <Link className="btn ghost" href="/outils">Essayer la boîte à outils</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
