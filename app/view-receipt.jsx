import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ReceiptPopupScreen() {
  const params = useLocalSearchParams();
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#FFFFFF']} style={styles.gradient} />
      <View style={styles.popupCard}>
        <Ionicons name="receipt-outline" size={32} color="#10B981" />
        <Text style={styles.title}>Order Receipt</Text>
        <Text style={styles.info}>Receipt #: {params.id || 'N/A'}</Text>
        <Text style={styles.info}>Client: {params.client || 'Unknown'}</Text>
        <Text style={styles.info}>Status:</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: params.status === 'delivered' ? '#10B981' : params.status === 'packed' ? '#F59E0B' : '#EF4444' }]}>
            {params.status ? params.status.toUpperCase() : 'PENDING'}
          </Text>
        </View>
        <Text style={styles.info}>Delivery Date: {params.date ? new Date(new Date(params.date).getTime() + 2*24*60*60*1000).toLocaleDateString() : '2 days from order'}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  popupCard: { margin: 24, backgroundColor: '#FFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  title: { fontSize: 20, fontWeight: '900', marginTop: 10, marginBottom: 16, color: '#0F172A' },
  info: { fontSize: 13, color: '#334155', marginBottom: 6 },
  statusRow: { marginBottom: 10 },
  statusText: { fontWeight: '900', fontSize: 16 },
  closeBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  closeBtnText: { color: '#FFF', fontWeight: '800' },
});
