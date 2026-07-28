import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import AdminFooter from './AdminFooter';

const toNumber = (value) => typeof value === 'number' ? value : Number(String(value || '0').replace(/[^0-9.-]/g, '')) || 0;
const parseItems = (raw) => Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw || '[]'); } catch { return []; } })();
const isToday = (raw) => { const d = new Date(raw || 0); return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString(); };

const mapOrder = (order) => {
  const items = parseItems(order.order_items || order.items || order.cartItems);
  const payable = toNumber(order.payable_total ?? order.grand_total ?? order.total_amount ?? order.payableTotal);
  return {
    id: order.invoice_number || order.invoiceNumber || order.id,
    store: order.client_name || order.store_name || order.clientName || order.store || 'Client Store',
    rep: order.rep_id || order.repId || 'UNKNOWN',
    created: order.created_at || order.localTimestamp,
    amount: `₦${payable.toLocaleString()}`,
    items: `${items.length} line${items.length === 1 ? '' : 's'}`,
    status: order.status || 'Pending Dispatch ⏳',
    gps: order.geotag_lat_lon || order.gpsVerified || 'No GPS recorded',
  };
};

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const raw = await DatabaseEngine.getAllOrders();
    setOrders((raw || []).filter(o => isToday(o.created_at || o.localTimestamp)).map(mapOrder).sort((a,b) => new Date(b.created || 0) - new Date(a.created || 0)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => router.replace('/admin')} style={styles.backBtn}><Ionicons name="arrow-back" size={16} color="#2563EB" /><Text style={styles.backText}> Admin</Text></TouchableOpacity><Text style={styles.title}>📦 Orders Queue</Text><Text style={styles.sub}>Today's synced field orders only.</Text></View><ScrollView contentContainerStyle={styles.scroll}>{loading ? <Loading /> : orders.length === 0 ? <Empty /> : orders.map(order => <View key={order.id} style={styles.card}><View style={styles.cardTop}><Text style={styles.invoice}>#{order.id}</Text><Text style={styles.status}>{order.status}</Text></View><Text style={styles.store}>{order.store}</Text><Text style={styles.meta}>👤 {order.rep} • {order.created ? new Date(order.created).toLocaleString() : 'No timestamp'}</Text><View style={styles.amountRow}><Text style={styles.amount}>{order.amount}</Text><Text style={styles.meta}>{order.items}</Text></View><Text style={styles.gps}>📍 {order.gps}</Text></View>)}</ScrollView><AdminFooter /></SafeAreaView>;
}
function Loading(){return <View style={styles.empty}><ActivityIndicator color="#2563EB"/><Text style={styles.emptySub}>Loading orders...</Text></View>}
function Empty(){return <View style={styles.empty}><Text style={{fontSize:40}}>📦</Text><Text style={styles.emptyTitle}>No Orders Today</Text><Text style={styles.emptySub}>Orders submitted today will show here.</Text></View>}
const styles = StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,paddingBottom:8,backgroundColor:'#EFF6FF'},backBtn:{flexDirection:'row',alignSelf:'flex-start',backgroundColor:'#FFF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,paddingHorizontal:12,paddingVertical:8,alignItems:'center',marginBottom:12},backText:{color:'#2563EB',fontSize:12,fontWeight:'900'},title:{color:'#1E3A8A',fontSize:24,fontWeight:'900'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderLeftColor:'#F59E0B',borderRadius:16,padding:15,marginBottom:12},cardTop:{flexDirection:'row',justifyContent:'space-between',gap:10},invoice:{flex:1,color:'#2563EB',fontSize:13,fontWeight:'900'},status:{color:'#D97706',backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FDE68A',borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:10,fontWeight:'900',overflow:'hidden'},store:{color:'#0F172A',fontSize:15,fontWeight:'900',marginTop:6},meta:{color:'#64748B',fontSize:11,lineHeight:16,marginTop:4},amountRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:10},amount:{color:'#059669',fontSize:18,fontWeight:'900'},gps:{color:'#2563EB',fontSize:11,fontWeight:'700',marginTop:8},empty:{backgroundColor:'#FFF',borderRadius:20,padding:26,borderWidth:1,borderColor:'#DBEAFE',alignItems:'center'},emptyTitle:{color:'#1E3A8A',fontSize:16,fontWeight:'900',marginTop:8},emptySub:{color:'#64748B',textAlign:'center',fontSize:12,marginTop:6}});
