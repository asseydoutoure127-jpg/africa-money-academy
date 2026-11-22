import { validateExercise } from '@/app/actions/admin.js';
import ConfirmButton from '@/components/ConfirmButton.jsx';

const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Bamako', day: 'numeric', month: 'short' });

// Décision sur un exercice : valider (note /10), demander une correction, refuser, ou annuler une décision.
// Le commentaire est obligatoire pour « demander une correction » et « refuser » (l'élève le reçoit).
export default function ValidateExercise({ userId, lessonId, status = 'pending', validatedAt, reviewedAt, feedback, grade, back }) {
  const key = `${userId}-${lessonId}`;
  const hidden = (
    <>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="back" value={back} />
    </>
  );
  const st = status === 'pending' && validatedAt ? 'validated' : status;
  if (st !== 'pending') {
    const label = { validated: `✓ Validé le ${fmt(validatedAt || reviewedAt)}${grade !== null && grade !== undefined ? ` · note ${grade}/10` : ''}`, needs_correction: `Correction demandée le ${fmt(reviewedAt)}`, refused: `Refusé le ${fmt(reviewedAt)}` }[st];
    const cls = { validated: 'ok', needs_correction: 'gold', refused: 'red' }[st];
    return (
      <form action={validateExercise} className={`validate ${st === 'validated' ? 'is-valid' : ''}`}>
        {hidden}
        <input type="hidden" name="decision" value="pending" />
        <p><span className={`badge ${cls}`}>{label}</span>{feedback ? <span className="muted"> Votre commentaire : « {feedback} »</span> : null}</p>
        <ConfirmButton className="btn ghost small" message={st === 'validated'
          ? 'Annuler la validation ? L’exercice repasse « en attente », la note est effacée et les points gagnés grâce à cette validation sont retirés à l’élève. Il en est prévenu par e-mail. L’action est notée dans le journal.'
          : 'Annuler cette décision ? L’exercice repasse « en attente ». L’élève en est prévenu par e-mail. L’action est notée dans le journal.'}>
          {st === 'validated' ? 'Annuler la validation' : 'Annuler cette décision'}
        </ConfirmButton>
      </form>
    );
  }
  return (
    <form action={validateExercise} className="validate decide">
      {hidden}
      <label htmlFor={`fb-${key}`} className="sr-only">Commentaire pour l’élève</label>
      <textarea id={`fb-${key}`} name="feedback" rows={2} maxLength={600} placeholder="Commentaire pour l’élève (obligatoire pour une correction ou un refus)" />
      <label htmlFor={`gr-${key}`} className="sr-only">Note sur 10</label>
      <select id={`gr-${key}`} name="grade" defaultValue="" className="grade-select">
        <option value="">Note /10 (pour valider)</option>
        {Array.from({ length: 11 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n} / 10</option>)}
      </select>
      <div className="decide-actions">
        <button className="btn small" type="submit" name="decision" value="validated">✓ Valider et noter</button>
        <button className="btn ghost small" type="submit" name="decision" value="needs_correction">Demander une correction</button>
        <button className="btn ghost small danger-text" type="submit" name="decision" value="refused">Refuser</button>
      </div>
    </form>
  );
}
