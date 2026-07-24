import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

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

  const renderTab = (isActive, iconActive, iconInactive, label, route, accessibilityLabel) => {
    return (
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.replace(route)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[
          styles.iconContainer,
          isActive && { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(37, 99, 235, 0.08)' }
        ]}>
          <Ionicons
            name={isActive ? iconActive : iconInactive}
            size={18}
            color={isActive ? activeCyan : inactiveGray}
          />
        </View>
        <Text style={[
          styles.tabLabel,
          { color: isActive ? activeCyan : inactiveGray },
          isActive && styles.activeBold
        ]}>
          {label}
        </Text>
        {isActive && <View style={[styles.activeIndicator, { backgroundColor: activeCyan }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.footerContainer, { backgroundColor: bg, borderTopColor: border }]}>
      {renderTab(isHomeActive, 'home', 'home-outline', 'Home', '/home', 'Home Tab')}
      {renderTab(isRouteActive, 'map', 'map-outline', 'Route', '/route', 'Route Tab')}
      {renderTab(isInventoryActive, 'cube', 'cube-outline', 'Inventory', '/inventory', 'Inventory Tab')}
      {renderTab(isHistoryActive, 'receipt', 'receipt-outline', 'History', '/history', 'History Tab')}
      {renderTab(isProfileActive, 'person', 'person-outline', 'Profile', '/profile', 'Profile Tab')}
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1.2,
    paddingBottom: 14
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative'
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600'
  },
  activeBold: {
    fontWeight: '800'
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: -6,
  }
});
