import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';

export default function SyncOrdersScreen() {
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load real offline orders from DatabaseEngine on mount
  useEffect(() => {
    const loadOffline = async () => {
      try {
        const orders = await DatabaseEngine.getOfflineOrders();
        setOfflineOrders(orders || []);
      } catch (e) {
        console.log('Sync load error', e.message);
      }
    };
    loadOffline();
  }, []);

  // Calculate total Naira volume of pending orders
  const grandTotal = offlineOrders.reduce((sum, item) => sum + item.totalAmount, 0);

  // Function to delete an order before syncing
  const removeOrder = (id, clientName) => {
    Alert.alert(
      'Delete Offline Order', 
      `Are you sure you want to remove ${clientName}'s order (₦${offlineOrders.find(o => o.id === id)?.totalAmount.toLocaleString()}) from local memory?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => setOfflineOrders(prev => prev.filter(order => order.id !== id)) 
        }
      ]
    );
  };

  // Function when they tap "Edit Order"
  const handleEditOrder = (clientName) => {
    Alert.alert(
      'Edit Order Details',
      `Opening offline adjustment window for ${clientName}... Here you can modify items, add special notes, or adjust quantities before server upload.`
    );
  };

  // Simulate cloud sync
  const handleSyncToCloud = () => {
    if (offlineOrders.length === 0) {
      Alert.alert('All Clear ✓', 'No offline orders pending.');
      return;
    }

    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      Alert.alert(
        'Sync Successful! 🎉⚡', 
        `All ${offlineOrders.length} orders totaling ₦${grandTotal.toLocaleString()} have been pushed to FS Hub Cloud Server!`
      );
      setOfflineOrders([]); // Clears pending list
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Top Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>⬅️ Back to Home</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>OFFLINE ORDERS SYNC</Text>
          <Text style={styles.subTitle}>Pending orders waiting to be uploaded</Text>
        </View>

        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.bannerTitle}>⚠️ OFFLINE DATABASE STATUS</Text>
          <Text style={styles.bannerText}>
            Look: No `+ / -` counter here! We display the <Text style={styles.boldWhite}>Total Order Amount</Text> made for each client (`AsyncStorage`). Tap <Text style={styles.boldCyan}>✏️ Edit Order</Text> if you need to adjust items/notes before uploading!
          </Text>
        </View>

        {/* List of Pending Orders */}
        {offlineOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{fontSize: 48, marginBottom: 12}}>🎉</Text>
            <Text style={styles.emptyTitle}>All Orders Synced to Cloud!</Text>
            <Text style={styles.emptySub}>No local offline orders pending. Your field data is 100% up to date with headquarters.</Text>
          </View>
        ) : (
          offlineOrders.map((item) => (
            <View key={item.id} style={styles.orderCard}>
              <View style={styles.orderTopRow}>
                <Text style={styles.clientTitle}>{item.clientName}</Text>
                <Text style={styles.totalAmountText}>₦{item.totalAmount.toLocaleString()}</Text>
              </View>

              <Text style={styles.descriptionText}>{item.description}</Text>
              <Text style={styles.timeTag}>📍 {item.timeTaken}</Text>

              {/* Action Buttons Row: Edit Order & Delete */}
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.editBtn} 
                  onPress={() => handleEditOrder(item.clientName)}
                >
                  <Text style={styles.editBtnText}>✏️ Edit Order Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => removeOrder(item.id, item.clientName)}
                >
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Massive Sync Button */}
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
                ⚡ SYNC ALL ORDERS TO CLOUD (₦{grandTotal.toLocaleString()}) ➔
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
    marginBottom: 20,
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
  boldWhite: {
    fontWeight: '900',
    color: '#1E3A8A',
  },
  boldCyan: {
    fontWeight: '800',
    color: '#2563EB',
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
    marginBottom: 6,
  },
  clientTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  totalAmountText: {
    color: '#059669',
    fontSize: 18,
    fontWeight: '900',
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
    marginBottom: 16,
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
  },
});
