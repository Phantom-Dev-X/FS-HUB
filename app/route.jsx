// ROUTE - WHITE PREMIUM ELEGANT - FIXED TEXT ERROR & FUNCTION CHILD ERROR
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { RouteStore } from './RouteStore';

let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function RouteOverviewScreen() {
  const { colors } = useTheme();
  const repLoc = RouteStore.repLocation;

  useEffect(() => {
    if (RouteStore.isJourneyActive) {
      router.replace('/route-active');
    }
  }, []);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' || !MapView ? (
        <View style={styles.webFallback}>
          <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.webFallbackContent}>
            <Text style={styles.webEmoji}>🗺️</Text>
            <Text style={styles.webTitle}>Full-Screen Territory Radar</Text>
            <Text style={styles.webSub}>Rep: Lat {repLoc.latitude.toFixed(4)}° N | Lon {repLoc.longitude.toFixed(4)}° E</Text>
            <Text style={styles.webHint}>Open on Android device (press a) to view 3D Google Map</Text>
          </View>
        </View>
      ) : (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={{
            latitude: repLoc.latitude,
            longitude: repLoc.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          <Marker coordinate={repLoc} title="📍 Rep HQ" description="Ikeja Commercial Zone" pinColor="blue" />
          {RouteStore.clients.map(store => (
            <Marker key={store.id} coordinate={store.coordinate} title={store.name} description={store.address} pinColor="red" />
          ))}
        </MapView>
      )}

      {/* FLOATING OVERLAY */}
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
  webFallback: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  webFallbackContent: { alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  webEmoji: { fontSize: 52, marginBottom: 12 },
  webTitle: { color: '#0F172A', fontWeight: '900', fontSize: 18, textAlign: 'center' },
  webSub: { color: '#059669', fontSize: 12, marginTop: 6, fontWeight: '700' },
  webHint: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 12, maxWidth: 300, lineHeight: 16 },
  floatingOverlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
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
