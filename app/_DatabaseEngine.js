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
          initials: repObject.initials,
          avatar: repObject.avatar,
          created_at: new Date().toISOString()
        });
        if (result.ok) {
          console.log(`[Supabase] Rep saved without password column (run ADD_MISSING_COLUMNS.sql to add password)`);
          return { success: true, cloud: true, warning: 'Saved without password column - run SQL fix to add password column' };
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

  getClientsByRep: async function(repId) {
    try {
      const encodedRepId = encodeURIComponent(repId);
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*&or=(rep_id.eq.${encodedRepId},created_by_rep_id.eq.${encodedRepId})`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        // Fallback: get all and filter client-side
        const fallbackUrl = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
        if (!fallbackRes.ok) return [];
        const allClients = await fallbackRes.json();
        // Filter by rep_id if exists, else return all for backward compat
        const filtered = allClients.filter(c => c.rep_id === repId || c.created_by_rep_id === repId);
        return filtered.length > 0 ? filtered : allClients;
      }
      return await response.json();
    } catch { return []; }
  },

  getAllClients: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?select=*`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      return await response.json();
    } catch { return []; }
  },

  // CATALOG
  getCatalog: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.catalogTable}?select=*`;
      const response = await fetch(url, { method: 'GET', headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` } });
      if (!response.ok) return [];
      return await response.json();
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
      const newRecord = { ...orderRecord, localTimestamp: new Date().toISOString(), syncStatus: 'PENDING_CLOUD_SYNC ⏳' };
      const updated = [newRecord, ...currentOrders];
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(updated));
      console.log(`[Offline] Saved, total offline: ${updated.length}`);
      return { success: true, orders: updated, offline: true };
    } catch (e) { return { success: false, error: e.message }; }
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
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          invoice_number: orderObj.invoiceNumber || `INV-${Math.floor(Math.random()*9000)}`,
          store_name: orderObj.store || orderObj.clientName || 'Client Store',
          rep_id: orderObj.repId || 'UNKNOWN',
          payable_total: orderObj.payableTotal || orderObj.grandTotal || 0,
          order_items: orderObj.cartItems || orderObj.items || [],
          geotag_lat_lon: orderObj.gpsVerified || '',
          created_at: new Date().toISOString()
        })
      });
      return response.ok;
    } catch { return false; }
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
