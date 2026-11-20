-- Notes sur 10, points de classement, pièces de boutique, boutique, tableau d'honneur.

alter table lesson_exercises add column grade smallint check (grade between 0 and 10);
alter table users add column rank_hidden boolean not null default false;

-- Journal des gains. `points` : classement du mois. `coins` : pièces dépensables dans la boutique.
-- (user_id, kind, ref) est unique : une même action ne rapporte jamais deux fois.
create table point_events (
  id         bigserial primary key,
  user_id    uuid not null references users (id) on delete cascade,
  kind       text not null,
  ref        text not null default '',
  points     integer not null default 0,
  coins      integer not null default 0,
  period     char(7) not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index point_events_period_idx on point_events (period, user_id);

-- Temps de lecture actif par jour (une impulsion d'une minute maximum toutes les ~50 secondes).
create table reading_days (
  user_id   uuid not null references users (id) on delete cascade,
  day       date not null,
  seconds   integer not null default 0,
  last_ping timestamptz not null default now(),
  primary key (user_id, day)
);

create table shop_items (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  price_coins integer not null check (price_coins > 0),
  stock       integer check (stock is null or stock >= 0),
  active      boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table shop_orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  item_id     uuid references shop_items (id) on delete set null,
  item_title  text not null,
  price_coins integer not null,
  status      text not null default 'pending' check (status in ('pending', 'delivered', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index shop_orders_user_idx on shop_orders (user_id, created_at desc);

-- Tableau d'honneur : gagnants des mois clôturés.
create table honor_board (
  id           bigserial primary key,
  period       char(7) not null,
  rank         smallint not null,
  user_id      uuid references users (id) on delete set null,
  display_name text not null,
  points       integer not null,
  prize        text not null default '',
  created_at   timestamptz not null default now(),
  unique (period, rank)
);
