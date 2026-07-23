import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailService } from './_EmailService';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';

export default function SignupScreen() {
  const [isDark, setIsDark] = useState(true);
  
  const [fullName, setFullName] = useState('');
  const [repId, setRepId] = useState('REP-2050');
  const [territory, setTerritory] = useState('Ikeja Commercial Zone');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
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
  };

  // Look right right here: Saves new officer straight into memory & disk so Admin sees them live!
  const handleCompleteSignup = async () => {
    if (!fullName.trim() || !repId.trim() || !territory.trim() || !gmail.trim() || !password) {
      Alert.alert('Incomplete Form ⚠️', 'Please fill in all officer onboarding fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch ⚠️', 'Your secret passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password ⚠️', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    const repCoords = OrderStore.repLocation || { latitude: 6.6018, longitude: 3.3515 };
    const newOfficerProfile = {
      id: repId.trim(),
      name: `${fullName.trim()} (Field Officer)`,
      zone: `${territory.trim()} • Route #${Math.floor(10 + Math.random()*80)}`,
      email: gmail.trim(),
      status: '🟢 Active in Field • Online Today',
      coordinate: {
        latitude: repCoords.latitude + (Math.random()*0.01 - 0.005),
        longitude: repCoords.longitude + (Math.random()*0.01 - 0.005),
      },
      salesVolume: '₦0 Today (Clean Baseline)',
    };

    // 1. Save straight to memory so Admin Tab #2 sees them instantly
    OrderStore.addNewRep(newOfficerProfile);

    // 2. Save straight to disk so Admin persists them on reboot
    await DatabaseEngine.saveNewRep(newOfficerProfile);

    // 3. Dispatch automated onboarding welcome receipt via EmailJS!
    const res = await EmailService.sendAgentWelcomeEmail({
      agentName: fullName.trim(),
      repId: repId.trim(),
      territory: territory.trim(),
      toEmail: gmail.trim(),
    });

    setIsLoading(false);

    if (res.success) {
      Alert.alert(
        '🎉 Officer Registration Complete!', 
        `Welcome to FS Hub, Officer ${fullName.trim()} (${repId})!\n\nYour profile has been synchronized with the Headquarters Admin suite (` +
        `Mr. Adewale / Peter Patrick).\n\n📧 Automated Confirmation:\nOur cloud server has dispatched your official Officer ID instructions straight to "${gmail.trim()}"!`,
        [{ text: 'Proceed to Field Portal 🚀', onPress: () => router.replace('/dashboard') }]
      );
    } else {
      Alert.alert(
        'Officer Registered (Email Notice)', 
        `Officer account created & synchronized with Headquarters, but automated welcome email had notice: ${res.message}. You can proceed right away!`,
        [{ text: 'Proceed to Portal ➔', onPress: () => router.replace('/dashboard') }]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
              <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Login</Text>
            </TouchableOpacity>

            <Text style={[styles.mainTitle, { color: colors.green }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              📝 AGENT ONBOARDING
            </Text>

            <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subText, { color: colors.subText }]}>
            Register your mobile device, link your assigned territory, and authenticate your officer credentials on FS Hub.
          </Text>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
            
            <Text style={[styles.label, { color: colors.subText }]}>FULL OFFICER NAME *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="e.g. Tunde Balogun"
              placeholderTextColor="#64748B"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.label, { color: colors.subText }]}>ASSIGNED REP ID / CODE *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="e.g. REP-2050"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              value={repId}
              onChangeText={setRepId}
            />

            <Text style={[styles.label, { color: colors.subText }]}>ASSIGNED TERRITORY OR ZONE *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="e.g. Ikeja Commercial Zone / Lagos Mainland"
              placeholderTextColor="#64748B"
              value={territory}
              onChangeText={setTerritory}
            />

            <Text style={[styles.label, { color: colors.green }]}>OFFICER GMAIL / WORK EMAIL (MANDATORY FOR NOTIFICATIONS) *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.green, borderWidth: 1.5, color: colors.mainText }]}
              placeholder="e.g. skybrown585@gmail.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={gmail}
              onChangeText={setGmail}
            />

            <Text style={[styles.label, { color: colors.subText }]}>CREATE SECRET PASSWORD *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={[styles.label, { color: colors.subText }]}>CONFIRM SECRET PASSWORD *</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              placeholder="Re-type secret password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.green }, isLoading && { backgroundColor: '#475569' }]}
              onPress={handleCompleteSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>⚡ COMPLETE AGENT ONBOARDING & SEND EMAIL ✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.loginLinkRow}>
              <Text style={[styles.loginLinkText, { color: colors.cyan }]}>Already registered on this device? <Text style={{fontWeight: '900'}}>Log In</Text></Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 130,
    flexGrow: 1,
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
    marginBottom: 16,
  },
  formCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    elevation: 4,
    marginBottom: 20,
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
    marginTop: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  loginLinkRow: {
    alignItems: 'center',
    marginTop: 18,
  },
  loginLinkText: {
    fontSize: 12,
  },
});
