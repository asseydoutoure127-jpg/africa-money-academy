-- Parrainage : chaque compte a un code personnel ; on mémorise qui a amené qui.
alter table users
  add column referral_code text,
  add column referred_by   uuid references users (id) on delete set null,
  add column referred_at   timestamptz;

create unique index users_referral_code_idx on users (referral_code) where referral_code is not null;
create index users_referred_by_idx on users (referred_by) where referred_by is not null;
