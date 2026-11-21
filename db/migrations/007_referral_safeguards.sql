-- Parrainage : empreinte d'inscription (pour repérer l'auto-parrainage) et registre des versements faits à la main.
alter table users add column if not exists signup_fp text;
create index if not exists users_signup_fp_idx on users (signup_fp) where signup_fp is not null;

create table if not exists referral_payouts (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references users (id) on delete cascade,
  amount      integer not null check (amount > 0),
  note        text not null default '',
  paid_at     timestamptz not null default now(),
  paid_by     uuid references users (id) on delete set null
);
create index if not exists referral_payouts_referrer_idx on referral_payouts (referrer_id);
