-- FIX FOR ADMIN NOT UPDATING & 0 REPS - ADD MISSING COLUMNS
-- Run this inside Supabase SQL Editor: https://supabase.com/dashboard/project/evcbqsgznbrzojjbtnfd/sql

-- 1. fshub_reps missing password column (causes signup fail + 0 reps)
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 2. fshub_clients missing rep_id columns for big company filtering (reps see only own)
ALTER TABLE fshub_clients ADD COLUMN IF NOT EXISTS rep_id TEXT;
ALTER TABLE fshub_clients ADD COLUMN IF NOT EXISTS created_by_rep_id TEXT;
ALTER TABLE fshub_clients ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE fshub_clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE fshub_clients ADD COLUMN IF NOT EXISTS standing TEXT;

-- 3. Ensure other tables exist (from previous fix)
CREATE TABLE IF NOT EXISTS fshub_reps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  zone TEXT,
  territory TEXT,
  status TEXT,
  coordinate JSONB,
  sales_volume TEXT,
  initials TEXT,
  avatar TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disable RLS for simple anon access (for demo)
ALTER TABLE fshub_reps DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_clients DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE fshub_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE fshub_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_catalog ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE fshub_catalog ADD COLUMN IF NOT EXISTS product_photo_path TEXT;
ALTER TABLE fshub_catalog DISABLE ROW LEVEL SECURITY;

-- 5. Admin password bootstrap (fixes Primary Admin seeded without password)
CREATE TABLE IF NOT EXISTS fshub_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  is_super BOOLEAN DEFAULT FALSE,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fshub_admins ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE fshub_admins ADD COLUMN IF NOT EXISTS auth_user_id UUID;
INSERT INTO fshub_admins (id, name, email, role, is_primary, is_super, password)
VALUES ('ADM-001', 'Peter Patrick', 'peterpatrick@gmail.com', 'Primary Super Admin', true, true, 'fshubadmin')
ON CONFLICT (email) DO UPDATE SET
  is_primary = true,
  is_super = true,
  password = COALESCE(fshub_admins.password, EXCLUDED.password);

-- 6. Messages + notifications tables for admin-rep workflow
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS fshub_rep_notifications (
  id TEXT PRIMARY KEY,
  rep_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'admin_reply',
  related_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fshub_admin_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE fshub_rep_notifications TO anon, authenticated;
ALTER TABLE fshub_admin_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_rep_notifications DISABLE ROW LEVEL SECURITY;

-- 7. Check data after fix
SELECT 'fshub_reps' as table_name, COUNT(*) as row_count FROM fshub_reps
UNION ALL
SELECT 'fshub_clients', COUNT(*) FROM fshub_clients
UNION ALL
SELECT 'fshub_orders', COUNT(*) FROM fshub_orders;

-- After running, go to Table Editor -> fshub_reps -> you should be able to see rows
-- If still 0, create a test rep manually to verify:
-- INSERT INTO fshub_reps (id, name, email, password, zone) VALUES ('REP-TEST-001', 'Test Rep', 'test@gmail.com', 'Test1234!', 'Ikeja Zone');
