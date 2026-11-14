import Flash from '@/components/Flash.jsx';
import { forgotPassword } from '@/app/actions/auth.js';

export const metadata = { title: 'Mot de passe oublié' };

export default async function Forgot({ searchParams }) {
  const sp = await searchParams;
  return (
    <main>
      <div className="narrow">
        <h1>Mot de passe oublié</h1>
        <Flash code={sp.m} />
        <form action={forgotPassword} className="card">
          <label htmlFor="email">Votre adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          <p style={{ marginTop: 18 }}>
            <button className="btn" type="submit">
              Recevoir le lien
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
