import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import { EmailService } from './_EmailService';
import AdminFooter from './AdminFooter';

const STATUS_OPTIONS = ['Pending Dispatch ⏳', 'Processing at Warehouse 🏭', 'Packed 📦', 'Out for Delivery 🚚', 'Delivered ✅', 'Cancelled ❌'];
const toNumber = (value) => typeof value === 'number' ? value : Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0;
const parseItems = (raw) => Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
const isToday = (raw) => { const d = new Date(raw || 0); return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString(); };

const mapOrder = (order) => {
  const items = parseItems(order.order_items || order.items || order.cartItems);
  const payable = toNumber(order.payable_total ?? order.grand_total ?? order.total_amount ?? order.payableTotal);
  return {
    id: order.invoice_number || order.invoiceNumber || order.id,
    store: order.client_name || order.store_name || order.clientName || order.store || 'Client Store',
    clientEmail: order.client_email || order.clientEmail || '',
    rep: order.rep_id || order.repId || 'UNKNOWN',
    created: order.created_at || order.localTimestamp,
    amountRaw: payable,
    amount: `₦${payable.toLocaleString()}`,
    itemsRaw: items,
    items: `${items.length} line${items.length === 1 ? '' : 's'}`,
    status: order.status || 'Pending Dispatch ⏳',
    gps: order.geotag_lat_lon || order.gpsVerified || 'No GPS recorded',
  };
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTarget, setStatusTarget] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    setLoading(true);
    const raw = await DatabaseEngine.getAllOrders();
    setOrders((raw || []).filter(o => isToday(o.created_at || o.localTimestamp)).map(mapOrder).sort((a,b) => new Date(b.created || 0) - new Date(a.created || 0)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (status) => {
    if (!statusTarget) return;
    const proceed = async () => {
      setUpdatingStatus(true);
      const res = await DatabaseEngine.updateOrderStatus(statusTarget.id, status);
      if (res.success && status === 'Delivered ✅' && statusTarget.clientEmail) {
        await EmailService._sendRawEmail(
          statusTarget.clientEmail,
          `Your FS Hub Order ${statusTarget.id} Has Been Delivered`,
          `Hello ${statusTarget.store},\n\nYour FS Hub order #${statusTarget.id} has been marked as delivered.\n\nTotal: ${statusTarget.amount}\n\nThank you for your business!`,
          statusTarget.store,
          { kind: 'delivery_confirmation', relatedId: statusTarget.id }
        );
      }
      setUpdatingStatus(false);
      setStatusTarget(null);
      if (!res.success) return Alert.alert('Status Update Failed', res.error || 'Could not update order status.');
      await load();
      Alert.alert('Status Updated', `Order #${statusTarget.id} is now ${status}.`);
    };

    if (status === 'Delivered ✅') {
      Alert.alert(
        'Mark as Delivered?',
        statusTarget.clientEmail
          ? `An email confirmation will be sent to ${statusTarget.clientEmail}. Proceed?`
          : 'This order has no client email saved. Mark as delivered anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: proceed }
        ]
      );
      return;
    }
    await proceed();
  };

  return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => router.replace('/admin')} style={styles.backBtn}><Ionicons name="arrow-back" size={16} color="#2563EB" /><Text style={styles.backText}> Admin</Text></TouchableOpacity><Text style={styles.title}>📦 Orders Queue</Text><Text style={styles.sub}>Today's synced field orders only.</Text></View><ScrollView contentContainerStyle={styles.scroll}>{loading ? <Loading /> : orders.length === 0 ? <Empty /> : orders.map(order => <View key={order.id} style={styles.card}><View style={styles.cardTop}><Text style={styles.invoice}>#{order.id}</Text><Text style={styles.status}>{order.status}</Text></View><Text style={styles.store}>{order.store}</Text><Text style={styles.meta}>👤 {order.rep} • {order.created ? new Date(order.created).toLocaleString() : 'No timestamp'}</Text><View style={styles.amountRow}><Text style={styles.amount}>{order.amount}</Text><Text style={styles.meta}>{order.items}</Text></View><Text style={styles.gps}>📍 {order.gps}</Text><TouchableOpacity style={styles.statusBtn} onPress={() => setStatusTarget(order)}><Text style={styles.statusBtnText}>Update Order Status</Text></TouchableOpacity></View>)}</ScrollView><Modal visible={Boolean(statusTarget)} transparent animationType="slide" onRequestClose={() => setStatusTarget(null)}><View style={styles.modalOverlay}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHead}><Text style={styles.sheetTitle}>Update Status</Text><TouchableOpacity style={styles.close} onPress={() => setStatusTarget(null)}><Ionicons name="close" size={18} color="#64748B"/></TouchableOpacity></View><Text style={styles.sheetSub}>#{statusTarget?.id} • {statusTarget?.store}</Text>{STATUS_OPTIONS.map(status => <TouchableOpacity key={status} style={styles.statusOption} onPress={() => updateStatus(status)} disabled={updatingStatus}>{updatingStatus ? <ActivityIndicator color="#2563EB"/> : <Text style={styles.statusOptionText}>{status}</Text>}</TouchableOpacity>)}</View></View></Modal><AdminFooter /></SafeAreaView>;
}
function Loading(){return <View style={styles.empty}><ActivityIndicator color="#2563EB"/><Text style={styles.emptySub}>Loading orders...</Text></View>}
function Empty(){return <View style={styles.empty}><Text style={{fontSize:40}}>📦</Text><Text style={styles.emptyTitle}>No Orders Today</Text><Text style={styles.emptySub}>Orders submitted today will show here.</Text></View>}
const styles = StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,paddingBottom:8,backgroundColor:'#EFF6FF'},backBtn:{flexDirection:'row',alignSelf:'flex-start',backgroundColor:'#FFF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,paddingHorizontal:12,paddingVertical:8,alignItems:'center',marginBottom:12},backText:{color:'#2563EB',fontSize:12,fontWeight:'900'},title:{color:'#1E3A8A',fontSize:24,fontWeight:'900'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderLeftColor:'#F59E0B',borderRadius:16,padding:15,marginBottom:12},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},invoice:{flex:1,color:'#2563EB',fontSize:13,fontWeight:'900'},status:{color:'#D97706',backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FDE68A',borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:10,fontWeight:'900',overflow:'hidden'},store:{color:'#0F172A',fontSize:15,fontWeight:'900',marginTop:6},meta:{color:'#64748B',fontSize:11,lineHeight:16,marginTop:4},amountRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10},amount:{color:'#059669',fontSize:18,fontWeight:'900'},gps:{color:'#2563EB',fontSize:11,fontWeight:'700',marginTop:8},statusBtn:{backgroundColor:'#2563EB',borderRadius:12,paddingVertical:12,alignItems:'center',marginTop:12},statusBtnText:{color:'#FFF',fontWeight:'900',fontSize:12},empty:{backgroundColor:'#FFF',borderRadius:20,padding:26,borderWidth:1,borderColor:'#DBEAFE',alignItems:'center'},emptyTitle:{color:'#1E3A8A',fontSize:16,fontWeight:'900',marginTop:8},emptySub:{color:'#64748B',textAlign:'center',fontSize:12,marginTop:6},modalOverlay:{flex:1,backgroundColor:'rgba(15,23,42,.45)',justifyContent:'flex-end'},sheet:{backgroundColor:'#FFF',borderTopLeftRadius:28,borderTopRightRadius:28,padding:18},handle:{width:44,height:5,borderRadius:999,backgroundColor:'#CBD5E1',alignSelf:'center',marginBottom:14},sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sheetTitle:{color:'#0F172A',fontSize:18,fontWeight:'900'},close:{width:34,height:34,borderRadius:12,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},sheetSub:{color:'#64748B',fontSize:12,marginTop:4,marginBottom:12},statusOption:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',borderRadius:12,padding:14,marginBottom:8},statusOptionText:{color:'#0F172A',fontWeight:'900'}});
