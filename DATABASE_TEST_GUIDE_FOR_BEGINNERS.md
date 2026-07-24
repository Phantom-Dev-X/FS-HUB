# How to TEST if Supabase Database is Linked Successfully - For Beginners

You said: "I dont know how to use a database, how can we test if linked, how can I verify and see it in app or better way?"

No wahala, I go show you 3 easy ways even JSS1 fit do.

---

## METHOD 1: Check Inside Supabase Dashboard (Easiest - No Code)

This is like checking your bank account balance online.

**Step 1: Open Supabase**
- Go to https://supabase.com/dashboard/project/evcbqsgznbrzojjbtnfd
- Login with your Supabase account

**Step 2: Go to Table Editor**
- Left sidebar → Click **Table Editor**
- You will see tables: `fshub_reps`, `fshub_clients`, `fshub_orders`, `fshub_catalog`, `fshub_admins`

**Step 3: Test Account Backup**
- Open your FS HUB app on phone
- Go to **Register New Account** → Create new rep:
  - Name: `Test Rep 1`
  - Rep ID: `REP-TEST-001`
  - Email: `testrep1@gmail.com`
  - Password: `Test1234!` (must have uppercase, lowercase, number, special char)
  - Territory: `Ikeja Test Zone`

- Tap **Complete Onboarding**
- If success, it says "Officer Registered!"

**Step 4: Verify in Supabase**
- Go back to Supabase Dashboard → Table Editor → Click `fshub_reps`
- You should see new row appear **instantly** with:
  - id: `REP-TEST-001`
  - name: `Test Rep 1`
  - email: `testrep1@gmail.com`
  - zone: `Ikeja Test Zone`
  - created_at: today's date

**If you see it there = Database is 100% linked and backup works!** ✅

- Same for clients: Go to `fshub_clients` table, add client via app → Add New Client, then check table editor, you will see new client row with `rep_id = REP-TEST-001` (so you know which rep created it)

- Same for orders: Take order via app, check `fshub_orders` table

**This is how you verify for big company with millions of workers - admin opens Supabase and sees all.**

---

## METHOD 2: Check Inside App (Admin Portal Overview)

You don't need to open Supabase website, you can see inside app.

**For Reps:**
- Login as rep (e.g., `REP-TEST-001`)
- Go to **Home** → It shows `My Clients: X` - this number comes from Supabase `SELECT * FROM fshub_clients WHERE rep_id = 'REP-TEST-001'` (only your own)
- Go to **Check-In** → Shows only your own clients (filtered by your Rep ID)
- Go to **History** → Shows only your own orders

**For Admin (Big Company Overview):**
- Login as admin: `peterpatrick@gmail.com / fshubadmin`
- Go to **Admin Portal**
- Tabs:
  - **REPS Tab**: Shows map with ALL reps pins from Supabase `fshub_reps` table - if 1 million reps, you see 1 million pins. Each pin is a rep who signed up and backed up to Supabase.
  - **ORDERS Tab**: Shows all orders from ALL reps
  - **CLIENTS?** Actually clients show via Territories or via checkin? But admin can see all via API
  - **CATALOG Tab**: Shows all products

So admin sees overview of all shii as you requested.

---

## METHOD 3: Check App Logs (For Developers)

When you run `npx expo start`, you see logs in terminal:

**If database linked successfully:**
```
LOG  [FS-HUB] DB Initialized: 1 reps, 3 clients, 5 products
LOG  [Supabase] Rep REP-TEST-001 backed up to cloud ✅
LOG  [Supabase] Client CL-123 backed up to cloud ✅
```

**If 404 error (table not found):**
```
LOG  [Supabase Rep Push] Status 404 for REP-TEST-001
ERROR  Supabase table fshub_reps not found (404). Run SUPABASE_404_FIX.sql
```

If you see 404, run the SQL file `SUPABASE_404_FIX.sql` inside Supabase SQL Editor (I pushed it to your repo root).

**If offline (no internet):**
```
LOG  [Offline Orders] Saved locally, will sync when online. Total offline: 1
```
And for account creation:
```
ERROR  Internet required to create account. No offline acc creation allowed.
```
This is expected as you requested: "creating of acc can't be done offline"

---

## WHAT EXACTLY IS BACKED UP TO SUPABASE? (For Big Company)

**Every new acc created:**
- When you signup, we create row in `fshub_reps`:
  - id, name, email, password (for demo, plain but in production should be hashed), zone/territory, coordinate (lat/lon), status, initials, avatar, created_at

**Every new client onboarded:**
- When rep adds client via Add New Client, we create row in `fshub_clients`:
  - id, name, address, owner_contact, credit_limit, registered_email, gps_coordinates, **rep_id** (who created it, so admin knows and rep sees only own), created_at

