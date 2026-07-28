// ROUTE - STABLE GOOGLE WEB MAP VERSION (NO NATIVE MAP CRASH)
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SmartFooter from './SmartFooter';
import { RouteStore } from './RouteStore';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import GoogleWebMap from '../components/GoogleWebMap';

const toRouteClient = (client) => ({
  id: client.id,
  name: client.name || 'Client Store',
  address: client.address || 'Assigned Route',
  coordinate: client.coordinate || (
    client.latitude && client.longitude
      ? { latitude: Number(client.latitude), longitude: Number(client.longitude) }
      : null
  ) || RouteStore.repLocation,
  distance: client.distance || 'Route Pending',
  selected: client.selected !== false,
  visited: Boolean(client.visited),
});

export default function RouteOverviewScreen() {
  const repLoc = RouteStore.repLocation;
  const [routeClients, setRouteClients] = useState(RouteStore.clients || []);

  useEffect(() => {
    let active = true;

    if (RouteStore.isJourneyActive) {
      router.replace('/route-active');
      return () => { active = false; };
    }

    (async () => {
      try {
        const session = await DatabaseEngine.getSession();
        const repId = session?.id || OrderStore.currentAgent?.id;
        if (!repId || repId === 'REP-GUEST') return;
        const myClients = await DatabaseEngine.getClientsByRep(repId);
        const mapped = myClients.map(toRouteClient);
        RouteStore.clients = mapped;
        if (active) setRouteClients(mapped);
      } catch (e) {
        console.log('Route clients load error', e.message);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <GoogleWebMap
        center={repLoc}
        markers={routeClients.slice(0, 12).map(store => ({
          id: store.id,
          coordinate: store.coordinate,
          title: store.name,
          description: store.address,
          color: '#EF4444',
        }))}
        height="100%"
        zoom={13}
        label="FS Hub Route Radar"
      />

      <SafeAreaView style={styles.floatingOverlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.floatingBackBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.floatingBackText}> Hub</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Ionicons name="map-outline" size={14} color="#FFFFFF" />
            <Text style={styles.headerTitleText}> TERRITORY RADAR</Text>
          </View>
        </View>

        <View style={styles.floatingActionRow}>
          <TouchableOpacity style={styles.floatingStartBtn} onPress={() => router.push('/route-select')}>
            <Text style={styles.floatingStartBtnText}>🚀 START JOURNEY PLANNER ➔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.footerContainer}>
        <SmartFooter />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  floatingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 86 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  floatingBackBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center' },
  floatingBackText: { color: '#2563EB', fontSize: 13, fontWeight: '800', marginLeft: 4 },
  headerTitleBox: { flexDirection: 'row', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  headerTitleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginLeft: 4 },
  floatingActionRow: { alignItems: 'flex-end', marginBottom: 10 },
  floatingStartBtn: { backgroundColor: '#10B981', paddingHorizontal: 22, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  floatingStartBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  footerContainer: { backgroundColor: '#FFFFFF' },
});
