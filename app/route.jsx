import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';
import { RouteStore } from './RouteStore';

let MapView = null;
let Marker = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

export default function RouteOverviewScreen() {
  const [isDark, setIsDark] = useState(true);
  const repLoc = RouteStore.repLocation;

  // Look right right here: Persistent Route Safeguard!
  // Whenever the user taps `🗺️ Route` on the footer, if they already started a journey,
  // we instantly redirect them right back to Screen 3 (`/route-active`) without resetting!
  useEffect(() => {
    if (RouteStore.isJourneyActive) {
      router.replace('/route-active');
    }
  }, []);

  return (
    <View style={styles.container}>
      
      {/* 100% FULL-SCREEN MAP */}
      {Platform.OS === 'web' || !MapView ? (
        <View style={[styles.webFallback, { backgroundColor: isDark ? '#0F172A' : '#F4F6F9' }]}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🗺️</Text>
          <Text style={{ color: isDark ? '#FFF' : '#0F172A', fontWeight: '900', fontSize: 20 }}>
            100% Full-Screen Territory Radar
          </Text>
          <Text style={{ color: '#10B981', fontSize: 14, marginTop: 6, fontWeight: 'bold' }}>
            Rep Coordinates: Lat {repLoc.latitude}° N | Lon {repLoc.longitude}° E
          </Text>
          <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 14, maxWidth: 300 }}>
            ⚡ Open on your Android Virtual Device (`a` key) or physical phone to view the 100% full-screen 3D Google Map!
          </Text>
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

      {/* FLOATING OVERLAY COCKPIT */}
      <SafeAreaView style={styles.floatingOverlay} pointerEvents="box-none">
        
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.floatingBackBtn}>
            <Text style={styles.floatingBackText}>⬅️ Hub</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitleText} numberOfLines={1}>📍 TERRITORY RADAR</Text>
          </View>

          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={styles.floatingThemeBtn}>
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.floatingActionRow}>
          <TouchableOpacity 
            style={styles.floatingStartBtn} 
            onPress={() => router.push('/route-select')}
          >
            <Text style={styles.floatingStartBtnText}>
              🚀 START JOURNEY PLANNER ➔
            </Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* FIXED SMART FOOTER */}
      <View style={styles.footerContainer}>
        <SmartFooter isDark={isDark} colors={{ card: isDark ? '#1E293B' : '#FFFFFF', border: isDark ? '#334155' : '#CBD5E1', cyan: '#38BDF8', subText: '#94A3B8' }} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  floatingOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingBackBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  floatingBackText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
  },
  headerTitleBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatingThemeBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  floatingActionRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  floatingStartBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  floatingStartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerContainer: {
    backgroundColor: '#1E293B',
  },
});
