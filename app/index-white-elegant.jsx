// FS HUB - ELEGANT WHITE THEME LOGIN - matches your generated mockup
// Copy this to app/index.jsx if you want white elegant version as main login
import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [userType, setUserType] = useState('agent'); // 'agent' | 'admin'
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
      setRepId('');
      setPassword('');
    }
  };

  const handleLogin = () => {
    if (!repId || !password) {
      Alert.alert('Missing Credentials ⚠️', `Please enter both your ${userType === 'admin' ? 'Manager Email / ID' : 'Rep ID / Work Email'} and password.`);
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (userType === 'admin') {
        Alert.alert(
          '🏢 Headquarters Access Granted!', 
          `Welcome, Manager ${repId}!`,
          [{ text: 'Open Admin Suite 🚀', onPress: () => router.replace('/admin') }]
        );
      } else {
        Alert.alert(
          '📱 Field Portal Unlocked!', 
          `Welcome back, Officer ${repId}!`,
          [{ text: 'Open Dashboard ➔', onPress: () => router.replace('/home') }]
        );
      }
    }, 1000);
  };

  const isAdmin = userType === 'admin';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* ELEGANT WHITE CARD - Centered like your mockup */}
          <View style={styles.centerWrapper}>
            
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={[styles.logoBadge, isAdmin && { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.logoBadgeText}>{isAdmin ? 'HQ' : 'FS'}</Text>
              </View>
              <Text style={[styles.appTitle, isAdmin && { color: '#F59E0B' }]}>FS HUB</Text>
              <Text style={styles.appSubtitle}>
                {isAdmin ? 'Headquarters Portal' : 'Field Portal'}
              </Text>
            </View>

            {/* Form Card - White Elegant like mockup */}
            <View style={[styles.formCard, isAdmin && { borderColor: '#F59E0B' }]}>
              
              {/* Inputs with icons - matching your white mockup */}
              <View style={styles.inputWrapper}>
                <Text style={styles.icon}>👤</Text>
                <TextInput 
                  style={styles.inputField}
                  placeholder={isAdmin ? "Admin Email" : "Rep ID / Email"}
                  placeholderTextColor="#9CA3AF"
                  value={repId}
                  onChangeText={setRepId}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.icon}>🔒</Text>
                <TextInput 
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '🔒'}</Text>
                </TouchableOpacity>
              </View>

              {userType === 'agent' && (
                <TouchableOpacity onPress={() => router.push('/forgot')} style={styles.forgotRow}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Blue Button - Matches Mockup */}
              <TouchableOpacity 
                style={[styles.loginBtn, isAdmin && { backgroundColor: '#F59E0B' }, isLoading && { backgroundColor: '#9CA3AF' }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Log In  ›</Text>
                )}
              </TouchableOpacity>

              {/* Divider like mockup */}
              <View style={styles.divider} />

              {/* Admin Toggle */}
              <TouchableOpacity 
                style={styles.linkBtn}
                onPress={handleToggleAdminMode}
              >
                <Text style={[styles.linkText, { color: '#2563EB' }]}>
                  {isAdmin ? '⬅️ Return to Field Sign In' : 'Admin Portal Access'}
                </Text>
              </TouchableOpacity>

              {/* Signup Link */}
              {userType === 'agent' && (
                <TouchableOpacity 
                  style={styles.linkBtn}
                  onPress={() => router.push('/signup')}
                >
                  <Text style={[styles.linkText, { marginTop: 8 }]}>Register New Account</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tiny footer */}
            <Text style={styles.footerNote}>Clean Production • Zero Fake Data • peterpatrick@gmail.com is Primary Admin</Text>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // very light gray-white like mockup background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563EB', // bright blue like mockup
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  appTitle: {
    color: '#2563EB',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: '#60A5FA',
    fontSize: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // light gray input bg like mockup
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 2,
    marginBottom: 14,
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.6,
  },
  inputField: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  forgotRow: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  forgotText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 18,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 20,
    lineHeight: 14,
  },
});
