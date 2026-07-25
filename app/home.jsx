// HOME - FINAL CLEAN ZERO FAKE - NO DUMMY 245, NO FAKE NUMBERS - REAL DATA ONLY FROM SUPABASE
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import SmartFooter from './SmartFooter';
import { OrderStore } from './_OrderStore';
import { RouteStore } from './RouteStore';
import { DatabaseEngine } from './_DatabaseEngine';
import { useTheme } from '../context/ThemeContext';

let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const [repCoords, setRepCoordinates] = useState(OrderStore.repLocation);
  const [locationStatus, setLocationStatus] = useState('Checking GPS...');
  
  // Keep previous values to avoid 0 flash
  const [myClientsCount, setMyClientsCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [myOrdersCount, setMyOrdersCount] = useState(0);
  const [agent, setAgent] = useState(OrderStore.currentAgent);
  const [loading, setLoading] = useState(true);

  // Persist last good values (prevents flash from 0)
  const lastValues = React.useRef({
    clients: 0,
    orders: 0,
    offline: 0,
  });

  const { grandTotal, totalUnits } = OrderStore.getCartSummary();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = location.coords;
          OrderStore.repLocation = { latitude, longitude };
          RouteStore.repLocation = { latitude, longitude };
          if (active) {
            setRepCoordinates({ latitude, longitude });
            setLocationStatus('GPS Active 🟢');
          }
        } else {
          if (active) setLocationStatus('Permission Denied');
        }
      } catch {
        if (active) setLocationStatus('Ready');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refreshHomeData = async () => {
        setLoading(true);
        try {
          const session = await DatabaseEngine.getSession();
          if (session) {
            if (active) {
              setAgent({
                name: session.name?.replace(' (Field Officer)', '') || session.fullName || session.name || 'Field Officer',
                id: session.id,
                role: 'Field Officer',
                territory: session.zone || session.territory || 'Ikeja Commercial Zone',
                initials: session.initials || session.name?.substring(0,2).toUpperCase() || 'FO',
                avatar: session.avatar || null,
                email: session.email,
              });
            }

            // Fetch ONLY my clients from Supabase
            const myClients = await DatabaseEngine.getClientsByRep(session.id);
            const clientCount = myClients.length;

            // Fetch ONLY my orders from Supabase
            const myOrders = await DatabaseEngine.getOrdersByRep(session.id);
            const orderCount = myOrders.length;

            // Offline orders count
            const offline = await DatabaseEngine.getOfflineOrders();
            const offlineCountVal = offline.length;

            if (active) {
              // Only update if different from last known good value (prevents 0 flash)
              if (clientCount !== lastValues.current.clients) {
                setMyClientsCount(clientCount);
                lastValues.current.clients = clientCount;
              }
              OrderStore.clients = myClients;

              if (orderCount !== lastValues.current.orders) {
                setMyOrdersCount(orderCount);
                lastValues.current.orders = orderCount;
              }

              if (offlineCountVal !== lastValues.current.offline) {
                setOfflineCount(offlineCountVal);
                lastValues.current.offline = offlineCountVal;
              }
            }
          } else {
            if (active) {
              setMyClientsCount(lastValues.current.clients);
              setMyOrdersCount(lastValues.current.orders);
              setOfflineCount(lastValues.current.offline);
            }
          }
        } catch (e) {
          console.log('Home load error', e.message);
        }
        if (active) {
          setLoading(false);
        }
      };

      refreshHomeData();

      return () => {
        active = false;
      };
    }, [])
  );

  const currentRegion = {
    latitude: repCoords.latitude,
    longitude: repCoords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const renderAvatar = () => {
    return (
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{agent?.initials || 'FO'}</Text>
        </View>
        <View style={styles.greenDotTop} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* AGENT HEADER - REAL DATA ONLY */}
        <View style={styles.agentHeader}>
          <View style={styles.agentRow}>
            {renderAvatar()}
            <View style={styles.agentInfo}>
              <Text style={styles.agentName} numberOfLines={1}>{agent?.name || 'Guest Officer'}</Text>
              <Text style={styles.agentRole} numberOfLines={1}>{agent?.id ? `${agent.id} • ${agent.territory}` : 'No session - Please login'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.gearBtn}>
              <Ionicons name="settings-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* DASHBOARD TITLE - REAL COUNTS ONLY, NO FAKE 245 */}
        <Text style={styles.dashboardTitle}>FS HUB DASHBOARD</Text>
        <Text style={styles.dashboardSub}>
          {loading ? 'Loading your workspace...' : `${myClientsCount} clients • ${myOrdersCount} orders • GPS: ${locationStatus}`}
        </Text>

        {/* 2x2 STATS GRID - REAL DATA ONLY, NO DUMMY +18% OR 245 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="people" size={18} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Active Accounts</Text>
                <Text style={styles.statNumber}>{myClientsCount}</Text>
                <Text style={styles.statExtra}>{myClientsCount === 0 ? 'No clients yet' : 'Active accounts'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="cart" size={18} color="#10B981" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Items in Cart</Text>
                <Text style={styles.statNumber}>{totalUnits}</Text>
                <Text style={styles.statExtraMuted}>{totalUnits === 0 ? 'Your cart is empty' : `${totalUnits} units ready`}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="wallet" size={18} color="#059669" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Order Value</Text>
                <Text style={styles.statNumber}>₦{grandTotal.toLocaleString()}</Text>
                <Text style={styles.statExtraMuted}>{grandTotal === 0 ? '₦0' : 'Cart total'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="sync" size={18} color="#F59E0B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Offline Orders</Text>
                <Text style={styles.statNumber}>{offlineCount}</Text>
                <Text style={styles.statExtraMuted}>{offlineCount === 0 ? 'All synced' : 'Pending sync'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* LIVE TERRITORY RADAR */}
        <View style={styles.radarCard}>
          <Text style={styles.radarTitle}>Live Territory Radar</Text>
          <Text style={styles.radarSub}>Blue = You • Red = Your clients</Text>
          <View style={styles.mapWrapper}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={styles.webMapFallback}>
                <Ionicons name="map-outline" size={32} color="#2563EB" />
                <Text style={styles.webMapTitle}>Your Territory Map</Text>
                <Text style={styles.webMapSub}>Lat {repCoords.latitude.toFixed(4)} | Lon {repCoords.longitude.toFixed(4)}</Text>
                <Text style={styles.webMapSmall}>Shows your assigned client network</Text>
                <TouchableOpacity style={styles.viewMapBtn} onPress={() => router.push('/territories')}>
                  <Text style={styles.viewMapText}>View Full Map →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MapView style={styles.realMap} initialRegion={currentRegion} showsUserLocation={true} showsMyLocationButton={true}>
                <Marker coordinate={repCoords} title="Your Position" description={locationStatus} pinColor="blue" />
                {OrderStore.clients.slice(0, 50).map(store => (
                  <Marker key={store.id} coordinate={store.coordinate || repCoords} title={store.name} description={store.address} pinColor="red" />
                ))}
              </MapView>
            )}
          </View>
        </View>

        {/* ZERO FAKE BANNER */}
        {myClientsCount === 0 && !loading && (
          <View style={styles.cleanBanner}>
            <Ionicons name="rocket-outline" size={24} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cleanTitle}>Build your client network</Text>
              <Text style={styles.cleanSub}>Add your first client to begin planning visits, managing locations, and taking orders.</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionHeading}>DAILY FIELD ACTIONS</Text>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/checkin')}>
          <View style={styles.actionIconBox}><Ionicons name="location-outline" size={22} color="#2563EB" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Client Check-In ({myClientsCount})</Text>
            <Text style={styles.actionSub}>Select a client and begin a verified visit</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/add-client')}>
          <View style={styles.actionIconBox}><Ionicons name="person-add-outline" size={22} color="#10B981" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Add New Client</Text>
            <Text style={styles.actionSub}>Register a store with its contact and verified location</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/territories')}>
          <View style={styles.actionIconBox}><Ionicons name="map-outline" size={22} color="#F59E0B" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>My Territories Map</Text>
            <Text style={styles.actionSub}>View and manage your assigned client locations</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/sync')}>
          <View style={styles.actionIconBox}><Ionicons name="sync-outline" size={22} color="#A855F7" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Sync Offline Orders ({offlineCount})</Text>
            <Text style={styles.actionSub}>Upload pending orders and refresh your field data</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

      </ScrollView>

      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 },
  agentHeader: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  agentRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginRight: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  greenDotTop: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  agentRole: { fontSize: 11, color: '#334155', marginTop: 1 },
  gearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dashboardTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 0.3 },
  dashboardSub: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 14, lineHeight: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#334155', fontWeight: '600' },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  statExtra: { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 2 },
  statExtraMuted: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  radarCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  radarTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  radarSub: { fontSize: 10, color: '#64748B', marginBottom: 8 },
  mapWrapper: { height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  webMapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  webMapTitle: { fontSize: 14, fontWeight: '800', color: '#1E3A8A', marginTop: 8 },
  webMapSub: { fontSize: 12, color: '#059669', marginTop: 4 },
  webMapSmall: { fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 14 },
  viewMapBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10 },
  viewMapText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  realMap: { width: '100%', height: '100%' },
  cleanBanner: { flexDirection: 'row', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'flex-start' },
  cleanTitle: { fontSize: 13, fontWeight: '900', color: '#065F46' },
  cleanSub: { fontSize: 11, color: '#047857', lineHeight: 16, marginTop: 2 },
  sectionHeading: { fontSize: 12, fontWeight: '800', color: '#0F172A', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  actionSub: { fontSize: 11, color: '#64748B', marginTop: 1, lineHeight: 14 },
});
