// FS HUB - FINAL ELEGANT WHITE + LINEAR GRADIENT + VALIDATION
// - Smooth blue gradient via expo-linear-gradient
// - Ionicons for elegant eye icons
// - Email regex validation + strong password validation (uppercase, lowercase, number, special char, 8+ chars)
import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [userType, setUserType] = useState('agent');
  const [repId, setRepId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ==================== VALIDATION HELPERS ====================
  const validateEmail = (email) => {
    // Gmail / any email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email / Rep ID is required';
    if (email.includes('@')) {
      if (!emailRegex.test(email.trim())) {
        return 'Invalid email format. e.g: name@gmail.com';
      }
    } else {
      // Rep ID validation: at least 3 chars alphanumeric + dash
      const repIdRegex = /^[A-Za-z0-9-]{3,}$/;
      if (!repIdRegex.test(email.trim())) {
        return 'Rep ID must be at least 3 chars (letters/numbers/-)';
      }
    }
    return '';
  };

  const validatePassword = (pwd) => {
    // Primary admin exception: allow fshubadmin for peterpatrick@gmail.com
    if (repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && pwd === 'fshubadmin') {
      return { valid: true, errors: [], message: '' };
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

    // For AGENT mode, enforce strong password; for ADMIN other, also enforce but less strict?
    return {
      valid: errors.length === 0,
      checks,
      errors,
      message: errors.length ? errors.join('\n') : '',
    };
  };

  // Live validation as user types
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

  const handleLogin = () => {
    // Final validation before login
    const emailErr = validateEmail(repId);
    const pwdResult = validatePassword(password);

    setEmailError(emailErr);
    
    // Allow primary admin exception
    const isPrimaryAdmin = repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && password === 'fshubadmin';
    
    if (!isPrimaryAdmin && !pwdResult.valid) {
      setPasswordError(pwdResult.message);
    }

    if (emailErr) {
      Alert.alert('Fix Email ⚠️', emailErr);
      return;
    }
    if (!isPrimaryAdmin && !pwdResult.valid) {
      Alert.alert('Weak Password 🔒', `Password must have:\n• At least 8 chars\n• Uppercase (A-Z)\n• Lowercase (a-z)\n• Number (0-9)\n• Special char (!@#$)\n\nCurrent issues:\n${pwdResult.message}`);
      return;
    }
    if (!repId || !password) {
      Alert.alert('Missing Credentials ⚠️', 'Please fill both fields.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (userType === 'admin') {
        Alert.alert('👑 Admin Access Granted!', `Welcome!`, [
          { text: 'Open Admin ➔', onPress: () => router.replace('/admin') }
        ]);
      } else {
        Alert.alert('📱 Field Portal Unlocked!', `Welcome Officer ${repId}!`, [
          { text: 'Open Dashboard ➔', onPress: () => router.replace('/home') }
        ]);
      }
    }, 900);
  };

  const isAdmin = userType === 'admin';
  const pwdLiveCheck = validatePassword(password);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#BFDBFE', '#DBEAFE', '#EFF6FF', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientBg}
      />

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
            </View>

            <View style={styles.inputGroup}>
              
              <View style={[styles.inputWrapper, emailError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="person-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder={isAdmin ? "Admin Email" : "Enter Rep ID / Email"}
                  placeholderTextColor="#94A3B8"
                  value={repId}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType={isAdmin ? "email-address" : "default"}
                />
                {repId.length > 0 && !emailError && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                )}
              </View>
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

              <View style={[styles.inputWrapper, passwordError ? { borderColor: '#EF4444', borderWidth: 2 } : {}]}>
                <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.vectorIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Password (8+ chars, A-Z, a-z, 0-9, !@#)"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeBtn}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={22} 
                    color="#64748B" 
                  />
                </TouchableOpacity>
              </View>

              {/* Live password strength checklist - elegant */}
              {password.length > 0 && (
                <View style={styles.checklistBox}>
                  <Text style={styles.checklistTitle}>Password must contain:</Text>
                  <View style={styles.checkRow}>
                    <Ionicons name={pwdLiveCheck.checks.length ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.length ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.checkText, pwdLiveCheck.checks.length && { color: '#059669' }]}> At least 8 characters</Text>
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons name={pwdLiveCheck.checks.uppercase ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.uppercase ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.checkText, pwdLiveCheck.checks.uppercase && { color: '#059669' }]}> Uppercase letter (A-Z)</Text>
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons name={pwdLiveCheck.checks.lowercase ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.lowercase ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.checkText, pwdLiveCheck.checks.lowercase && { color: '#059669' }]}> Lowercase letter (a-z)</Text>
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons name={pwdLiveCheck.checks.number ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.number ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.checkText, pwdLiveCheck.checks.number && { color: '#059669' }]}> Number (0-9)</Text>
                  </View>
                  <View style={styles.checkRow}>
                    <Ionicons name={pwdLiveCheck.checks.special ? "checkmark-circle" : "close-circle"} size={16} color={pwdLiveCheck.checks.special ? "#10B981" : "#94A3B8"} />
                    <Text style={[styles.checkText, pwdLiveCheck.checks.special && { color: '#059669' }]}> Special char (!@#$%^&*)</Text>
                  </View>
                  {repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && password === 'fshubadmin' && (
                    <Text style={{ color: '#F59E0B', fontSize: 11, marginTop: 6, fontWeight: '700' }}>👑 Primary admin exception allowed</Text>
                  )}
                </View>
              )}
              {passwordError ? <Text style={[styles.errorText, { marginTop: password.length > 0 ? 0 : -6 }]}>{passwordError}</Text> : null}

              <TouchableOpacity 
                style={[styles.loginBtn, isAdmin && { backgroundColor: '#F59E0B' }, (emailError || passwordError) && { opacity: 0.7 }, isLoading && { backgroundColor: '#94A3B8' }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>LOG IN</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToggleAdminMode} style={styles.linkBtn}>
                <Text style={[styles.linkText, isAdmin && { color: '#F59E0B' }]}>
                  {isAdmin ? '⬅️ Return to Field Sign In' : 'Admin Portal Access'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/signup')} style={styles.linkBtnSecondary}>
                <Text style={styles.linkTextSecondary}>Register New Account</Text>
              </TouchableOpacity>

              {userType === 'agent' && (
                <TouchableOpacity onPress={() => router.push('/forgot')} style={{ alignItems: 'center', marginTop: 12 }}>
                  <Text style={{ color: '#60A5FA', fontSize: 13 }}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.footer}>Secure • Regex Validated • Premium White • peterpatrick@gmail.com = Primary Admin</Text>

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
  logoRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 5, borderColor: '#2563EB',
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  logoText: { color: '#1E3A8A', fontSize: 36, fontWeight: '900' },
  title: { color: '#1E3A8A', fontSize: 34, fontWeight: '900' },
  subtitle: { color: '#334155', fontSize: 14, marginTop: 4, fontWeight: '500', textAlign: 'center' },
  welcome: { color: '#0F172A', fontSize: 22, fontWeight: '700', marginTop: 18 },
  adminBadge: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  adminBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '800' },
  inputGroup: { marginTop: 10 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, marginBottom: 6, height: 56,
  },
  vectorIcon: { marginRight: 10 },
  input: { flex: 1, color: '#0F172A', fontSize: 15, fontWeight: '500' },
  eyeBtn: { padding: 6, marginLeft: 6 },
  errorText: { color: '#EF4444', fontSize: 11, marginBottom: 10, marginLeft: 4, fontWeight: '600' },
  checklistBox: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 10, marginBottom: 12, marginTop: 2,
  },
  checklistTitle: { fontSize: 11, fontWeight: '800', color: '#334155', marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  checkText: { fontSize: 11, color: '#64748B', marginLeft: 6 },
  loginBtn: {
    backgroundColor: '#2563EB', height: 52, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    marginTop: 14, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.6 },
  linkBtn: { alignItems: 'center', marginTop: 22 },
  linkText: { color: '#1E3A8A', fontSize: 15, fontWeight: '700' },
  linkBtnSecondary: { alignItems: 'center', marginTop: 16 },
  linkTextSecondary: { color: '#1E3A8A', fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#94A3B8', fontSize: 10, marginTop: 24 },
});
