// ADD CLIENT - WHITE PREMIUM ELEGANT, ZERO FAKE, LINKED TO SUPABASE
import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { EmailService } from './_EmailService';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { RouteStore } from './RouteStore';
import { DatabaseEngine } from './_DatabaseEngine';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function AddClientScreen() {
  const { colors } = useTheme();
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState('⚡ Electronics & Solar');
  const [creditLimit, setCreditLimit] = useState('500,000');
  const [isSending, setIsSending] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationMethod, setLocationMethod] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);

  const categories = ['⚡ Electronics & Solar', '🛒 Provisions', '👔 Clothing', '💊 Pharma', '📦 Wholesale', '🏪 Retail'];

  const captureCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to register the client at this store.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const selected = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy || null };
      setLocation(selected);
      setLocationMethod('current_gps');
      OrderStore.repLocation = { latitude: selected.latitude, longitude: selected.longitude };
      if (selected.accuracy && selected.accuracy > 100) {
        Alert.alert('Weak GPS accuracy', `Accuracy is ±${Math.round(selected.accuracy)}m. Move outdoors and retry for a more reliable store marker.`);
      }
    } catch (e) {
      Alert.alert('Could not read location', e.message);
    } finally {
      setIsLocating(false);
    }
  };

  const takeStorefrontPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera permission needed', 'Allow camera access to capture the storefront.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) setPhotoUri(result.assets[0].uri);
  };

  const handleAddClient = async () => {
    if (!storeName || !phone || !address || !storeEmail) {
      Alert.alert('Missing Info ⚠️', 'Fill Store Name, Phone, Email, Address');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(storeEmail.trim())) {
      Alert.alert('Invalid Email', 'Enter valid email like name@gmail.com');
      return;
    }

    if (!location) {
      Alert.alert('Client location required', 'Use your current GPS location, or choose the exact store position on the map.');
      return;
    }

    const session = await DatabaseEngine.getSession();
    const repId = session?.id || OrderStore.currentAgent?.id;
    if (!repId) {
      Alert.alert('Session expired', 'Please log in again before registering a client.');
      return;
    }

    setIsSending(true);
    const newClientId = `CL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    let photoPath = null;
    if (photoUri) {
      const upload = await DatabaseEngine.uploadImage(photoUri, `clients/${newClientId}/storefront.jpg`);
      if (!upload.success) {
        setIsSending(false);
        Alert.alert('Photo upload failed', `${upload.error}\n\nThe client was not saved. Retry when internet is stable.`);
        return;
      }
      photoPath = upload.path;
    }

    const genuineClient = {
      id: newClientId,
      name: storeName.trim(),
      address: address.trim(),
      owner: `${ownerName.trim() || 'Manager'} (${phone.trim()})`,
      owner_contact: ownerName.trim(),
      phone: phone.trim(),
      email: storeEmail.trim().toLowerCase(),
      storeEmail: storeEmail.trim().toLowerCase(),
      lastVisited: 'Just Added',
      lastOrderAmount: 'No orders yet',
      creditLimit: `₦${creditLimit}`,
      credit_limit: `₦${creditLimit}`,
      standing: 'New Client 🟢',
      gpsVerified: `Lat: ${location.latitude.toFixed(6)} | Lon: ${location.longitude.toFixed(6)}`,
      gps_coordinates: `Lat: ${location.latitude.toFixed(6)} | Lon: ${location.longitude.toFixed(6)}`,
      latitude: location.latitude,
      longitude: location.longitude,
      location_accuracy_m: location.accuracy,
      location_method: locationMethod,
      location_captured_at: new Date().toISOString(),
      storefront_photo_path: photoPath,
      businessType,
      rep_id: repId,
      createdByRepId: repId,
      created_by_rep_id: repId,
      coordinate: { latitude: location.latitude, longitude: location.longitude }
    };

    const saveRes = await DatabaseEngine.saveNewClient(genuineClient);
    if (!saveRes.success) {
      setIsSending(false);
      Alert.alert('Client was not saved', saveRes.error || `Supabase error ${saveRes.status}: ${saveRes.text || 'Unknown error'}`);
      return;
    }
    OrderStore.addNewClient(genuineClient);
    RouteStore.addNewClient(genuineClient);

    const emailResponse = await EmailService.sendWelcomeEmail({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      storeEmail: storeEmail.trim(),
      businessType,
      creditLimit,
      visitDay: 'Wed & Fri',
    });
    setIsSending(false);

    Alert.alert(
      '🎉 Client Registered!',
      `${storeName} saved ${saveRes.success ? 'locally + cloud' : 'locally'}! ${emailResponse.success ? 'Welcome email sent to ' + storeEmail : 'Email failed: ' + emailResponse.message}`,
      [{ text: 'Go to Check-In', onPress: () => router.push('/checkin') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
          <Ionicons name="home-outline" size={16} color="#2563EB" />
          <Text style={styles.backText}> Home</Text>
        </TouchableOpacity>

        <Text style={styles.title}>➕ Add New Client</Text>
        <Text style={styles.sub}>Register a store with its contact and verified location.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>STORE NAME *</Text>
          <TextInput style={styles.input} placeholder="e.g. Chinedu Electronics" value={storeName} onChangeText={setStoreName} placeholderTextColor="#94A3B8" editable={!isSending} />

          <Text style={styles.label}>OWNER NAME</Text>
          <TextInput style={styles.input} placeholder="Mr. Chinedu" value={ownerName} onChangeText={setOwnerName} placeholderTextColor="#94A3B8" editable={!isSending} />

          <Text style={styles.label}>PHONE *</Text>
          <TextInput style={styles.input} placeholder="08012345678" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor="#94A3B8" editable={!isSending} />

          <Text style={[styles.label, { color: '#2563EB' }]}>CLIENT EMAIL * (regex validated)</Text>
          <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
            <Ionicons name="mail-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, paddingVertical: 12, color: '#0F172A' }} placeholder="client@gmail.com" keyboardType="email-address" autoCapitalize="none" value={storeEmail} onChangeText={setStoreEmail} placeholderTextColor="#94A3B8" editable={!isSending} />
          </View>

          <Text style={styles.label}>ADDRESS * (for GPS)</Text>
          <TextInput style={styles.input} placeholder="14 Allen Avenue, Ikeja" value={address} onChangeText={setAddress} placeholderTextColor="#94A3B8" editable={!isSending} />

          <Text style={styles.label}>EXACT STORE LOCATION *</Text>
          <TouchableOpacity style={styles.locationPrimary} onPress={captureCurrentLocation} disabled={isLocating}>
            {isLocating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.locationPrimaryText}>📍 Use My Current Location (Recommended)</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationAlternative} onPress={() => setMapVisible(true)}>
            <Text style={styles.locationAlternativeText}>🗺️ Choose Exact Location on Map</Text>
          </TouchableOpacity>
          {location && (
            <View style={styles.locationResult}>
              <Text style={styles.locationResultTitle}>✓ Store marker selected</Text>
              <Text style={styles.locationResultText}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} • {locationMethod === 'current_gps' ? `GPS${location.accuracy ? ` ±${Math.round(location.accuracy)}m` : ''}` : 'Selected on map'}</Text>
            </View>
          )}

          <Text style={styles.label}>STOREFRONT PHOTO</Text>
          <TouchableOpacity style={styles.photoButton} onPress={takeStorefrontPhoto}>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : <Text style={styles.photoButtonText}>📸 Take Storefront Photo</Text>}
          </TouchableOpacity>
          {photoUri && <Text style={styles.photoHint}>Tap photo to retake</Text>}

          <Text style={styles.label}>BUSINESS TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 12 }}>
            {categories.map((cat, i) => (
              <TouchableOpacity key={i} onPress={() => setBusinessType(cat)} style={[styles.pill, businessType === cat && styles.pillActive]}>
                <Text style={[styles.pillText, businessType === cat && { color: '#FFFFFF' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>CREDIT LIMIT</Text>
          <TextInput style={styles.input} value={creditLimit} onChangeText={setCreditLimit} placeholderTextColor="#94A3B8" editable={!isSending} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleAddClient} disabled={isSending}>
            {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Client & Send Email 📧 ✓</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <SafeAreaView style={styles.mapModal}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapVisible(false)}><Text style={styles.mapCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.mapTitle}>Tap the exact store location</Text>
            <TouchableOpacity onPress={() => location && setMapVisible(false)} disabled={!location}><Text style={[styles.mapDone, !location && { opacity: 0.4 }]}>Use Pin</Text></TouchableOpacity>
          </View>
          {Platform.OS === 'web' || !MapView ? (
            <View style={styles.mapUnavailable}><Text>Map selection is available on Android/iOS. Use current location here.</Text></View>
          ) : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: location?.latitude || OrderStore.repLocation.latitude,
                longitude: location?.longitude || OrderStore.repLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02
              }}
              showsUserLocation
              onPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setLocation({ latitude, longitude, accuracy: null });
                setLocationMethod('map_selected');
              }}
            >
              {location && <Marker coordinate={location} draggable onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setLocation({ latitude, longitude, accuracy: null });
                setLocationMethod('map_selected');
              }} />}
            </MapView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  title: { fontSize: 22, fontWeight: '900', color: '#1E3A8A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 16, lineHeight: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#0F172A', fontSize: 13, marginBottom: 8 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  pillText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  saveBtn: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  locationPrimary: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  locationPrimaryText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  locationAlternative: { borderWidth: 1.5, borderColor: '#2563EB', padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  locationAlternativeText: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
  locationResult: { backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  locationResultTitle: { color: '#047857', fontWeight: '900', fontSize: 12 },
  locationResultText: { color: '#065F46', fontSize: 10, marginTop: 3 },
  photoButton: { minHeight: 100, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#94A3B8', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoButtonText: { color: '#334155', fontWeight: '800' },
  photoPreview: { width: '100%', height: 180 },
  photoHint: { color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 4 },
  mapModal: { flex: 1, backgroundColor: '#FFF' },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  mapTitle: { color: '#0F172A', fontWeight: '900', fontSize: 13 },
  mapCancel: { color: '#EF4444', fontWeight: '800' },
  mapDone: { color: '#2563EB', fontWeight: '900' },
  mapUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
});
