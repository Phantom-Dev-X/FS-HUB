-- FS HUB SUPABASE FIX FOR 404 ERROR ON NEW ACCOUNT CREATION
-- You saw Status 404 when creating new account because fshub_reps table doesn't exist yet
-- Run this entire SQL inside Supabase SQL Editor: https://supabase.com/dashboard/project/evcbqsgznbrzojjbtnfd/sql

-- 1. REPS TABLE (Fixes 404 on signup)
CREATE TABLE IF NOT EXISTS fshub_reps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  zone TEXT,
  territory TEXT,
  status TEXT DEFAULT '🟢 Active in Field',
  coordinate JSONB,
  sales_volume TEXT,
  initials TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS fshub_clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  owner_contact TEXT,
  credit_limit TEXT DEFAULT '₦500,000',
  gps_coordinates TEXT,
  registered_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. CATALOG TABLE
CREATE TABLE IF NOT EXISTS fshub_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  warehouse_stock INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  image_path TEXT,
  product_photo_path TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE fshub_catalog ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE fshub_catalog ADD COLUMN IF NOT EXISTS product_photo_path TEXT;

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS fshub_orders (
  invoice_number TEXT PRIMARY KEY,
  store_name TEXT,
  rep_id TEXT NOT NULL,
  payable_total NUMERIC NOT NULL,
  order_items JSONB NOT NULL,
  geotag_lat_lon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS rep_id TEXT;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS payable_total NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS order_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Dispatch ⏳';
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS geotag_lat_lon TEXT;
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- 5. ADMINS TABLE (Optional, for future admin management)
CREATE TABLE IF NOT EXISTS fshub_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_super BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security OFF for anon key (simple for demo) - OR create policies
-- For quick fix to allow anon insert/select:
ALTER TABLE fshub_reps DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_admins DISABLE ROW LEVEL SECURITY;

-- If you have RLS enabled, instead use these policies:
-- CREATE POLICY "Allow all for anon" ON fshub_reps FOR ALL USING (true) WITH CHECK (true);
-- etc.

-- Messages + notifications tables
CREATE TABLE IF NOT EXISTS fshub_admin_messages (
  id TEXT PRIMARY KEY,
  rep_id TEXT,
  rep_name TEXT,
  type TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  related_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
CREATE TABLE IF NOT EXISTS fshub_rep_notifications (
  id TEXT PRIMARY KEY,
  rep_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'admin_reply',
  related_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fshub_admin_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fshub_rep_notifications TO anon, authenticated;
ALTER TABLE fshub_admin_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_rep_notifications DISABLE ROW LEVEL SECURITY;

-- Insert primary admin if not exists
ALTER TABLE fshub_admins ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE fshub_admins ADD COLUMN IF NOT EXISTS auth_user_id UUID;

INSERT INTO fshub_admins (id, name, email, role, is_primary, is_super, password)
VALUES ('ADM-001', 'Peter Patrick', 'peterpatrick@gmail.com', '👑 PRIMARY SUPER ADMIN', true, true, 'fshubadmin')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_primary = true,
  is_super = true,
  password = COALESCE(fshub_admins.password, EXCLUDED.password);

-- Success message
SELECT 'All FS HUB tables created successfully! 404 should be gone.' as status;
