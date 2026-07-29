import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import AdminFooter from './AdminFooter';
import GoogleWebMap from '../components/GoogleWebMap';

export default function AdminReps() {
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const r = await DatabaseEngine.getAllReps();
      setReps(r || []);
      setLoading(false);
    })();
  }, []);

  const filteredReps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reps;
    return reps.filter(rep => [rep.name, rep.full_name, rep.email, rep.id, rep.zone, rep.territory, rep.status]
      .some(value => String(value || '').toLowerCase().includes(q)));
  }, [query, reps]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>📍 Reps Radar</Text><Text style={styles.sub}>Search by name, Rep ID, email, route, zone or territory.</Text></View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput style={styles.search} placeholder="Filter reps e.g. Ikeja route, REP-001, zone..." value={query} onChangeText={setQuery} />
        {loading ? <View style={styles.empty}><ActivityIndicator color="#2563EB" /></View> : <>
          <View style={styles.mapBox}><GoogleWebMap center={OrderStore.repLocation} markers={filteredReps.slice(0, 20).map(rep => ({ id: rep.id || rep.email, coordinate: rep.coordinate || OrderStore.repLocation, title: rep.name || rep.email || 'Rep', color: '#2563EB' }))} height={250} zoom={12} label="FS Hub Reps" /></View>
          <Text style={styles.count}>{filteredReps.length} rep(s) found</Text>
          {filteredReps.map(rep => <View key={String(rep.id || rep.email)} style={styles.card}><Text style={styles.name}>{String(rep.name || rep.full_name || rep.email || 'Unnamed Rep')}</Text><Text style={styles.meta}>{String(rep.id || 'NO-ID')} • {String(rep.email || '')}</Text><Text style={styles.route}>Route/Zone: {String(rep.zone || rep.territory || 'Unassigned')}</Text><Text style={styles.status}>{String(rep.status || 'Registered')}</Text></View>)}
        </>}
      </ScrollView>
      <AdminFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#EFF6FF' },
  title: { fontSize: 24, fontWeight: '900', color: '#1E3A8A' },
  sub: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4 },
  scroll: { padding: 16, paddingBottom: 95 },
  search: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, color: '#0F172A' },
  mapBox: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 14 },
  count: { color: '#64748B', fontSize: 12, fontWeight: '800', marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 15, marginBottom: 10 },
  name: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  meta: { color: '#2563EB', fontSize: 12, marginTop: 4, fontWeight: '700' },
  route: { color: '#0F172A', fontSize: 12, marginTop: 5, fontWeight: '800' },
  status: { color: '#64748B', fontSize: 11, marginTop: 4 },
  empty: { backgroundColor: '#FFF', borderRadius: 20, padding: 26, alignItems: 'center' }
});
