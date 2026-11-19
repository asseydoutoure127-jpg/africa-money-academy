import { validateExercise } from '@/app/actions/admin.js';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' });

// Bouton « Valider l'exercice » (avec mot facultatif pour l'élève) ou « Annuler la validation ».
export default function ValidateExercise({ userId, lessonId, validatedAt, feedback, back }) {
  return (
    <form action={validateExercise} className={`validate ${validatedAt ? 'is-valid' : ''}`}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="back" value={back} />
      {validatedAt ? (
        <>
          <p><span className="badge ok">✓ Validé le {fmt(validatedAt)}</span>{feedback ? <span className="muted"> Votre mot : « {feedback} »</span> : null}</p>
          <input type="hidden" name="validated" value="0" />
          <button className="btn ghost small" type="submit">Annuler la validation</button>
        </>
      ) : (
        <>
          <input type="hidden" name="validated" value="1" />
          <label htmlFor={`fb-${userId}-${lessonId}`} className="sr-only">Petit mot pour l’élève (facultatif)</label>
          <input id={`fb-${userId}-${lessonId}`} name="feedback" type="text" maxLength={600} placeholder="Petit mot pour l’élève (facultatif)" />
          <button className="btn small" type="submit">✓ Valider l’exercice</button>
        </>
      )}
    </form>
  );
}
