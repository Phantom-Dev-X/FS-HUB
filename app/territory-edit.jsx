import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import GoogleWebMap from '../components/GoogleWebMap';

export default function TerritoryEditScreen() {
  const params = useLocalSearchParams();
  const [client, setClient] = useState(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!params.id) return;
      const session = await DatabaseEngine.getSession();
      const repId = params.repId || session?.id || OrderStore.currentAgent?.id;
      const clients = await DatabaseEngine.getClientsByRep(repId || '');
      const found = clients.find(c => c.id === params.id);
      if (found) {
        setClient(found);
        setName(found.name || '');
        setAddress(found.address || '');
        if (found.coordinate) setLocation(found.coordinate);
      }
    })();
  }, [params.id, params.repId]);

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Location Permission', 'Allow GPS to update this client location.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy || null });
    } catch (e) {
      Alert.alert('GPS Error', e.message);
    } finally {
      setIsLocating(false);
    }
  };

  const save = async () => {
    if (!client) return;
    if (!location) return Alert.alert('Location Required', 'Select location by dragging/tapping the map or using current GPS.');
    setIsSaving(true);
    const gps = `Lat: ${location.latitude.toFixed(6)} | Lon: ${location.longitude.toFixed(6)}`;
    const res = await DatabaseEngine.updateClient(client.id, {
      name: name.trim(),
      address: address.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      location_accuracy_m: location.accuracy || null,
      location_method: 'territory_edit_map',
      location_captured_at: new Date().toISOString(),
      gps_coordinates: gps,
    });
    setIsSaving(false);
    if (!res.success) return Alert.alert('Save Failed', res.error || 'Could not update client.');
    Alert.alert('Saved', 'Client territory details updated.', [{ text: 'Back to Territories', onPress: () => router.replace('/territories') }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#FFFFFF']} style={styles.gradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.replace('/territories')} style={styles.backBtn}><Text style={styles.backText}>⬅️ Territories</Text></TouchableOpacity>
        <Text style={styles.title}>Edit Territory Client</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Client ID</Text>
          <Text style={styles.value}>{params.id || '-'}</Text>
          <Text style={styles.label}>Store Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
          <Text style={styles.label}>Exact Location</Text>
          <GoogleWebMap
            center={location || OrderStore.repLocation}
            height={300}
            zoom={16}
            label={name || 'Client Location'}
            draggablePicker
            onLocationSelected={setLocation}
          />
          <Text style={styles.hint}>Tap map or drag blue pin to move the client marker.</Text>
          {location && <Text style={styles.coord}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>}
          <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={isLocating}>{isLocating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.gpsText}>📍 Use Current GPS</Text>}</TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.saveBtn, isSaving && { backgroundColor: '#94A3B8' }]} onPress={save} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes ✓</Text>}</TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 230 },
  scroll: { padding: 18, paddingTop: 24, paddingBottom: 40 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  backText: { color: '#2563EB', fontWeight: '900', fontSize: 12 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 18, color: '#1E3A8A' },
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 5, marginTop: 10 },
  value: { fontSize: 13, color: '#0F172A', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: '#F8FAFC', color: '#0F172A' },
  hint: { color: '#64748B', textAlign: 'center', fontSize: 11, marginTop: 8, lineHeight: 16 },
  coord: { color: '#059669', textAlign: 'center', fontSize: 11, fontWeight: '900', marginTop: 6 },
  gpsBtn: { backgroundColor: '#2563EB', padding: 13, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  gpsText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  saveBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});
