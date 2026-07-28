// HISTORY - ZERO FAKE, WHITE PREMIUM, FIXED TEXT ERROR
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { DatabaseEngine } from './_DatabaseEngine';

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getOrderTotal = (order) => toNumber(
  order?.payable_total ??
  order?.payableTotal ??
  order?.finalPayableTotal ??
  order?.grandTotal ??
  order?.total_amount ??
  order?.totalAmount ??
  order?.amount ??
  0
);

const getOrderItems = (order) => {
  const rawItems = order?.order_items || order?.cartItems || order?.items || [];
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getOrderDate = (order) => {
  const rawDate = order?.created_at || order?.localTimestamp || order?.createdAt;
  const date = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getFilterTag = (date) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfOrderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday - startOfOrderDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays >= 0 && diffDays <= 6) return 'This Week';
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) return 'This Month';
  return 'All Time';
};

const getOrderClientName = (order) => (
  order?.store_name ||
  order?.store ||
  order?.clientName ||
  order?.client_name ||
  'Client Store'
);

const getReceiptNo = (order) => (
  order?.invoice_number ||
  order?.invoiceNumber ||
  order?.id ||
  `LOG-${Math.random()}`
);

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Time');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = ['All Time', 'Today', 'This Week', 'This Month'];

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        setLoading(true);
        try {
          const session = await DatabaseEngine.getSession();
          const repId = session?.id;

          // Fetch only own orders from Supabase (big company - reps see only own)
          let orders = [];
          if (repId) {
            orders = await DatabaseEngine.getOrdersByRep(repId);
          } else {
            orders = await DatabaseEngine.getAllOrders();
          }

          // Also include offline orders still pending on this phone.
          const offline = await DatabaseEngine.getOfflineOrders();
          const allOrders = [...orders, ...offline];

          // Convert both Supabase rows and local offline records to history logs.
          const logs = allOrders.map(o => {
            const orderDate = getOrderDate(o);
            const items = getOrderItems(o);
            const totalUnits = items.reduce((sum, item) => sum + toNumber(item?.qty ?? item?.quantity ?? 0), 0);
            const total = getOrderTotal(o);
            const receiptNo = getReceiptNo(o);
            const isOffline = !o.created_at && (o.syncStatus || o.localTimestamp);

            return {
              id: receiptNo,
              clientName: getOrderClientName(o),
              type: isOffline ? 'Offline Order Pending Sync' : 'Check-In & Order Logged',
              date: orderDate.toLocaleString(),
              filterTag: getFilterTag(orderDate),
              amount: `₦${total.toLocaleString()} (${items.length} line${items.length === 1 ? '' : 's'}${totalUnits ? ` • ${totalUnits} units` : ''})`,
              gpsPrecision: o.geotag_lat_lon || o.gpsVerified || 'No GPS recorded',
              statusColor: isOffline ? '#F59E0B' : '#10B981',
              receiptNo,
              localTimestamp: o.localTimestamp || '',
              source: isOffline ? 'offline' : 'cloud',
            };
          }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (active) setHistoryLogs(logs);
        } catch (e) {
          console.log('History load error', e.message);
          if (active) Alert.alert('History Error', `Could not load orders: ${e.message}`);
        } finally {
          if (active) setLoading(false);
        }
      };

      loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  const filteredLogs = historyLogs.filter(log => {
    const matchesSearch = log.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || log.receiptNo?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      selectedFilter === 'All Time' ||
      log.filterTag === selectedFilter ||
      (selectedFilter === 'This Week' && log.filterTag === 'Today') ||
      (selectedFilter === 'This Month' && ['Today', 'This Week'].includes(log.filterTag));
    return matchesSearch && matchesFilter;
  });

  const handleViewReceipt = (log) => {
    router.push({
      pathname: '/view-receipt',
      params: {
        receiptNo: log.receiptNo,
        source: log.source || '',
        localTimestamp: log.localTimestamp || '',
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{historyLogs.length} Logs</Text>
          </View>
        </View>

        <Text style={styles.mainTitle}>📜 My Order History</Text>
        <Text style={styles.subText}>Review and track your previously submitted orders and field activity logs.</Text>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="Search client or receipt..." placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: 14 }}>
          {filters.map((fil, idx) => {
            const active = selectedFilter === fil;
            return (
              <TouchableOpacity key={idx} style={[styles.filPill, active && { backgroundColor: '#2563EB', borderColor: '#2563EB' }]} onPress={() => setSelectedFilter(fil)}>
                <Text style={[styles.filPillText, active && { color: '#FFFFFF' }]}>{fil}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.emptySub}>Loading your order history from Supabase...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>📜</Text>
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptySub}>You have no orders yet. Orders you take will appear here (only yours). Offline orders pending sync also show here until wiped after sync.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/checkin')}>
              <Text style={styles.emptyBtnText}>Go to Check-In → Take Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.clientName} numberOfLines={1}>{log.clientName}</Text>
                <View style={[styles.typeBadge, { borderColor: log.statusColor }]}>
                  <Text style={[styles.typeBadgeText, { color: log.statusColor }]}>{log.filterTag}</Text>
                </View>
              </View>
              <Text style={styles.dateText}>🕒 {log.date} • #{log.receiptNo}</Text>
              <Text style={styles.amountValue} numberOfLines={1}>{log.amount}</Text>
              <Text style={styles.gpsText} numberOfLines={1}>📍 {log.gpsPrecision}</Text>
              <TouchableOpacity style={styles.receiptBtn} onPress={() => handleViewReceipt(log)}>
                <Ionicons name="document-text-outline" size={14} color="#2563EB" />
                <Text style={styles.receiptBtnText}> View Receipt</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
      <SmartFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '800' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#1E3A8A', marginBottom: 4 },
  subText: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 14 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 14 },
  searchInput: { flex: 1, marginLeft: 8, color: '#0F172A', fontSize: 13 },
  filPill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filPillText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1E3A8A', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 16 },
  emptyBtn: { backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  logCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderLeftColor: '#10B981' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '900', color: '#0F172A', flex: 1, marginRight: 8 },
  typeBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginBottom: 8 },
  amountValue: { fontSize: 14, fontWeight: '800', color: '#059669', marginBottom: 6 },
  gpsText: { fontSize: 11, color: '#64748B', marginBottom: 10 },
  receiptBtn: { flexDirection: 'row', borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  receiptBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginLeft: 4 },
});
