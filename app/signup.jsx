// SIGNUP WITH STRONG VALIDATION - Email regex + Password strength
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailService } from './_EmailService';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const { isDark, colors } = useTheme();
  
  const [fullName, setFullName] = useState('');
  // Keep this empty: a shared prefilled ID (formerly REP-2050) caused every
  // subsequent signup to collide with the first account's primary key.
  const [repId, setRepId] = useState('');
  const [territory, setTerritory] = useState('Ikeja Commercial Zone');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email.trim())) return 'Invalid email. Must be like name@gmail.com';
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
    if (!checks.length) errors.push('At least 8 chars');
    if (!checks.uppercase) errors.push('1 uppercase (A-Z)');
    if (!checks.lowercase) errors.push('1 lowercase (a-z)');
    if (!checks.number) errors.push('1 number (0-9)');
    if (!checks.special) errors.push('1 special char (!@#$)');
    return { valid: errors.length === 0, checks, errors, message: errors.join(', ') };
  };

  const handleCompleteSignup = async () => {
    if (!fullName.trim() || !repId.trim() || !territory.trim() || !gmail.trim() || !password) {
      Alert.alert('Incomplete Form ⚠️', 'Please fill all fields.');
      return;
    }

    const normalizedRepId = repId.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,30}$/.test(normalizedRepId)) {
      Alert.alert('Invalid Rep ID ⚠️', 'Use 3–30 letters, numbers, or hyphens, for example REP-2051.');
      return;
    }

    const emailErr = validateEmail(gmail);
    if (emailErr) {
      Alert.alert('Invalid Email ⚠️', emailErr);
      return;
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      Alert.alert('Weak Password 🔒', `Password must contain:\n• ${pwdCheck.errors.join('\n• ')}`);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch ⚠️', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const repCoords = OrderStore.repLocation || { latitude: 6.6018, longitude: 3.3515 };
    const newOfficerProfile = {
      id: normalizedRepId,
      fullName: fullName.trim(),
      name: `${fullName.trim()} (Field Officer)`,
      zone: `${territory.trim()} • Route #${Math.floor(10 + Math.random()*80)}`,
      territory: territory.trim(),
      email: gmail.trim().toLowerCase(),
      password: password, // stored locally for login verification (and pushed to cloud as placeholder)
      status: '🟢 Active in Field • Online Today',
      coordinate: { latitude: repCoords.latitude + (Math.random()*0.01 - 0.005), longitude: repCoords.longitude + (Math.random()*0.01 - 0.005) },
      salesVolume: '₦0 Today (Clean Baseline)',
      initials: fullName.trim().substring(0,2).toUpperCase(),
      avatar: null,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase FIRST - must succeed, otherwise show real error
    console.log('[Signup] Attempting to backup to Supabase...', newOfficerProfile.id);
    const saveRes = await DatabaseEngine.saveNewRep(newOfficerProfile);
    
    if (!saveRes.success) {
      console.log('[Signup] Supabase save FAILED:', saveRes.error);
      setIsLoading(false);
      Alert.alert(
        '❌ Database Save Failed - Account NOT Backed Up!',
        `Your account was NOT saved to Supabase cloud. Admin will see 0 reps.\n\nError: ${saveRes.error}\n\nFix:\n1. Go to Supabase SQL Editor\n2. Run SUPABASE_ADD_MISSING_COLUMNS.sql (adds password column)\n3. Then try signup again with NEW Rep ID (old email may be duplicate)\n\nDetails: ${saveRes.error}`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('[Signup] Supabase save SUCCESS - Rep backed up to cloud ✅');

    // Only if DB save succeeded, save to memory and session
    OrderStore.addNewRep({ ...newOfficerProfile, isCurrent: true });
    OrderStore.setCurrentAgent(newOfficerProfile);
    await DatabaseEngine.saveSession(newOfficerProfile);
    
    const res = await EmailService.sendAgentWelcomeEmail({ agentName: fullName.trim(), repId: repId.trim(), territory: territory.trim(), toEmail: gmail.trim() });
    setIsLoading(false);

    if (res.success) {
      Alert.alert('🎉 Officer Registered & Backed Up to Supabase!', `Welcome ${fullName.trim()}!\n\n✅ Saved to Supabase fshub_reps table\n✅ Admin will now see you\n✅ Confirmation email sent to ${gmail.trim()}\n\nNow go to Supabase Table Editor -> fshub_reps -> you will see ${repId.trim()} row!`, [{ text: 'Proceed to Home 🚀', onPress: () => router.replace('/home') }]);
    } else {
      Alert.alert('Registered & Backed Up (Email Notice)', `Account saved to Supabase ✅ but email failed: ${res.message}\n\nCheck Supabase fshub_reps - you should see ${repId.trim()} row.`, [{ text: 'Proceed ➔', onPress: () => router.replace('/home') }]);
    }
  };

  const pwdLive = validatePassword(password);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.push('/')} style={[styles.backBtn, { borderColor: colors.border }]}>
              <Ionicons name="arrow-back" size={16} color={colors.cyan} />
              <Text style={[styles.backText, { color: colors.cyan }]}> Back to Login</Text>
            </TouchableOpacity>
            <Text style={[styles.mainTitle, { color: colors.green }]}>📝 AGENT ONBOARDING</Text>
          </View>
          <Text style={[styles.subText, { color: colors.subText }]}>Register device with validated email & strong password (8+ chars, A-Z, a-z, 0-9, !@#)</Text>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
            <Text style={[styles.label, { color: colors.subText }]}>FULL NAME *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]} placeholder="e.g. Tunde Balogun" placeholderTextColor="#64748B" value={fullName} onChangeText={setFullName} />

            <Text style={[styles.label, { color: colors.subText }]}>REP ID *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]} placeholder="REP-2050" autoCapitalize="characters" value={repId} onChangeText={setRepId} />

            <Text style={[styles.label, { color: colors.subText }]}>TERRITORY *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]} placeholder="Ikeja Commercial Zone" value={territory} onChangeText={setTerritory} />

            <Text style={[styles.label, { color: colors.green }]}>OFFICER GMAIL * (regex validated)</Text>
            <View style={[styles.input, { backgroundColor: colors.background, borderColor: gmail && validateEmail(gmail) ? '#EF4444' : colors.green, flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
              <Ionicons name="mail-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput style={{ flex: 1, color: colors.mainText, paddingVertical: 12 }} placeholder="name@gmail.com" keyboardType="email-address" autoCapitalize="none" value={gmail} onChangeText={setGmail} placeholderTextColor="#64748B" />
              {gmail && !validateEmail(gmail) ? <Ionicons name="checkmark-circle" size={18} color="#10B981" /> : null}
            </View>
            {gmail && validateEmail(gmail) ? <Text style={styles.err}>{validateEmail(gmail)}</Text> : null}

            <Text style={[styles.label, { color: colors.subText }]}>CREATE STRONG PASSWORD *</Text>
            <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput style={{ flex: 1, color: colors.mainText, paddingVertical: 12 }} placeholder="8+ chars, A-Z, a-z, 0-9, !@#" secureTextEntry={!showPwd} value={password} onChangeText={setPassword} placeholderTextColor="#64748B" />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ padding: 8 }}>
                <Ionicons name={showPwd ? "eye-outline" : "eye-off-outline"} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.checkBox}>
                <Text style={styles.checkTitle}>Must contain:</Text>
                <View style={styles.row}><Ionicons name={pwdLive.checks.length ? "checkmark-circle" : "close-circle"} size={14} color={pwdLive.checks.length ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkT, pwdLive.checks.length && { color: '#059669' }]}> 8+ chars</Text></View>
                <View style={styles.row}><Ionicons name={pwdLive.checks.uppercase ? "checkmark-circle" : "close-circle"} size={14} color={pwdLive.checks.uppercase ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkT, pwdLive.checks.uppercase && { color: '#059669' }]}> Uppercase A-Z</Text></View>
                <View style={styles.row}><Ionicons name={pwdLive.checks.lowercase ? "checkmark-circle" : "close-circle"} size={14} color={pwdLive.checks.lowercase ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkT, pwdLive.checks.lowercase && { color: '#059669' }]}> Lowercase a-z</Text></View>
                <View style={styles.row}><Ionicons name={pwdLive.checks.number ? "checkmark-circle" : "close-circle"} size={14} color={pwdLive.checks.number ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkT, pwdLive.checks.number && { color: '#059669' }]}> Number 0-9</Text></View>
                <View style={styles.row}><Ionicons name={pwdLive.checks.special ? "checkmark-circle" : "close-circle"} size={14} color={pwdLive.checks.special ? "#10B981" : "#94A3B8"} /><Text style={[styles.checkT, pwdLive.checks.special && { color: '#059669' }]}> Special !@#$</Text></View>
              </View>
            )}

            <Text style={[styles.label, { color: colors.subText }]}>CONFIRM PASSWORD *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]} placeholder="Re-type" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholderTextColor="#64748B" />

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green }, isLoading && { backgroundColor: '#475569' }]} onPress={handleCompleteSignup} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>⚡ COMPLETE ONBOARDING ✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/')} style={styles.loginLinkRow}>
              <Text style={[styles.loginLinkText, { color: colors.cyan }]}>Already registered? <Text style={{fontWeight: '900'}}>Log In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  backText: { fontSize: 12, fontWeight: '800', marginLeft: 4 },
  mainTitle: { fontSize: 16, fontWeight: '900' },
  subText: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  formCard: { borderRadius: 18, padding: 18, borderWidth: 1.5, elevation: 4, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 8 },
  err: { color: '#EF4444', fontSize: 11, marginBottom: 6, fontWeight: '600' },
  checkBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, marginBottom: 12 },
  checkTitle: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  checkT: { fontSize: 11, color: '#64748B', marginLeft: 4 },
  actionBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  loginLinkRow: { alignItems: 'center', marginTop: 18 },
  loginLinkText: { fontSize: 12 },
});
