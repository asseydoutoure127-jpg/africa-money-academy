import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import { requireUser } from '@/lib/auth.js';
import { updateProfile, changePassword, deleteAccount, logout } from '@/app/actions/auth.js';

export const metadata = { title: 'Mon profil' };

export default async function Profil({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace/profil');
  return (
    <main>
      <div className="narrow">
        <p>
          <Link href="/espace">← Mon espace</Link>
        </p>
        <h1>Mon profil</h1>
        <Flash code={sp.m} />
        <form action={updateProfile} className="card">
          <label htmlFor="name">Prénom et nom</label>
          <input id="name" name="name" type="text" defaultValue={user.name} required minLength={2} maxLength={100} />
          <label>Adresse e-mail</label>
          <p style={{ margin: '4px 0' }}>
            {user.email} {user.email_verified_at ? <span className="badge">Confirmée</span> : <span className="badge red">À confirmer</span>}
          </p>
          <p style={{ marginTop: 16 }}>
            <button className="btn" type="submit">
              Enregistrer
            </button>
          </p>
        </form>
        <h2 style={{ marginTop: 28 }}>Changer le mot de passe</h2>
        <form action={changePassword} className="card">
          <label htmlFor="current">Mot de passe actuel</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required />
          <label htmlFor="password">Nouveau mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          <label htmlFor="confirm">Répétez le nouveau mot de passe</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
          <p style={{ marginTop: 16 }}>
            <button className="btn" type="submit">
              Changer le mot de passe
            </button>
          </p>
        </form>
        <form action={logout} style={{ marginTop: 28 }}>
          <button className="btn ghost" type="submit">
            Me déconnecter
          </button>
        </form>
        <details style={{ marginTop: 28 }}>
          <summary>Supprimer mon compte</summary>
          <form action={deleteAccount} className="card">
            <p>Cette action est définitive : votre compte, votre progression et vos accès seront effacés.</p>
            <label htmlFor="confirmation">Écrivez SUPPRIMER pour confirmer</label>
            <input id="confirmation" name="confirmation" type="text" autoComplete="off" required />
            <label htmlFor="pw">Votre mot de passe</label>
            <input id="pw" name="password" type="password" autoComplete="current-password" required />
            <p style={{ marginTop: 16 }}>
              <button className="btn danger" type="submit">
                Supprimer définitivement
              </button>
            </p>
          </form>
        </details>
      </div>
    </main>
  );
}
