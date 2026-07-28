import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@fshub_cache:';

export const CacheEngine = {
  key: (name, scope = 'global') => `${PREFIX}${scope}:${name}`,

  get: async function(name, scope = 'global', fallback = null) {
    try {
      const raw = await AsyncStorage.getItem(this.key(name, scope));
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed?.value ?? fallback;
    } catch {
      return fallback;
    }
  },

  set: async function(name, scope = 'global', value) {
    try {
      await AsyncStorage.setItem(this.key(name, scope), JSON.stringify({
        value,
        savedAt: new Date().toISOString(),
      }));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  getWithMeta: async function(name, scope = 'global', fallback = null) {
    try {
      const raw = await AsyncStorage.getItem(this.key(name, scope));
      if (!raw) return { value: fallback, savedAt: null };
      const parsed = JSON.parse(raw);
      return { value: parsed?.value ?? fallback, savedAt: parsed?.savedAt || null };
    } catch {
      return { value: fallback, savedAt: null };
    }
  },

  remove: async function(name, scope = 'global') {
    try {
      await AsyncStorage.removeItem(this.key(name, scope));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

export default CacheEngine;
