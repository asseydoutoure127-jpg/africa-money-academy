-- Validation d'un exercice par l'administrateur (avec un petit mot facultatif pour l'élève).
alter table lesson_exercises add column validated_at timestamptz;
alter table lesson_exercises add column validated_by uuid references users (id) on delete set null;
alter table lesson_exercises add column feedback text not null default '';
