import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';
import { SupabaseAuth, getPasswordResetRedirectTo } from './_SupabaseAuth';

export default function ForgotPasswordScreen() {
  const { isDark, toggleTheme } = useTheme();

  // Look right right here: 2-Step OTP Reset Wizard state!
  const [step, setStep] = useState(1); // Step 1: Send OTP, Step 2: Verify & Reset

  const [repEmail, setRepEmail] = useState('');
  const [repId, setRepId] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [resetRep, setResetRep] = useState(null);

  // Step 2 Form Inputs
  const [inputtedOtp, setInputtedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const isExpoGo = Constants.appOwnership === 'expo';

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
  };

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) return 'Email is required.';
    if (!emailRegex.test(email.trim())) return 'Enter a valid email address.';
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
    if (!checks.uppercase) errors.push('1 uppercase letter');
    if (!checks.lowercase) errors.push('1 lowercase letter');
    if (!checks.number) errors.push('1 number');
    if (!checks.special) errors.push('1 special character');
    return { valid: errors.length === 0, errors };
  };

  // =========================================================================
  // STEP 1: Expo Go uses OTP because custom app schemes do not belong to Expo Go.
  // Packaged/dev builds use Supabase recovery deep links (fshub://reset-password).
  // =========================================================================
  const handleSendOtp = async () => {
    const emailErr = validateEmail(repEmail);
    if (emailErr) {
      Alert.alert('Invalid Email ⚠️', emailErr);
      return;
    }

    setIsLoading(true);

    if (!isExpoGo) {
      const res = await SupabaseAuth.sendPasswordResetEmail(repEmail.trim());
      setIsLoading(false);
      if (res.success) {
        Alert.alert(
          '📧 Reset Link Sent!',
          `Supabase sent a secure reset link to "${repEmail.trim().toLowerCase()}".\n\nOpen the email on this phone. Because this is a packaged/dev build, the link should open FS Hub directly.\n\nRedirect used:\n${getPasswordResetRedirectTo()}`
        );
      } else {
        Alert.alert('Reset Link Failed ❌', res.message || 'Could not send Supabase password reset email.');
      }
      return;
    }

    const res = await SupabaseAuth.sendEmailOtp(repEmail.trim());
    setIsLoading(false);

    if (res.success) {
      setStep(2);
      setInputtedOtp('');
      Alert.alert(
        '📧 OTP Code Sent!',
        `Supabase sent a sign-in OTP code to "${repEmail.trim().toLowerCase()}".\n\nYou are using Expo Go, so do NOT tap the link/button. Copy the numeric OTP code from the email and enter it in the app, then choose a new password.`
      );
    } else {
      Alert.alert('OTP Send Failed ❌', res.message || 'Could not send Supabase OTP email.');
    }
  };

  // =========================================================================
  // STEP 2: VERIFY SUPABASE OTP, THEN UPDATE AUTH PASSWORD
  // =========================================================================
  const handleVerifyAndReset = async () => {
    if (!inputtedOtp.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Incomplete Form ⚠️', 'Please enter the email OTP code and your new password twice.');
      return;
    }

    const cleanInput = inputtedOtp.trim().replace(/[^0-9]/g, '');
    if (cleanInput.length < 6) {
      Alert.alert('Invalid OTP ❌', 'Enter the numeric OTP code from your Supabase email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch ⚠️', 'Your new password and confirmation password do not match. Please re-type them carefully.');
      return;
    }

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      Alert.alert('Weak Password 🔒', `Password must contain:\n• ${pwdCheck.errors.join('\n• ')}`);
      return;
    }

    setIsLoading(true);
    const verified = await SupabaseAuth.verifyEmailOtp(repEmail.trim(), cleanInput);
    if (!verified.success) {
      setIsLoading(false);
      Alert.alert('OTP Verification Failed', verified.message || 'The OTP code is incorrect or expired. Please request a new code.');
      return;
    }

    const update = await SupabaseAuth.updatePassword(newPassword);
    setIsLoading(false);

    if (!update.success) {
      Alert.alert('Password Update Failed', update.message || 'Could not update password in Supabase. Please retry.');
      return;
    }

    Alert.alert(
      '🎉 Password Reset Successfully!',
      `Your Supabase Auth password has been updated. You can now log in with your email and new password.`,
      [{ text: 'Proceed to Login 🚀', onPress: () => router.replace('/') }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/')} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Login</Text>
          </TouchableOpacity>

          <Text style={[styles.mainTitle, { color: colors.amber }]} numberOfLines={1} adjustsFontSizeToFit={true}>
            🔑 RESET PASSWORD
          </Text>

        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          {isExpoGo
            ? 'Expo Go mode: we send an email OTP code, then you type it here to set a new password.'
            : 'Installed app mode: Supabase sends a deep-link reset email that opens FS Hub directly.'}
        </Text>

        {/* Step Progress Bar */}
        <View style={styles.stepIndicatorRow}>
          <View style={[styles.stepBar, { backgroundColor: step >= 1 ? colors.amber : colors.border }]} />
          <View style={[styles.stepBar, { backgroundColor: step >= 2 ? colors.green : colors.border }]} />
        </View>

        {/* =========================================================================
            STEP 1: REQUEST OTP CODE (`step === 1`)
            ========================================================================= */}
        {step === 1 ? (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.amber }]}>
            <View style={[styles.noteBox, { backgroundColor: colors.background }]}>
              <Text style={styles.noteText}>
                {isExpoGo
                  ? 'ℹ️ Enter your registered email below. Supabase will send a numeric OTP code. Copy the code into this app — no link tapping needed in Expo Go.'
                  : 'ℹ️ Enter your registered email below. Supabase will send a secure deep-link reset email that opens FS Hub directly.'}
              </Text>
            </View>

            {false && (
              <>
                <Text style={[styles.label, { color: colors.subText }]}>REP ID / OFFICER CODE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                  placeholder="e.g. REP-2049"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                  value={repId}
                  onChangeText={setRepId}
                />
              </>
            )}

            <Text style={[styles.label, { color: colors.amber }]}>REGISTERED EMAIL *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.amber, borderWidth: 1.5, color: colors.mainText }]}
              placeholder="e.g. skybrown585@gmail.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={repEmail}
              onChangeText={setRepEmail}
            />

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.amber }, isLoading && { backgroundColor: '#475569' }]}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>{isExpoGo ? '⚡ SEND SUPABASE OTP CODE ➔' : '⚡ SEND DEEP-LINK RESET EMAIL ➔'}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* =========================================================================
              STEP 2: ENTER OTP & NEW SECRET PASSWORD (`step === 2`)
              ========================================================================= */
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
            <View style={[styles.noteBox, { backgroundColor: '#064E3B', borderLeftColor: colors.green }]}>
              <Text style={[styles.noteText, { color: '#A7F3D0' }]}>
                ✅ OTP Sent to <Text style={{fontWeight: '900', color: '#FFF'}}>{repEmail}</Text>! Check your email and enter the numeric code below to create your new password. Do not tap the email link/button.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.green }]}>ENTER SUPABASE EMAIL OTP CODE *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.green, borderWidth: 1.5, color: colors.mainText, fontSize: 18, fontWeight: '900', letterSpacing: 3, textAlign: 'center' }]}
              placeholder="e.g. 12345678"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              maxLength={10}
              value={inputtedOtp}
              onChangeText={setInputtedOtp}
            />

            <Text style={[styles.label, { color: colors.subText }]}>CREATE NEW SECRET PASSWORD *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={[styles.label, { color: colors.subText }]}>CONFIRM NEW SECRET PASSWORD *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="Re-type new secret password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green }, isLoading && { backgroundColor: '#475569' }]} onPress={handleVerifyAndReset} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionBtnText}>🔒 VERIFY OTP & UPDATE SUPABASE PASSWORD ✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(1)} style={styles.resendLinkRow}>
              <Text style={[styles.resendLinkText, { color: colors.cyan }]}>Didn't receive the email? <Text style={{fontWeight: '900'}}>Resend OTP Code</Text></Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: '900',
    flexShrink: 1,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  subText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  formCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    elevation: 4,
    marginBottom: 20,
  },
  noteBox: {
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 16,
  },
  noteText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    marginTop: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  resendLinkRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendLinkText: {
    fontSize: 12,
  },
});
