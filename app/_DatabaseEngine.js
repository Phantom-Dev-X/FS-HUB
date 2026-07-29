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
    ADMIN_MESSAGES: '@fshub_admin_messages_pending',
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
        phone: repObject.phone || '',
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
          phone: repObject.phone || '',
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

  getSignedImageUrl: async function(storagePath, expiresIn = 604800) {
    try {
      if (!storagePath) return { success: false, error: 'Missing storage path' };
      if (String(storagePath).startsWith('http') || String(storagePath).startsWith('file:') || String(storagePath).startsWith('content:')) {
        return { success: true, url: storagePath };
      }
      const response = await fetch(`https://evcbqsgznbrzojjbtnfd.supabase.co/storage/v1/object/sign/fshub-media/${storagePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`
        },
        body: JSON.stringify({ expiresIn })
      });
      const text = await response.text();
      if (!response.ok) return { success: false, error: `Sign URL error ${response.status}: ${text}` };
      const data = JSON.parse(text);
      const signedURL = data.signedURL || data.signedUrl || data.url;
      return signedURL ? { success: true, url: `https://evcbqsgznbrzojjbtnfd.supabase.co/storage/v1${signedURL}` } : { success: false, error: 'No signed URL returned' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  updateRepAvatar: async function(repId, avatarPath) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.repsTable}?id=eq.${encodeURIComponent(repId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ avatar: avatarPath })
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Avatar update failed ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
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

  updateClient: async function(clientId, updates) {
    try {
      const payload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.address !== undefined) payload.address = updates.address;
      if (updates.latitude !== undefined) payload.latitude = Number(updates.latitude);
      if (updates.longitude !== undefined) payload.longitude = Number(updates.longitude);
      if (updates.location_accuracy_m !== undefined) payload.location_accuracy_m = updates.location_accuracy_m;
      if (updates.location_method !== undefined) payload.location_method = updates.location_method;
      if (updates.location_captured_at !== undefined) payload.location_captured_at = updates.location_captured_at;
      if (updates.gps_coordinates !== undefined) payload.gps_coordinates = updates.gps_coordinates;

      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.clientsTable}?id=eq.${encodeURIComponent(clientId)}`, {
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
      return response.ok ? { success: true } : { success: false, error: `Client update failed ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  saveAdminMessage: async function(messageObject) {
    const message = {
      id: messageObject.id || `MSG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      rep_id: messageObject.rep_id || messageObject.repId || 'UNKNOWN',
      rep_name: messageObject.rep_name || messageObject.repName || 'Field Officer',
      type: messageObject.type || 'general_message',
      title: messageObject.title || 'Message to Admin',
      body: messageObject.body || messageObject.message || '',
      priority: messageObject.priority || 'Normal',
      related_id: messageObject.related_id || messageObject.relatedId || '',
      payload: messageObject.payload || {},
      status: messageObject.status || 'Open',
      created_at: messageObject.created_at || new Date().toISOString(),
    };

    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(message)
      });
      const text = await response.text();
      if (response.ok) return { success: true, cloud: true, message };

      // Keep messages locally if table is not created yet. This prevents UX errors.
      console.log(`[Admin Message] Cloud save failed ${response.status}: ${text}`);
      const current = await this.getPendingAdminMessages();
      await AsyncStorage.setItem(this.KEYS.ADMIN_MESSAGES, JSON.stringify([message, ...current]));
      return { success: true, cloud: false, offline: true, warning: `Saved locally. Run SQL repair to create fshub_admin_messages. Supabase: ${response.status}`, message };
    } catch (e) {
      const current = await this.getPendingAdminMessages();
      await AsyncStorage.setItem(this.KEYS.ADMIN_MESSAGES, JSON.stringify([message, ...current]));
      return { success: true, cloud: false, offline: true, warning: `Saved locally: ${e.message}`, message };
    }
  },

  getPendingAdminMessages: async function() {
    try {
      const raw = await AsyncStorage.getItem(this.KEYS.ADMIN_MESSAGES);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getAdminMessages: async function() {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?select=*&order=created_at.desc`, {
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        console.log(`[Admin Messages] Fetch failed ${response.status}: ${await response.text()}`);
        return await this.getPendingAdminMessages();
      }
      return await response.json();
    } catch (e) {
      console.log('[Admin Messages] Fetch error', e.message);
      return await this.getPendingAdminMessages();
    }
  },

  getAdminMessagesByRep: async function(repId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?select=*&rep_id=eq.${encodeURIComponent(repId)}&order=created_at.desc`, {
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        console.log(`[Admin Messages By Rep] Fetch failed ${response.status}: ${await response.text()}`);
        const pending = await this.getPendingAdminMessages();
        return pending.filter(msg => msg.rep_id === repId || msg.repId === repId);
      }
      return await response.json();
    } catch (e) {
      console.log('[Admin Messages By Rep] Fetch error', e.message);
      const pending = await this.getPendingAdminMessages();
      return pending.filter(msg => msg.rep_id === repId || msg.repId === repId);
    }
  },

  updateAdminMessageStatus: async function(messageId, status) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?id=eq.${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status })
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  markAllAdminMessagesRead: async function() {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?admin_read=is.false`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ admin_read: true, read_at: new Date().toISOString() })
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  markAdminMessageRead: async function(messageId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?id=eq.${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ admin_read: true, read_at: new Date().toISOString() })
      });
      return { success: response.ok };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  saveRepNotification: async function(notification) {
    const record = {
      id: notification.id || `NTF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      rep_id: notification.rep_id || notification.repId || 'UNKNOWN',
      title: notification.title || 'Admin Notification',
      body: notification.body || notification.message || '',
      type: notification.type || 'admin_reply',
      related_id: notification.related_id || notification.relatedId || '',
      read: false,
      created_at: notification.created_at || new Date().toISOString(),
    };
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(record)
      });
      const text = await response.text();
      return response.ok ? { success: true, notification: record } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  getRepNotifications: async function(repId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications?select=*&rep_id=eq.${encodeURIComponent(repId)}&order=created_at.desc`, {
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        console.log(`[Rep Notifications] Fetch failed ${response.status}: ${await response.text()}`);
        return [];
      }
      return await response.json();
    } catch (e) {
      console.log('[Rep Notifications] Fetch error', e.message);
      return [];
    }
  },

  getAllRepNotifications: async function() {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications?select=*&order=created_at.desc`, {
        headers: { 'apikey': this.supabaseConfig.anonKey, 'Authorization': `Bearer ${this.supabaseConfig.anonKey}` }
      });
      if (!response.ok) {
        console.log(`[All Rep Notifications] Fetch failed ${response.status}: ${await response.text()}`);
        return [];
      }
      return await response.json();
    } catch (e) {
      console.log('[All Rep Notifications] Fetch error', e.message);
      return [];
    }
  },

  markRepNotificationRead: async function(notificationId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications?id=eq.${encodeURIComponent(notificationId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ read: true })
      });
      return { success: response.ok };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  deleteRepNotification: async function(notificationId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications?id=eq.${encodeURIComponent(notificationId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        }
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  deleteAdminMessage: async function(messageId) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?id=eq.${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        }
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  deleteMessageThread: async function(threadId) {
    try {
      const encoded = encodeURIComponent(threadId);
      const [adminRes, notificationRes] = await Promise.all([
        fetch(`${this.supabaseConfig.projectUrl}/fshub_admin_messages?id=eq.${encoded}`, {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            'Prefer': 'return=minimal'
          }
        }),
        fetch(`${this.supabaseConfig.projectUrl}/fshub_rep_notifications?or=(id.eq.${encoded},related_id.eq.${encoded})`, {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            'Prefer': 'return=minimal'
          }
        })
      ]);
      const adminText = await adminRes.text();
      const notificationText = await notificationRes.text();
      if (!adminRes.ok) return { success: false, error: `Admin message delete failed ${adminRes.status}: ${adminText}` };
      if (!notificationRes.ok) return { success: false, error: `Notification delete failed ${notificationRes.status}: ${notificationText}` };
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
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
        stock: Number(product.warehouse_stock ?? product.stock ?? 0),
        image_path: product.image_path || product.product_photo_path || product.photo_path || product.image || null,
        product_photo_path: product.product_photo_path || product.image_path || product.photo_path || product.image || null
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
          image_path: productObject.image_path || productObject.product_photo_path || null,
          product_photo_path: productObject.product_photo_path || productObject.image_path || null,
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
      if (updates.image_path !== undefined) payload.image_path = updates.image_path;
      if (updates.product_photo_path !== undefined) payload.product_photo_path = updates.product_photo_path;
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
        if (pushed.success) {
          successCount++;
        } else {
          failedOrders.push({
            ...order,
            lastSyncError: pushed.error || 'Unknown Supabase sync error',
            lastSyncAttemptAt: new Date().toISOString(),
          });
        }
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
          : `Synced ${successCount}; ${failedCount} order(s) remain pending. First error: ${failedOrders[0]?.lastSyncError || 'Unknown error'}`,
        firstError: failedOrders[0]?.lastSyncError || null
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

      const clientName = orderObj.store || orderObj.clientName || orderObj.store_name || orderObj.client_name || 'Client Store';
      const grandTotalRaw = orderObj.grandTotal ?? orderObj.grand_total ?? orderObj.totalAmount ?? orderObj.total_amount ?? payableTotal;
      const grandTotal = typeof grandTotalRaw === 'number'
        ? grandTotalRaw
        : (Number(String(grandTotalRaw || '0').replace(/[^0-9.-]/g, '')) || payableTotal || 0);
      const geotag = orderObj.gpsVerified || orderObj.geotag_lat_lon || orderObj.geotag || orderObj.gps_coordinates || '';
      const clientEmail = orderObj.clientEmail || orderObj.client_email || '';
      const repEmail = orderObj.repEmail || orderObj.rep_email || '';

      const payload = {
        invoice_number: orderObj.invoiceNumber || orderObj.invoice_number || orderObj.id || `INV-${Math.floor(Math.random()*9000)}`,
        store_name: clientName,
        client_name: clientName,
        client_id: orderObj.clientId || orderObj.client_id || '',
        client_email: clientEmail,
        rep_id: orderObj.repId || orderObj.rep_id || 'UNKNOWN',
        rep_email: repEmail,
        grand_total: grandTotal,
        total_amount: payableTotal || grandTotal,
        payable_total: payableTotal || grandTotal,
        discount_amount: Number(orderObj.discountAmount ?? orderObj.discount_amount ?? 0) || 0,
        order_items: orderObj.cartItems || orderObj.items || orderObj.order_items || [],
        payment_cycle: orderObj.paymentCycle || orderObj.payment_cycle || '',
        delivery_urgency: orderObj.deliveryUrgency || orderObj.delivery_urgency || '',
        order_notes: orderObj.orderNotes || orderObj.order_notes || '',
        status: orderObj.status || 'Pending Dispatch ⏳',
        geotag_lat_lon: geotag,
        geotag: geotag,
        created_at: orderObj.created_at || orderObj.localTimestamp || new Date().toISOString()
      };

      const pushPayload = async (body) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseConfig.anonKey,
            'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify(body)
        });
        const text = await response.text();
        return { ok: response.ok, status: response.status, text };
      };

      let body = { ...payload };
      let lastResult = null;

      // Retry after removing missing columns from older Supabase schemas.
      for (let attempt = 0; attempt < 8; attempt++) {
        const result = await pushPayload(body);
        lastResult = result;

        if (result.ok) {
          console.log(`[Order Push] Synced ${payload.invoice_number} ✅`);
          return { success: true };
        }

        console.log(`[Order Push] Failed ${result.status}: ${result.text}`);

        const missingColumn = result.text?.match(/Could not find the '([^']+)' column/)?.[1];
        if (result.status === 400 && missingColumn && Object.prototype.hasOwnProperty.call(body, missingColumn)) {
          console.log(`[Order Push] Supabase table missing column "${missingColumn}"; retrying without it. Run SUPABASE_DATABASE_REPAIR.sql to fix schema permanently.`);
          const { [missingColumn]: _removed, ...rest } = body;
          body = rest;
          continue;
        }

        const duplicateKey = result.text?.includes('duplicate key value') || result.status === 409;
        if (duplicateKey) {
          // If old row already exists, treat as synced so the offline queue can clear.
          console.log(`[Order Push] Invoice ${payload.invoice_number} already exists in Supabase; clearing local duplicate ✅`);
          return { success: true, warning: 'Invoice already exists in Supabase' };
        }

        return { success: false, error: `Supabase ${result.status}: ${result.text || 'Unknown error'}` };
      }

      return { success: false, error: `Supabase ${lastResult?.status || 'error'}: ${lastResult?.text || 'Too many schema retry attempts'}` };
    } catch (e) {
      console.log('[Order Push] Network/error:', e.message);
      return { success: false, error: `Network/error: ${e.message}` };
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

  updateOrderStatus: async function(invoiceNumber, status) {
    try {
      const response = await fetch(`${this.supabaseConfig.projectUrl}${this.supabaseConfig.ordersTable}?invoice_number=eq.${encodeURIComponent(invoiceNumber)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.supabaseConfig.anonKey,
          'Authorization': `Bearer ${this.supabaseConfig.anonKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status, status_updated_at: new Date().toISOString() })
      });
      const text = await response.text();
      return response.ok ? { success: true } : { success: false, error: `Supabase ${response.status}: ${text}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
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
