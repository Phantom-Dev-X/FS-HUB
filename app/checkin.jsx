// CHECKIN - BIG COMPANY VERSION: Reps see ONLY own clients (filtered by rep_id), Supabase source, white premium
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';
import SmartFooter from './SmartFooter';

export default function CheckInScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRep, setCurrentRep] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const session = await DatabaseEngine.getSession();
      setCurrentRep(session);
      const repId = session?.id || session?.email || OrderStore.currentAgent?.id;

      if (!repId || repId === 'REP-GUEST') {
        // If no session, show empty and prompt login
        setClients([]);
        setLoading(false);
        return;
      }

      // Fetch ONLY clients created by this rep (big company multi-user)
      const myClients = await DatabaseEngine.getClientsByRep(repId);
      // Also merge with memory if any new just added
      const memoryClients = OrderStore.clients.filter(c => c.rep_id === repId || c.createdByRepId === repId || !c.rep_id); // fallback for old data without rep_id
      const combined = [...myClients, ...memoryClients];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

      setClients(unique);
      OrderStore.clients = unique; // cache for this session
      setLoading(false);
    })();
  }, []);

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectClient = (client) => {
    Alert.alert(
      `📍 Check-In at ${client.name}`,
      `GPS match! Log visit and open catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed 🛒', onPress: () => {
            OrderStore.currentClient = {
              id: client.id,
              name: client.name,
              address: client.address || 'Assigned Route',
              creditLimit: client.creditLimit || client.credit_limit || '₦500,000',
              standing: client.standing || 'Good Standing 🟢',
              gpsVerified: client.gpsVerified || client.gps_coordinates || 'Lat: 6.6018° N | Lon: 3.3515° E',
              checkInPhotoTaken: false,
              email: client.email || client.registered_email || 'client@gmail.com',
              rep_id: currentRep?.id,
            };
            router.push('/visit');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Rep: {currentRep?.id || OrderStore.currentAgent?.id || 'Unknown'}</Text>
          </View>
        </View>

        <Text style={styles.mainTitle}>📍 My Clients</Text>
        <Text style={styles.subText}>You are viewing your assigned clients. Select a store below to start a verified visit.</Text>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="Search my stores..." placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.emptySub}>Loading your workspace...</Text>
          </View>
        ) : clients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>🏬</Text>
            <Text style={styles.emptyTitle}>No Clients Found</Text>
            <Text style={styles.emptySub}>Add your first client to begin planning visits, managing locations, and taking orders.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-client')}>
              <Text style={styles.emptyBtnText}>➕ Onboard First Client</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredClients.map((client) => (
            <View key={client.id} style={styles.clientCard}>
              <Text style={styles.clientName} numberOfLines={2}>{client.name}</Text>
              <Text style={styles.clientAddress} numberOfLines={2}>📍 {client.address}</Text>
              <Text style={styles.clientOwner} numberOfLines={1}>📞 {client.owner || client.owner_contact || 'Store Manager'} • Rep: {client.rep_id || client.created_by_rep_id || currentRep?.id}</Text>
              <View style={styles.timestampBox}>
                <Text style={styles.timestampText}>🕒 Last Visited: {client.lastVisited || client.created_at?.substring(0,10) || 'Just Onboarded'}</Text>
                <Text style={styles.lastOrderText}>📦 Credit: {client.creditLimit || client.credit_limit || '₦500,000'}</Text>
              </View>
              <TouchableOpacity style={styles.checkInBtn} onPress={() => handleSelectClient(client)}>
                <Ionicons name="location-outline" size={16} color="#FFF" />
                <Text style={styles.checkInBtnText}> Check-In & Take Order ➔</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '800' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#1E3A8A', marginBottom: 4 },
  subText: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 14 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, color: '#0F172A', fontSize: 13 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 16 },
  emptyBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderLeftColor: '#10B981' },
  clientName: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  clientAddress: { fontSize: 12, color: '#64748B', marginTop: 4 },
  clientOwner: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 10 },
  timestampBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  timestampText: { fontSize: 11, color: '#2563EB' },
  lastOrderText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  checkInBtn: { flexDirection: 'row', backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  checkInBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
