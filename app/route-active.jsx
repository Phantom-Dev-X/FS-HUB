import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Platform, Linking, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';
import { RouteStore } from './RouteStore';

let MapView = null;
let Marker = null;
let Polyline = null;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

export default function RouteActiveScreen() {
  const [isDark, setIsDark] = useState(true);
  const repLoc = RouteStore.repLocation;
  const [activeStores, setActiveStores] = useState(RouteStore.getSelectedStores());

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
  };

  const toggleVisited = (id, name) => {
    const updated = activeStores.map(c => c.id === id ? { ...c, visited: !c.visited } : c);
    setActiveStores(updated);
    RouteStore.clients = RouteStore.clients.map(c => c.id === id ? { ...c, visited: !c.visited } : c);
    Alert.alert('Stop Status Updated ✓', `${name} marked as visited and completed for today's route!`);
  };

  const routeCoordinates = [
    repLoc,
    ...activeStores.map(s => s.coordinate)
  ];

  const openExternalGoogleMaps = () => {
    if (activeStores.length === 0) return;
    const firstStop = activeStores[0].coordinate;
    
    let waypointsParam = '';
    if (activeStores.length > 1) {
      const rest = activeStores.slice(1).map(s => `${s.coordinate.latitude},${s.coordinate.longitude}`).join('|');
      waypointsParam = `&waypoints=${rest}`;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${repLoc.latitude},${repLoc.longitude}&destination=${firstStop.latitude},${firstStop.longitude}${waypointsParam}`;
    Linking.openURL(url);
  };

  // Look right right here: Persistent Route Safeguard!
  // Prevents sales reps from accidentally aborting their route early!
  const handleEndOrReturnRoute = () => {
    const unvisitedCount = activeStores.filter(s => !s.visited).length;
    
    if (unvisitedCount > 0) {
      Alert.alert(
        '⚠️ Incomplete Route Alert',
        `You still have ${unvisitedCount} pending client stops on today's itinerary (` +
        activeStores.filter(s => !s.visited).map(s => s.name).join(', ') +
        `)! Are you sure you want to abort your assigned route early?`,
        [
          { text: 'Resume Route 🚗', style: 'cancel' },
          { 
            text: 'Abort Route Early ⚠️', 
            style: 'destructive',
            onPress: () => {
              RouteStore.isJourneyActive = false; // Unlocks journey memory
              router.replace('/route'); // Returns to Screen 1
            }
          }
        ]
      );
      return;
    }

    // If all stops visited 100%:
    Alert.alert('🎉 Route 100% Completed!', 'All assigned client stops visited and verified! Route closed successfully.');
    RouteStore.isJourneyActive = false;
    router.replace('/route');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Top Header & Safeguard Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleEndOrReturnRoute} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ End / Modify Route</Text>
          </TouchableOpacity>

          <Text style={[styles.mainTitle, { color: colors.cyan }]} numberOfLines={1}>
            🚀 ACTIVE ROUTE MAP
          </Text>

          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* 1. IN-APP INTERACTIVE ROUTE MAP */}
        <View style={[styles.routeMapContainer, { borderColor: colors.cyan }]}>
          {Platform.OS === 'web' || !MapView ? (
            <View style={[styles.webFallbackBox, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🗺️</Text>
              <Text style={{ color: colors.mainText, fontWeight: 'bold', fontSize: 16 }}>Active Polyline Route Ready</Text>
              <Text style={{ color: colors.green, fontSize: 13, marginTop: 4 }}>Connecting {activeStores.length} Client Stores</Text>
            </View>
          ) : (
            <MapView 
              style={styles.realMap}
              initialRegion={{
                latitude: repLoc.latitude,
                longitude: repLoc.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              <Marker coordinate={repLoc} title="📍 Rep Start Location" description="Ikeja HQ" pinColor="blue" />
              {activeStores.map(store => (
                <Marker 
                  key={store.id} 
                  coordinate={store.coordinate} 
                  title={store.name} 
                  description={`Stop Status: ${store.visited ? 'Visited ✓' : 'Pending'}`}
                  pinColor={store.visited ? 'orange' : 'green'} 
                />
              ))}
              {Polyline && (
                <Polyline 
                  coordinates={routeCoordinates}
                  strokeColor="#007AFF"
                  strokeWidth={4.5}
                />
              )}
            </MapView>
          )}
        </View>

        {/* 2. MULTI-STOP GOOGLE MAPS VOICE NAVIGATION BUTTON! */}
        <TouchableOpacity style={styles.navGoogleBtn} onPress={openExternalGoogleMaps}>
          <Text style={styles.navGoogleBtnText}>
            ⚡ Launch Turn-by-Turn Voice Navigation in Google Maps ➔
          </Text>
        </TouchableOpacity>

        {/* Stop-by-Stop Itinerary Checklist */}
        <Text style={[styles.sectionTitle, { color: colors.mainText }]}>
          🚗 TODAY'S DRIVING ITINERARY (Tap to Mark Visited)
        </Text>

        <View style={[styles.itineraryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.stopRow}>
            <Text style={styles.stopNum}>🏁</Text>
            <View style={styles.stopTextWrapper}>
              <Text style={[styles.stopName, { color: colors.mainText }]}>Start: Ikeja Headquarters</Text>
              <Text style={[styles.stopSub, { color: colors.subText }]}>Rep Office Departure Point</Text>
            </View>
          </View>

          {activeStores.map((store, idx) => (
            <View key={store.id} style={[styles.stopRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={styles.stopNum}>{idx + 1}️⃣</Text>
              <View style={styles.stopTextWrapper}>
                <Text style={[styles.stopName, { color: colors.mainText, textDecorationLine: store.visited ? 'line-through' : 'none' }]}>
                  {store.name}
                </Text>
                <Text style={[styles.stopSub, { color: store.visited ? colors.amber : colors.green }]}>
                  {store.visited ? 'Visited & Completed Today ✓' : `Stop #${idx + 1} • ${store.distance}`}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.visitedBtn, { backgroundColor: store.visited ? colors.amber : colors.green }]}
                onPress={() => toggleVisited(store.id, store.name)}
              >
                <Text style={styles.visitedBtnText}>{store.visited ? 'Undo' : 'Mark Visited ✓'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.resetBtn, { borderColor: colors.border }]} 
          onPress={handleEndOrReturnRoute}
        >
          <Text style={styles.resetBtnText}>⏹️ End Route & Return to Territory Map</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* FIXED SMART FOOTER */}
      <SmartFooter isDark={isDark} colors={{ card: colors.card, border: colors.border, cyan: colors.cyan, subText: colors.subText }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  routeMapContainer: {
    height: 310,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 16,
    elevation: 4,
  },
  realMap: {
    width: '100%',
    height: '100%',
  },
  webFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  navGoogleBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  navGoogleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  itineraryCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 18,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  stopNum: {
    fontSize: 18,
    marginRight: 10,
  },
  stopTextWrapper: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  stopSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  visitedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 8,
  },
  visitedBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  resetBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  resetBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
});
