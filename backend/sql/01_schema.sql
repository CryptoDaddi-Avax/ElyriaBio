-- =====================================================================
--  ELYRIA BIO  ·  DATABASE SCHEMA  (Supabase / PostgreSQL)
--  Run this FIRST in Supabase → SQL Editor → New query → Run.
--  Safe to re-run: every table uses "create table if not exists".
-- =====================================================================

-- ---------- PRODUCTS & INVENTORY ------------------------------------
create table if not exists products (
  id          text primary key,            -- e.g. 'bpc157', 'motsc'
  slug        text unique not null,         -- e.g. 'bpc-157'  (matches the .html file name)
  name        text not null,
  category    text not null default 'other',
  cas         text,
  size        text,                         -- '10 mg'
  price       numeric(10,2) not null default 0,
  cost        numeric(10,2) not null default 0,
  purity      text,
  stock       integer not null default 0,   -- units on hand  (THE number you edit)
  reorder     integer not null default 0,   -- alert threshold
  badge       text default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- "NOTIFY ME WHEN IN STOCK" SIGNUPS ----------------------
create table if not exists notify_signups (
  id          bigint generated always as identity primary key,
  product_id  text references products(id) on delete cascade,
  name        text,
  email       text not null,
  notified    boolean not null default false,  -- flip true after you email them
  created_at  timestamptz not null default now()
);
create index if not exists notify_signups_product_idx on notify_signups(product_id);

-- ---------- CUSTOMERS ----------------------------------------------
create table if not exists customers (
  id          bigint generated always as identity primary key,
  name        text,
  email       text unique not null,
  institution text,
  country     text,
  region      text,
  created_at  timestamptz not null default now()
);

-- ---------- DISCOUNT CODES -----------------------------------------
create table if not exists discounts (
  code        text primary key,
  kind        text not null default 'percent',  -- 'percent' | 'fixed'
  amount      numeric(10,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- ORDERS + LINE ITEMS ------------------------------------
create table if not exists orders (
  id           text primary key,             -- e.g. 'EB-100234'
  customer_id  bigint references customers(id) on delete set null,
  email        text,
  status       text not null default 'pending', -- pending|paid|shipped|delivered|cancelled|refunded
  subtotal     numeric(10,2) not null default 0,
  shipping     numeric(10,2) not null default 0,
  discount_code text references discounts(code) on delete set null,
  total        numeric(10,2) not null default 0,
  created_at   timestamptz not null default now()
);
create table if not exists order_items (
  id          bigint generated always as identity primary key,
  order_id    text references orders(id) on delete cascade,
  product_id  text references products(id) on delete set null,
  name        text,
  qty         integer not null default 1,
  price       numeric(10,2) not null default 0
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ---------- AFFILIATES ---------------------------------------------
create table if not exists affiliates (
  id          text primary key,
  name        text,
  email       text,
  status      text not null default 'active', -- active|paused|suspended
  tier        text default 'standard',
  balance     numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- COA / LOT RECORDS --------------------------------------
create table if not exists coa_lots (
  lot         text primary key,             -- 'LMB-26B-157'
  product_id  text references products(id) on delete cascade,
  purity      text,
  identity    text default 'Confirmed (ESI-MS)',
  endotoxin   text,
  assay_date  date,
  retest_date date,
  pdf_url     text,
  created_at  timestamptz not null default now()
);
create index if not exists coa_lots_product_idx on coa_lots(product_id);

-- ---------- keep updated_at fresh on products ----------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists products_touch on products;
create trigger products_touch before update on products
  for each row execute function touch_updated_at();
