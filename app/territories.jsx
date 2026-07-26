// TERRITORIES - WHITE PREMIUM, REPS SEE ONLY OWN CLIENTS, ZERO FAKE
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';
import SmartFooter from './SmartFooter';
import GoogleWebMap from '../components/GoogleWebMap';

export default function TerritoriesScreen() {
  const [clients, setClients] = useState([]);
  const [repId, setRepId] = useState('');

  useEffect(() => {
    (async () => {
      const session = await DatabaseEngine.getSession();
      const rId = session?.id || OrderStore.currentAgent?.id;
      setRepId(rId || '');
      if (!rId) return;
      const myClients = await DatabaseEngine.getClientsByRep(rId);
      const unique = Array.from(new Map(myClients.map(item => [item.id, item])).values());
      setClients(unique);
    })();
  }, []);

  const handleEditDetails = (client) => {
    router.push({ pathname: '/territory-edit', params: { id: client.id } });
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
            <Text style={styles.badgeText}>My Territory: {repId || 'Unknown'} • {clients.length} clients</Text>
          </View>
        </View>

        <Text style={styles.mainTitle}>👥 My Territories</Text>
        <Text style={styles.subText}>Big company: You see ONLY your own {clients.length} clients (filtered by rep_id). Admin sees all via Admin portal. Tap Edit to modify.</Text>

        {clients.length > 0 && (
          <View style={styles.mapCard}>
            <GoogleWebMap
              center={clients.find(c => c.coordinate)?.coordinate || OrderStore.repLocation}
              height={220}
              zoom={13}
              label="FS Hub Territory"
            />
            <Text style={styles.mapHint}>Embedded Google map preview • Client list below remains source of truth</Text>
          </View>
        )}

        {clients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>👥</Text>
            <Text style={styles.emptyTitle}>No Territories Yet</Text>
            <Text style={styles.emptySub}>Your territory is clean. Add first client to create territory.</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => router.push('/add-client')}>
              <Text style={styles.emptyActionText}>➕ Create First Client</Text>
            </TouchableOpacity>
          </View>
        ) : (
          clients.map((client) => (
            <View key={client.id} style={styles.clientCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.clientName}>{client.name}</Text>
                <TouchableOpacity style={styles.editPill} onPress={() => handleEditDetails(client)}>
                  <Ionicons name="pencil-outline" size={12} color="#2563EB" />
                  <Text style={styles.editPillText}> Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.clientAddress}>📍 {client.address}</Text>
              <Text style={styles.clientContact}>📞 {client.owner || client.owner_contact || 'Store Manager'}</Text>
              <Text style={styles.clientLimit}>Credit: {client.creditLimit || client.credit_limit || '₦500,000'} • Rep: {client.rep_id || client.created_by_rep_id || repId}</Text>
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
  scrollContainer: { padding: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '800' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#1E3A8A', marginBottom: 4 },
  subText: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 16 },
  mapCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  mapHint: { color: '#64748B', fontSize: 10, marginTop: 8, textAlign: 'center', fontWeight: '700' },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginTop: 10 },
  emptyTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptySub: { color: '#64748B', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 16 },
  emptyActionBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  emptyActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  clientCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderLeftColor: '#2563EB' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  clientName: { color: '#0F172A', fontSize: 15, fontWeight: '900', flex: 1 },
  editPill: { flexDirection: 'row', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center' },
  editPillText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  clientAddress: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  clientContact: { color: '#94A3B8', fontSize: 12, marginBottom: 6 },
  clientLimit: { fontSize: 12, fontWeight: '700', color: '#059669' },
});
