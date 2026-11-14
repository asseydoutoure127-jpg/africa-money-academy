import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db.js';
import * as store from '@/lib/store.js';
import { createFirstAdmin } from '@/app/actions/setup.js';

export const metadata = { title: 'Installation', robots: { index: false, follow: false } };

const ERR = {
  config: 'La variable SETUP_TOKEN n’est pas définie (16 caractères minimum) dans Vercel.',
  deja: 'Un administrateur existe déjà.',
  essais: 'Trop d’essais. Patientez quelques minutes.',
  jeton: 'Code d’installation incorrect.',
  champs: 'Vérifiez le nom, l’e-mail (non déjà utilisé) et le mot de passe (8 caractères minimum).',
};

export default async function Setup({ searchParams }) {
  const sp = await searchParams;
  if ((await store.countAdmins(getDb())) > 0 && sp.e !== 'deja') notFound();
  return (
    <main>
      <div className="narrow">
        <h1>Créer l’administrateur</h1>
        {sp.e && <p className="flash err" role="alert">{ERR[sp.e] || 'Erreur.'}</p>}
        <form action={createFirstAdmin} className="card">
          <label htmlFor="token">Code d’installation (SETUP_TOKEN)</label><input id="token" name="token" type="password" autoComplete="off" required />
          <label htmlFor="name">Votre nom</label><input id="name" name="name" type="text" required minLength={2} />
          <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required />
          <label htmlFor="password">Mot de passe (8 caractères minimum)</label><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <p style={{ marginTop: 16 }}><button className="btn" type="submit">Créer mon compte administrateur</button></p>
        </form>
      </div>
    </main>
  );
}
