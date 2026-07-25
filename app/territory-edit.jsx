import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { DatabaseEngine } from './_DatabaseEngine';

export default function TerritoryEditScreen() {
  const params = useLocalSearchParams();
  const [client, setClient] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    (async () => {
      if (params.id) {
        const clients = await DatabaseEngine.getClientsByRep(params.repId || '');
        const found = clients.find(c => c.id === params.id);
        if (found) {
          setClient(found);
          setName(found.name);
          setAddress(found.address);
        }
      }
    })();
  }, [params.id]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#FFFFFF']} style={styles.gradient} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Edit Territory Client</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Client ID</Text>
          <Text style={styles.value}>{params.id || '-'}</Text>

          <Text style={styles.label}>Store Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={() => router.replace('/territories')}>
          <Text style={styles.saveBtnText}>Save Changes ✓</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  scroll: { padding: 24, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 18 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 4, marginTop: 10 },
  value: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#F8FAFC' },
  saveBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});
