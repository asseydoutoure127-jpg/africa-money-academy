-- Correction des exercices : statuts (refusé, correction demandée) et historique des tentatives.
-- Additif seulement : aucune donnée supprimée ou modifiée, sauf l'ajout du statut calculé à partir de validated_at.
alter table lesson_exercises add column status text not null default 'pending'
  check (status in ('pending', 'validated', 'refused', 'needs_correction'));
update lesson_exercises set status = 'validated' where validated_at is not null;
alter table lesson_exercises add column reviewed_at timestamptz;
alter table lesson_exercises add column reviewed_by uuid references users (id) on delete set null;
update lesson_exercises set reviewed_at = validated_at, reviewed_by = validated_by where validated_at is not null;

create table exercise_attempts (
  id           bigserial primary key,
  user_id      uuid not null references users (id) on delete cascade,
  lesson_id    uuid not null references lessons (id) on delete cascade,
  answer       text not null,
  submitted_at timestamptz not null default now()
);
create index exercise_attempts_idx on exercise_attempts (user_id, lesson_id, submitted_at desc);
insert into exercise_attempts (user_id, lesson_id, answer, submitted_at)
  select user_id, lesson_id, answer, submitted_at from lesson_exercises;
