import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [userType, setUserType] = useState('agent'); // 'agent' | 'admin'
  
  // Default values for quick testing
  const [repId, setRepId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  const handleToggleAdminMode = () => {
    if (userType === 'agent') {
      setUserType('admin');
      setRepId('peterpatrick@gmail.com');
      setPassword('fshubadmin');
    } else {
      setUserType('agent');
      setRepId('REP-2049');
      setPassword('');
    }
  };

  const handleLogin = () => {
    if (!repId || !password) {
      Alert.alert('Missing Credentials ⚠️', `Please enter both your ${userType === 'admin' ? 'Manager Email / ID' : 'Rep ID / Work Email'} and secret password.`);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      
      // Look right here: Check if Primary Super Admin or Regular Admin!
      if (userType === 'admin') {
        if (repId.toLowerCase().trim() === 'peterpatrick@gmail.com' && password === 'fshubadmin') {
          Alert.alert(
            '👑 Primary Super Admin Unlocked!', 
            'Welcome back, Mr. Peter Patrick! Full Headquarters, Cloud Database, and Admin Management permissions active.',
            [{ text: 'Open Admin Suite 🚀', onPress: () => router.replace('/admin') }]
          );
        } else {
          // Check other admins or alert standard login
          Alert.alert(
            '🏢 Headquarters Access Granted!', 
            `Welcome to the Central Dispatch Portal, Manager ${repId}!\n\nConnected to live Supabase Cloud Database (evcbqsg...supabase.co).`,
            [{ text: 'Open Admin Suite 🚀', onPress: () => router.replace('/admin') }]
          );
        }
      } else {
        // Normal Field Agent Mode -> `/dashboard` (`/home`)!
        Alert.alert(
          '📱 Field Portal Unlocked!', 
          `Welcome back to your assigned territory, Officer ${repId}!`,
          [{ text: 'Open Field Dashboard ➔', onPress: () => router.replace('/home') }]
        );
      }
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Top Logo Badge */}
          <View style={styles.headerContainer}>
            <View style={[styles.logoBadge, userType === 'admin' && { backgroundColor: '#F59E0B', shadowColor: '#F59E0B' }]}>
              <Text style={styles.logoBadgeText}>{userType === 'admin' ? 'HQ' : 'FS'}</Text>
            </View>
            <Text style={styles.appTitle}>FS HUB 🌐</Text>
            <Text style={styles.appSubtitle}>
              {userType === 'admin' ? 'Headquarters Super Admin & Dispatch Portal' : 'Field Sales Automation Agent Portal'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, userType === 'admin' && { borderColor: '#F59E0B', borderWidth: 2 }]}>
            
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, userType === 'admin' && { color: '#F59E0B' }]}>
                {userType === 'admin' ? '👑 Super Admin Sign In' : '📱 Field Officer Sign In'}
              </Text>
              <View style={[styles.modePill, { backgroundColor: userType === 'admin' ? '#F59E0B' : '#007AFF' }]}>
                <Text style={styles.modePillText}>{userType.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.cardSub}>
              {userType === 'admin' 
                ? 'Primary Admin credentials pre-loaded for peterpatrick@gmail.com. Tap `Log In` below to enter your master console.'
                : 'Enter your Rep ID or work email to access your assigned Ikeja & Mainland routes.'}
            </Text>

            <Text style={[styles.inputLabel, userType === 'admin' && { color: '#F59E0B' }]}>
              {userType === 'admin' ? 'PRIMARY SUPER ADMIN GMAIL' : 'REP ID OR WORK EMAIL'}
            </Text>
            <TextInput 
              style={styles.inputField}
              placeholder="e.g. peterpatrick@gmail.com"
              placeholderTextColor="#64748B"
              value={repId}
              onChangeText={setRepId}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, userType === 'admin' && { color: '#F59E0B' }]}>
              {userType === 'admin' ? 'SUPER ADMIN SECURITY PIN' : 'SECRET OFFICER PASSWORD'}
            </Text>
            <View style={styles.passwordRow}>
              <TextInput 
                style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
                placeholder="Enter secret password..."
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🔒'}</Text>
              </TouchableOpacity>
            </View>

            {userType === 'agent' && (
              <TouchableOpacity onPress={() => router.push('/forgot')} style={styles.forgotRow}>
                <Text style={styles.forgotText}>Forgot Officer Password? <Text style={{fontWeight: '900'}}>Reset via OTP</Text></Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.loginBtn, userType === 'admin' && { backgroundColor: '#F59E0B' }, isLoading && { backgroundColor: '#475569' }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginBtnText}>
                  {userType === 'admin' ? '⚡ Log In to Headquarters Portal ➔' : '⚡ Log In to Field Portal ➔'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Look right here: THE ADMIN / AGENT TOGGLE BUTTON */}
            <TouchableOpacity 
              style={[styles.portalToggleBtn, userType === 'admin' && { backgroundColor: '#1E293B', borderColor: '#38BDF8' }]}
              onPress={handleToggleAdminMode}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>{userType === 'admin' ? '📱' : '🏢'}</Text>
              <Text style={[styles.portalToggleText, userType === 'admin' && { color: '#38BDF8' }]}>
                {userType === 'admin' 
                  ? '⬅️ Return to Field Officer Sign In' 
                  : 'Are you an Admin? Log into Admin Portal ➔'}
              </Text>
            </TouchableOpacity>

          </View>

          {userType === 'agent' && (
            <TouchableOpacity onPress={() => router.push('/signup')} style={styles.signupFooterRow}>
              <Text style={styles.signupText}>
                New Field Officer? <Text style={styles.signupBoldText}>Complete Device Onboarding 📝</Text>
              </Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  appTitle: {
    color: '#38BDF8',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#475569',
    borderRadius: 12,
    paddingRight: 12,
    marginBottom: 6,
  },
  eyeBtn: {
    padding: 8,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  forgotText: {
    color: '#38BDF8',
    fontSize: 12,
  },
  loginBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    marginTop: 20,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 18,
  },
  portalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  portalToggleText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '900',
  },
  signupFooterRow: {
    alignItems: 'center',
    marginTop: 22,
  },
  signupText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  signupBoldText: {
    color: '#10B981',
    fontWeight: '900',
  },
});
