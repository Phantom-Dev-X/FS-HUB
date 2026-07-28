import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, usePathname } from 'expo-router';

const items = [
  { label: 'Overview', icon: '🏢', path: '/admin' },
  { label: 'Analytics', icon: '📊', path: '/admin-analytics' },
  { label: 'Orders', icon: '📦', path: '/admin-orders' },
  { label: 'Messages', icon: '💬', path: '/admin-messages' },
  { label: 'More', icon: '☰', path: '/admin-more' },
];

export default function AdminFooter() {
  const pathname = usePathname();
  return (
    <View style={styles.footer}>
      {items.map(item => {
        const active = pathname === item.path;
        return (
          <TouchableOpacity key={item.path} style={[styles.item, active && styles.activeItem]} onPress={() => router.replace(item.path)}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 76,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
    elevation: 10,
  },
  item: { alignItems: 'center', justifyContent: 'center', minWidth: 58, paddingVertical: 5, borderRadius: 14 },
  activeItem: { backgroundColor: '#EFF6FF' },
  icon: { fontSize: 17, marginBottom: 2 },
  label: { color: '#64748B', fontSize: 10, fontWeight: '900' },
  activeLabel: { color: '#2563EB' },
});
