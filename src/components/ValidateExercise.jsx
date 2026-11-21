import { validateExercise } from '@/app/actions/admin.js';
import ConfirmButton from '@/components/ConfirmButton.jsx';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' });

// Bouton « Valider l'exercice » avec une note sur 10 (obligatoire) et un petit mot facultatif.
export default function ValidateExercise({ userId, lessonId, validatedAt, feedback, grade, back }) {
  const key = `${userId}-${lessonId}`;
  return (
    <form action={validateExercise} className={`validate ${validatedAt ? 'is-valid' : ''}`}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="back" value={back} />
      {validatedAt ? (
        <>
          <p><span className="badge ok">✓ Validé le {fmt(validatedAt)}{grade !== null && grade !== undefined ? ` · note ${grade}/10` : ''}</span>{feedback ? <span className="muted"> Votre mot : « {feedback} »</span> : null}</p>
          <input type="hidden" name="validated" value="0" />
          <ConfirmButton className="btn ghost small" message="Annuler la validation ? L’exercice repasse « à corriger », la note est effacée et les points gagnés grâce à cette validation sont retirés à l’élève. L’action est notée dans le journal.">Annuler la validation</ConfirmButton>
        </>
      ) : (
        <>
          <input type="hidden" name="validated" value="1" />
          <label htmlFor={`gr-${key}`} className="sr-only">Note sur 10</label>
          <select id={`gr-${key}`} name="grade" required defaultValue="" className="grade-select">
            <option value="" disabled>Note /10</option>
            {Array.from({ length: 11 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n} / 10</option>)}
          </select>
          <label htmlFor={`fb-${key}`} className="sr-only">Petit mot pour l’élève (facultatif)</label>
          <input id={`fb-${key}`} name="feedback" type="text" maxLength={600} placeholder="Petit mot pour l’élève (facultatif)" />
          <button className="btn small" type="submit">✓ Valider et noter</button>
        </>
      )}
    </form>
  );
}
