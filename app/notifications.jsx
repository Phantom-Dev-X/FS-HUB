import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const session = await DatabaseEngine.getSession();
    const id = session?.id || OrderStore.currentAgent?.id;
    setRepId(id || '');
    if (!id || id === 'REP-GUEST') {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const data = await DatabaseEngine.getRepNotifications(id);
    setNotifications(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const markRead = async (item) => {
    if (!item.read) {
      await DatabaseEngine.markRepNotificationRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
          <View style={styles.badge}><Text style={styles.badgeText}>{notifications.filter(n => !n.read).length} Unread</Text></View>
        </View>

        <Text style={styles.title}>🔔 Notifications</Text>
        <Text style={styles.sub}>Admin replies and HQ messages for {repId || 'your account'}.</Text>

        {loading ? (
          <View style={styles.emptyBox}><ActivityIndicator color="#2563EB" /><Text style={styles.emptySub}>Loading notifications...</Text></View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>🔕</Text>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptySub}>Replies from admin/HQ will appear here.</Text>
          </View>
        ) : notifications.map(item => (
          <TouchableOpacity key={item.id} style={[styles.card, !item.read && styles.unreadCard]} onPress={() => markRead(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {!item.read && <View style={styles.dot} />}
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.cardMeta}>{item.type || 'admin_reply'} • {item.created_at ? new Date(item.created_at).toLocaleString() : 'Now'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  scroll: { padding: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '900', marginLeft: 4 },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '900' },
  title: { fontSize: 23, fontWeight: '900', color: '#1E3A8A' },
  sub: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#CBD5E1' },
  unreadCard: { borderLeftColor: '#2563EB', backgroundColor: '#F8FBFF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '900' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  cardBody: { color: '#334155', fontSize: 12, lineHeight: 18, marginTop: 7 },
  cardMeta: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 10 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 26, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginTop: 12 },
  emptyTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 },
});
