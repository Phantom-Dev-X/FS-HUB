import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

const getOrderKey = (order) => String(
  order?.id ||
  order?.invoiceNumber ||
  order?.invoice_number ||
  order?.localTimestamp ||
  order?.created_at ||
  Math.random()
);

const getOrderTotal = (order) => toNumber(
  order?.payableTotal ??
  order?.payable_total ??
  order?.grandTotal ??
  order?.totalAmount ??
  order?.amount ??
  0
);

const getClientName = (order) => (
  order?.clientName ||
  order?.store ||
  order?.store_name ||
  order?.client?.name ||
  'Unknown Client'
);

const getInvoiceNumber = (order) => (
  order?.invoiceNumber ||
  order?.invoice_number ||
  order?.id ||
  'Pending Invoice'
);

const getOrderItems = (order) => {
  const items = order?.cartItems || order?.items || order?.order_items || [];
  return Array.isArray(items) ? items : [];
};

const getItemSummary = (order) => {
  const items = getOrderItems(order);
  const totalUnits = items.reduce((sum, item) => sum + toNumber(item?.qty ?? item?.quantity ?? 0), 0);
  if (items.length === 0) return 'No item lines saved on this offline record';
  return `${items.length} product line${items.length === 1 ? '' : 's'} • ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`;
};

const getOrderTime = (order) => {
  const raw = order?.localTimestamp || order?.created_at || order?.createdAt;
  if (!raw) return 'Saved locally';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 'Saved locally' : date.toLocaleString();
};

