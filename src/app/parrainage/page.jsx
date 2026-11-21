import Link from 'next/link';
import CopyButton from '@/components/CopyButton.jsx';
import Icon from '@/components/Icon.jsx';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { getSiteUrl } from '@/lib/context.js';
import { PHOTOS } from '@/lib/photos.js';
import * as store from '@/lib/store.js';
import { REFERRAL_RATE_PERCENT, REFERRAL_HOLD_DAYS, REFERRAL_MIN_PAYOUT, isMature, commissionFor, ensureReferralCode, listReferredWithPurchases } from '@/lib/referral.js';

export const metadata = {
  title: 'Parrainage : gagnez 50 % en invitant vos amis',
  description: 'Partagez votre lien personnel. Quand un ami s’inscrit grâce à lui et achète une formation, vous recevez 50 % du prix.',
};

const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/[  ]/g, ' ')} FCFA`;
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export default async function Parrainage() {
  const db = getDb();
  const user = await getCurrentUser();
  const courses = (await store.listPublishedCourses(db)).filter((c) => !c.is_free && commissionFor(c.price_label) !== null);

  let refLink = null;
  let filleuls = [];
  let total = 0;
  if (user) {
    const code = await ensureReferralCode(db, user.id);
    refLink = `${getSiteUrl()}/r/${code}`;
    filleuls = await listReferredWithPurchases(db, user.id);
    for (const f of filleuls) for (const a of f.achats) total += commissionFor(a.prix) || 0;
  }
  const buyers = filleuls.filter((f) => f.achats.length > 0).length;
  const shareText = refLink
    ? `Je te recommande Waypoint : des formations simples, en français, pour gagner de l’argent à partir de ton téléphone. Inscris-toi avec mon lien : ${refLink}`
    : '';

  return (
    <main style={{ padding: 0 }}>
      <section className="hero hero-app ref-hero2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="bg" src={PHOTOS.amis.l} alt="" fetchPriority="high" />
        <div className="wrap hero-inner">
          <span className="tag gold">Parrainage</span>
          <h1>Invitez vos amis. Gagnez 50 % à chaque achat.</h1>
          <p>
            Vous avez un lien personnel. Quand quelqu’un crée son compte avec ce lien, puis achète une formation payante, <strong>vous recevez la moitié du prix</strong>. Pas de limite, pas de frais pour vous.
          </p>
          <div className="hero-cta">
            {user ? (
              <a className="btn go gold" href="#mon-lien">Voir mon lien</a>
            ) : (
              <Link className="btn go gold" href="/inscription?suite=/parrainage">Créer un compte pour avoir mon lien</Link>
            )}
          </div>
        </div>
      </section>

      <div className="wrap ref-body">
        {user && (
          <section id="mon-lien" className="card gold ref-link">
            <h2>Votre lien personnel</h2>
            <p>Copiez-le et envoyez-le à vos amis : sur WhatsApp, Facebook, par SMS ou à l’école.</p>
            <div className="copybox">
              <code>{refLink}</code>
              <CopyButton value={refLink} />
            </div>
            <p style={{ marginBottom: 0 }}>
              <a className="btn go" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
                Envoyer sur WhatsApp
              </a>
            </p>
            <ul className="stats-line" aria-label="Vos chiffres">
              <li><strong>{filleuls.length}</strong> ami{filleuls.length > 1 ? 's' : ''} inscrit{filleuls.length > 1 ? 's' : ''}</li>
              <li><strong>{buyers}</strong> {buyers > 1 ? 'ont acheté' : 'a acheté'}</li>
              <li><strong>{fcfa(total)}</strong> à recevoir (estimation)</li>
            </ul>
          </section>
        )}

        <section>
          <h2>Comment ça marche, en 3 étapes</h2>
          <ol className="ref-steps">
            <li>
              <span className="ico"><Icon name="link" size={26} /></span>
              <h3>Vous copiez votre lien</h3>
              <p>Chaque compte a un lien personnel unique. {user ? 'Il est juste au-dessus.' : 'Créez un compte gratuit pour le recevoir.'}</p>
            </li>
            <li>
              <span className="ico"><Icon name="users" size={26} /></span>
              <h3>Votre ami s’inscrit avec ce lien</h3>
              <p>Il clique sur votre lien, puis crée son compte. C’est ce clic qui permet de savoir que c’est vous qui l’avez invité.</p>
            </li>
            <li>
              <span className="ico"><Icon name="coins" size={26} /></span>
              <h3>Il achète, vous gagnez 50 %</h3>
              <p>Quand votre ami paie une formation, nous vérifions l’achat et vous versons {REFERRAL_RATE_PERCENT} % du prix payé.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2>Combien vous gagnez, formation par formation</h2>
          <p className="muted">Calculé sur le prix affiché de chaque formation payante. Si votre ami bénéficie d’une promotion, la commission se calcule sur le prix qu’il a réellement payé.</p>
          <div className="ref-table-wrap">
            <table className="ref-table">
              <thead>
                <tr><th>Formation achetée par votre ami</th><th>Prix</th><th>Vous gagnez</th></tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{c.price_label}</td>
                    <td><strong>{fcfa(commissionFor(c.price_label))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Exemple : si votre ami achète deux formations, vous recevez 50 % du prix de chacune.</p>
        </section>

        <section>
          <h2>Les règles, simplement</h2>
          <ul className="ref-rules">
            <li><strong>La formation gratuite ne rapporte rien.</strong> Seuls les achats de formations payantes comptent.</li>
            <li><strong>Votre ami doit créer son compte avec votre lien.</strong> Un compte déjà créé avant ne peut pas être rattaché à vous après coup.</li>
            <li><strong>On ne se parraine pas soi-même.</strong> Un compte ouvert avec votre propre adresse e-mail ne compte pas.</li>
            <li><strong>La commission est due {REFERRAL_HOLD_DAYS} jours après l’achat</strong>, une fois le délai de remboursement de votre ami terminé. S’il est remboursé, la commission est annulée.</li>
            <li><strong>Versement minimum : {fcfa(REFERRAL_MIN_PAYOUT)}.</strong> En dessous, vos commissions s’additionnent jusqu’à atteindre ce montant.</li>
            <li><strong>Nous vérifions chaque achat</strong> avant de verser la commission. Elle est versée à la main par notre équipe : nous vous écrivons à l’adresse e-mail de votre compte pour convenir du moyen de paiement.</li>
            <li><strong>Pas d’astuce, pas de fausse promesse.</strong> N’affirmez pas à vos amis qu’ils vont « devenir riches ». Dites-leur la vérité : ce sont des formations pour apprendre et agir, sans revenu garanti.</li>
          </ul>
        </section>

        {user && (
          <section>
            <h2>Vos amis inscrits</h2>
            {filleuls.length === 0 ? (
              <div className="card soft">
                <p style={{ margin: 0 }}>Personne ne s’est encore inscrit avec votre lien. Envoyez-le à trois amis aujourd’hui : c’est le meilleur moyen de commencer.</p>
              </div>
            ) : (
              <div className="ref-table-wrap">
                <table className="ref-table">
                  <thead>
                    <tr><th>Ami</th><th>Inscrit le</th><th>Achats</th><th>Pour vous</th></tr>
                  </thead>
                  <tbody>
                    {filleuls.map((f) => {
                      const gain = f.achats.reduce((s, a) => s + (commissionFor(a.prix) || 0), 0);
                      return (
                        <tr key={f.id}>
                          <td>{f.name.split(' ')[0]}</td>
                          <td>{dateFr(f.referred_at)}</td>
                          <td>{f.achats.length === 0 ? <span className="muted">Pas encore</span> : f.achats.map((a) => a.titre).join(', ')}</td>
                          <td>{gain > 0 ? <><strong>{fcfa(gain)}</strong>{f.achats.some((a) => !isMature(a.date)) && <small className="muted"> (en attente)</small>}</> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="hint">Seul le prénom de vos amis est affiché. Les montants sont des estimations : le versement réel est confirmé par notre équipe.</p>
          </section>
        )}

        <section>
          <h2>Questions fréquentes</h2>
          <details className="faq">
            <summary>Combien de temps mon lien reste-t-il valable ?</summary>
            <p>Votre lien ne change pas. Une fois que votre ami a cliqué, son navigateur retient votre code pendant 30 jours : il doit créer son compte dans ce délai.</p>
          </details>
          <details className="faq">
            <summary>Mon ami s’est inscrit mais n’a pas acheté. Que se passe-t-il ?</summary>
            <p>Rien n’est perdu : il reste rattaché à vous. Si, plus tard, il achète une formation avec son compte, vous recevez votre commission.</p>
          </details>
          <details className="faq">
            <summary>Comment savoir qu’un ami a acheté ?</summary>
            <p>Il apparaît dans la liste « Vos amis inscrits » de cette page, avec la formation achetée et le montant estimé qui vous revient.</p>
          </details>
          <details className="faq">
            <summary>Comment suis-je payé ?</summary>
            <p>Nous vérifions l’achat, puis nous vous contactons par e-mail pour convenir du moyen de paiement. Pensez à garder une adresse e-mail valide sur votre compte.</p>
          </details>
          <details className="faq">
            <summary>Puis-je utiliser mon lien partout ?</summary>
            <p>Oui : WhatsApp, Facebook, SMS, discussion directe. Évitez d’envoyer des messages en masse à des inconnus : ça fait fuir et ça ne rapporte presque jamais.</p>
          </details>
        </section>

        {!user && (
          <section className="card gold center">
            <h2>Prêt à commencer ?</h2>
            <p>Créez un compte gratuit : votre lien personnel s’affiche tout de suite sur cette page.</p>
            <Link className="btn gold" href="/inscription?suite=/parrainage">Créer mon compte</Link>
          </section>
        )}
      </div>
    </main>
  );
}
