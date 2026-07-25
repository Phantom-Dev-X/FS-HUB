-- FS HUB DATABASE REPAIR / SCHEMA ALIGNMENT
-- Run this entire file once in Supabase Dashboard > SQL Editor.
-- It is safe to re-run: all schema changes use IF NOT EXISTS.
--
-- NOTE: This configuration allows the public anon key to access these tables.
-- It is suitable for the current prototype, but production should use
-- Supabase Auth and restrictive Row Level Security policies.

begin;

-- Representatives
create table if not exists public.fshub_reps (
  id text primary key,
  name text not null,
  email text unique not null,
  zone text,
  territory text,
  status text,
  coordinate jsonb,
  sales_volume text,
  initials text,
  avatar text,
  password text,
  full_name text,
  email_verified boolean default false,
  created_at timestamptz default now()
);
alter table public.fshub_reps add column if not exists password text;
alter table public.fshub_reps add column if not exists full_name text;
alter table public.fshub_reps add column if not exists email_verified boolean default false;
alter table public.fshub_reps add column if not exists sales_volume text;
alter table public.fshub_reps add column if not exists auth_user_id uuid;

-- Clients
create table if not exists public.fshub_clients (
  id text primary key,
  name text not null,
  address text not null,
  owner_contact text,
  credit_limit text default '₦500,000',
  gps_coordinates text,
  registered_email text,
  rep_id text,
  created_by_rep_id text,
  business_type text,
  phone text,
  standing text,
  created_at timestamptz default now()
);
alter table public.fshub_clients add column if not exists rep_id text;
alter table public.fshub_clients add column if not exists created_by_rep_id text;
alter table public.fshub_clients add column if not exists business_type text;
alter table public.fshub_clients add column if not exists phone text;
alter table public.fshub_clients add column if not exists standing text;
alter table public.fshub_clients add column if not exists latitude double precision;
alter table public.fshub_clients add column if not exists longitude double precision;
alter table public.fshub_clients add column if not exists location_accuracy_m double precision;
alter table public.fshub_clients add column if not exists location_method text;
alter table public.fshub_clients add column if not exists location_captured_at timestamptz;
alter table public.fshub_clients add column if not exists storefront_photo_path text;

-- Permanent audit trail for real check-ins and their uploaded photos.
create table if not exists public.fshub_checkins (
  id text primary key,
  client_id text not null,
  rep_id text not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision,
  photo_path text,
  checked_in_at timestamptz default now(),
  verification_status text default 'captured'
);

-- Catalog
create table if not exists public.fshub_catalog (
  id text primary key,
  name text not null,
  category text not null,
  unit_price numeric not null default 0,
  warehouse_stock integer not null default 0,
  barcode text,
  status text,
  created_at timestamptz default now()
);
alter table public.fshub_catalog add column if not exists unit_price numeric not null default 0;
alter table public.fshub_catalog add column if not exists warehouse_stock integer not null default 0;
alter table public.fshub_catalog add column if not exists barcode text;
alter table public.fshub_catalog add column if not exists status text;
alter table public.fshub_catalog add column if not exists created_at timestamptz default now();

-- Orders
create table if not exists public.fshub_orders (
  invoice_number text primary key,
  store_name text,
  rep_id text not null,
  payable_total numeric not null,
  order_items jsonb not null,
  geotag_lat_lon text,
  created_at timestamptz default now()
);

-- Admins
create table if not exists public.fshub_admins (
  id text primary key,
  name text not null,
  email text unique not null,
  role text,
  is_primary boolean default false,
  is_super boolean default false,
  password text,
  created_at timestamptz default now()
);
alter table public.fshub_admins add column if not exists password text;
alter table public.fshub_admins add column if not exists auth_user_id uuid;

-- The current app calls PostgREST directly with the anon key. Explicit grants
-- are required in addition to disabling RLS.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.fshub_reps to anon, authenticated;
grant select, insert, update, delete on table public.fshub_clients to anon, authenticated;
grant select, insert, update, delete on table public.fshub_catalog to anon, authenticated;
grant select, insert, update, delete on table public.fshub_orders to anon, authenticated;
grant select, insert, update, delete on table public.fshub_admins to anon, authenticated;
grant select, insert, update, delete on table public.fshub_checkins to anon, authenticated;

-- Private media bucket. The database stores paths; image bytes belong in Storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fshub-media', 'fshub-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "FS Hub media insert" on storage.objects;
create policy "FS Hub media insert" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'fshub-media');
drop policy if exists "FS Hub media update" on storage.objects;
create policy "FS Hub media update" on storage.objects for update to anon, authenticated
using (bucket_id = 'fshub-media') with check (bucket_id = 'fshub-media');
drop policy if exists "FS Hub media read" on storage.objects;
create policy "FS Hub media read" on storage.objects for select to anon, authenticated
using (bucket_id = 'fshub-media');

-- Prototype access model. Replace this with proper RLS policies before launch.
alter table public.fshub_reps disable row level security;
alter table public.fshub_clients disable row level security;
alter table public.fshub_catalog disable row level security;
alter table public.fshub_orders disable row level security;
alter table public.fshub_admins disable row level security;
alter table public.fshub_checkins disable row level security;

insert into public.fshub_admins (id, name, email, role, is_primary, is_super, password)
values ('ADM-001', 'Peter Patrick', 'peterpatrick@gmail.com', 'Primary Super Admin', true, true, 'fshubadmin')
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  is_primary = true,
  is_super = true,
  password = coalesce(public.fshub_admins.password, excluded.password);

commit;

-- Ask PostgREST to immediately reload the changed schema.
notify pgrst, 'reload schema';

-- The result grid should show five rows and can_access = true for each table.
select
  table_name,
  (xpath('/row/c/text()', query_to_xml(
    format('select count(*) as c from public.%I', table_name),
    false, true, ''
  )))[1]::text::bigint as row_count,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT,INSERT') as anon_can_access
from (values
  ('fshub_reps'),
  ('fshub_clients'),
  ('fshub_catalog'),
  ('fshub_orders'),
  ('fshub_admins')
) as tables(table_name);
