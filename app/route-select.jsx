// ROUTE SELECT - WHITE PREMIUM, FIXED TEXT ERROR, BIG COMPANY - ONLY OWN CLIENTS
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { RouteStore } from './RouteStore';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

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

export default function RouteSelectScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientList, setClientList] = useState(RouteStore.clients || []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await DatabaseEngine.getSession();
        const repId = session?.id || OrderStore.currentAgent?.id;
        if (!repId || repId === 'REP-GUEST') return;
        const myClients = await DatabaseEngine.getClientsByRep(repId);
        const mapped = myClients.map(toRouteClient);
        RouteStore.clients = mapped;
        if (active) setClientList(mapped);
      } catch (e) {
        console.log('Route select load error', e.message);
      }
    })();
    return () => { active = false; };
  }, []);

  const toggleSelectStore = (id) => {
    const updated = clientList.map(c => c.id === id ? { ...c, selected: !c.selected } : c);
    setClientList(updated);
    RouteStore.clients = updated;
  };

  const filteredClients = clientList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = clientList.filter(c => c.selected).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/route')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color="#2563EB" />
            <Text style={styles.backText}> Map</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>📋 Select Stops</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{selectedCount} Selected</Text>
          </View>
        </View>

        <Text style={styles.subText}>Tick your own client stores for today's route. Optimized for your Rep ID only (big company mode).</Text>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="Search store..." placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {filteredClients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
            <Text style={styles.emptyTitle}>No Stores for Route</Text>
            <Text style={styles.emptySub}>Add clients first via Add Client, then select them here. Only your own clients show.</Text>
          </View>
        ) : (
          filteredClients.map((store) => (
            <TouchableOpacity key={store.id} style={[styles.storeCheckCard, store.selected && styles.selectedCard]} onPress={() => toggleSelectStore(store.id)}>
              <View style={styles.checkRow}>
                <View style={[styles.checkBox, store.selected && { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                  {store.selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={styles.storeTextWrapper}>
                  <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                  <Text style={styles.storeAddress} numberOfLines={1}>📍 {store.address}</Text>
                  <Text style={styles.storeDistance}>🚗 {store.distance || 'Nearby'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={[styles.calcRouteBtn, selectedCount === 0 && { backgroundColor: '#94A3B8' }]} onPress={() => {
            if (selectedCount === 0) {
              Alert.alert('No Stores Ticked ⚠️', 'Tick at least 1 store!');
              return;
            }
            RouteStore.isJourneyActive = true;
            router.push('/route-active');
          }}>
          <Text style={styles.calcRouteBtnText}>⚡ CALCULATE FASTEST ROUTE ({selectedCount}) ➔</Text>
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
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  mainTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  countBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  subText: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 14 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 14 },
  searchInput: { flex: 1, marginLeft: 8, color: '#0F172A', fontSize: 13 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: '#1E3A8A', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6 },
  storeCheckCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 14, borderRadius: 14, marginBottom: 10 },
  selectedCard: { borderColor: '#10B981', borderLeftWidth: 5, borderLeftColor: '#10B981' },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  storeTextWrapper: { flex: 1 },
  storeName: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  storeAddress: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  storeDistance: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  calcRouteBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  calcRouteBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