export default function SyncOrdersScreen() {
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadOfflineOrders = async () => {
    try {
      const orders = await DatabaseEngine.getOfflineOrders();
      setOfflineOrders(Array.isArray(orders) ? orders : []);
    } catch (e) {
      console.log('Sync load error', e.message);
      Alert.alert('Load Error', `Could not read offline orders: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineOrders();
  }, []);

  const grandTotal = offlineOrders.reduce((sum, item) => sum + getOrderTotal(item), 0);

  const removeOrder = (orderKey, clientName) => {
    const target = offlineOrders.find(o => getOrderKey(o) === orderKey);
    const targetTotal = getOrderTotal(target);

    Alert.alert(
      'Delete Offline Order',
      `Remove ${clientName}'s offline order (${formatNaira(targetTotal)}) from this phone?\n\nThis cannot be synced after deletion.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = offlineOrders.filter(order => getOrderKey(order) !== orderKey);
            const saved = await DatabaseEngine.setOfflineOrders(updated);
            if (!saved.success) {
              Alert.alert('Delete Failed', saved.error || 'Could not update offline storage.');
              return;
            }
            setOfflineOrders(updated);
          }
        }
      ]
    );
  };

  const handleViewOrder = (order) => {
    const items = getOrderItems(order);
    const itemLines = items.length
      ? items.map((item, idx) => {
          const qty = toNumber(item?.qty ?? item?.quantity ?? 0);
          const price = toNumber(item?.price ?? item?.unit_price ?? 0);
          return `${idx + 1}. ${item.name || 'Unnamed Product'} — Qty: ${qty} — ₦${(qty * price).toLocaleString()}`;
        }).join('\n')
      : 'No item lines saved on this offline record.';

    Alert.alert(
      `Offline Order ${getInvoiceNumber(order)}`,
      `Client: ${getClientName(order)}\nTotal: ${formatNaira(getOrderTotal(order))}\nSaved: ${getOrderTime(order)}\nStatus: ${order.syncStatus || 'Pending cloud sync'}\n\n${itemLines}`
    );
  };

  const handleSyncToCloud = async () => {
    if (offlineOrders.length === 0) {
      Alert.alert('All Clear ✓', 'No offline orders pending.');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await DatabaseEngine.syncToCloudBackend();
      const remainingOrders = await DatabaseEngine.getOfflineOrders();
      setOfflineOrders(Array.isArray(remainingOrders) ? remainingOrders : []);

      if (result.success) {
        Alert.alert(
          'Sync Successful 🎉',
          result.count === 0
            ? 'No offline orders were pending.'
            : `Synced ${result.count} order${result.count === 1 ? '' : 's'} to Supabase. Local pending queue is now clean.`
        );
      } else {
        Alert.alert(
          result.failedCount ? 'Partial Sync ⚠️' : 'Sync Failed',
          result.message || result.error || 'Some orders could not be uploaded. They are still safe on this phone. Please retry when network is stable.'
        );
      }
    } catch (e) {
      Alert.alert('Sync Failed', `${e.message}\n\nYour offline orders are still safe on this phone.`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>⬅️ Back to Home</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>OFFLINE ORDERS SYNC</Text>
          <Text style={styles.subTitle}>Real pending orders waiting to upload to Supabase</Text>
        </View>

        <View style={styles.statusBanner}>
          <Text style={styles.bannerTitle}>📡 OFFLINE QUEUE STATUS</Text>
          <Text style={styles.bannerText}>
            Offline orders are saved safely on this phone first. Tap <Text style={styles.boldCyan}>Sync All</Text> when internet is available; successful uploads are removed locally, failed ones stay pending.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Pending Orders</Text>
            <Text style={styles.summaryValue}>{offlineOrders.length}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>Pending Value</Text>
            <Text style={styles.summaryAmount}>{formatNaira(grandTotal)}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.emptySub}>Reading offline queue...</Text>
          </View>
        ) : offlineOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{fontSize: 48, marginBottom: 12}}>🎉</Text>
            <Text style={styles.emptyTitle}>All Orders Synced!</Text>
            <Text style={styles.emptySub}>No local offline orders pending. Your field order queue is clean.</Text>
          </View>
        ) : (
          offlineOrders.map((item) => {
            const orderKey = getOrderKey(item);
            const clientName = getClientName(item);
            const total = getOrderTotal(item);

            return (
              <View key={orderKey} style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <Text style={styles.clientTitle} numberOfLines={1}>{clientName}</Text>
                  <Text style={styles.totalAmountText}>{formatNaira(total)}</Text>
                </View>

                <Text style={styles.invoiceText}>#{getInvoiceNumber(item)}</Text>
                <Text style={styles.descriptionText}>{getItemSummary(item)}</Text>
                <Text style={styles.timeTag}>🕒 {getOrderTime(item)}</Text>
                <Text style={styles.statusText}>{item.syncStatus || 'PENDING_CLOUD_SYNC ⏳'}</Text>
                {item.lastSyncError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxTitle}>Last sync error</Text>
                    <Text style={styles.errorBoxText}>{item.lastSyncError}</Text>
                  </View>
                ) : null}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => handleViewOrder(item)}
                  >
                    <Text style={styles.editBtnText}>👁️ View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeOrder(orderKey, clientName)}
                  >
                    <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {offlineOrders.length > 0 && (
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && { backgroundColor: '#475569' }]}
            onPress={handleSyncToCloud}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.syncBtnText}>
                ⚡ SYNC ALL ORDERS TO SUPABASE ({formatNaira(grandTotal)}) ➔
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    marginBottom: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 14,
  },
  backText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  mainTitle: {
    color: '#1E3A8A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subTitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4,
  },
  statusBanner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerText: {
    color: '#78350F',
    fontSize: 13,
    lineHeight: 18,
  },
  boldCyan: {
    fontWeight: '800',
    color: '#2563EB',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#1E3A8A',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryAmount: {
    color: '#059669',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    borderLeftColor: '#2563EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    marginRight: 10,
  },
  totalAmountText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
  },
  invoiceText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  descriptionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeTag: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 6,
  },
  statusText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorBoxTitle: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  errorBoxText: {
    color: '#7F1D1D',
    fontSize: 11,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 14,
  },
  editBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  syncBtn: {
    backgroundColor: '#2563EB',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    elevation: 4,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    color: '#065F46',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySub: {
    color: '#047857',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
