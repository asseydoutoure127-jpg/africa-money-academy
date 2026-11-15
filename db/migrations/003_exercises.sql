-- Exercices : consigne attachée à la leçon + réponse de chaque apprenant.
alter table lessons add column exercise text not null default '';

create table lesson_exercises (
  user_id      uuid not null references users (id) on delete cascade,
  lesson_id    uuid not null references lessons (id) on delete cascade,
  answer       text not null,
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_exercises_lesson_idx on lesson_exercises (lesson_id, submitted_at desc);
