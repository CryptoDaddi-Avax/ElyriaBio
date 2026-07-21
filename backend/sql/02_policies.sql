-- =====================================================================
--  ELYRIA BIO  ·  SECURITY POLICIES  (Row Level Security)
--  Run this SECOND.  It decides who can read/write each table.
--
--  Rule of thumb:
--   * The PUBLIC website (anon key) may READ products/COAs and
--     may INSERT a notify signup or an order — nothing else.
--   * YOU, signed into the Supabase dashboard or the admin console
--     with a logged-in account (authenticated), may do everything.
-- =====================================================================

alter table products       enable row level security;
alter table notify_signups enable row level security;
alter table customers      enable row level security;
alter table discounts      enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table affiliates     enable row level security;
alter table coa_lots       enable row level security;

-- ---- PUBLIC READ (storefront needs stock, prices, COAs) ----
create policy "public read products" on products
  for select using (true);
create policy "public read coa"      on coa_lots
  for select using (true);
create policy "public read discounts" on discounts
  for select using (active = true);

-- ---- PUBLIC WRITE (only the two things a shopper submits) ----
create policy "public add notify signup" on notify_signups
  for insert with check (true);
create policy "public create order" on orders
  for insert with check (true);
create policy "public add order items" on order_items
  for insert with check (true);
create policy "public create customer" on customers
  for insert with check (true);

-- ---- ADMIN (any signed-in user) can do EVERYTHING ----
-- After you create your admin login (see SETUP.md step 6) you are
-- 'authenticated' and these grant full control from the console.
do $$
declare t text;
begin
  foreach t in array array['products','notify_signups','customers','discounts','orders','order_items','affiliates','coa_lots']
  loop
    execute format('create policy "admin all %1$s" on %1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
