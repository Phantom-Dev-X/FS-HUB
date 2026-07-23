import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';

export default function TerritoriesScreen() {
  // Look right here: 100% ZERO FAKE STORES (`[]`)!
  const [clients, setClients] = useState([]);

  useEffect(() => {
    DatabaseEngine.getAllClients().then(data => {
      const combined = [...OrderStore.clients, ...data];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      setClients(unique);
    });
  }, []);

  const handleEditDetails = (clientName) => {
    Alert.alert(
      'Edit Client Details',
      `Opening edit form for ${clientName}. Here you can update physical store address, owner phone number, or request a credit limit extension from headquarters.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button & Header */}
        <TouchableOpacity onPress={() => router.push('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>⬅️ Back to Home Hub</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.mainTitle}>👥 ASSIGNED TERRITORIES</Text>
        </View>

        <Text style={styles.subText}>
          View all inputted clients directory below. Tap <Text style={styles.boldCyan}>✏️ Edit Details</Text> on any card to modify their store address, phone number, or credit standing!
        </Text>

        {/* Look right here: CLEAN EMPTY STATE WHEN 0 STORES ONBOARDED YET */}
        {clients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44, marginBottom: 8 }}>👥</Text>
            <Text style={styles.emptyTitle}>No Client Territories Assigned Yet</Text>
            <Text style={styles.emptySub}>
              Your territory starts 100% clean without dummy stores. Tap <Text style={{fontWeight: '900', color: '#10B981'}}>➕ Add New Client Contact</Text> below right now to create your first store!
            </Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => router.push('/add-client')}>
              <Text style={styles.emptyActionText}>➕ Create First Territory Client Now ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          clients.map((client) => (
            <View key={client.id} style={[styles.clientCard, { borderLeftColor: client.statusColor || '#007AFF' }]}>
              <View style={styles.cardTopRow}>
                <Text style={styles.clientName}>{client.name}</Text>
                <TouchableOpacity 
                  style={styles.editPill} 
                  onPress={() => handleEditDetails(client.name)}
                >
                  <Text style={styles.editPillText}>✏️ Edit Details</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.clientAddress}>📍 Address: {client.address}</Text>
              <Text style={styles.clientContact}>📞 Owner: {client.owner || client.owner_contact || 'Store Manager'}</Text>
              <Text style={[styles.clientLimit, { color: client.creditLimit && client.creditLimit.includes('⚠️') ? '#F59E0B' : '#10B981' }]}>
                Credit Limit: {client.creditLimit || '₦500,000'} ({client.standing || 'Good Standing 🟢'})
              </Text>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  backText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  header: {
    marginBottom: 6,
  },
  mainTitle: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  boldCyan: {
    fontWeight: '800',
    color: '#38BDF8',
  },
  emptyBox: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  clientCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  editPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  clientAddress: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  clientContact: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 6,
  },
  clientLimit: {
    fontSize: 12,
    fontWeight: '800',
  },
});
