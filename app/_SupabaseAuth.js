// FS HUB SUPABASE AUTH CLIENT
// Email/password auth for reps. Admin portal remains on the existing admin table for now.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://evcbqsgznbrzojjbtnfd.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y2Jxc2d6bmJyem9qamJ0bmZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTYxNzQsImV4cCI6MjEwMDEzMjE3NH0.vJTODvgryNS1G-x35SuqKXoxgKY0spRdkAlxnW0xqnI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const getAuthErrorMessage = (error) => {
  const raw = error?.message || 'Authentication failed. Please try again.';
  if (/Invalid login credentials/i.test(raw)) return 'Incorrect email or password, or this email has not been registered in Supabase Auth.';
  if (/Email not confirmed/i.test(raw)) return 'Please confirm your email before logging in.';
  if (/User already registered/i.test(raw)) return 'This email already has an account. Please log in instead.';
  return raw;
};

const getPasswordResetRedirectTo = () => {
  // Web testing needs an http URL; native builds use the fshub:// deep link.
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/reset-password`;
  }
  return 'fshub://reset-password';
};

const parseAuthParamsFromUrl = (url) => {
  if (!url) return {};
  const queryLike = url.includes('#') ? url.replace('#', '?') : url;
  const query = queryLike.split('?')[1] || '';
  const params = new URLSearchParams(query);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    error: params.get('error'),
    error_description: params.get('error_description'),
  };
};

export const SupabaseAuth = {
  signUpRep: async function({ email, password, metadata = {} }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: metadata },
      });
      if (error) return { success: false, message: getAuthErrorMessage(error), error };
      return { success: true, user: data.user, session: data.session };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  signInRep: async function({ email, password }) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { success: false, message: getAuthErrorMessage(error), error };
      return { success: true, user: data.user, session: data.session };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  signOut: async function() {
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  getSession: async function() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return { success: false, message: getAuthErrorMessage(error), session: null };
      return { success: true, session: data.session };
    } catch (e) {
      return { success: false, message: e.message, session: null };
    }
  },

  sendPasswordResetEmail: async function(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getPasswordResetRedirectTo(),
      });
      if (error) return { success: false, message: getAuthErrorMessage(error), error };
      return { success: true };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  setSessionFromUrl: async function(url) {
    try {
      const params = parseAuthParamsFromUrl(url);
      if (params.error) return { success: false, message: params.error_description || params.error };
      if (!params.access_token || !params.refresh_token) {
        return { success: false, message: 'Reset link did not include a valid Supabase session. Open the latest password reset email link again.' };
      }
      const { data, error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) return { success: false, message: getAuthErrorMessage(error), error };
      return { success: true, session: data.session, user: data.user };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  updatePassword: async function(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, message: getAuthErrorMessage(error), error };
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },
};

export default SupabaseAuth;
