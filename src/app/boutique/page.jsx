import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import ConfirmButton from '@/components/ConfirmButton.jsx';
import { getCurrentUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import { coinBalance, listShopItems, touchDaily, safe } from '@/lib/points.js';
import { buyShopItem } from '@/app/actions/points.js';

export const metadata = { title: 'Boutique', description: 'Échangez vos pièces contre des articles.' };

export default async function Boutique({ searchParams }) {
  const sp = await searchParams;
  const db = getDb();
  const user = await getCurrentUser();
  if (user) await safe(() => touchDaily(db, user.id));
  const items = await listShopItems(db);
  const balance = user ? await coinBalance(db, user.id) : null;
  return (
    <main>
      <div className="wrap" style={{ maxWidth: 960 }}>
        <h1>Boutique</h1>
        <Flash code={sp.m} />
        <p className="lead">Chaque point que vous gagnez en apprenant vous rapporte aussi une pièce. Les pièces s’accumulent, elles ne sont jamais remises à zéro, et vous les échangez ici.</p>
        {user ? (
          <p className="coin-balance wallet"><span>Vos pièces</span><strong>{balance}</strong></p>
        ) : (
          <p><Link className="btn gold" href="/inscription">Créer un compte pour gagner des pièces</Link></p>
        )}
        {items.length === 0 ? (
          <section className="card soft">
            <h2 style={{ marginTop: 0 }}>La boutique ouvre bientôt</h2>
            <p>Les premiers articles arrivent. En attendant, vos pièces s’accumulent déjà quand vous apprenez, donc continuez : elles vous attendent.</p>
            <p><Link href="/classement">Voir le classement du mois</Link></p>
          </section>
        ) : (
          <div className="shop-grid">
            {items.map((it) => {
              const out = it.stock !== null && it.stock <= 0;
              return (
                <article className="card shop-item" key={it.id}>
                  <h2>{it.title}</h2>
                  {it.description && <p>{it.description}</p>}
                  <p className="price"><strong>{it.price_coins}</strong> pièces{it.stock !== null && !out ? ` · ${it.stock} restant${it.stock > 1 ? 's' : ''}` : ''}</p>
                  {user ? (
                    out ? <span className="badge grey">Épuisé</span> : (
                      <form action={buyShopItem}>
                        <input type="hidden" name="itemId" value={it.id} />
                        <ConfirmButton className="btn gold small" message={`Acheter « ${it.title} » pour ${it.price_coins} pièces ?`}>Acheter</ConfirmButton>
                      </form>
                    )
                  ) : <Link className="btn small" href="/connexion?suite=%2Fboutique">Se connecter pour acheter</Link>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
