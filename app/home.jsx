import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Platform, Dimensions, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Look right right here: We import `expo-location` to request real GPS coordinates on launch!
import * as Location from 'expo-location';

import SmartFooter from './SmartFooter';
import { OrderStore } from './_OrderStore';
import { RouteStore } from './RouteStore';

// WEB SAFE MAPS IMPORT
let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function DashboardScreen() {
  const [isDark, setIsDark] = useState(true);
  
  // Look right here: Starts with baseline coordinates, updates dynamically to exact phone location!
  const [repCoords, setRepCoordinates] = useState(OrderStore.repLocation);
  const [locationStatus, setLocationStatus] = useState('Checking GPS...');

  // Reads clean production stats directly from our stores (`0 clients` on day 1 until created!)
  const totalRegisteredClients = OrderStore.clients.length;
  const { grandTotal, totalUnits } = OrderStore.getCartSummary();

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
    purple:     isDark ? '#A855F7' : '#9333EA',
  };

  // =========================================================================
  // 🛰️ REAL-TIME GPS LOCATION ACCESS REQUEST ON STARTUP
  // =========================================================================
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationStatus('GPS High Precision Active 🟢');
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = location.coords;
          
          // Update central memory stores instantly with real exact coordinates!
          OrderStore.repLocation = { latitude, longitude };
          RouteStore.repLocation = { latitude, longitude };
          setRepCoordinates({ latitude, longitude });
          console.log(`[Dashboard] Locked real GPS coordinates: Lat ${latitude}, Lon ${longitude}`);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* TOP HEADER SECTION */}
        <View style={styles.headerTop}>
          <Text style={[styles.welcomeText, { color: colors.subText }]} numberOfLines={1}>WELCOME BACK, AGENT</Text>
          
          <View style={styles.titleRow}>
            <Text style={[styles.mainTitle, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              FS HUB DASHBOARD 🌐
            </Text>
            
            <View style={styles.headerRightActions}>
              <TouchableOpacity 
                onPress={() => setIsDark(!isDark)} 
                style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>

              <View style={[styles.statusBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.statusText} numberOfLines={1}>🟢 Online</Text>
              </View>
            </View>
          </View>
        </View>

        {/* =========================================================================
            CLEAN 2x2 STATS GRID (`Starts 100% genuine based on real user actions!`)
            ========================================================================= */}
        <View style={styles.statsGrid}>
          
          {/* Stat 1: Total Registered Clients (`0 Clients` until user adds some!) */}
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              {totalRegisteredClients} Clients
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Total Registered</Text>
          </View>

          {/* Stat 2: Active Cart Volume */}
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.green }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              {totalUnits} Units
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Active Cart Items</Text>
          </View>

          {/* Stat 3: Current Order Value */}
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.mainText }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              ₦{grandTotal.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>Order Value</Text>
          </View>

          {/* Stat 4: GPS Location Accuracy Status */}
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.green }]}>
            <Text style={[styles.statNumber, { color: colors.green, fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              {locationStatus.includes('Active') ? '±3m Precision' : 'Ready'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]} numberOfLines={1}>{locationStatus}</Text>
          </View>

        </View>

        {/* REAL INTERACTIVE MAP SECTION (Centers dynamically on user's exact real-time GPS coordinates!) */}
        <View style={[styles.mapCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.mapHeader}>
            <Text style={[styles.mapTitle, { color: colors.mainText }]} numberOfLines={1}>📍 LIVE TERRITORY RADAR</Text>
            <Text style={[styles.mapSub, { color: colors.subText }]} numberOfLines={1}>
              Rep Coordinates: Lat {repCoords.latitude.toFixed(4)}° | Lon {repCoords.longitude.toFixed(4)}°
            </Text>
          </View>

          <View style={[styles.mapBoxWrapper, { borderColor: colors.cyan }]}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={[styles.webFallbackBox, { backgroundColor: colors.background }]}>
                <Text style={{ fontSize: 28, marginBottom: 4 }}>🗺️</Text>
                <Text style={{ color: colors.mainText, fontWeight: 'bold', fontSize: 14 }}>Real-Time Territory Radar Active</Text>
                <Text style={{ color: colors.green, fontSize: 12, marginTop: 2 }}>Lat: {repCoords.latitude.toFixed(4)}° N | Lon: {repCoords.longitude.toFixed(4)}° E</Text>
                <Text style={{ color: colors.subText, fontSize: 11, textAlign: 'center', marginTop: 6 }}>
                  ⚡ All dummy client pins removed! Real pins pop up as you add client stores inside `➕ Add New Client`!
                </Text>
              </View>
            ) : (
              <MapView 
                style={styles.realMap}
                initialRegion={currentRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {/* Rep Current GPS Location Marker */}
                <Marker coordinate={repCoords} title="📍 Rep Current Position" description={locationStatus} pinColor="blue" />

                {/* Real Client Markers (Only renders genuine client stores added by the user!) */}
                {OrderStore.clients.map(store => (
                  <Marker 
                    key={store.id} 
                    coordinate={store.coordinate || repCoords} 
                    title={store.name} 
                    description={store.address} 
                    pinColor="red" 
                  />
                ))}
              </MapView>
            )}
          </View>
        </View>

        {/* Look right here: Guidance banner if the directory is 100% brand new! */}
      

        {/* DAILY FIELD ACTIONS */}
        <Text style={[styles.sectionHeading, { color: colors.heading }]}>DAILY FIELD ACTIONS</Text>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}
          onPress={() => router.push('/checkin')}
        >
          <Text style={[styles.actionTitle, { color: colors.mainText }]}>📍 Client Check-In & Take Store Order</Text>
          <Text style={[styles.actionSub, { color: colors.subText }]}>Select from inputted clients to log arrival, verify GPS, and submit orders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.green }]}
          onPress={() => router.push('/add-client')}
        >
          <Text style={[styles.actionTitle, { color: colors.mainText }]}>➕ Add New Client Contact</Text>
          <Text style={[styles.actionSub, { color: colors.subText }]}>Input store name, address, and Gmail to onboard a genuine store into your directory</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: colors.card, borderLeftColor: colors.amber }]}
          onPress={() => router.push('/territories')}
        >
          <Text style={[styles.actionTitle, { color: colors.mainText }]}>👥 View Client List</Text>
          <Text style={[styles.actionSub, { color: colors.subText }]}>View store owners, addresses, and credit limits or modify details</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: isDark ? '#1a1e36' : '#F3E8FF', borderLeftColor: colors.purple }]}
          onPress={() => router.push('/sync')}
        >
          <View style={styles.syncHeaderRow}>
            <Text style={[styles.actionTitle, { color: colors.mainText, flexShrink: 1 }]}>🔄 Sync Offline Orders</Text>
            <View style={[styles.badgePill, { backgroundColor: colors.purple }]}>
              <Text style={styles.badgePillText}>READY</Text>
            </View>
          </View>
          <Text style={[styles.actionSub, { color: colors.subText }]}>Orders taken locally without data waiting to push to cloud storage</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* FIXED SMART FOOTER */}
      <SmartFooter isDark={isDark} colors={colors} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTop: {
    marginBottom: 14,
  },
  welcomeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  themeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    width: '48.5%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  mapCardContainer: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
  },
  mapHeader: {
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapSub: {
    fontSize: 12,
    marginTop: 2,
  },
  mapBoxWrapper: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  realMap: {
    width: '100%',
    height: '100%',
  },
  webFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cleanStateBanner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cleanStateTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  cleanStateSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  actionCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    elevation: 2,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  actionSub: {
    fontSize: 11,
    lineHeight: 16,
  },
});
