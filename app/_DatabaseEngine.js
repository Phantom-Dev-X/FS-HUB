// FS HUB DATABASE ENGINE - FIXED FOR MISSING COLUMNS + BIG COMPANY
// Fixes: Admin not updating because fshub_reps missing password column causing 404/400 and 0 reps

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const DatabaseEngine = {
  supabaseConfig: {
    projectUrl: 'https://evcbqsgznbrzojjbtnfd.supabase.co/rest/v1',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y2Jxc2d6bmJyem9qamJ0bmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTYxNzQsImV4cCI6MjEwMDEzMjE3NH0.vJTODvgryNS1G-x35SuqKXoxgKY0spRdkAlxnW0xqnI',
    ordersTable: '/fshub_orders',
    clientsTable: '/fshub_clients',
    catalogTable: '/fshub_catalog',
    repsTable: '/fshub_reps',
    adminsTable: '/fshub_admins',
  },

  KEYS: {
    OFFLINE_ORDERS: '@fshub_offline_orders_only',
    SESSION: 'fshub_session_rep',
  },

  initDatabase: async function() {
    try {
      const offline = await AsyncStorage.getItem(this.KEYS.OFFLINE_ORDERS);
      if (!offline) await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify([]));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // REPS - SUPABASE ONLY, NO LOCAL
  saveNewRep: async function(repObject) {
    // First try with password column (if you ran ADD_MISSING_COLUMNS.sql)
    // If fails due to missing column, retry without password field
    const tryPush = async (payload) => {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    };

    try {
      // Attempt 1: Full payload with password
      let result = await tryPush({
        id: repObject.id,
        name: repObject.name || repObject.fullName,
        email: repObject.email?.toLowerCase(),
        zone: repObject.zone || repObject.territory,
        territory: repObject.territory || repObject.zone,
        status: repObject.status || 'Active',
        coordinate: repObject.coordinate,
        auth_user_id: repObject.auth_user_id,
        password: repObject.password,
        initials: repObject.initials,
        avatar: repObject.avatar,
        created_at: new Date().toISOString()
      });

      if (result.ok) {
        console.log(`[Supabase] Rep ${repObject.id} saved ✅ Status ${result.status}`);
        return { success: true, cloud: true };
      }

      // If fails due to missing password column, try without password
      if (result.status === 400 && result.text.includes('password')) {
        console.log(`[Supabase] Missing password column, retrying without it...`);
        result = await tryPush({
          id: repObject.id,
          name: repObject.name || repObject.fullName,
          email: repObject.email?.toLowerCase(),
          zone: repObject.zone || repObject.territory,
          territory: repObject.territory || repObject.zone,
          status: repObject.status || 'Active',
          coordinate: repObject.coordinate,
          auth_user_id: repObject.auth_user_id,
          initials: repObject.initials,
          avatar: repObject.avatar,
          created_at: new Date().toISOString()
        });
        if (result.ok) {
          console.log(`[Supabase] Rep saved without password column (run ADD_MISSING_COLUMNS.sql to add password)`);
          return { success: true, cloud: true, warning: 'Saved without password column - run SQL fix to add password column' };
        }
      }

      // If Supabase schema has not been upgraded for auth_user_id yet, keep the
      // profile usable by matching via email. Run the repair SQL later to add the column.
      if (result.status === 400 && result.text.includes('auth_user_id')) {
        console.log(`[Supabase] Missing auth_user_id column, retrying profile save without it...`);
        result = await tryPush({
          id: repObject.id,
          name: repObject.name || repObject.fullName,
          email: repObject.email?.toLowerCase(),
          zone: repObject.zone || repObject.territory,
          territory: repObject.territory || repObject.zone,
          status: repObject.status || 'Active',
          coordinate: repObject.coordinate,
          initials: repObject.initials,
          avatar: repObject.avatar,
          created_at: new Date().toISOString()
        });
        if (result.ok) {
          return { success: true, cloud: true, warning: 'Saved without auth_user_id column - run SQL repair to add Auth linkage later' };
        }
      }

      if (result.status === 404) {
        return { success: false, error: `Table fshub_reps not found (404). Run SUPABASE_404_FIX.sql + SUPABASE_ADD_MISSING_COLUMNS.sql. Details: ${result.text}` };
      }

      return { success: false, error: `Supabase error ${result.status}: ${result.text}` };
    } catch (e) {
      return { success: false, error: `Internet required to create account. Error: ${e.message}` };
    }
  },

  getAllReps: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?select=*`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        console.log(`[getAllReps] Status ${response.status}`);
        return [];
      }
      const data = await response.json();
      console.log(`[getAllReps] Fetched ${data.length} reps from Supabase`);
      return data;
    } catch (e) {
      console.log('[getAllReps] Error', e.message);
      return [];
    }
  },

  verifyRepCredentials: async function(inputIdOrEmail, inputPassword) {
    try {
      const normalizedInput = inputIdOrEmail.trim();
      const encodedId = encodeURIComponent(normalizedInput);
      const encodedEmail = encodeURIComponent(normalizedInput.toLowerCase());
      // Try OR filter for id or email
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?select=*&or=(id.eq.${encodedId},email.eq.${encodedEmail})`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });

      if (!response.ok) {
        return { success: false, message: `Supabase error ${response.status}. Run SQL fix.` };
      }

      const reps = await response.json();
      if (!reps || reps.length === 0) {
        // Try case-insensitive search by fetching all and filtering (fallback for big company if OR filter fails)
        const allReps = await this.getAllReps();
        const foundFallback = allReps.find(r =>
          r.id?.toLowerCase() === normalizedInput.toLowerCase() ||
          r.email?.toLowerCase() === normalizedInput.toLowerCase()
        );
        if (!foundFallback) {
          return { success: false, message: `Account not found for "${inputIdOrEmail}". Please sign up first!` };
        }
        if (!foundFallback.password) {
          return { success: false, message: 'This account has no login password. Please contact an administrator or create a new account.' };
        }
        if (foundFallback.password !== inputPassword) {
          return { success: false, message: 'Incorrect password. Please check your credentials and try again.' };
        }
        return { success: true, rep: foundFallback };
      }

      const found = reps[0];
      // Never allow an account with no password to authenticate. Older code
      // treated a NULL password as a successful match, which could let anyone
      // log in from another phone by knowing only the Rep ID/email.
      if (!found.password) {
        return { success: false, message: 'This account has no login password. Please contact an administrator or create a new account.' };
      }
      if (found.password !== inputPassword) {
        return { success: false, message: 'Incorrect password. Please check your credentials and try again.' };
      }

      return { success: true, rep: found };
    } catch (e) {
      return { success: false, message: `Internet required to login. Error: ${e.message}` };
    }
  },

  getRepByIdOrEmail: async function(inputIdOrEmail) {
    try {
      const normalizedInput = inputIdOrEmail.trim();
      const encodedId = encodeURIComponent(normalizedInput);
      const encodedEmail = encodeURIComponent(normalizedInput.toLowerCase());
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?select=*&or=(id.eq.${encodedId},email.eq.${encodedEmail})`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) return { success: false, message: `Rep lookup failed (${response.status}). Run SQL repair if table/columns are missing.` };
      const reps = await response.json();
      let rep = reps?.[0] || null;

      // Fallback for case-sensitive IDs/emails or older rows.
      if (!rep) {
        const allReps = await this.getAllReps();
        rep = allReps.find(r =>
          r.id?.toLowerCase() === normalizedInput.toLowerCase() ||
          r.email?.toLowerCase() === normalizedInput.toLowerCase()
        ) || null;
      }

      if (!rep) return { success: false, message: 'No representative account was found for those details.' };
      return { success: true, rep };
    } catch (e) {
      return { success: false, message: `Internet required for password reset. Error: ${e.message}` };
    }
  },

  updateRepPassword: async function(inputIdOrEmail, newPassword) {
    try {
      const lookup = await this.getRepByIdOrEmail(inputIdOrEmail);
      if (!lookup.success) return lookup;
      const rep = lookup.rep;
      const encodedId = encodeURIComponent(rep.id);
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?id=eq.${encodedId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ password: newPassword })
      });
      const text = await response.text();
      if (!response.ok) {
        return { success: false, message: `Password update failed (${response.status}): ${text || 'Unknown Supabase error'}` };
      }
      let updatedRep = rep;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed[0]) updatedRep = parsed[0];
      } catch {}
      return { success: true, rep: updatedRep };
    } catch (e) {
      return { success: false, message: `Could not update password: ${e.message}` };
    }
  },

  uploadImage: async function(uri, storagePath) {
    try {
      const localResponse = await fetch(uri);
      const imageBlob = await localResponse.blob();
      const response = await fetch(`https://evcbqsgznbrzojjbtnfd.supabase.co/storage/v1/object/fshub-media/${storagePath}`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Content-Type': imageBlob.type || 'image/jpeg',
          'x-upsert': 'true'
        },
        body: imageBlob
      });
      const text = await response.text();
      return response.ok ? { success: true, path: storagePath } : { success: false, error: `Storage error ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: `Image upload failed: ${e.message}` };
    }
  },

  saveCheckin: async function(checkin) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify(checkin)
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase error ${response.status}: ${text}` };
    } catch (e) { return { success: false, error: e.message }; }
  },

  verifyAdminCredentials: async function(email, password) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const primaryEmail = 'peterpatrick@gmail.com';
      const bootstrapPassword = 'fshubadmin';

      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.adminsTable}?select=*&email=eq.${encodeURIComponent(normalizedEmail)}`, {
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) return { success: false, message: `Admin database error ${response.status}. Run SUPABASE_DATABASE_REPAIR.sql.` };
      const admins = await response.json();
      let admin = admins[0];

      // Prototype bootstrap: older SQL seeded Peter Patrick without a password.
      // If the primary admin enters the documented bootstrap password once,
      // write it into Supabase so future logins work normally.
      if (!admin && normalizedEmail === primaryEmail && password === bootstrapPassword) {
        const createRes = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.adminsTable}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            id: 'ADM-001',
            name: 'Peter Patrick',
            email: primaryEmail,
            role: 'Primary Super Admin',
            is_primary: true,
            is_super: true,
            password: bootstrapPassword,
            created_at: new Date().toISOString()
          })
        });
        const created = createRes.ok ? await createRes.json() : null;
        admin = Array.isArray(created) ? created[0] : null;
      }

      if (!admin) return { success: false, message: 'Admin account not found.' };

      if (!admin.password && normalizedEmail === primaryEmail && password === bootstrapPassword) {
        const patchRes = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.adminsTable}?email=eq.${encodeURIComponent(primaryEmail)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ password: bootstrapPassword, is_primary: true, is_super: true, role: 'Primary Super Admin' })
        });
        if (!patchRes.ok) return { success: false, message: `Primary admin exists but password could not be seeded. Run SUPABASE_DATABASE_REPAIR.sql. Status ${patchRes.status}` };
        const patched = await patchRes.json();
        admin = Array.isArray(patched) ? patched[0] : { ...admin, password: bootstrapPassword };
      }

      if (!admin.password) return { success: false, message: 'This admin has no password configured. Run SUPABASE_DATABASE_REPAIR.sql or login once with the bootstrap password.' };
      if (admin.password !== password) return { success: false, message: 'Incorrect admin password.' };
      return { success: true, admin: { ...admin, accountType: 'admin' } };
    } catch (e) { return { success: false, message: `Could not verify admin: ${e.message}` }; }
  },

  isAdminSession: function(session) {
    return Boolean(session && (session.accountType === 'admin' || String(session.id || '').startsWith('ADM-')));
  },

  // CLIENTS
  saveNewClient: async function(clientObject) {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}`;
      const payload = {
        id: clientObject.id,
        name: clientObject.name,
        address: clientObject.address,
        owner_contact: clientObject.owner || clientObject.owner_contact,
        credit_limit: clientObject.creditLimit || clientObject.credit_limit || '₦500,000',
        registered_email: clientObject.email || clientObject.storeEmail,
        gps_coordinates: clientObject.gpsVerified || clientObject.gps_coordinates || '',
        rep_id: clientObject.rep_id || clientObject.createdByRepId || 'UNKNOWN',
        created_by_rep_id: clientObject.rep_id || clientObject.createdByRepId || 'UNKNOWN',
        business_type: clientObject.businessType || '',
        phone: clientObject.phone || '',
        standing: clientObject.standing || 'Good Standing 🟢',
        latitude: clientObject.latitude,
        longitude: clientObject.longitude,
        location_accuracy_m: clientObject.location_accuracy_m,
        location_method: clientObject.location_method,
        location_captured_at: clientObject.location_captured_at,
        storefront_photo_path: clientObject.storefront_photo_path,
        created_at: new Date().toISOString()
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      if (!response.ok) {
        console.log(`[Client Push] Status ${response.status}: ${text}`);
        // If rep_id column missing, try without it
        if (text.includes('rep_id') || text.includes('created_by_rep_id')) {
          console.log('Missing rep_id columns, run ADD_MISSING_COLUMNS.sql');
        }
        if (response.status === 404) {
          return { success: false, error: `fhsup_clients table missing. Run SQL fix.` };
        }
      }

      return { success: response.ok, status: response.status, text };
    } catch (e) {
      return { success: false, error: `Internet needed: ${e.message}` };
    }
  },

  _normalizeClients: function(clients) {
    if (!clients) return [];
    return clients.map(client => {
      const lat = client.latitude !== undefined && client.latitude !== null ? Number(client.latitude) : null;
      const lon = client.longitude !== undefined && client.longitude !== null ? Number(client.longitude) : null;
      return {
        ...client,
        email: client.registered_email ?? client.email,
        creditLimit: client.credit_limit ?? client.creditLimit,
        businessType: client.business_type ?? client.businessType,
        createdByRepId: client.created_by_rep_id ?? client.createdByRepId,
        coordinate: (lat !== null && lon !== null) ? { latitude: lat, longitude: lon } : null
      };
    });
  },

  getClientsByRep: async function(repId) {
    try {
      const encodedRepId = encodeURIComponent(repId);
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*&or=(rep_id.eq.${encodedRepId},created_by_rep_id.eq.${encodedRepId})`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      let clients = [];
      if (response.ok) {
        clients = await response.json();
      } else {
        // Fallback: get all and filter client-side
        const fallbackUrl = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
        if (fallbackRes.ok) {
          const allClients = await fallbackRes.json();
          clients = allClients.filter(c => c.rep_id === repId || c.created_by_rep_id === repId);
        }
      }
      const normalized = this._normalizeClients(clients);
      console.log(`[getClientsByRep] Rep ${repId}: ${normalized.length} client(s)`);
      return normalized;
    } catch (e) {
      console.log('[getClientsByRep] Error', e.message);
      return [];
    }
  },

  getAllClients: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      const rawClients = await response.json();
      return this._normalizeClients(rawClients);
    } catch { return []; }
  },

  // CATALOG
  getCatalog: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}?select=*`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      const products = await response.json();
      return products.map(product => ({
        ...product,
        price: Number(product.unit_price ?? product.price ?? 0),
        stock: Number(product.warehouse_stock ?? product.stock ?? 0)
      }));
    } catch { return []; }
  },

  addNewProductToCatalog: async function(productObject) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: productObject.id,
          name: productObject.name,
          category: productObject.category,
          unit_price: Number(productObject.unit_price ?? productObject.price ?? 0),
          warehouse_stock: Number(productObject.warehouse_stock ?? productObject.stock ?? 0),
          barcode: productObject.barcode || null,
          status: productObject.status || 'In Stock',
          created_at: productObject.created_at || new Date().toISOString()
        })
      });
      const text = await response.text();
      return response.ok
        ? { success: true }
        : { success: false, error: `Supabase error ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: `Internet required: ${e.message}` };
    }
  },

  updateCatalogProduct: async function(productId, updates) {
    try {
      const encodedId = encodeURIComponent(productId);
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.price !== undefined) payload.unit_price = Number(updates.price);
      if (updates.stock !== undefined) payload.warehouse_stock = Number(updates.stock);
      if (updates.barcode !== undefined) payload.barcode = updates.barcode;
      if (updates.status !== undefined) payload.status = updates.status;

      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}?id=eq.${encodedId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      return response.ok
        ? { success: true }
        : { success: false, error: `Supabase error ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  deleteCatalogProduct: async function(productId) {
    try {
      const encodedId = encodeURIComponent(productId);
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}?id=eq.${encodedId}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        }
      });
      const text = await response.text();
      return response.ok
        ? { success: true }
        : { success: false, error: `Supabase error ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  updateProductStock: async function(productId, quantity) {
    try {
      const encodedId = encodeURIComponent(productId);
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}?id=eq.${encodedId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ warehouse_stock: Number(quantity) })
      });
      const text = await response.text();
      return response.ok
        ? { success: true }
        : { success: false, error: `Supabase error ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: `Internet required: ${e.message}` };
    }
  },

  // OFFLINE ORDERS ONLY - As you requested
  getOfflineOrders: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.OFFLINE_ORDERS);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  saveOfflineOrder: async function(orderRecord) {
    try {
      const currentOrders = await this.getOfflineOrders();
      const generatedId = orderRecord.id || orderRecord.invoiceNumber || orderRecord.invoice_number || `OFF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newRecord = {
        ...orderRecord,
        id: generatedId,
        localTimestamp: orderRecord.localTimestamp || new Date().toISOString(),
        syncStatus: 'PENDING_CLOUD_SYNC ⏳'
      };
      const updated = [newRecord, ...currentOrders];
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(updated));
      console.log(`[Offline] Saved, total offline: ${updated.length}`);
      return { success: true, orders: updated, offline: true };
    } catch (e) { return { success: false, error: e.message }; }
  },

  setOfflineOrders: async function(orders) {
    try {
      const safeOrders = Array.isArray(orders) ? orders : [];
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(safeOrders));
      return { success: true, orders: safeOrders };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  syncToCloudBackend: async function() {
    try {
      const pendingOrders = await this.getOfflineOrders();
      if (pendingOrders.length === 0) return { success: true, count: 0, message: 'No offline orders.' };
      let successCount = 0;
      const failedOrders = [];
      for (const order of pendingOrders) {
        const pushed = await this._pushOrderToSupabase(order);
        if (pushed) successCount++;
        else failedOrders.push(order);
      }
      // Keep failed orders on the device so a partial network/database failure
      // can never silently destroy a salesperson's order.
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(failedOrders));
      const failedCount = failedOrders.length;
      return {
        success: failedCount === 0,
        count: successCount,
        failedCount,
        message: failedCount === 0
          ? `Synced ${successCount} order(s) successfully.`
          : `Synced ${successCount}; ${failedCount} order(s) remain pending. Please retry.`
      };
    } catch (e) { return { success: false, error: e.message }; }
  },

  _pushOrderToSupabase: async function(orderObj) {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.ordersTable}`;
      const amountRaw = orderObj.payableTotal ?? orderObj.payable_total ?? orderObj.grandTotal ?? orderObj.totalAmount ?? 0;
      const payableTotal = typeof amountRaw === 'number'
        ? amountRaw
        : (Number(String(amountRaw || '0').replace(/[^0-9.-]/g, '')) || 0);

      // Build the richest order payload first. If an older Supabase table is
      // missing a column, we remove that exact column and retry instead of
      // blocking the whole order from entering fshub_orders.
      const payload = {
        invoice_number: orderObj.invoiceNumber || orderObj.invoice_number || orderObj.id || `INV-${Math.floor(Math.random()*9000)}`,
        store_name: orderObj.store || orderObj.clientName || orderObj.store_name || 'Client Store',
        rep_id: orderObj.repId || orderObj.rep_id || 'UNKNOWN',
        payable_total: payableTotal,
        order_items: orderObj.cartItems || orderObj.items || orderObj.order_items || [],
        geotag_lat_lon: orderObj.gpsVerified || orderObj.geotag_lat_lon || '',
        created_at: orderObj.created_at || orderObj.localTimestamp || new Date().toISOString()
      };

      const pushPayload = async (body) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            // Upsert by invoice_number so retrying a synced/partially-synced order never creates a duplicate or blocks cleanup.
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify(body)
        });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
      };

      let body = { ...payload };
      for (let attempt = 0; attempt < 4; attempt++) {
        const result = await pushPayload(body);
        if (result.ok) {
          console.log(`[Order Push] Synced ${payload.invoice_number} ✅`);
          return true;
        }

        console.log(`[Order Push] Failed ${result.status}: ${result.text}`);
        const missingColumn = result.text?.match(/Could not find the '([^']+)' column/)?.[1];
        if (result.status === 400 && missingColumn && Object.prototype.hasOwnProperty.call(body, missingColumn)) {
          console.log(`[Order Push] Supabase table missing column "${missingColumn}"; retrying without it. Run SUPABASE_DATABASE_REPAIR.sql to fix schema permanently.`);
          const { [missingColumn]: _removed, ...rest } = body;
          body = rest;
          continue;
        }

        return false;
      }

      return false;
    } catch (e) {
      console.log('[Order Push] Network/error:', e.message);
      return false;
    }
  },

  getOrdersByRep: async function(repId) {
    try {
      const encodedRepId = encodeURIComponent(repId);
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.ordersTable}?select=*&rep_id=eq.${encodedRepId}`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      return await response.json();
    } catch { return []; }
  },

  getAllOrders: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.ordersTable}?select=*`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      return await response.json();
    } catch { return []; }
  },

  // SESSION - SecureStore
  saveSession: async function(repObj) {
    try { await SecureStore.setItemAsync(this.KEYS.SESSION, JSON.stringify(repObj)); return { success: true }; }
    catch { try { await AsyncStorage.setItem(this.KEYS.SESSION, JSON.stringify(repObj)); return { success: true }; } catch { return { success: false }; } }
  },

  getSession: async function() {
    try {
      const data = await SecureStore.getItemAsync(this.KEYS.SESSION);
      if (data) return JSON.parse(data);
      const fallback = await AsyncStorage.getItem(this.KEYS.SESSION);
      return fallback ? JSON.parse(fallback) : null;
    } catch { return null; }
  },

  clearSession: async function() {
    try { await SecureStore.deleteItemAsync(this.KEYS.SESSION); await AsyncStorage.removeItem(this.KEYS.SESSION); } catch {}
  }
};

export default DatabaseEngine;
