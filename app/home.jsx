// FS HUB - PREMIUM ELEGANT HOME DASHBOARD WITH GLOBAL THEME SYNC
// - Shows agent name & pic (template if no pic)
// - Uses global theme from context/ThemeContext (synced from profile settings)
// - Removed local theme toggle icon (as requested, toggle now only in profile)
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Platform, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import SmartFooter from './SmartFooter';
import { OrderStore } from './_OrderStore';
import { RouteStore } from './RouteStore';
import { useTheme } from '../context/ThemeContext';

// WEB SAFE MAPS IMPORT
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function DashboardScreen() {
  const { isDark, colors } = useTheme();
  
  const [repCoords, setRepCoordinates] = useState(OrderStore.repLocation);
  const [locationStatus, setLocationStatus] = useState('Checking GPS...');
  const [myClientsCount, setMyClientsCount] = useState(OrderStore.clients.length);
  const [currentAgent, setCurrentAgent] = useState(OrderStore.currentAgent);

  const totalRegisteredClients = myClientsCount;
  const { grandTotal, totalUnits } = OrderStore.getCartSummary();
  const agent = currentAgent;

  // Load only own clients for this rep (big company - reps see only own)
  useEffect(() => {
    (async () => {
      const { DatabaseEngine } = await import('./_DatabaseEngine');
      const session = await DatabaseEngine.getSession();
      if (session) {
        setCurrentAgent({
          name: session.name?.replace(' (Field Officer)', '') || session.fullName || session.name,
          id: session.id,
          role: 'Senior Field Officer',
          territory: session.zone || session.territory || 'Ikeja Commercial Zone',
          avatar: session.avatar || null,
          initials: session.initials || (session.name?.substring(0,2) || 'FO').toUpperCase(),
          email: session.email,
        });
        // Fetch only my clients
        const myClients = await DatabaseEngine.getClientsByRep(session.id);
        setMyClientsCount(myClients.length);
        OrderStore.clients = myClients;
      }
    })();
  }, []);

  // REAL GPS ON MOUNT
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationStatus('GPS High Precision Active 🟢');
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = location.coords;
          OrderStore.repLocation = { latitude, longitude };
          RouteStore.repLocation = { latitude, longitude };
          setRepCoordinates({ latitude, longitude });
        } else {
          setLocationStatus('GPS Permission Denied (Using Baseline 📍)');
        }
      } catch (error) {
        setLocationStatus('GPS Ready (Baseline Coordinates 📍)');
      }
    })();
  }, []);

  const currentRegion = {
    latitude: repCoords.latitude,
    longitude: repCoords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Template avatar: show image if exists, else initials in circle (premium)
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
      {/* Subtle gradient header background for premium look */}
      {!isDark && (
        <LinearGradient
          colors={['#DBEAFE', '#EFF6FF', '#F8FAFC']}
          style={styles.topGradient}
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* PREMIUM AGENT HEADER - Elegant apps style */}
        <View style={[styles.premiumHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.agentRow}>
            {renderAvatar()}
            <View style={styles.agentInfo}>
              <Text style={[styles.agentName, { color: colors.mainText }]} numberOfLines={1}>{agent.name}</Text>
              <Text style={[styles.agentRole, { color: colors.primary }]} numberOfLines={1}>{agent.role} • {agent.id}</Text>
              <Text style={[styles.agentTerritory, { color: colors.subText }]} numberOfLines={1}>{agent.territory}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.onlineBadge, { backgroundColor: isDark ? '#0F172A' : '#ECFDF5', borderColor: colors.green }]}>
                <View style={styles.greenDot} />
                <Text style={[styles.onlineText, { color: colors.green }]}>Online</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.profileBtn, { backgroundColor: colors.background }]}>
                <Ionicons name="settings-outline" size={18} color={colors.subText} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* WELCOME TITLE - No theme toggle icon anymore (global sync from profile) */}
        <View style={styles.titleSection}>
          <Text style={[styles.welcomeSmall, { color: colors.subText }]}>WELCOME BACK</Text>
          <Text style={[styles.dashboardTitle, { color: colors.cyan }]}>FS HUB DASHBOARD 🌐</Text>
          <Text style={[styles.dashboardSub, { color: colors.subText }]}>
            {totalRegisteredClients} registered clients • {locationStatus}
          </Text>
        </View>

        {/* 2x2 STATS GRID */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={20} color={colors.cyan} />
            <Text style={[styles.statNumber, { color: colors.cyan }]}>{totalRegisteredClients} Clients</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total Registered</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cart-outline" size={20} color={colors.green} />
            <Text style={[styles.statNumber, { color: colors.green }]}>{totalUnits} Units</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Active Cart</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.mainText} />
            <Text style={[styles.statNumber, { color: colors.mainText }]}>₦{grandTotal.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Order Value</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.green }]}>
            <Ionicons name="navigate-outline" size={20} color={colors.green} />
            <Text style={[styles.statNumber, { color: colors.green, fontSize: 14 }]}>{locationStatus.includes('Active') ? '±3m Precision' : 'Ready'}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>{locationStatus}</Text>
          </View>
        </View>

        {/* MAP */}
        <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.mapHeader}>
            <Text style={[styles.mapTitle, { color: colors.mainText }]}>📍 LIVE TERRITORY RADAR</Text>
            <Text style={[styles.mapSub, { color: colors.subText }]}>
              Lat {repCoords.latitude.toFixed(4)}° | Lon {repCoords.longitude.toFixed(4)}°
            </Text>
          </View>
          <View style={[styles.mapWrapper, { borderColor: colors.cyan }]}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={[styles.webFallback, { backgroundColor: colors.background }]}>
                <Text style={{ fontSize: 28 }}>🗺️</Text>
                <Text style={{ color: colors.mainText, fontWeight: 'bold', fontSize: 14, marginTop: 6 }}>Territory Radar Active</Text>
                <Text style={{ color: colors.green, fontSize: 12 }}>Lat: {repCoords.latitude.toFixed(4)} | Lon: {repCoords.longitude.toFixed(4)}</Text>
              </View>
            ) : (
              <MapView style={styles.realMap} initialRegion={currentRegion} showsUserLocation={true} showsMyLocationButton={true}>
                <Marker coordinate={repCoords} title="📍 Your Position" description={locationStatus} pinColor="blue" />
                {OrderStore.clients.map(store => (
                  <Marker key={store.id} coordinate={store.coordinate || repCoords} title={store.name} description={store.address} pinColor="red" />
                ))}
              </MapView>
            )}
          </View>
        </View>

        {totalRegisteredClients === 0 && (
          <View style={[styles.cleanBanner, { backgroundColor: colors.card, borderColor: colors.green }]}>
            <Ionicons name="rocket-outline" size={20} color={colors.green} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cleanTitle, { color: colors.green }]}>Clean Production Mode</Text>
              <Text style={[styles.cleanSub, { color: colors.subText }]}>
                No dummy clients. Tap <Text style={{ fontWeight: '900', color: colors.green }}>Add New Client</Text> to onboard first real store.
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionHeading, { color: colors.heading }]}>DAILY FIELD ACTIONS</Text>

        {/* FIXED NAVIGATION - all router.push now point to valid routes, fallback to /home not /dashboard */}
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.cyan }]} onPress={() => router.push('/checkin')}>
          <Ionicons name="location-outline" size={22} color={colors.cyan} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.mainText }]}>📍 Client Check-In & Order</Text>
            <Text style={[styles.actionSub, { color: colors.subText }]}>Select client, verify GPS, submit orders</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.green }]} onPress={() => router.push('/add-client')}>
          <Ionicons name="person-add-outline" size={22} color={colors.green} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.mainText }]}>➕ Add New Client</Text>
            <Text style={[styles.actionSub, { color: colors.subText }]}>Onboard genuine store with Gmail</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.amber }]} onPress={() => router.push('/territories')}>
          <Ionicons name="map-outline" size={22} color={colors.amber} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: colors.mainText }]}>👥 Client List ({totalRegisteredClients})</Text>
            <Text style={[styles.actionSub, { color: colors.subText }]}>View owners, addresses, credit limits</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.purple }]} onPress={() => router.push('/sync')}>
          <Ionicons name="sync-outline" size={22} color={colors.purple} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.actionTitle, { color: colors.mainText }]}>🔄 Sync Offline Orders</Text>
              <View style={[styles.badge, { backgroundColor: colors.purple, marginLeft: 8 }]}>
                <Text style={styles.badgeText}>READY</Text>
              </View>
            </View>
            <Text style={[styles.actionSub, { color: colors.subText }]}>Push local orders to cloud</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </TouchableOpacity>

      </ScrollView>

      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 },
  premiumHeader: {
    borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 18, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  agentRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCircle: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 56, height: 56, borderRadius: 18, marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 17, fontWeight: '900' },
  agentRole: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  agentTerritory: { fontSize: 11, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  onlineText: { fontSize: 11, fontWeight: '800' },
  profileBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },

  titleSection: { marginBottom: 14 },
  welcomeSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  dashboardTitle: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  dashboardSub: { fontSize: 12, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  statBox: { width: '48.5%', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 4 },
  statNumber: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  mapCard: { borderRadius: 18, padding: 14, borderWidth: 1, marginBottom: 16, elevation: 2 },
  mapHeader: { marginBottom: 10 },
  mapTitle: { fontSize: 13, fontWeight: '800' },
  mapSub: { fontSize: 11, marginTop: 2 },
  mapWrapper: { height: 200, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5 },
  realMap: { width: '100%', height: '100%' },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },

  cleanBanner: { flexDirection: 'row', borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 16, alignItems: 'center' },
  cleanTitle: { fontSize: 13, fontWeight: '900' },
  cleanSub: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  sectionHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10, borderLeftWidth: 5, elevation: 2 },
  actionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  actionSub: { fontSize: 11, lineHeight: 15 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
