import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import { SupabaseAuth } from './_SupabaseAuth';
import AdminFooter from './AdminFooter';

const isToday = (dateLike) => {
  const date = new Date(dateLike || 0);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
};

export default function AdminOverviewScreen() {
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [reps, setReps] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [messages, setMessages] = useState([]);

  const todayOrders = useMemo(() => orders.filter(o => isToday(o.created_at || o.createdAt || o.localTimestamp)), [orders]);
  const unreadMessages = useMemo(() => messages.filter(m => !m.admin_read), [messages]);
  const openMessages = useMemo(() => messages.filter(m => String(m.status || 'Open').toLowerCase() !== 'closed'), [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rawOrders, allReps, products, adminMessages] = await Promise.all([
        DatabaseEngine.getAllOrders(),
        DatabaseEngine.getAllReps(),
        DatabaseEngine.getCatalog(),
        DatabaseEngine.getAdminMessages(),
      ]);
      setOrders(rawOrders || []);
      setReps(Array.from(new Map([...(OrderStore.activeReps || []), ...(allReps || [])].map(r => [r.id || r.email, r])).values()));
      setCatalog(products || []);
      setMessages(adminMessages || []);
    } catch (e) {
      Alert.alert('Admin Error', e.message || 'Could not load admin overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const session = await DatabaseEngine.getSession();
      if (!DatabaseEngine.isAdminSession(session)) {
        setAuthorized(false);
        Alert.alert('Admin access required', 'Field reps cannot open Admin Portal.');
        router.replace('/home');
        return;
      }
      setAuthorized(true);
      await loadData();
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (authorized === true) loadData();
  }, [authorized]));

  const signOut = async () => {
    await SupabaseAuth.signOut();
    await DatabaseEngine.clearSession();
    OrderStore.currentAgent = { name: 'Guest Officer', id: 'REP-GUEST', role: 'Field Officer', territory: '', avatar: null, initials: 'GO', email: '' };
    router.replace('/');
  };

  if (authorized !== true) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#2563EB" size="large" /><Text style={styles.centerText}>Verifying admin access...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E3A8A', '#2563EB']} style={styles.headerBg} />
      <View style={styles.header}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}><Text style={styles.signOutText}>⬅️ Sign Out</Text></TouchableOpacity>
          <Text style={styles.pill}>HQ ADMIN SUITE</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshBtn}><Ionicons name="refresh" size={17} color="#FFF" /></TouchableOpacity>
        </View>
        <Text style={styles.title}>Admin Control Center</Text>
        <Text style={styles.subtitle}>Overview only. Open a section below to manage full details.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? <View style={styles.empty}><ActivityIndicator color="#2563EB" /><Text style={styles.emptySub}>Loading admin dashboard...</Text></View> : (
          <>
            <View style={styles.metricsGrid}>
              <Metric emoji="📦" label="Today Orders" value={todayOrders.length} color="#F59E0B" />
              <Metric emoji="💬" label="Unread Msgs" value={unreadMessages.length} color="#A855F7" />
              <Metric emoji="📍" label="Total Reps" value={reps.length} color="#2563EB" />
              <Metric emoji="🏬" label="Products" value={catalog.length} color="#10B981" />
            </View>

            <Text style={styles.sectionTitle}>Admin Sections</Text>
            <View style={styles.menuCard}>
              <MenuItem emoji="📊" title="Analytics" sub="Total orders, reps, products, sync health" onPress={() => router.push('/admin-analytics')} />
              <MenuItem emoji="📦" title="Orders Queue" sub="Today's synced field orders" count={todayOrders.length} onPress={() => router.push('/admin-orders')} />
              <MenuItem emoji="💬" title="Messages & Requests" sub="Rep messages, restock requests, replies" count={unreadMessages.length} onPress={() => router.push('/admin-messages')} />
              <MenuItem emoji="📍" title="Reps Radar" sub="All registered reps and territories" onPress={() => router.push('/admin-reps')} />
              <MenuItem emoji="🏬" title="Catalog & Stock" sub="Create products, update prices and stock" onPress={() => router.push('/admin-catalog')} />
              <MenuItem emoji="🛡️" title="Admins & Access" sub="HQ users and protected primary admin" onPress={() => router.push('/admin-access')} />
            </View>

            <Text style={styles.sectionTitle}>Latest Messages</Text>
            {openMessages.length === 0 ? <View style={styles.empty}><Text style={{ fontSize: 34 }}>💬</Text><Text style={styles.emptyTitle}>No open messages</Text><Text style={styles.emptySub}>New rep messages and restock requests will appear here.</Text></View> : openMessages.slice(0, 2).map(msg => (
              <TouchableOpacity key={msg.id} style={[styles.messageCard, !msg.admin_read && styles.unreadCard]} onPress={() => router.push('/admin-messages')}>
                <View style={styles.cardTop}><Text style={styles.messageTitle} numberOfLines={1}>{msg.title}</Text>{!msg.admin_read && <View style={styles.redDot} />}</View>
                <Text style={styles.messageMeta}>{msg.rep_name || 'Field Officer'} • {msg.rep_id || 'UNKNOWN'} • {msg.priority || 'Normal'}</Text>
                <Text style={styles.messageBody} numberOfLines={2}>{msg.body}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
      <AdminFooter />
    </SafeAreaView>
  );
}

function Metric({ emoji, label, value, color }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}><Text>{emoji}</Text></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function MenuItem({ emoji, title, sub, count, onPress }) {
  return <TouchableOpacity style={styles.menuItem} onPress={onPress}><View style={styles.menuIcon}><Text>{emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSub}>{sub}</Text></View>{count ? <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View> : null}<Ionicons name="chevron-forward" size={18} color="#94A3B8" /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '800' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 235 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  signOutText: { color: '#38BDF8', fontSize: 11, fontWeight: '900' },
  refreshBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  pill: { color: '#FDE68A', backgroundColor: 'rgba(245,158,11,0.16)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.32)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 92, paddingTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metric: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 20, padding: 14, shadowColor: '#2563EB', shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  metricValue: { color: '#0F172A', fontSize: 22, fontWeight: '900' },
  metricLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  sectionTitle: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 14, marginBottom: 9, marginLeft: 4 },
  menuCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, overflow: 'hidden', marginBottom: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  menuTitle: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  menuSub: { color: '#64748B', fontSize: 11, lineHeight: 15, marginTop: 2 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 999, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  messageCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderLeftColor: '#2563EB', borderRadius: 16, padding: 15, marginBottom: 12 },
  unreadCard: { backgroundColor: '#F8FBFF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  messageTitle: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '900' },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  messageMeta: { color: '#2563EB', fontSize: 11, fontWeight: '800', marginTop: 5 },
  messageBody: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 5 },
  empty: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 },
});
