// FS HUB PROFILE - GLOBAL THEME SYNC (fixed)
// Now toggle in profile syncs for ALL pages via ThemeContext
// Removed isolated local theme, now uses useTheme()
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SmartFooter from './SmartFooter';
import { OrderStore } from './_OrderStore';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const [gpsWatermark, setGpsWatermark] = useState(true);
  const [offlineAutoSync, setOfflineAutoSync] = useState(true);
  const agent = OrderStore.currentAgent;

  const handleLogout = () => {
    Alert.alert('🔒 Log Out', 'End your officer session? Ensure offline orders synced!', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        // Clear session and current agent
        const { DatabaseEngine } = await import('./_DatabaseEngine');
        await DatabaseEngine.clearSession();
        router.replace('/');
      }},
    ]);
  };

  const renderAvatar = () => {
    if (agent.avatar) {
      return <Image source={{ uri: agent.avatar }} style={styles.avatarImage} />;
    }
    return (
      <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>{agent.initials}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={[styles.mainTitle, { color: colors.cyan }]}>👤 REP PROFILE</Text>
          <TouchableOpacity onPress={() => Alert.alert('Settings', 'FS Hub Preferences')} style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="settings-outline" size={18} color={colors.subText} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subText, { color: colors.subText }]}>
          Review credentials, commission, and app appearance (theme syncs globally).
        </Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <View style={styles.avatarRow}>
            {renderAvatar()}
            <View style={{ flex: 1 }}>
              <Text style={[styles.repName, { color: colors.mainText }]}>{agent.name}</Text>
              <Text style={[styles.repTitle, { color: colors.cyan }]}>{agent.role}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <View style={[styles.idBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.idBadgeText, { color: colors.cyan }]}>ID: {agent.id}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: colors.green }]}>
                  <Text style={{ color: colors.green, fontSize: 10, fontWeight: '900' }}>🟢 Active</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.infoLabel, { color: colors.subText }]}>ASSIGNED TERRITORY</Text>
          <Text style={[styles.infoValue, { color: colors.mainText }]}>{agent.territory}</Text>
        </View>

        <Text style={[styles.sectionHeading, { color: colors.heading }]}>🎨 APP APPEARANCE (Global Sync)</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.cyan} />
                <Text style={[styles.settingTitle, { color: colors.mainText }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              </View>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Toggle white / dark theme for ALL pages. Saved automatically.</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#CBD5E1', true: '#2563EB' }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/settings')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.settingTitle, { color: colors.mainText }]}>Field Settings & Preferences</Text>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Background sync, GPS watermark, theme</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: '#EF4444' }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}> Log Out of Device</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.subText }]}>FS Hub v2.4 • All routes fixed • Primary: peterpatrick@gmail.com</Text>
      </ScrollView>
      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mainTitle: { fontSize: 20, fontWeight: '900' },
  settingsBtn: { padding: 10, borderRadius: 12, borderWidth: 1 },
  subText: { fontSize: 12, lineHeight: 18, marginBottom: 16 },
  profileCard: { borderRadius: 20, padding: 18, borderWidth: 1.5, marginBottom: 22 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 64, height: 64, borderRadius: 18 },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  repName: { fontSize: 18, fontWeight: '900' },
  repTitle: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  idBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  idBadgeText: { fontSize: 10, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  divider: { height: 1, marginVertical: 14 },
  infoLabel: { fontSize: 10, fontWeight: '800', marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: '800' },
  sectionHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10, marginTop: 6 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 18 },
  commissionLabel: { fontSize: 11, fontWeight: '800' },
  commissionAmount: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  payoutNotice: { fontSize: 12, marginTop: 4 },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 12, marginBottom: 6 },
  progressBar: { height: '100%', borderRadius: 5 },
  targetSub: { fontSize: 11, fontWeight: '600' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  settingTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  settingSub: { fontSize: 11, lineHeight: 16 },
  logoutBtn: { flexDirection: 'row', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 6, marginBottom: 20, backgroundColor: '#FEF2F2' },
  logoutBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '900' },
  versionText: { fontSize: 11, textAlign: 'center', marginBottom: 20 },
});
