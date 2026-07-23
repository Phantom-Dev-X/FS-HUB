import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';

export default function SyncOrdersScreen() {
  // Offline orders stored locally in phone memory (AsyncStorage)
  const [offlineOrders, setOfflineOrders] = useState([
    {
      id: 'ORD-101',
      clientName: 'Shoprite Superstore - Ikeja',
      totalAmount: 120000,
      description: 'Items: FS Solar Home Inverter Box (1 unit)',
      timeTaken: 'Logged at 10:45 AM (Offline GPS Geotagged)',
    },
    {
      id: 'ORD-102',
      clientName: 'Mama Tobi Wholesale Store',
      totalAmount: 130000,
      description: 'Items: Smart WiFi Router Pack (2 units)',
      timeTaken: 'Logged at 01:15 PM (Offline GPS Geotagged)',
    },
    {
      id: 'ORD-103',
      clientName: 'Alhaja Kudirat Beverages',
      totalAmount: 40000,
      description: 'Items: Commercial Display Shelf Unit (1 unit)',
      timeTaken: 'Logged at 03:20 PM (Offline GPS Geotagged)',
    },
  ]);

  const [isSyncing, setIsSyncing] = useState(false);

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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Top Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/home')} style={styles.backBtn}>
            <Text style={styles.backText}>⬅️ Back to Home Hub</Text>
          </TouchableOpacity>
          <Text style={styles.mainTitle}>OFFLINE ORDERS STORAGE 🔄</Text>
          <Text style={styles.subTitle}>Orders taken locally waiting for network connection</Text>
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
    backgroundColor: '#0F172A',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  backText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  mainTitle: {
    color: '#A855F7',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subTitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  statusBanner: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 5,
    borderLeftColor: '#A855F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  bannerTitle: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  boldWhite: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  boldCyan: {
    fontWeight: '800',
    color: '#38BDF8',
  },
  orderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 5,
    borderLeftColor: '#38BDF8',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
  },
  totalAmountText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '900',
  },
  descriptionText: {
    color: '#38BDF8',
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
    borderTopColor: '#334155',
    paddingTop: 14,
  },
  editBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editBtnText: {
    color: '#38BDF8',
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
    backgroundColor: '#A855F7',
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
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyTitle: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
