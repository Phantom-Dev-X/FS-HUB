// FS HUB PERSISTENT DATABASE ENGINE - FULLY LINKED TO SUPABASE
// Now saves Reps to Supabase too, and provides auth verification
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DatabaseEngine = {
  supabaseConfig: {
    projectUrl: 'https://evcbqsgznbrzojjbtnfd.supabase.co/rest/v1',
    anonKey:    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y2Jxc2d6bmJyem9qamJ0bmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTYxNzQsImV4cCI6MjEwMDEzMjE3NH0.vJTODvgryNS1G-x35SuqKXoxgKY0spRdkAlxnW0xqnI',
    ordersTable:  '/fshub_orders',
    clientsTable: '/fshub_clients',
    catalogTable: '/fshub_catalog',
    repsTable:    '/fshub_reps',
    adminsTable:  '/fshub_admins', // optional, for future
  },

  KEYS: {
    CLIENTS: '@fshub_table_clients',
    CATALOG: '@fshub_table_catalog',
    OFFLINE_ORDERS: '@fshub_table_offline_orders',
    REPS: '@fshub_table_reps',
    ADMINS: '@fshub_table_admins',
    SESSION: '@fshub_session_current_rep',
  },

  DEFAULT_CLIENTS: [],
  DEFAULT_REPS: [],
  DEFAULT_CATALOG: [],

  initDatabase: async function() {
    try {
      const clients = await AsyncStorage.getItem(this.KEYS.CLIENTS);
      const catalog = await AsyncStorage.getItem(this.KEYS.CATALOG);
      const orders  = await AsyncStorage.getItem(this.KEYS.OFFLINE_ORDERS);
      const reps    = await AsyncStorage.getItem(this.KEYS.REPS);
      const admins  = await AsyncStorage.getItem(this.KEYS.ADMINS);

      if (!clients) await AsyncStorage.setItem(this.KEYS.CLIENTS, JSON.stringify([]));
      if (!catalog) await AsyncStorage.setItem(this.KEYS.CATALOG, JSON.stringify([]));
      if (!orders)  await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify([]));
      if (!reps)    await AsyncStorage.setItem(this.KEYS.REPS, JSON.stringify([]));
      if (!admins)  await AsyncStorage.setItem(this.KEYS.ADMINS, JSON.stringify([{
        id: 'ADM-001',
        name: 'Peter Patrick',
        email: 'peterpatrick@gmail.com',
        role: '👑 PRIMARY SUPER ADMIN',
        isPrimary: true,
        isSuper: true,
      }]));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ==================== CLIENTS ====================
  getAllClients: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CLIENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) { return []; }
  },

  saveNewClient: async function(clientObject) {
    try {
      const currentList = await this.getAllClients();
      const updatedList = [clientObject, ...currentList];
      await AsyncStorage.setItem(this.KEYS.CLIENTS, JSON.stringify(updatedList));
      this._pushClientToSupabase(clientObject);
      return { success: true, clients: updatedList };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ==================== REPS (FIELD OFFICERS) ====================
  getAllReps: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.REPS);
      return data ? JSON.parse(data) : [];
    } catch (error) { return []; }
  },

  saveNewRep: async function(repObject) {
    try {
      // Ensure no duplicate ID or email
      const currentList = await this.getAllReps();
      const exists = currentList.some(r => r.id === repObject.id || r.email?.toLowerCase() === repObject.email?.toLowerCase());
      if (exists) {
        // Update existing instead of duplicate
        const updatedList = currentList.map(r => 
          (r.id === repObject.id || r.email?.toLowerCase() === repObject.email?.toLowerCase()) ? { ...r, ...repObject } : r
        );
        await AsyncStorage.setItem(this.KEYS.REPS, JSON.stringify(updatedList));
        this._pushRepToSupabase(repObject);
        return { success: true, reps: updatedList, message: 'Updated existing rep' };
      }

      const updatedList = [repObject, ...currentList];
      await AsyncStorage.setItem(this.KEYS.REPS, JSON.stringify(updatedList));
      // Push to Supabase cloud
      const pushed = await this._pushRepToSupabase(repObject);
      return { success: true, reps: updatedList, cloudPushed: pushed };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Verify rep exists and password matches - THIS STOPS LOGIN WITHOUT ACCOUNT
  verifyRepCredentials: async function(inputIdOrEmail, inputPassword) {
    try {
      const allReps = await this.getAllReps();
      const normalizedInput = inputIdOrEmail.trim().toLowerCase();
      
      const found = allReps.find(r => 
        r.id?.toLowerCase() === normalizedInput || 
        r.email?.toLowerCase() === normalizedInput
      );

      if (!found) {
        return { success: false, message: `Account not found for "${inputIdOrEmail}". Please sign up first!` };
      }

      // Check password - rep object stores password field
      if (found.password && found.password !== inputPassword) {
        return { success: false, message: 'Incorrect password. Check your password or reset via Forgot Password.' };
      }

      // If rep has no password stored (old data), allow but warn - for backward compat
      if (!found.password) {
        return { success: true, rep: found, warning: 'Old account without password, please update password in profile.' };
      }

      return { success: true, rep: found };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Session management - store current logged in rep
  saveSession: async function(repObj) {
    try {
      await AsyncStorage.setItem(this.KEYS.SESSION, JSON.stringify(repObj));
      return { success: true };
    } catch (e) { return { success: false }; }
  },

  getSession: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  clearSession: async function() {
    await AsyncStorage.removeItem(this.KEYS.SESSION);
  },

  // ==================== CATALOG ====================
  getCatalog: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CATALOG);
      return data ? JSON.parse(data) : [];
    } catch (error) { return []; }
  },

  updateProductStock: async function(productId, newStock, newPrice) {
    try {
      const currentCatalog = await this.getCatalog();
      const updated = currentCatalog.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            stock: newStock !== undefined ? newStock : item.stock,
            price: newPrice !== undefined ? newPrice : item.price,
            status: newStock === 0 ? 'Out of Stock 🔴' : (newStock < 10 ? 'Low Stock ⚠️' : 'High Stock 🟢'),
            statusColor: newStock === 0 ? '#EF4444' : (newStock < 10 ? '#F59E0B' : '#10B981'),
          };
        }
        return item;
      });
      await AsyncStorage.setItem(this.KEYS.CATALOG, JSON.stringify(updated));
      return { success: true, catalog: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  addNewProductToCatalog: async function(prodObject) {
    try {
      const currentCatalog = await this.getCatalog();
      const updated = [prodObject, ...currentCatalog];
      await AsyncStorage.setItem(this.KEYS.CATALOG, JSON.stringify(updated));
      return { success: true, catalog: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ==================== ORDERS ====================
  getOfflineOrders: async function() {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.OFFLINE_ORDERS);
      return data ? JSON.parse(data) : [];
    } catch (error) { return []; }
  },

  saveOfflineOrder: async function(orderRecord) {
    try {
      const currentOrders = await this.getOfflineOrders();
      const newRecord = {
        ...orderRecord,
        localTimestamp: new Date().toISOString(),
        syncStatus: 'PENDING_CLOUD_SYNC ⏳',
      };
      const updated = [newRecord, ...currentOrders];
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(updated));
      this._pushOrderToSupabase(newRecord);
      return { success: true, orders: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteOfflineOrder: async function(orderId) {
    try {
      const currentOrders = await this.getOfflineOrders();
      const updated = currentOrders.filter(o => o.id !== orderId && o.invoiceNumber !== orderId);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify(updated));
      return { success: true, orders: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  syncToCloudBackend: async function() {
    try {
      const pendingOrders = await this.getOfflineOrders();
      if (pendingOrders.length === 0) {
        return { success: true, count: 0, message: 'All local orders already synced!' };
      }
      let successCount = 0;
      for (const order of pendingOrders) {
        const pushed = await this._pushOrderToSupabase(order);
        if (pushed) successCount++;
      }
      await AsyncStorage.setItem(this.KEYS.OFFLINE_ORDERS, JSON.stringify([]));
      return { success: true, count: successCount, message: `Uploaded ${successCount} orders to cloud!` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ==================== SUPABASE PUSHERS ====================
  _pushOrderToSupabase: async function(orderObj) {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.ordersTable}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          invoice_number: orderObj.invoiceNumber || `INV-${Math.floor(Math.random()*9000)}`,
          store_name:     orderObj.store || orderObj.clientName || 'Client Store',
          rep_id:         orderObj.repId || 'REP-2049',
          payable_total:  orderObj.payableTotal || orderObj.grandTotal || 0,
          order_items:    orderObj.cartItems || orderObj.items || [],
          geotag_lat_lon: orderObj.gpsVerified || 'Lat: 6.6018° N | Lon: 3.3515° E',
          created_at:     new Date().toISOString()
        })
      });
      return response.ok;
    } catch (error) { return false; }
  },

  _pushClientToSupabase: async function(clientObj) {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: clientObj.id || `CL-${Math.floor(Math.random()*9000)}`,
          name: clientObj.name,
          address: clientObj.address,
          owner_contact: clientObj.owner || clientObj.phone,
          registered_email: clientObj.email || clientObj.storeEmail,
          credit_limit: clientObj.creditLimit || '₦500,000',
          created_at: new Date().toISOString()
        })
      });
      return response.ok;
    } catch (error) { return false; }
  },

  _pushRepToSupabase: async function(repObj) {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: repObj.id || `REP-${Math.floor(Math.random()*9000)}`,
          name: repObj.name || repObj.fullName || 'Field Officer',
          email: repObj.email || '',
          // Store minimal info - password not pushed for security, but for demo we push hash placeholder
          zone: repObj.zone || repObj.territory || 'Ikeja Commercial Zone',
          territory: repObj.zone || repObj.territory || '',
          status: repObj.status || 'Active',
          coordinate: repObj.coordinate || null,
          created_at: new Date().toISOString()
        })
      });
      console.log(`[Supabase Rep Push] Status ${response.status} for ${repObj.id}`);
      return response.ok;
    } catch (error) {
      console.log('[Supabase Rep Push Error]', error.message);
      return false;
    }
  },

  // Fetch all reps from Supabase to sync local (optional)
  fetchRepsFromSupabase: async function() {
    try {
      const url = `${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?select=*`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return [];
    } catch { return []; }
  }
};

export default DatabaseEngine;
