import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';

// 100% DPI-Responsive & Compact Smart Footer!
export default function SmartFooter({ isDark, colors }) {
  const currentPath = usePathname();

  const bg = colors?.card || '#1E293B';
  const border = colors?.border || '#334155';
  const activeCyan = colors?.cyan || '#38BDF8';
  const inactiveGray = colors?.subText || '#64748B';

  const isHomeActive = currentPath === '/home' || currentPath === '/dashboard' || currentPath === '/' || currentPath === '';
  const isRouteActive = currentPath === '/route';
  const isInventoryActive = currentPath === '/inventory';
  const isHistoryActive = currentPath === '/history';
  const isProfileActive = currentPath === '/profile';

  return (
    <View style={[styles.footerContainer, { backgroundColor: bg, borderTopColor: border }]}>
      
      {/* Tab 1: Home Hub */}
      <TouchableOpacity 
        style={[styles.tabItem, isHomeActive && styles.activeTabPill]} 
        onPress={() => router.push('/home')}
      >
        <Text style={[styles.tabIcon, isHomeActive && { transform: [{ scale: 1.1 }] }]}>🏠</Text>
        <Text style={[styles.tabLabel, { color: isHomeActive ? activeCyan : inactiveGray }, isHomeActive && styles.activeBold]} numberOfLines={1}>
          Home
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Route / Map */}
      <TouchableOpacity 
        style={[styles.tabItem, isRouteActive && styles.activeTabPill]} 
        onPress={() => router.push('/route')}
      >
        <Text style={[styles.tabIcon, isRouteActive && { transform: [{ scale: 1.1 }] }]}>🗺️</Text>
        <Text style={[styles.tabLabel, { color: isRouteActive ? activeCyan : inactiveGray }, isRouteActive && styles.activeBold]} numberOfLines={1}>
          Route
        </Text>
      </TouchableOpacity>

      {/* Tab 3: Inventory */}
      <TouchableOpacity 
        style={[styles.tabItem, isInventoryActive && styles.activeTabPill]} 
        onPress={() => router.push('/inventory')}
      >
        <Text style={[styles.tabIcon, isInventoryActive && { transform: [{ scale: 1.1 }] }]}>📦</Text>
        <Text style={[styles.tabLabel, { color: isInventoryActive ? activeCyan : inactiveGray }, isInventoryActive && styles.activeBold]} numberOfLines={1}>
          Inventory
        </Text>
      </TouchableOpacity>

      {/* Tab 4: History */}
      <TouchableOpacity 
        style={[styles.tabItem, isHistoryActive && styles.activeTabPill]} 
        onPress={() => router.push('/history')}
      >
        <Text style={[styles.tabIcon, isHistoryActive && { transform: [{ scale: 1.1 }] }]}>📜</Text>
        <Text style={[styles.tabLabel, { color: isHistoryActive ? activeCyan : inactiveGray }, isHistoryActive && styles.activeBold]} numberOfLines={1}>
          History
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Profile */}
      <TouchableOpacity 
        style={[styles.tabItem, isProfileActive && styles.activeTabPill]} 
        onPress={() => router.push('/profile')}
      >
        <Text style={[styles.tabIcon, isProfileActive && { transform: [{ scale: 1.1 }] }]}>👤</Text>
        <Text style={[styles.tabLabel, { color: isProfileActive ? activeCyan : inactiveGray }, isProfileActive && styles.activeBold]} numberOfLines={1}>
          Profile
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1.2,
    paddingBottom: 14,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeTabPill: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tabIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeBold: {
    fontWeight: '900',
  },
});
