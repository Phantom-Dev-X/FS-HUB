-- FIX FOR ADMIN NOT UPDATING & 0 REPS - ADD MISSING COLUMNS
-- Run this inside Supabase SQL Editor: https://supabase.com/dashboard/project/evcbqsgznbrzojjbtnfd/sql

-- 1. fshub_reps missing password column (causes signup fail + 0 reps)
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE fshub_reps ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

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
ALTER TABLE fshub_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE fshub_catalog DISABLE ROW LEVEL SECURITY;

-- 5. Check data after fix
SELECT 'fshub_reps' as table_name, COUNT(*) as row_count FROM fshub_reps
UNION ALL
SELECT 'fshub_clients', COUNT(*) FROM fshub_clients
UNION ALL
SELECT 'fshub_orders', COUNT(*) FROM fshub_orders;

-- After running, go to Table Editor -> fshub_reps -> you should be able to see rows
-- If still 0, create a test rep manually to verify:
-- INSERT INTO fshub_reps (id, name, email, password, zone) VALUES ('REP-TEST-001', 'Test Rep', 'test@gmail.com', 'Test1234!', 'Ikeja Zone');
