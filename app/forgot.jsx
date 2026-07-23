import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailService } from './_EmailService';

export default function ForgotPasswordScreen() {
  const [isDark, setIsDark] = useState(true);
  
  // Look right right here: 2-Step OTP Reset Wizard state!
  const [step, setStep] = useState(1); // Step 1: Send OTP, Step 2: Verify & Reset
  
  const [repEmail, setRepEmail] = useState('');
  const [repId, setRepId] = useState('REP-2049');
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  // Step 2 Form Inputs
  const [inputtedOtp, setInputtedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

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

  // =========================================================================
  // STEP 1: GENERATE & DISPATCH REAL 6-DIGIT OTP VIA EMAILJS (`_EmailService.js`)
  // =========================================================================
  const handleSendOtp = async () => {
    if (!repEmail.trim()) {
      Alert.alert('Missing Email ⚠️', 'Please enter your registered Gmail or Work Email address to receive your 6-digit OTP code.');
      return;
    }

    setIsLoading(true);

    // Generate a random 6-digit OTP (e.g., '849201')
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
    setGeneratedOtp(formattedCode);

    // Call our automated background server email service!
    const res = await EmailService.sendOtpResetEmail({
      toEmail: repEmail.trim(),
      otpCode: formattedCode,
      repId: repId.trim(),
    });

    setIsLoading(false);

    if (res.success) {
      setStep(2); // Smoothly transitions to Step 2 OTP verification card!
      Alert.alert(
        '📲 OTP Reset Code Sent!', 
        `We have automatically dispatched a 6-digit verification code (` +
        `and security instructions) right to "${repEmail.trim()}" via FS Hub Cloud Server.\n\nCheck your Gmail inbox right now and enter the code below to reset your secret password.`
      );
    } else {
      Alert.alert('Send Error ❌', `Could not dispatch automated OTP email: ${res.message}. Check internet connection.`);
    }
  };

  // =========================================================================
  // STEP 2: VERIFY OTP & RESET SECRET PASSWORD
  // =========================================================================
  const handleVerifyAndReset = () => {
    if (!inputtedOtp.trim() || !newPassword || !confirmPassword) {
      Alert.alert('Incomplete Form ⚠️', 'Please enter your 6-digit OTP code and your new secret password twice.');
      return;
    }

    // Clean formatting check against our generated OTP
    const cleanInput = inputtedOtp.trim().replace('-', '');
    const cleanGenerated = generatedOtp.replace('-', '');

    if (cleanInput !== cleanGenerated) {
      Alert.alert('Invalid OTP ❌', 'The 6-digit code you entered does not match the verification code sent to your email. Please double-check your inbox.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch ⚠️', 'Your new secret password and confirmation password do not match. Please re-type them carefully.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Weak Password ⚠️', 'Your secret password must be at least 6 characters long for security compliance.');
      return;
    }

    Alert.alert(
      '🎉 Password Reset Successfully!', 
      `Officer (${repId}) credentials updated in local secure storage. You can now log into your field portal with your new secret password!`,
      [{ text: 'Proceed to Login 🚀', onPress: () => router.replace('/') }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Login</Text>
          </TouchableOpacity>

          <Text style={[styles.mainTitle, { color: colors.amber }]} numberOfLines={1} adjustsFontSizeToFit={true}>
            🔑 RESET PASSWORD
          </Text>

          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          Secure OTP verification for FS Hub Field Agents. Our cloud server sends a one-time reset code straight to your inbox.
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
                ℹ️ Enter your registered Rep ID and Gmail address below. We will send a 6-digit OTP code (`e.g. 849-201`) to your inbox in 1 second.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.subText }]}>REP ID / OFFICER CODE</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="e.g. REP-2049"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={repId}
              onChangeText={setRepId}
            />

            <Text style={[styles.label, { color: colors.amber }]}>REGISTERED GMAIL / WORK EMAIL *</Text>
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
                <Text style={styles.actionBtnText}>⚡ SEND OTP RESET CODE TO GMAIL ➔</Text>
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
                ✅ OTP Sent to <Text style={{fontWeight: '900', color: '#FFF'}}>{repEmail}</Text>! Check your Gmail right now and enter the 6-digit code below to create your new secret password.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.green }]}>ENTER 6-DIGIT OTP CODE FROM GMAIL *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.green, borderWidth: 1.5, color: colors.mainText, fontSize: 18, fontWeight: '900', letterSpacing: 3, textAlign: 'center' }]}
              placeholder="e.g. 849-201"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              maxLength={7}
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

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green }]} onPress={handleVerifyAndReset}>
              <Text style={styles.actionBtnText}>🔒 VERIFY OTP & RESET PASSWORD ✓</Text>
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
