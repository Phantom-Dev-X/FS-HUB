// FS HUB - FINAL ELEGANT WHITE + LINEAR GRADIENT + VALIDATION + DATABASE LINKED
// - Email regex + strong password checklist
// - BLOCKS login without account (checks DatabaseEngine reps)
// - Admin primary peterpatrick@gmail.com / fshubadmin allowed
// - Saves session and sets OrderStore.currentAgent
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

export default function LoginScreen() {
  const [userType, setUserType] = useState('agent');
  const [repId, setRepId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [repCount, setRepCount] = useState(0);

  useEffect(() => {
    // Init DB and check how many reps exist
    DatabaseEngine.initDatabase().then(() => {
      DatabaseEngine.getAllReps().then(reps => setRepCount(reps.length));
    });
  }, []);

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
    if (repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && pwd === 'fshubadmin') {
      return { valid: true, checks: { length: true, uppercase: true, lowercase: true, number: true, special: true }, errors: [], message: '' };
    }
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
    const result = validatePassword(text);
    if (text && !result.valid && !(repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && text === 'fshubadmin')) {
      setPasswordError(result.message);
    } else {
      setPasswordError('');
    }
  };

  const handleToggleAdminMode = () => {
    if (userType === 'agent') {
      setUserType('admin');
      setRepId('peterpatrick@gmail.com');
      setPassword('fshubadmin');
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

  const handleLogin = async () => {
    const emailErr = validateEmail(repId);
    const pwdResult = validatePassword(password);
    setEmailError(emailErr);
    const isPrimaryAdmin = repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && password === 'fshubadmin';
    if (!isPrimaryAdmin && !pwdResult.valid) setPasswordError(pwdResult.message);

    if (emailErr) {
      Alert.alert('Fix Email ⚠️', emailErr);
      return;
    }
    if (!isPrimaryAdmin && !pwdResult.valid) {
      Alert.alert('Weak Password 🔒', `Password must have:\n• At least 8 chars\n• Uppercase (A-Z)\n• Lowercase (a-z)\n• Number (0-9)\n• Special char (!@#$)\n\nIssues:\n${pwdResult.message}`);
      return;
    }
    if (!repId || !password) {
      Alert.alert('Missing Credentials ⚠️', 'Please fill both fields.');
      return;
    }

    setIsLoading(true);

    try {
      // ADMIN MODE
      if (userType === 'admin') {
        if (isPrimaryAdmin) {
          // Primary super admin allowed always
          await DatabaseEngine.saveSession({ id: 'ADM-001', name: 'Peter Patrick', email: 'peterpatrick@gmail.com', role: 'Primary Super Admin' });
          setIsLoading(false);
          Alert.alert('👑 Primary Super Admin Unlocked!', 'Welcome back, Mr. Peter Patrick!', [{ text: 'Open Admin Suite 🚀', onPress: () => router.replace('/admin') }]);
          return;
        } else {
          // Check if other admin exists in storage (future)
          // For now, allow any admin email that is not primary but exists in admin list? We check reps as well
          // If you created additional admins via admin portal, they would be in ADMINS key - we check
          const adminsData = await (await import('@react-native-async-storage/async-storage')).default.getItem('@fshub_table_admins');
          const admins = adminsData ? JSON.parse(adminsData) : [];
          const foundAdmin = admins.find(a => a.email?.toLowerCase() === repId.toLowerCase().trim());
          if (foundAdmin) {
            await DatabaseEngine.saveSession(foundAdmin);
            setIsLoading(false);
            Alert.alert('🏢 Admin Access Granted!', `Welcome ${foundAdmin.name}!`, [{ text: 'Open Admin Suite 🚀', onPress: () => router.replace('/admin') }]);
            return;
          } else {
            setIsLoading(false);
            Alert.alert('Admin Not Found ❌', `No admin account found for "${repId}". Only peterpatrick@gmail.com is primary, or create new admin inside admin portal after logging in as primary.`);
            return;
          }
        }
      }

      // AGENT MODE - MUST EXIST IN DATABASE - THIS FIXES "LOGIN WITHOUT ACCOUNT"
      const verifyResult = await DatabaseEngine.verifyRepCredentials(repId, password);
      
      if (!verifyResult.success) {
        setIsLoading(false);
        Alert.alert('Login Failed ❌', verifyResult.message + `\n\nRegistered reps: ${repCount}. If 0, please tap "Register New Account" first to create your officer profile, then it will be saved to Supabase cloud.`, [
          { text: 'Go to Signup', onPress: () => router.push('/signup') },
          { text: 'OK' }
        ]);
        return;
      }

      // Success - save session and set current agent in OrderStore
      const rep = verifyResult.rep;
      OrderStore.setCurrentAgent({ ...rep, isCurrent: true });
      OrderStore.addNewRep({ ...rep, isCurrent: true });
      await DatabaseEngine.saveSession(rep);
      
      // Refresh rep count
      DatabaseEngine.getAllReps().then(reps => setRepCount(reps.length));

      setIsLoading(false);
      Alert.alert('📱 Field Portal Unlocked!', `Welcome back, Officer ${rep.name || repId}! Territory: ${rep.zone || 'Ikeja'}`, [
        { text: 'Open Dashboard ➔', onPress: () => router.replace('/home') }
      ]);

    } catch (e) {
      setIsLoading(false);
      Alert.alert('Error', e.message);
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
              <Text style={styles.infoPill}>📊 {repCount} reps registered • Must signup first</Text>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN MODE • Primary Admin</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={[styles.inputWrapper, emailError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput style={styles.input} placeholder={isAdmin ? "Admin Email" : "Enter Rep ID / Email"} placeholderTextColor="#94A3B8" value={repId} onChangeText={handleEmailChange} autoCapitalize="none" keyboardType={isAdmin ? "email-address" : "default"} />
                {repId.length > 0 && !emailError && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              <View style={[styles.inputWrapper, passwordError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput style={styles.input} placeholder="Password (8+ chars, A-Z, a-z, 0-9, !@#)" placeholderTextColor="#94A3B8" value={password} onChangeText={handlePasswordChange} secureTextEntry={!showPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {password.length > 0 && (
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

              <TouchableOpacity style={[styles.loginBtn, isAdmin && { backgroundColor: '#F59E0B' }, isLoading && { backgroundColor: '#94A3B8' }]} onPress={handleLogin} disabled={isLoading}>
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

            <Text style={styles.footer}>Secure • Regex Validated • DB Linked • Must signup before login • {repCount} reps stored</Text>
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
  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 10, marginTop: 24 },
});
