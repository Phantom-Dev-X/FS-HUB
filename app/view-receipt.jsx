import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseEngine } from './_DatabaseEngine';

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatNaira = (value) => `₦${toNumber(value).toLocaleString()}`;

const parseItems = (rawItems) => {
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

const getReceiptNo = (order) => String(
  order?.invoice_number ||
  order?.invoiceNumber ||
  order?.id ||
  ''
);

const getClientName = (order) => (
  order?.client_name ||
  order?.clientName ||
  order?.store_name ||
  order?.store ||
  'Client Store'
);

const getRepId = (order) => order?.rep_id || order?.repId || 'UNKNOWN';

const getCreatedAt = (order) => {
  const raw = order?.created_at || order?.localTimestamp || order?.createdAt;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getTotals = (order, items) => {
  const itemSubtotal = items.reduce((sum, item) => {
    const qty = toNumber(item.qty ?? item.quantity ?? 0);
    const price = toNumber(item.price ?? item.unit_price ?? item.unitPrice ?? 0);
    return sum + (qty * price);
  }, 0);

  const grandTotal = toNumber(
    order?.grand_total ??
    order?.grandTotal ??
    order?.total_amount ??
    order?.totalAmount ??
    itemSubtotal
  );
  const discount = toNumber(order?.discount_amount ?? order?.discountAmount ?? 0);
  const payable = toNumber(order?.payable_total ?? order?.payableTotal ?? Math.max(0, grandTotal - discount));

  return {
    subtotal: itemSubtotal || grandTotal,
    discount,
    grandTotal,
    payable,
  };
};

export default function ReceiptScreen() {
  const params = useLocalSearchParams();
  const receiptNo = String(params.receiptNo || params.id || '');
  const source = String(params.source || '');
  const localTimestamp = String(params.localTimestamp || '');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    const loadExactReceipt = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [cloudOrders, offlineOrders] = await Promise.all([
          DatabaseEngine.getAllOrders(),
          DatabaseEngine.getOfflineOrders(),
        ]);
        const allOrders = [
          ...(Array.isArray(cloudOrders) ? cloudOrders.map(o => ({ ...o, __source: 'cloud' })) : []),
          ...(Array.isArray(offlineOrders) ? offlineOrders.map(o => ({ ...o, __source: 'offline' })) : []),
        ];

        // Exact matching only: same invoice/receipt number first. If caller gave
        // a local timestamp for an offline order, use it as an extra guard.
        let found = allOrders.find(o => getReceiptNo(o) === receiptNo && (!source || o.__source === source));
        if (found && localTimestamp && found.localTimestamp && found.localTimestamp !== localTimestamp) {
          found = allOrders.find(o => getReceiptNo(o) === receiptNo && found.localTimestamp === localTimestamp);
        }
        if (!found) found = allOrders.find(o => getReceiptNo(o) === receiptNo);

        if (active) {
          setOrder(found || null);
          setNotFound(!found);
        }
      } catch (e) {
        console.log('Receipt load error', e.message);
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadExactReceipt();
    return () => { active = false; };
  }, [receiptNo, source, localTimestamp]);

  const items = useMemo(() => parseItems(order?.order_items || order?.cartItems || order?.items), [order]);
  const totals = useMemo(() => getTotals(order || {}, items), [order, items]);
  const totalUnits = items.reduce((sum, item) => sum + toNumber(item.qty ?? item.quantity ?? 0), 0);
  const date = order ? getCreatedAt(order) : new Date();
  const status = order?.status || order?.syncStatus || (order?.__source === 'offline' ? 'Pending Sync' : 'Synced');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#DBEAFE', '#FFFFFF']} style={styles.gradient} />
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingText}>Loading exact receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#FEE2E2', '#FFFFFF']} style={styles.gradient} />
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={42} color="#EF4444" />
          <Text style={styles.notFoundTitle}>Receipt not found</Text>
          <Text style={styles.notFoundText}>No exact order was found for receipt #{receiptNo}. It may have been deleted or synced under another invoice.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.gradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={16} color="#2563EB" />
          <Text style={styles.backText}> Back to History</Text>
        </TouchableOpacity>

        <View style={styles.receiptCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.brand}>FS HUB</Text>
              <Text style={styles.brandSub}>Official Order Receipt</Text>
            </View>
            <View style={styles.logoCircle}><Text style={styles.logoText}>FS</Text></View>
          </View>

          <View style={styles.divider} />

          <View style={styles.invoiceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>INVOICE</Text>
              <Text style={styles.invoiceText}>#{getReceiptNo(order)}</Text>
            </View>
            <View style={[styles.statusBadge, order.__source === 'offline' && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[styles.statusText, order.__source === 'offline' && { color: '#D97706' }]}>{String(status).replace('PENDING_CLOUD_SYNC ⏳', 'Pending Sync')}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.label}>CLIENT</Text>
              <Text style={styles.metaValue}>{getClientName(order)}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.label}>REP ID</Text>
              <Text style={styles.metaValue}>{getRepId(order)}</Text>
            </View>
          </View>

          <View style={styles.metaBoxFull}>
            <Text style={styles.label}>DATE & TIME</Text>
            <Text style={styles.metaValue}>{date.toLocaleString()}</Text>
          </View>

          <Text style={styles.sectionTitle}>ORDER ITEMS ({items.length} line{items.length === 1 ? '' : 's'} • {totalUnits} units)</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Item</Text>
            <Text style={[styles.th, { width: 44, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.th, { width: 86, textAlign: 'right' }]}>Total</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyItemsBox}>
              <Text style={styles.emptyItemsText}>No item lines found for this receipt.</Text>
            </View>
          ) : items.map((item, index) => {
            const qty = toNumber(item.qty ?? item.quantity ?? 0);
            const price = toNumber(item.price ?? item.unit_price ?? item.unitPrice ?? 0);
            const lineTotal = qty * price;
            return (
              <View key={`${getReceiptNo(order)}-${item.id || item.name || index}`} style={styles.itemRow}>
                <View style={{ flex: 2, paddingRight: 8 }}>
                  <Text style={styles.itemName}>{item.name || 'Unnamed Product'}</Text>
                  <Text style={styles.itemSub}>{formatNaira(price)} / unit {item.barcode ? `• #${item.barcode}` : ''}</Text>
                </View>
                <Text style={styles.itemQty}>{qty}</Text>
                <Text style={styles.itemTotal}>{formatNaira(lineTotal)}</Text>
              </View>
            );
          })}

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatNaira(totals.subtotal)}</Text></View>
            {totals.discount > 0 && <View style={styles.totalRow}><Text style={styles.totalLabel}>Discount</Text><Text style={styles.discountValue}>- {formatNaira(totals.discount)}</Text></View>}
            <View style={styles.grandRow}><Text style={styles.grandLabel}>Payable Total</Text><Text style={styles.grandValue}>{formatNaira(totals.payable)}</Text></View>
          </View>

          <Text style={styles.footerNote}>Thank you for doing business with FS Hub.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  scroll: { padding: 16, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  receiptCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#DBEAFE', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#1E3A8A', fontSize: 25, fontWeight: '900', letterSpacing: 1 },
  brandSub: { color: '#64748B', fontSize: 12, marginTop: 2, fontWeight: '700' },
  logoCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  label: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.4, marginBottom: 4 },
  invoiceText: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  statusBadge: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: 150 },
  statusText: { color: '#047857', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  metaGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metaBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12 },
  metaBoxFull: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, marginBottom: 16 },
  metaValue: { color: '#0F172A', fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: '#0F172A', fontSize: 12, fontWeight: '900', marginBottom: 10, letterSpacing: 0.4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  th: { color: '#1E3A8A', fontSize: 10, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemName: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  itemSub: { color: '#64748B', fontSize: 10, marginTop: 2 },
  itemQty: { width: 44, color: '#0F172A', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  itemTotal: { width: 86, color: '#059669', fontSize: 12, fontWeight: '900', textAlign: 'right' },
  emptyItemsBox: { padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  emptyItemsText: { color: '#64748B', fontSize: 12 },
  totalsBox: { marginTop: 14, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  totalValue: { color: '#0F172A', fontSize: 12, fontWeight: '900' },
  discountValue: { color: '#D97706', fontSize: 12, fontWeight: '900' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { color: '#1E3A8A', fontSize: 14, fontWeight: '900' },
  grandValue: { color: '#059669', fontSize: 21, fontWeight: '900' },
  footerNote: { color: '#64748B', textAlign: 'center', fontSize: 11, marginTop: 16, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: '#334155', fontWeight: '800' },
  notFoundTitle: { color: '#DC2626', fontSize: 18, fontWeight: '900', marginTop: 12 },
  notFoundText: { color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  primaryBtn: { backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, marginTop: 18 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
});
