// FS HUB SETTINGS PAGE - White Elegant Theme + Linear Gradient
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const [gpsWatermark, setGpsWatermark] = useState(true);
  const [offlineAutoSync, setOfflineAutoSync] = useState(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#2563EB" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: colors.cyan }]}>Settings</Text>
        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          Manage your app preferences and field tools.
        </Text>

        {/* APP APPEARANCE */}
        <Text style={[styles.sectionHeading, { color: colors.heading }]}>🎨 APP APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={colors.cyan} />
                <Text style={[styles.settingTitle, { color: colors.mainText }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              </View>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Toggle theme for all pages. Saved automatically.</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#CBD5E1', true: '#2563EB' }} thumbColor="#FFFFFF" />
          </View>
        </View>

        {/* FIELD SETTINGS */}
        <Text style={[styles.sectionHeading, { color: colors.heading }]}>⚙️ FIELD SETTINGS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.mainText }]}>Auto Background Sync</Text>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Push local orders to cloud when data is on</Text>
            </View>
            <Switch value={offlineAutoSync} onValueChange={setOfflineAutoSync} trackColor={{ false: '#CBD5E1', true: '#2563EB' }} thumbColor="#FFFFFF" />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.settingTitle, { color: colors.mainText }]}>GPS Photo Watermark</Text>
              <Text style={[styles.settingSub, { color: colors.subText }]}>Attach ±3m coordinates to photos</Text>
            </View>
            <Switch value={gpsWatermark} onValueChange={setGpsWatermark} trackColor={{ false: '#CBD5E1', true: '#10B981' }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/home')}>
          <Text style={styles.backHomeText}>← Return to Dashboard</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.subText }]}>FS Hub v2.4 • Settings synced globally</Text>
      </ScrollView>

      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  backText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  mainTitle: { fontSize: 22, fontWeight: '900', flex: 1 },
  subText: { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  sectionHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10, marginTop: 10 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 18 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  settingTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  settingSub: { fontSize: 12, lineHeight: 16 },
  backHomeBtn: { alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  backHomeText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  versionText: { fontSize: 11, textAlign: 'center', marginBottom: 20 },
});