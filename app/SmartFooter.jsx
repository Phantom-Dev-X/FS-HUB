import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

// Global theme synced footer - no need to pass isDark/colors props anymore
export default function SmartFooter() {
  const { isDark, colors } = useTheme();
  const currentPath = usePathname();

  const bg = colors.card;
  const border = colors.border;
  const activeCyan = colors.cyan;
  const inactiveGray = colors.subText;

  const isHomeActive = currentPath === '/home' || currentPath === '/dashboard' || currentPath === '/' || currentPath === '';
  const isRouteActive = currentPath === '/route' || currentPath === '/route-select' || currentPath === '/route-active';
  const isInventoryActive = currentPath === '/inventory';
  const isHistoryActive = currentPath === '/history';
  const isProfileActive = currentPath === '/profile';

  return (
    <View style={[styles.footerContainer, { backgroundColor: bg, borderTopColor: border }]}>
      <TouchableOpacity style={[styles.tabItem, isHomeActive && { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: activeCyan, borderWidth: isHomeActive ? 1 : 0, borderRadius: 10 }]} onPress={() => router.push('/home')}>
        <Text style={styles.tabIcon}>🏠</Text>
        <Text style={[styles.tabLabel, { color: isHomeActive ? activeCyan : inactiveGray }, isHomeActive && styles.activeBold]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.tabItem, isRouteActive && { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: activeCyan, borderWidth: isRouteActive ? 1 : 0, borderRadius: 10 }]} onPress={() => router.push('/route')}>
        <Text style={styles.tabIcon}>🗺️</Text>
        <Text style={[styles.tabLabel, { color: isRouteActive ? activeCyan : inactiveGray }, isRouteActive && styles.activeBold]}>Route</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.tabItem, isInventoryActive && { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: activeCyan, borderWidth: isInventoryActive ? 1 : 0, borderRadius: 10 }]} onPress={() => router.push('/inventory')}>
        <Text style={styles.tabIcon}>📦</Text>
        <Text style={[styles.tabLabel, { color: isInventoryActive ? activeCyan : inactiveGray }, isInventoryActive && styles.activeBold]}>Inventory</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.tabItem, isHistoryActive && { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: activeCyan, borderWidth: isHistoryActive ? 1 : 0, borderRadius: 10 }]} onPress={() => router.push('/history')}>
        <Text style={styles.tabIcon}>📜</Text>
        <Text style={[styles.tabLabel, { color: isHistoryActive ? activeCyan : inactiveGray }, isHistoryActive && styles.activeBold]}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.tabItem, isProfileActive && { backgroundColor: isDark ? '#0F172A' : '#EFF6FF', borderColor: activeCyan, borderWidth: isProfileActive ? 1 : 0, borderRadius: 10 }]} onPress={() => router.push('/profile')}>
        <Text style={styles.tabIcon}>👤</Text>
        <Text style={[styles.tabLabel, { color: isProfileActive ? activeCyan : inactiveGray }, isProfileActive && styles.activeBold]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1.2, paddingBottom: 14 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 6 },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  activeBold: { fontWeight: '900' },
});
