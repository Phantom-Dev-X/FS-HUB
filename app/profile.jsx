import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Switch, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';

export default function ProfileScreen() {
  const [isDark, setIsDark] = useState(true);
  
  // Exactly the 2 SFA settings switches!
  const [gpsWatermark, setGpsWatermark] = useState(true);
  const [offlineAutoSync, setOfflineAutoSync] = useState(true);

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    heading:    isDark ? '#E2E8F0' : '#334155',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
    red:        '#EF4444',
  };

  const handleLogout = () => {
    Alert.alert(
      '🔒 Log Out of FS Hub Device',
      'Are you sure you want to end your active officer session on this device? Make sure all offline orders are synced to the cloud first!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Session Closed ✓', 'Officer disconnected. Redirecting to Agent Portal Login.');
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Look right right here: Settings Icon sitting right at the far right corner where the theme toggle was! */}
        <View style={styles.headerRow}>
          <Text style={[styles.mainTitle, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit={true}>
            👤 REP OFFICER PROFILE
          </Text>

          <TouchableOpacity 
            onPress={() => Alert.alert('⚙️ Device Settings', 'FS Hub System Preferences & Account Menu')} 
            style={[styles.settingsBtnRight, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          Review your assigned territory credentials, monthly commission progress, and background sync preferences.
        </Text>

        {/* REP OFFICER IDENTIFICATION CARD */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>TB</Text>
            </View>

            <View style={styles.repInfoWrapper}>
              <Text style={[styles.repName, { color: colors.mainText }]} numberOfLines={1}>Tunde Balogun</Text>
              <Text style={[styles.repTitle, { color: colors.cyan }]}>Senior Field Sales Officer</Text>
              <View style={styles.idBadgeRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>REP ID: REP-2049</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: colors.green }]}>
                  <Text style={[styles.statusText, { color: colors.green }]}>🟢 Active Device</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.territoryInfoBox}>
            <Text style={[styles.infoLabel, { color: colors.subText }]}>ASSIGNED TERRITORY / ROUTE</Text>
            <Text style={[styles.infoValue, { color: colors.mainText }]} numberOfLines={1}>Ikeja Commercial Zone • Route #14</Text>
            <Text style={[styles.deviceInfoText, { color: colors.green }]}>
              📱 Linked Device: iPhone 14 Pro (`GPS High Precision Active`)
            </Text>
          </View>
        </View>

        {/* FINANCIAL & COMMISSION COCKPIT */}
        <Text style={[styles.sectionHeading, { color: colors.heading }]}>💰 MONTHLY COMMISSION BREAKDOWN</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.amber, borderLeftWidth: 6 }]}>
          <View style={styles.commissionTopRow}>
            <View>
              <Text style={[styles.commissionLabel, { color: colors.subText }]}>ESTIMATED COMMISSION EARNED</Text>
              <Text style={[styles.commissionAmount, { color: colors.amber }]} adjustsFontSizeToFit={true} numberOfLines={1}>
                ₦195,000
              </Text>
            </View>

            <View style={[styles.rateBadge, { backgroundColor: colors.background }]}>
              <Text style={[styles.rateText, { color: colors.cyan }]}>5% Commission Rate</Text>
            </View>
          </View>

          <Text style={[styles.payoutNotice, { color: colors.mainText }]}>
            📅 Next Payout Date: <Text style={{fontWeight: '800'}}>31st of this Month</Text>
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Monthly Target Progress */}
          <View style={styles.targetRow}>
            <Text style={[styles.targetLabel, { color: colors.mainText }]}>Monthly Sales Volume Target</Text>
            <Text style={[styles.targetPercent, { color: colors.green }]}>78% Completed</Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
            <View style={[styles.progressBar, { width: '78%', backgroundColor: colors.green }]} />
          </View>

          <View style={styles.targetBottomRow}>
            <Text style={[styles.targetSubText, { color: colors.subText }]}>Current: ₦3.9 Million</Text>
            <Text style={[styles.targetSubText, { color: colors.subText }]}>Target: ₦5.0 Million</Text>
          </View>
        </View>

        {/* FIELD SYNC & GEOTAG SETTINGS (Exactly 2 switches!) */}
        <Text style={[styles.sectionHeading, { color: colors.heading }]}>⚙️ FIELD SYNC & GEOTAG SETTINGS</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingTextWrapper}>
              <Text style={[styles.settingTitle, { color: colors.mainText }]}>Automatic Background Sync when Data is On</Text>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Instantly push local `AsyncStorage` orders to cloud when network restores</Text>
            </View>
            <Switch 
              value={offlineAutoSync} 
              onValueChange={setOfflineAutoSync} 
              trackColor={{ false: '#334155', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingTextWrapper}>
              <Text style={[styles.settingTitle, { color: colors.mainText }]}>GPS Photo Watermark on Check-ins</Text>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Attach verified coordinates (`±3m`) directly onto store entrance photos</Text>
            </View>
            <Switch 
              value={gpsWatermark} 
              onValueChange={setGpsWatermark} 
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

        </View>

        {/* LOGOUT BUTTON RIGHT BELOW */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: '#1F121B', borderColor: '#EF4444' }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>🔒 Log Out of FS Hub Device</Text>
        </TouchableOpacity>

        <View style={styles.footerVersionRow}>
          <Text style={[styles.versionText, { color: colors.subText }]}>
            FS Hub SFA Mobile Portal • Version 2.4.0 (Build 882)
          </Text>
          <Text style={[styles.versionText, { color: colors.subText }]}>
            Licensed to Ikeja Headquarters Depot • All Rights Reserved
          </Text>
        </View>

      </ScrollView>

      {/* FIXED SMART FOOTER */}
      <SmartFooter isDark={isDark} colors={{ card: colors.card, border: colors.border, cyan: colors.cyan, subText: colors.subText }} />
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
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  settingsBtnRight: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  subText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 22,
    elevation: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  repInfoWrapper: {
    flex: 1,
  },
  repName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  repTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  idBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  idBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  deviceInfoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 22,
    elevation: 3,
  },
  commissionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commissionLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  commissionAmount: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '800',
  },
  payoutNotice: {
    fontSize: 12,
    marginBottom: 4,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  targetPercent: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  targetBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  targetSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingTextWrapper: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  settingSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  logoutBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
  },
  footerVersionRow: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
