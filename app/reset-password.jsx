import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SupabaseAuth } from './_SupabaseAuth';

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
  if (!checks.uppercase) errors.push('1 uppercase letter');
  if (!checks.lowercase) errors.push('1 lowercase letter');
  if (!checks.number) errors.push('1 number');
  if (!checks.special) errors.push('1 special character');
  return { valid: errors.length === 0, checks, errors };
};

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const [isPreparing, setIsPreparing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const prepareSessionFromUrl = async (url) => {
    setIsPreparing(true);
    setErrorText('');
    const result = await SupabaseAuth.setSessionFromUrl(url);
    if (result.success) {
      setSessionReady(true);
    } else {
      setSessionReady(false);
      setErrorText(result.message || 'Could not read the reset link. Please open the latest reset email link again.');
    }
    setIsPreparing(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!mounted) return;
      if (initialUrl) {
        await prepareSessionFromUrl(initialUrl);
      } else {
        setIsPreparing(false);
        setErrorText('No reset link was detected. Go back to Forgot Password and request a fresh Supabase reset link.');
      }
    })();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      prepareSessionFromUrl(url);
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  const handleUpdatePassword = async () => {
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      Alert.alert('Weak Password 🔒', `Password must contain:\n• ${pwdCheck.errors.join('\n• ')}`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Both password fields must match.');
      return;
    }
    if (!sessionReady) {
      Alert.alert('Reset Link Not Ready', errorText || 'Please open the reset email link again.');
      return;
    }

    setIsSaving(true);
    const updated = await SupabaseAuth.updatePassword(password);
    setIsSaving(false);

    if (!updated.success) {
      Alert.alert('Password Update Failed', updated.message || 'Could not update your password.');
      return;
    }

    Alert.alert(
      'Password Updated ✅',
      'Your Supabase Auth password has been changed. Please log in with your email and new password.',
      [{ text: 'Go to Login', onPress: () => router.replace('/') }]
    );
  };

  const pwdLive = validatePassword(password);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <View style={styles.wrapper}>
        <TouchableOpacity onPress={() => router.replace('/')} style={[styles.backBtn, { borderColor: colors.border }]}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}> Back to Login</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.mainText }]}>🔐 Create New Password</Text>
          <Text style={[styles.sub, { color: colors.subText }]}>This screen is opened from your Supabase password reset email link.</Text>

          {isPreparing ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.sub, { color: colors.subText, marginTop: 10 }]}>Verifying reset link...</Text>
            </View>
          ) : !sessionReady ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Reset link not ready</Text>
              <Text style={styles.errorText}>{errorText}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/forgot')}>
                <Text style={styles.primaryBtnText}>Request New Link</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.subText }]}>NEW PASSWORD</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.mainText }]}
                  placeholder="8+ chars, A-Z, a-z, 0-9, !@#"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showPwd}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                  <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {password.length > 0 && (
                <View style={styles.checkBox}>
                  <Text style={styles.checkTitle}>Must contain:</Text>
                  <Text style={[styles.checkText, pwdLive.checks.length && styles.checkOk]}>• 8+ characters</Text>
                  <Text style={[styles.checkText, pwdLive.checks.uppercase && styles.checkOk]}>• Uppercase A-Z</Text>
                  <Text style={[styles.checkText, pwdLive.checks.lowercase && styles.checkOk]}>• Lowercase a-z</Text>
                  <Text style={[styles.checkText, pwdLive.checks.number && styles.checkOk]}>• Number 0-9</Text>
                  <Text style={[styles.checkText, pwdLive.checks.special && styles.checkOk]}>• Special !@#$</Text>
                </View>
              )}

              <Text style={[styles.label, { color: colors.subText }]}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.inputSolo, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                placeholder="Re-type new password"
                placeholderTextColor="#64748B"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity style={[styles.primaryBtn, isSaving && { backgroundColor: '#64748B' }]} onPress={handleUpdatePassword} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>UPDATE PASSWORD ✓</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  wrapper: { flex: 1, padding: 18, justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, alignItems: 'center', backgroundColor: '#FFFFFF' },
  backText: { fontSize: 12, fontWeight: '800' },
  card: { borderWidth: 1, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  sub: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  centerBox: { alignItems: 'center', paddingVertical: 24 },
  label: { fontSize: 11, fontWeight: '900', marginBottom: 6, marginTop: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14 },
  inputSolo: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, marginBottom: 14 },
  checkBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, marginBottom: 10 },
  checkTitle: { fontSize: 11, fontWeight: '900', color: '#334155', marginBottom: 4 },
  checkText: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  checkOk: { color: '#059669', fontWeight: '800' },
  primaryBtn: { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 14 },
  errorTitle: { color: '#DC2626', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  errorText: { color: '#7F1D1D', fontSize: 12, lineHeight: 18 },
});
