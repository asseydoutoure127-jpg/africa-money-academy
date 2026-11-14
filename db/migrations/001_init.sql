-- Africa Money Academy : schéma initial.
-- Appliqué automatiquement par `npm run migrate` (et à chaque déploiement Vercel).

create table users (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  name              text not null,
  password_hash     text not null,
  role              text not null default 'learner'
                    check (role in ('learner', 'admin', 'corrector')),
  email_verified_at timestamptz,
  blocked_at        timestamptz,
  created_at        timestamptz not null default now()
);
-- Un e-mail = un compte, sans tenir compte des majuscules.
create unique index users_email_lower_idx on users (lower(email));

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  user_agent  text
);
create index sessions_user_idx on sessions (user_id);

-- Jetons à usage unique : confirmation d'adresse et mot de passe oublié.
create table email_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  kind        text not null check (kind in ('verify', 'reset')),
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Limitation de débit (connexion, vérification d'achat, etc.).
create table rate_limits (
  key        text not null,
  bucket     timestamptz not null,
  count      integer not null default 0,
  primary key (key, bucket)
);

create table courses (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title               text not null,
  summary             text not null default '',
  description         text not null default '',
  objectives          text not null default '',
  audience            text not null default '',
  prerequisites       text not null default '',
  faq                 text not null default '',
  image_url           text,
  level               text not null default 'debutant'
                      check (level in ('debutant', 'intermediaire', 'avance')),
  duration_label      text not null default '',
  price_label         text not null default '',
  status              text not null default 'draft'
                      check (status in ('draft', 'published', 'hidden')),
  is_free             boolean not null default false,
  -- Ce que l'admin a saisi (prd_... ou slug) et l'identifiant prd_... résolu
  -- via l'API : le Pulse envoie toujours l'identifiant prd_.
  chariow_product_ref text,
  chariow_product_id  text,
  chariow_product_url text,
  purchase_mode       text not null default 'api'
                      check (purchase_mode in ('api', 'link')),
  certificate_enabled boolean not null default false,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- Une formation payante ne peut pas être publiée sans produit Chariow vérifié.
  constraint published_paid_needs_product
    check (status <> 'published' or is_free or chariow_product_id is not null)
);
create index courses_product_idx on courses (chariow_product_id);

create table modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses (id) on delete cascade,
  title       text not null,
  description text not null default '',
  position    integer not null default 0
);
create index modules_course_idx on modules (course_id, position);

create table lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references modules (id) on delete cascade,
  title        text not null,
  content      text not null default '',
  duration_min integer not null default 0,
  position     integer not null default 0
);
create index lessons_module_idx on lessons (module_id, position);

create table lesson_progress (
  user_id      uuid not null references users (id) on delete cascade,
  lesson_id    uuid not null references lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Accès d'un apprenant à une formation.
create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users (id) on delete cascade,
  course_id        uuid not null references courses (id) on delete cascade,
  status           text not null default 'active'
                   check (status in ('active', 'revoked')),
  source           text not null
                   check (source in ('pulse', 'reconciliation', 'manual', 'free')),
  chariow_sale_id  text,
  granted_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  revoke_reason    text,
  granted_by       uuid references users (id) on delete set null,
  -- Dernière fois où on a demandé à Chariow si la vente a été remboursée
  -- (champ `is_access_revoked` de l'API Sales).
  chariow_checked_at timestamptz,
  unique (user_id, course_id)
);
create index enrollments_course_idx on enrollments (course_id);

-- Achat reçu pour une adresse qui n'a pas (encore) de compte vérifié.
create table pending_purchases (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  course_id        uuid not null references courses (id) on delete cascade,
  chariow_sale_id  text not null unique,
  customer_name    text,
  source           text not null default 'pulse',
  created_at       timestamptz not null default now(),
  claimed_at       timestamptz,
  claimed_user_id  uuid references users (id) on delete set null
);
create index pending_purchases_email_idx on pending_purchases (lower(email)) where claimed_at is null;

-- Journal de chaque livraison de Pulse (signée et authentique uniquement).
create table pulse_deliveries (
  id            bigserial primary key,
  delivery_id   text not null unique,
  pulse_id      text,
  event         text not null,
  status        text not null default 'received'
                check (status in ('received', 'processing', 'done', 'failed', 'ignored')),
  result        text,
  error         text,
  attempts      integer not null default 0,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);
create index pulse_deliveries_status_idx on pulse_deliveries (status, received_at);

-- Requêtes refusées (signature absente ou invalide) : jamais d'accès, juste un journal.
create table webhook_rejections (
  id           bigserial primary key,
  reason       text not null,
  pulse_id     text,
  received_at  timestamptz not null default now()
);

-- Réglages modifiables depuis l'admin. Les secrets sont chiffrés (AES-256-GCM).
create table settings (
  key         text primary key,
  value       text not null,
  encrypted   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references users (id) on delete set null
);

-- Un secret de signature par Pulse (chacun a le sien).
create table pulse_secrets (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  pulse_id    text,
  secret_enc  text not null,
  created_at  timestamptz not null default now()
);

create table admin_log (
  id          bigserial primary key,
  admin_id    uuid references users (id) on delete set null,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- Alertes visibles dans le tableau de bord admin.
create table alerts (
  id           bigserial primary key,
  kind         text not null,
  message      text not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
create index alerts_open_idx on alerts (kind) where resolved_at is null;

create table site_pages (
  slug        text primary key,
  title       text not null,
  body        text not null default '',
  updated_at  timestamptz not null default now()
);
