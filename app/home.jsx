// HOME - NEW LAYOUT like home-white-elegant-new-layout-mockup.png (3 phones version you like)
// White elegant premium, shows agent TB header, 245 clients stats, live radar, daily actions 18
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
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
  const { colors } = useTheme(); // will be white since default isDark false
  const [repCoords, setRepCoordinates] = useState(OrderStore.repLocation);
  const [locationStatus, setLocationStatus] = useState('Excellent');
  const [myClientsCount, setMyClientsCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [agent, setAgent] = useState(OrderStore.currentAgent);

  const { grandTotal, totalUnits } = OrderStore.getCartSummary();

  useEffect(() => {
    (async () => {
      // GPS
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const { latitude, longitude } = location.coords;
          OrderStore.repLocation = { latitude, longitude };
          RouteStore.repLocation = { latitude, longitude };
          setRepCoordinates({ latitude, longitude });
          setLocationStatus('Excellent');
        } else {
          setLocationStatus('Baseline');
        }
      } catch { setLocationStatus('Ready'); }

      // Session + My Clients (big company - only own)
      const session = await DatabaseEngine.getSession();
      if (session) {
        setAgent({
          name: session.name?.replace(' (Field Officer)', '') || session.fullName || session.name,
          id: session.id,
          role: 'Senior Field Officer',
          territory: session.zone || session.territory || 'Ikeja Commercial Zone',
          initials: session.initials || session.name?.substring(0,2).toUpperCase() || 'TB',
          avatar: session.avatar || null,
        });
        const myClients = await DatabaseEngine.getClientsByRep(session.id);
        setMyClientsCount(myClients.length);
        OrderStore.clients = myClients;
      } else {
        setMyClientsCount(OrderStore.clients.length);
      }

      // Offline orders count for Sync badge
      const offline = await DatabaseEngine.getOfflineOrders();
      setOfflineCount(offline.length);
    })();
  }, []);

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
          <Text style={styles.avatarText}>{agent?.initials || 'TB'}</Text>
        </View>
        <View style={styles.greenDotTop} />
        <View style={styles.greenDotBottom} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* AGENT HEADER - Like mockup */}
        <View style={styles.agentHeader}>
          <View style={styles.agentRow}>
            {renderAvatar()}
            <View style={styles.agentInfo}>
              <Text style={styles.agentName} numberOfLines={1}>{agent?.name || 'Tunde Balogun'}</Text>
              <Text style={styles.agentRole} numberOfLines={1}>Senior Field Officer • {agent?.id || 'REP-2049'}</Text>
              <Text style={styles.agentTerritory} numberOfLines={1}>{agent?.territory || 'Ikeja Commercial Zone'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.gearBtn}>
              <Ionicons name="settings-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* DASHBOARD TITLE */}
        <Text style={styles.dashboardTitle}>FS HUB DASHBOARD</Text>
        <Text style={styles.dashboardSub}>{myClientsCount || 245} Registered Clients • GPS Status: {locationStatus}</Text>

        {/* 2x2 STATS GRID - Like mockup */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="people" size={18} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Clients</Text>
                <Text style={styles.statNumber}>{myClientsCount || 245}</Text>
                <Text style={styles.statExtra}>+18%</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="cart" size={18} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Active Cart Units</Text>
                <Text style={styles.statNumber}>{totalUnits || 78}</Text>
                <Text style={styles.statExtraMuted}>{totalUnits ? `${totalUnits} units` : '12 Pending'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="cash" size={18} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Order Value</Text>
                <Text style={styles.statNumber}>₦{(grandTotal || 1850300).toLocaleString()}</Text>
                <Text style={styles.statExtraMuted}>Today</Text>
              </View>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <View style={styles.statIconBox}><Ionicons name="location" size={18} color="#2563EB" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>GPS Precision</Text>
                <Text style={styles.statNumber}>5 Meters</Text>
                <Text style={styles.statExtraMuted}>Reliable</Text>
              </View>
            </View>
          </View>
        </View>

        {/* LIVE TERRITORY RADAR - Like mockup */}
        <View style={styles.radarCard}>
          <Text style={styles.radarTitle}>Live Territory Radar</Text>
          <View style={styles.mapWrapper}>
            {Platform.OS === 'web' || !MapView ? (
              <View style={styles.webMapFallback}>
                <View style={styles.mapPinkDot} />
                <View style={styles.mapBlueDot} />
                <View style={styles.mapOrangeDot} />
                <View style={styles.mapCenterTB}>
                  <Text style={styles.mapCenterText}>TB</Text>
                </View>
                <Text style={styles.mapIkejaLabel}>Ikeja</Text>
                <View style={styles.mapLegend}>
                  <Text style={styles.legendTitle}>Ikeja Zone</Text>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} /><Text style={styles.legendText}>3 clients</Text></View>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>1 pending</Text></View>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} /><Text style={styles.legendText}>1 agent location</Text></View>
                  <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} /><Text style={styles.legendText}>Radius</Text></View>
                  <Text style={styles.viewFullMap}>View Full Map</Text>
                </View>
              </View>
            ) : (
              <MapView style={styles.realMap} initialRegion={currentRegion} showsUserLocation={true}>
                <Marker coordinate={repCoords} title="Your Position" pinColor="blue" />
                {OrderStore.clients.map(store => (
                  <Marker key={store.id} coordinate={store.coordinate || repCoords} title={store.name} pinColor="red" />
                ))}
              </MapView>
            )}
          </View>
        </View>

        {/* DAILY FIELD ACTIONS */}
        <View style={styles.actionsHeader}>
          <Text style={styles.actionsTitle}>Daily Field Actions</Text>
          <Text style={styles.actionsCount}>18</Text>
        </View>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/checkin')}>
          <View style={styles.actionIconBox}><Ionicons name="location" size={20} color="#2563EB" /></View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionName}>Client Check-In</Text>
            <Text style={styles.actionSub}>Check-in at Client Site</Text>
            <Text style={styles.actionSmall}>24 visits logged</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/add-client')}>
          <View style={styles.actionIconBox}><Ionicons name="person-add" size={20} color="#2563EB" /></View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionName}>Add New Client</Text>
            <Text style={styles.actionSub}>Register New Client</Text>
            <Text style={styles.actionSmall}>3 onboarded today</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/territories')}>
          <View style={styles.actionIconBox}><Ionicons name="people" size={20} color="#2563EB" /></View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionName}>Client List</Text>
            <Text style={styles.actionSub}>View All Clients</Text>
            <Text style={styles.actionSmall}>{myClientsCount || 245} total</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/sync')}>
          <View style={styles.actionIconBox}><Ionicons name="sync" size={20} color="#2563EB" /></View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionName}>Sync Offline Orders</Text>
            <Text style={styles.actionSub}>Sync offline data</Text>
            <Text style={styles.actionSmall}>{offlineCount || 3} pending orders</Text>
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
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90 },
  agentHeader: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  agentRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrapper: { marginRight: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  greenDotTop: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  greenDotBottom: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF' },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  agentRole: { fontSize: 12, color: '#334155', marginTop: 1 },
  agentTerritory: { fontSize: 11, color: '#64748B', marginTop: 1 },
  gearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dashboardTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 0.3 },
  dashboardSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  statTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#334155', fontWeight: '600' },
  statNumber: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  statExtra: { fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 2 },
  statExtraMuted: { fontSize: 11, color: '#64748B', marginTop: 2 },
  radarCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  radarTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  mapWrapper: { height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  webMapFallback: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  mapIkejaLabel: { position: 'absolute', left: 10, top: 10, fontSize: 12, color: '#64748B' },
  mapPinkDot: { position: 'absolute', left: 40, top: 40, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B' },
  mapBlueDot: { position: 'absolute', right: 60, top: 30, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563EB' },
  mapOrangeDot: { position: 'absolute', right: 30, bottom: 50, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444' },
  mapCenterTB: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#BFDBFE' },
  mapCenterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  mapLegend: { position: 'absolute', right: 10, top: 10, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E2E8F0', width: 110 },
  legendTitle: { fontSize: 10, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 9, color: '#64748B' },
  viewFullMap: { fontSize: 10, color: '#2563EB', fontWeight: '700', marginTop: 6, textAlign: 'center' },
  realMap: { width: '100%', height: '100%' },
  actionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  actionsTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  actionsCount: { fontSize: 12, color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  actionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionTextBox: { flex: 1 },
  actionName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  actionSub: { fontSize: 11, color: '#334155', marginTop: 1 },
  actionSmall: { fontSize: 11, color: '#64748B', marginTop: 2 },
});
