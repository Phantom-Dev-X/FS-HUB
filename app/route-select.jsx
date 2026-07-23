import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { RouteStore } from './RouteStore';

export default function RouteSelectScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientList, setClientList] = useState(RouteStore.clients);

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
  };

  const toggleSelectStore = (id) => {
    const updated = clientList.map(c => c.id === id ? { ...c, selected: !c.selected } : c);
    setClientList(updated);
    RouteStore.clients = updated;
  };

  const filteredClients = clientList.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = clientList.filter(c => c.selected).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push('/route')} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Territory Map</Text>
          </TouchableOpacity>

          <Text style={[styles.mainTitle, { color: colors.mainText }]} numberOfLines={1}>
            📋 SELECT CLIENT STOPS
          </Text>

        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          Tick the client stores you plan to visit on today's route. We connect them in optimal driving order!
        </Text>

        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={[styles.searchInput, { color: colors.mainText }]}
            placeholder="Search store name or territory..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredClients.map((store) => (
          <TouchableOpacity 
            key={store.id} 
            style={[
              styles.storeCheckCard, 
              { backgroundColor: colors.card, borderColor: store.selected ? colors.green : colors.border },
              store.selected && styles.selectedCardBorder
            ]}
            onPress={() => toggleSelectStore(store.id)}
          >
            <View style={styles.checkRow}>
              <View style={[styles.checkBox, { borderColor: store.selected ? colors.green : colors.subText, backgroundColor: store.selected ? colors.green : 'transparent' }]}>
                {store.selected && <Text style={styles.checkMark}>✓</Text>}
              </View>

              <View style={styles.storeTextWrapper}>
                <Text style={[styles.storeName, { color: colors.mainText }]} numberOfLines={1}>{store.name}</Text>
                <Text style={[styles.storeAddress, { color: colors.subText }]} numberOfLines={1}>📍 {store.address}</Text>
                <Text style={[styles.storeDistance, { color: colors.cyan }]}>🚗 {store.distance}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity 
          style={[styles.calcRouteBtn, selectedCount === 0 && { backgroundColor: '#475569' }]}
          onPress={() => {
            if (selectedCount === 0) {
              Alert.alert('No Stores Ticked ⚠️', 'Please tick at least 1 store from the checklist to calculate your route!');
              return;
            }
            // Look right right here: We lock `RouteStore.isJourneyActive = true` before transitioning!
            RouteStore.isJourneyActive = true;
            router.push('/route-active');
          }}
        >
          <Text style={styles.calcRouteBtnText}>
            ⚡ CALCULATE FASTEST ROUTE ({selectedCount} Selected) ➔
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <SmartFooter isDark={isDark} colors={{ card: colors.card, border: colors.border, cyan: colors.cyan, subText: colors.subText }} />
import { useTheme } from '../context/ThemeContext';
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  subText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
  },
  storeCheckCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    elevation: 2,
  },
  selectedCardBorder: {
    borderLeftWidth: 6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  storeTextWrapper: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  storeAddress: {
    fontSize: 12,
    marginBottom: 3,
  },
  storeDistance: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  calcRouteBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    marginTop: 14,
  },
  calcRouteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
