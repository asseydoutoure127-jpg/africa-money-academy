import { notFound, redirect } from 'next/navigation';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { COUNTRIES } from '@/lib/countries.js';
import { startCheckout } from '@/app/actions/checkout.js';

export const metadata = { title: 'Acheter', robots: { index: false } };

export default async function Achat({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/achat/${slug}`);
  const db = getDb();
  const course = await store.getCourseBySlug(db, slug);
  if (!course || course.status !== 'published') notFound();
  if (course.is_free) redirect(`/formations/${slug}`);
  if (await store.hasActiveAccess(db, user.id, course.id)) redirect(`/espace/formation/${slug}?m=deja_acces`);
  if (course.purchase_mode !== 'api') redirect(`/formations/${slug}`);
  const [firstName, ...rest] = user.name.split(' ');

  return (
    <main>
      <div className="narrow">
        <h1>Acheter : {course.title}</h1>
        {course.price_label && <p style={{ fontSize: '1.3rem' }}><strong>{course.price_label}</strong></p>}
        <Flash code={sp.m} />
        <form action={startCheckout} className="card">
          <input type="hidden" name="slug" value={slug} />
          <label htmlFor="first_name">Prénom</label>
          <input id="first_name" name="first_name" type="text" defaultValue={firstName} autoComplete="given-name" required maxLength={50} />
          <label htmlFor="last_name">Nom</label>
          <input id="last_name" name="last_name" type="text" defaultValue={rest.join(' ')} autoComplete="family-name" required maxLength={50} />
          <label htmlFor="country">Pays</label>
          <select id="country" name="country" required defaultValue="">
            <option value="" disabled>
              Choisir mon pays
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} (+{c.dial})
              </option>
            ))}
          </select>
          <label htmlFor="phone">Numéro de téléphone (sans l’indicatif)</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required />
          <label htmlFor="discount_code">Code de réduction (facultatif)</label>
          <input id="discount_code" name="discount_code" type="text" autoComplete="off" maxLength={100} />
          <p className="hint">
            Le paiement se fait sur la page sécurisée de Chariow, avec l’adresse <strong>{user.email}</strong>. Votre accès s’ouvre automatiquement après le paiement.
          </p>
          <p style={{ marginTop: 18 }}>
            <button className="btn gold" type="submit">
              Payer maintenant
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
