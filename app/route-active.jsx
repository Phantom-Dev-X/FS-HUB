// ROUTE ACTIVE - WHITE PREMIUM FIXED
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { RouteStore } from './RouteStore';
import GoogleWebMap from '../components/GoogleWebMap';

export default function RouteActiveScreen() {
  const { colors } = useTheme();
  const repLoc = RouteStore.repLocation;
  const [activeStores, setActiveStores] = useState(RouteStore.getSelectedStores());

  const toggleVisited = (id, name) => {
    const updated = activeStores.map(c => c.id === id ? { ...c, visited: !c.visited } : c);
    setActiveStores(updated);
    RouteStore.clients = RouteStore.clients.map(c => c.id === id ? { ...c, visited: !c.visited } : c);
  };

  const openExternalGoogleMaps = () => {
    if (activeStores.length === 0) return;
    const firstStop = activeStores[0].coordinate;
    let waypointsParam = '';
    if (activeStores.length > 1) {
      const rest = activeStores.slice(1).map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`).join('|');
      waypointsParam = `&waypoints=${rest}`;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${repLoc.latitude},${repLoc.longitude}&destination=${firstStop.latitude},${firstStop.longitude}${waypointsParam}`;
    Linking.openURL(url);
  };

  const handleEndRoute = () => {
    const unvisited = activeStores.filter(s => !s.visited).length;
    if (unvisited > 0) {
      Alert.alert('Incomplete Route', `You still have ${unvisited} pending stops. Abort?`, [
        { text: 'Resume', style: 'cancel' },
        { text: 'Abort', style: 'destructive', onPress: () => { RouteStore.isJourneyActive = false; router.replace('/route'); } }
      ]);
      return;
    }
    RouteStore.isJourneyActive = false;
    router.replace('/route');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleEndRoute} style={styles.backBtn}>
            <Ionicons name="close-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> End Route</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>🚀 ACTIVE ROUTE</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{activeStores.length} Stops</Text></View>
        </View>

        <View style={styles.routeMapContainer}>
          <GoogleWebMap
            center={repLoc}
            markers={activeStores.slice(0, 8).map(store => ({
              id: store.id,
              coordinate: store.coordinate,
              title: store.name,
            }))}
            height={280}
            zoom={13}
            label="FS Hub Active Route"
          />
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={openExternalGoogleMaps}>
          <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
          <Text style={styles.navBtnText}> Launch Google Maps Navigation ➔</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>DRIVING ITINERARY (Tap to Mark Visited)</Text>
        <View style={styles.itineraryCard}>
          <View style={styles.stopRow}>
            <Text style={styles.stopNum}>🏁</Text>
            <View style={{ flex: 1 }}><Text style={styles.stopName}>Start: Ikeja HQ</Text><Text style={styles.stopSub}>Departure Point</Text></View>
          </View>
          {activeStores.map((store, idx) => (
            <View key={store.id} style={[styles.stopRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
              <Text style={styles.stopNum}>{idx + 1}️⃣</Text>
              <View style={{ flex: 1 }}><Text style={[styles.stopName, store.visited && { textDecorationLine: 'line-through', color: '#94A3B8' }]}>{store.name}</Text><Text style={[styles.stopSub, { color: store.visited ? '#F59E0B' : '#10B981' }]}>{store.visited ? 'Visited ✓' : `Stop #${idx+1}`}</Text></View>
              <TouchableOpacity style={[styles.visitedBtn, { backgroundColor: store.visited ? '#F59E0B' : '#10B981' }]} onPress={() => toggleVisited(store.id, store.name)}>
                <Text style={styles.visitedBtnText}>{store.visited ? 'Undo' : 'Visited ✓'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleEndRoute}>
          <Text style={styles.resetBtnText}>⏹️ End Route & Return to Map</Text>
        </TouchableOpacity>

      </ScrollView>
      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  mainTitle: { fontSize: 15, fontWeight: '900', color: '#1E3A8A' },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  routeMapContainer: { height: 280, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 14 },
  realMap: { width: '100%', height: '100%' },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20 },
  webTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  webSub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  navBtn: { flexDirection: 'row', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  navBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginLeft: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  itineraryCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  stopNum: { fontSize: 16, marginRight: 10 },
  stopName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  stopSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  visitedBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  visitedBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  resetBtn: { borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  resetBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
});