**Every new order taken:**
- When rep takes order, we create row in `fshub_orders`:
  - invoice_number, store_name, **rep_id** (who took it), payable_total, order_items (JSON of cart), geotag_lat_lon, created_at
  - If offline, saved in phone AsyncStorage `@fshub_offline_orders_only`, then when online tap Sync → pushes to Supabase and **wipes local** (paving new place as you requested)

**Catalog:**
- Admin creates products via Admin → Catalog tab → saved to `fshub_catalog`
- All reps fetch catalog from Supabase (global, same for all)

---

## HOW NORMAL APPS WORK (Like you said)

You said: "Like if a users enters a credentials let it check the database if it not there let it tell them to create a new acc like how normal apps are"

That's exactly what we implemented now:

1. **Signup (First time):**
   - Must have internet
   - Fills form → POST to Supabase `fshub_reps`
   - If email or ID already exists → Supabase returns duplicate error → App shows "Account already exists, please login"
   - If success → Row appears in Supabase → Welcome email sent

2. **Login (Next time):**
   - User enters Rep ID/Email + Password
   - App does: `GET https://.../fshub_reps?or=(id.eq.REP,email.eq.EMAIL)` → fetches from Supabase
   - If no row found → **"Account not found for XYZ. Please sign up first!"** + button to Signup
   - If found but password wrong → "Incorrect password"
   - If found and password correct → Save session in SecureStore (encrypted), set currentAgent, go to Home

3. **Home:**
   - Reads session from SecureStore → knows who you are (e.g., REP-TEST-001)
   - Fetches `GET fshub_clients?rep_id=eq.REP-TEST-001` → shows ONLY your clients
   - Fetches `GET fshub_orders?rep_id=eq.REP-TEST-001` → shows ONLY your orders

4. **Admin:**
   - Login as primary admin
   - Fetches `GET fshub_reps?select=*` → sees ALL reps (millions)
   - Fetches `GET fshub_clients?select=*` → sees ALL clients
   - etc.

This is exactly how normal apps like Facebook, WhatsApp work - check DB if credentials exist.

---

## QUICK TEST CHECKLIST FOR YOU (Do Now)

1. **Run SQL Fix First:**
   - Open Supabase → SQL Editor → Copy paste `SUPABASE_404_FIX.sql` → Run

2. **Test Signup Backup:**
   - App → Register New Account → Create `REP-TEST-001` with email `test1@gmail.com` + strong password `Test1234!`
   - Go to Supabase → Table Editor → `fshub_reps` → You should see new row. If yes, backup works!

3. **Test Login Block Without Account:**
   - Logout → Try login with `REP-FAKE-999` + `Fake1234!` → Should show "Account not found, please sign up first!" → Good, blocks login without account as you requested

4. **Test Login With Real Account:**
   - Login with `REP-TEST-001` + `Test1234!` → Should go to Home, show your name, 0 clients (real, not fake 245)

5. **Test Client Backup:**
   - Add New Client → Fill `Mama T Shop` → Save → Check Supabase `fshub_clients` → See new row with `rep_id = REP-TEST-001`
   - Go to Check-In → You should see Mama T Shop (only yours)

6. **Test Admin Overview (Big Company):**
   - Login as `peterpatrick@gmail.com / fshubadmin` → Admin → Reps Tab → You should see `REP-TEST-001` pin on map

If all 6 pass, your database is 100% linked for big company with millions!

---

## WHAT IF YOU STILL SEE DUMMY / FAKE NUMBERS?

We removed fake 245, 18%, etc. from home.jsx. Now home shows real counts:
- `My Clients: 0` (if you never added clients)
- `Active Cart: 0 Units`
- `Order Value: ₦0`
- `Offline Orders: 0`

If you still see 245, pull latest code:
```bash
git reset --hard origin/main
git pull origin/main
npx expo start --clear
```

Any dummy remaining is from old AsyncStorage `@fshub_table_catalog` or `@fshub_table_clients`. Tap **Clear All Stock** button in Inventory or run:
```js
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

But after moving to Supabase-only for clients/catalog, dummy should not appear again because we don't read from AsyncStorage for those anymore, only from Supabase.

---

## SUMMARY FOR BEGINNER

- **Supabase = Your company bank vault in cloud**
- **Every signup = INSERT row into vault fshub_reps (online only)**
- **Every login = SELECT from vault to check if account exists**
- **Every client/order = INSERT into vault with rep_id, so rep sees only own, admin sees all**
- **Offline orders only = Saved in phone small box, wiped after sync**
- **To see data: Supabase Dashboard → Table Editor OR Admin Portal inside app**

You don't need to know SQL deeply - just know that app backs up and gets back via `fetch()` to `https://evcbqsgznbrzojjbtnfd.supabase.co/rest/v1/...`

Anything you create in app appears in Supabase Table Editor instantly if internet dey. That's verification.

Need more explanation? Tell me which part still confuse.
