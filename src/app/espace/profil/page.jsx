import Link from 'next/link';
import Flash from '@/components/Flash.jsx';
import Icon from '@/components/Icon.jsx';
import { requireUser } from '@/lib/auth.js';
import { updateProfile, changePassword, deleteAccount, logout } from '@/app/actions/auth.js';

export const metadata = { title: 'Mon profil' };

export default async function Profil({ searchParams }) {
  const sp = await searchParams;
  const user = await requireUser('/espace/profil');
  const nameErr = sp.m === 'nom_invalide';
  const pwErr = ['mdp_actuel', 'mdp_court', 'mdp_different'].includes(sp.m);
  const delErr = ['suppression_confirmation', 'dernier_admin'].includes(sp.m);
  return (
    <main>
      <div className="narrow">
        <Flash code={sp.m} />
        <section className="profile-head">
          <span className="avatar-lg big" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>
          <h1>{user.name}</h1>
          <p className="muted">
            {user.email} {user.email_verified_at ? <span className="badge">Confirmée</span> : <span className="badge red">À confirmer</span>}
          </p>
        </section>

        <div className="settings">
          <details open={nameErr}>
            <summary><span className="ic"><Icon name="user" size={20} /></span><span>Modifier mon nom</span></summary>
            <form action={updateProfile}>
              <label htmlFor="name">Prénom et nom</label>
              <input id="name" name="name" type="text" defaultValue={user.name} required minLength={2} maxLength={100} />
              <p><button className="btn go" type="submit">Enregistrer le nom</button></p>
            </form>
          </details>
          <details open={pwErr}>
            <summary><span className="ic"><Icon name="lock" size={20} /></span><span>Changer le mot de passe</span></summary>
            <form action={changePassword}>
              <label htmlFor="current">Mot de passe actuel</label>
              <input id="current" name="current" type="password" autoComplete="current-password" required />
              <label htmlFor="password">Nouveau mot de passe</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
              <label htmlFor="confirm">Répétez le nouveau mot de passe</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
              <p><button className="btn go" type="submit">Changer le mot de passe</button></p>
            </form>
          </details>
          <Link href="/classement/reglement" className="srow"><span className="ic"><Icon name="trophy" size={20} /></span><span>Règlement du classement</span></Link>
          <Link href="/parrainage" className="srow"><span className="ic"><Icon name="gift" size={20} /></span><span>Mon lien de parrainage</span></Link>
        </div>

        <form action={logout} style={{ marginTop: 22 }}>
          <button className="btn ghost pill block" type="submit">Me déconnecter</button>
        </form>
        <details className="danger-zone" open={delErr}>
          <summary>Supprimer mon compte</summary>
          <form action={deleteAccount}>
            <p>Cette action est définitive : votre compte, votre progression et vos accès seront effacés.</p>
            <label htmlFor="confirmation">Écrivez SUPPRIMER pour confirmer</label>
            <input id="confirmation" name="confirmation" type="text" autoComplete="off" required />
            <label htmlFor="pw">Votre mot de passe</label>
            <input id="pw" name="password" type="password" autoComplete="current-password" required />
            <p><button className="btn danger pill" type="submit">Supprimer définitivement</button></p>
          </form>
        </details>
      </div>
    </main>
  );
}
