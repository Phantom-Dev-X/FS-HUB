// FS HUB - FINAL ELEGANT WHITE + LINEAR GRADIENT + VALIDATION + DATABASE LINKED
// - Clean professional login (no rep count leak)
// - Nice in-page alert cards instead of ugly Alert popups
// - Inputs disabled while loading
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import { SupabaseAuth } from './_SupabaseAuth';

// Reusable nice Alert Card (replaces ugly Alert.alert)
const AlertCard = ({ type, title, message, onClose }) => {
  const bgColor = type === 'error' ? '#FEE2E2' : type === 'success' ? '#D1FAE5' : '#FEF3C7';
  const borderColor = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#F59E0B';
  const icon = type === 'error' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'information-circle';
  const iconColor = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#F59E0B';

  return (
    <View style={styles.popupOverlay} pointerEvents="box-none">
      <View style={[styles.popupCard, { backgroundColor: bgColor, borderColor }]} pointerEvents="auto">
        <TouchableOpacity style={styles.popupCloseArea} onPress={onClose} activeOpacity={1} />
        <View style={styles.alertRow}>
          <Ionicons name={icon} size={24} color={iconColor} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.alertTitle, { color: iconColor }]}>{title}</Text>
            <Text style={styles.alertMessage}>{message}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.popupCloseBtn}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const [userType, setUserType] = useState('agent');
  const [repId, setRepId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [alert, setAlert] = useState(null); // {type, title, message}

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email / Rep ID is required';
    if (email.includes('@')) {
      if (!emailRegex.test(email.trim())) return 'Invalid email format. e.g: name@gmail.com';
    } else {
      const repIdRegex = /^[A-Za-z0-9-]{3,}$/;
      if (!repIdRegex.test(email.trim())) return 'Rep ID must be at least 3 chars (letters/numbers/-)';
    }
    return '';
  };

  const validatePassword = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    };
    const errors = [];
    if (!checks.length) errors.push('At least 8 characters');
    if (!checks.uppercase) errors.push('At least 1 uppercase letter (A-Z)');
    if (!checks.lowercase) errors.push('At least 1 lowercase letter (a-z)');
    if (!checks.number) errors.push('At least 1 number (0-9)');
    if (!checks.special) errors.push('At least 1 special character (!@#$%^&* etc)');
    return { valid: errors.length === 0, checks, errors, message: errors.join('\n') };
  };

  const handleEmailChange = (text) => {
    setRepId(text);
    if (text) setEmailError(validateEmail(text));
    else setEmailError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    // On login, do not enforce signup strength rules. Supabase/Admin will verify the password.
    setPasswordError('');
  };

  const handleToggleAdminMode = () => {
    if (userType === 'agent') {
      setUserType('admin');
      setRepId('');
      setPassword('');
      setEmailError('');
      setPasswordError('');
    } else {
      setUserType('agent');
      setRepId('');
      setPassword('');
      setEmailError('');
      setPasswordError('');
    }
  };

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  const closeAlert = () => setAlert(null);

  const handleLogin = async () => {
    const normalizedEmail = repId.trim().toLowerCase();
    const emailErr = validateEmail(normalizedEmail);
    setEmailError(emailErr);
    setPasswordError('');

    if (emailErr || !normalizedEmail.includes('@')) {
      showAlert('error', 'Fix Email', userType === 'agent' ? 'Agent login now uses registered email + password. Rep ID login can be added later.' : (emailErr || 'Enter a valid admin email.'));
      return;
    }
    if (!password) {
      setPasswordError('Password is required');
      showAlert('error', 'Missing Password', 'Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // ADMIN MODE remains on the protected fshub_admins table for now.
      if (userType === 'admin') {
        const adminResult = await DatabaseEngine.verifyAdminCredentials(normalizedEmail, password);
        setIsLoading(false);
        if (!adminResult.success) {
          showAlert('error', 'Admin Login Failed', adminResult.message);
          return;
        }
        await SupabaseAuth.signOut();
        await DatabaseEngine.saveSession(adminResult.admin);
        showAlert('success', 'Admin Access Granted', `Welcome ${adminResult.admin.name}!`);
        setTimeout(() => {
          closeAlert();
          router.replace('/admin');
        }, 1200);
        return;
      }

      // AGENT MODE: Supabase Auth email/password first, then load FS Hub profile.
      const authResult = await SupabaseAuth.signInRep({ email: normalizedEmail, password });
      if (!authResult.success) {
        setIsLoading(false);
        showAlert('error', 'Login Failed', authResult.message + '');
        return;
      }

      const profileResult = await DatabaseEngine.getRepByIdOrEmail(authResult.user.email);
      if (!profileResult.success) {
        await SupabaseAuth.signOut();
        setIsLoading(false);
        showAlert('error', 'Profile Missing', 'Supabase Auth login worked, but no FS Hub rep profile was found for this email. Please sign up again or contact admin.');
        return;
      }

      const rep = { ...profileResult.rep, auth_user_id: authResult.user.id, accountType: 'rep' };
      OrderStore.setCurrentAgent({ ...rep, isCurrent: true });
      OrderStore.addNewRep({ ...rep, isCurrent: true });
      await DatabaseEngine.saveSession(rep);

      setIsLoading(false);
      showAlert('success', 'Welcome Back!', `Officer ${rep.name || normalizedEmail} — ${rep.zone || 'Ikeja'}`);
      setTimeout(() => {
        closeAlert();
        router.replace('/home');
      }, 900);

    } catch (e) {
      setIsLoading(false);
      showAlert('error', 'Error', e.message);
    }
  };

  const isAdmin = userType === 'admin';
  const pwdLiveCheck = validatePassword(password);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#BFDBFE', '#DBEAFE', '#EFF6FF', '#FFFFFF']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.gradientBg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.centerWrapper}>
            <View style={styles.logoSection}>
              <View style={[styles.logoRing, isAdmin && { borderColor: '#F59E0B' }]}>
                <Text style={[styles.logoText, isAdmin && { color: '#F59E0B' }]}>{isAdmin ? 'HQ' : 'FS'}</Text>
              </View>
              <Text style={styles.title}>FS HUB</Text>
              <Text style={styles.subtitle}>Premium Field Services Platform</Text>
              <Text style={styles.welcome}>Welcome Back!</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN MODE • Primary Admin</Text>
                </View>
              )}
              <Text style={styles.tagline}>Secure • Fast • Professional</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, emailError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isAdmin ? "Admin Email" : "Registered Email"}
                  placeholderTextColor="#94A3B8"
                  value={repId}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
                {repId.length > 0 && !emailError && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              <View style={[styles.inputWrapper, passwordError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} disabled={isLoading}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {false && password.length > 0 && (
                <View style={styles.checklistBox}>
                  <Text style={styles.checklistTitle}>Password must contain:</Text>
                  <View style={styles.checkRow}><Ionicons name={pwdLiveCheck.checks.length ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.length ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkText, pwdLiveCheck.checks.length && { color: '#059669' }]}> At least 8 characters</Text></View>
                  <View style={styles.checkRow}><Ionicons name={pwdLiveCheck.checks.uppercase ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.uppercase ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkText, pwdLiveCheck.checks.uppercase && { color: '#059669' }]}> Uppercase (A-Z)</Text></View>
                  <View style={styles.checkRow}><Ionicons name={pwdLiveCheck.checks.lowercase ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.lowercase ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkText, pwdLiveCheck.checks.lowercase && { color: '#059669' }]}> Lowercase (a-z)</Text></View>
                  <View style={styles.checkRow}><Ionicons name={pwdLiveCheck.checks.number ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.number ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkText, pwdLiveCheck.checks.number && { color: '#059669' }]}> Number (0-9)</Text></View>
                  <View style={styles.checkRow}><Ionicons name={pwdLiveCheck.checks.special ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.special ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkText, pwdLiveCheck.checks.special && { color: '#059669' }]}> Special char (!@#$)</Text></View>
                </View>
              )}
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

              {alert && <AlertCard {...alert} onClose={closeAlert} />}

              <TouchableOpacity
                style={[styles.loginBtn, isAdmin && { backgroundColor: '#F59E0B' }, isLoading && { backgroundColor: '#94A3B8' }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>LOG IN</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToggleAdminMode} style={styles.linkBtn}>
                <Text style={[styles.linkText, isAdmin && { color: '#F59E0B' }]}>{isAdmin ? '⬅️ Return to Field Sign In' : 'Admin Portal Access'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/signup')} style={styles.linkBtnSecondary}>
                <Text style={styles.linkTextSecondary}>Register New Account (Required First Time)</Text>
              </TouchableOpacity>

              {userType === 'agent' && (
                <TouchableOpacity onPress={() => router.push('/forgot')} style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: '#60A5FA', fontSize: 13 }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  centerWrapper: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 26 },
  logoRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, borderColor: '#2563EB', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  logoText: { color: '#1E3A8A', fontSize: 36, fontWeight: '900' },
  title: { color: '#1E3A8A', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#334155', fontSize: 14, marginTop: 4, fontWeight: '500', textAlign: 'center' },
  welcome: { color: '#0F172A', fontSize: 22, fontWeight: '700', marginTop: 18 },
  infoPill: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8, color: '#2563EB', fontSize: 11, fontWeight: '700' },
  adminBadge: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  adminBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '800' },
  tagline: { color: '#64748B', fontSize: 12, marginTop: 8, fontWeight: '600' },

  // Nice Alert Card styles
  alertCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  inputGroup: { marginTop: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, marginBottom: 6, height: 56 },
  vectorIcon: { marginRight: 10 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '500' },
  eyeBtn: { padding: 6, marginLeft: 6 },
  errorText: { color: '#EF4444', fontSize: 11, marginBottom: 10, marginLeft: 4, fontWeight: '600' },
  checklistBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, marginBottom: 12, marginTop: 2 },
  checklistTitle: { fontSize: 11, fontWeight: '800', color: '#334155', marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  checkText: { fontSize: 11, color: '#64748B', marginLeft: 6 },
  loginBtn: { backgroundColor: '#2563EB', height: 52, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 14, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.6 },
  linkBtn: { alignItems: 'center', marginTop: 22 },
  linkText: { color: '#1E3A8A', fontSize: 15, fontWeight: '700' },
  linkBtnSecondary: { alignItems: 'center', marginTop: 16 },
  linkTextSecondary: { color: '#1E3A8A', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  // Popup overlay for centered alert card
  popupOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 24,
  },
  popupCard: {
    borderWidth: 2,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  popupCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popupCloseBtn: {
    padding: 4,
  },
  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 10, marginTop: 24 },
});
