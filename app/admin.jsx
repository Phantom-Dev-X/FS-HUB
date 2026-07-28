import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import { SupabaseAuth } from './_SupabaseAuth';
import GoogleWebMap from '../components/GoogleWebMap';

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeOrderItems = (rawItems) => {
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

const mapOrder = (order) => {
  const items = normalizeOrderItems(order.order_items || order.cartItems || order.items);
  const totalUnits = items.reduce((sum, item) => sum + toNumber(item.qty ?? item.quantity), 0);
  const payable = toNumber(order.payable_total ?? order.payableTotal ?? order.grand_total ?? order.grandTotal ?? order.total_amount ?? order.totalAmount);
  const created = order.created_at || order.createdAt || order.localTimestamp || '';
  return {
    id: order.invoice_number || order.invoiceNumber || order.id || `INV-${Math.floor(Math.random() * 9999)}`,
    store: order.client_name || order.store_name || order.store || order.clientName || 'Client Store',
    rep: order.rep_id || order.repId || 'UNKNOWN',
    amount: `₦${payable.toLocaleString()}`,
    itemsCount: `${items.length} line${items.length === 1 ? '' : 's'}${totalUnits ? ` • ${totalUnits} units` : ''}`,
    status: order.status || 'Pending Dispatch ⏳',
    gps: order.geotag_lat_lon || order.gpsVerified || order.geotag || 'No GPS recorded',
    createdAt: created,
    createdAtLabel: created ? new Date(created).toLocaleString() : 'No timestamp',
    raw: order,
  };
};

const isToday = (dateLike) => {
  const date = new Date(dateLike || 0);
  return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
};

const primaryAdmin = {
  id: 'ADM-001',
  name: 'Peter Patrick',
  email: 'peterpatrick@gmail.com',
  role: '👑 PRIMARY SUPER ADMIN',
  isPrimary: true,
  isSuper: true,
};

export default function AdminDashboardScreen() {
  const [section, setSection] = useState('OVERVIEW');
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [reps, setReps] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [messages, setMessages] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('⚡ Solar & Power');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('50');
  const [editingProduct, setEditingProduct] = useState(null);

  const todayOrders = useMemo(() => orders.filter(order => isToday(order.createdAt)), [orders]);
  const openMessages = useMemo(() => messages.filter(msg => String(msg.status || 'Open').toLowerCase() !== 'closed'), [messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rawOrders, allReps, products, adminMessages] = await Promise.all([
        DatabaseEngine.getAllOrders(),
        DatabaseEngine.getAllReps(),
        DatabaseEngine.getCatalog(),
        DatabaseEngine.getAdminMessages(),
      ]);
      setOrders((rawOrders || []).map(mapOrder).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      const uniqueReps = Array.from(new Map([...(OrderStore.activeReps || []), ...(allReps || [])].map(rep => [rep.id || rep.email, rep])).values());
      setReps(uniqueReps);
      setCatalog(products || []);
      setMessages((adminMessages || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } catch (e) {
      Alert.alert('Admin Load Error', e.message || 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const session = await DatabaseEngine.getSession();
      if (!DatabaseEngine.isAdminSession(session)) {
        setAuthorized(false);
        Alert.alert('Admin access required', 'Field representatives cannot open the Admin Portal.');
        router.replace('/home');
        return;
      }
      setAuthorized(true);
      await loadData();
    })();
  }, []);

  const signOut = async () => {
    await SupabaseAuth.signOut();
    await DatabaseEngine.clearSession();
    OrderStore.currentAgent = { name: 'Guest Officer', id: 'REP-GUEST', role: 'Field Officer', territory: '', avatar: null, initials: 'GO', email: '' };
    router.replace('/');
  };

  const sendNotificationToRep = async ({ message, title, body, status }) => {
    const repId = message?.rep_id || message?.repId;
    if (!repId) {
      Alert.alert('Missing Rep ID', 'This message has no rep_id, so admin cannot send a direct reply.');
      return false;
    }
    const notification = await DatabaseEngine.saveRepNotification({ repId, title, body, type: 'admin_reply', relatedId: message.id });
    if (!notification.success) {
      Alert.alert('Reply Failed', notification.error || 'Could not send notification to rep. Run SQL repair for fshub_rep_notifications.');
      return false;
    }
    if (status) await DatabaseEngine.updateAdminMessageStatus(message.id, status);
    await loadData();
    return true;
  };

  const markInProgress = async (message) => {
    const body = `HQ has received your ${message.type === 'restock_request' ? 'restock request' : 'message'} and marked it as In Progress. We will update you soon.`;
    const ok = await sendNotificationToRep({ message, title: `In Progress: ${message.title}`, body, status: 'In Progress' });
    if (ok) Alert.alert('Marked In Progress', `Default reply sent to ${message.rep_id}.`);
  };

  const openReply = (message) => {
    setReplyTarget(message);
    setReplyText(`Hello ${message.rep_name || message.rep_id || 'Officer'},\n\n`);
  };

  const submitReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setSendingReply(true);
    const ok = await sendNotificationToRep({ message: replyTarget, title: `Reply: ${replyTarget.title}`, body: replyText.trim(), status: 'Replied' });
    setSendingReply(false);
    if (ok) {
      setReplyTarget(null);
      setReplyText('');
      Alert.alert('Reply Sent', `Reply sent to ${replyTarget.rep_id}.`);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductName('');
    setProductCategory('⚡ Solar & Power');
    setProductPrice('');
    setProductStock('50');
  };

  const saveProduct = async () => {
    if (!productName.trim() || !productPrice.trim()) return Alert.alert('Missing Product', 'Product name and price are required.');
    const price = Number(String(productPrice).replace(/[^0-9]/g, '')) || 0;
    const stock = Number(String(productStock).replace(/[^0-9]/g, '')) || 0;
    const res = editingProduct
      ? await DatabaseEngine.updateCatalogProduct(editingProduct.id, { name: productName.trim(), category: productCategory, price, stock })
      : await DatabaseEngine.addNewProductToCatalog({
        id: `PRD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        name: productName.trim(),
        category: productCategory,
        price,
        stock,
        barcode: `84019${Math.floor(100000 + Math.random() * 900000)}`,
        status: stock === 0 ? 'Out of Stock 🔴' : stock < 10 ? 'Low Stock ⚠️' : 'In Stock 🟢',
      });
    if (!res.success) return Alert.alert('Catalog Error', res.error || 'Could not save product.');
    resetProductForm();
    await loadData();
    Alert.alert('Saved', 'Catalog updated successfully.');
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setProductName(product.name || '');
    setProductCategory(product.category || '⚡ Solar & Power');
    setProductPrice(String(product.price || 0));
    setProductStock(String(product.stock || 0));
  };

  if (authorized !== true) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={styles.centerText}>Verifying admin access...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F172A', '#1E3A8A', '#2563EB']} style={styles.headerBg} />
      <View style={styles.header}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={signOut} style={styles.topBtn}><Text style={styles.topBtnText}>⬅️ Sign Out</Text></TouchableOpacity>
          <Text style={styles.adminPill}>HQ ADMIN SUITE</Text>
          <TouchableOpacity onPress={loadData} style={styles.iconBtn}><Ionicons name="refresh" size={17} color="#FFF" /></TouchableOpacity>
        </View>
        <Text style={styles.title}>Admin Control Center</Text>
        <Text style={styles.subtitle}>Manage field reps, today’s orders, stock, and rep messages.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.metricsGrid}>
          <Metric emoji="📦" label="Today Orders" value={todayOrders.length} color="#F59E0B" />
          <Metric emoji="💬" label="Open Messages" value={openMessages.length} color="#A855F7" />
          <Metric emoji="📍" label="Reps" value={reps.length} color="#2563EB" />
          <Metric emoji="🏬" label="Products" value={catalog.length} color="#10B981" />
        </View>

        <Text style={styles.sectionTitle}>Admin Sections</Text>
        <View style={styles.menuCard}>
          <AdminMenu emoji="🏢" title="Overview" sub="Command center and quick actions" active={section === 'OVERVIEW'} onPress={() => setSection('OVERVIEW')} />
          <AdminMenu emoji="📦" title="Orders Queue" sub="Today’s synced field orders" count={todayOrders.length} active={section === 'ORDERS'} onPress={() => setSection('ORDERS')} />
          <AdminMenu emoji="💬" title="Messages & Requests" sub="Rep messages, restock requests, replies" count={openMessages.length} active={section === 'MESSAGES'} onPress={() => setSection('MESSAGES')} />
          <AdminMenu emoji="📍" title="Reps Radar" sub="Registered officers and territories" active={section === 'REPS'} onPress={() => setSection('REPS')} />
          <AdminMenu emoji="🏬" title="Catalog & Stock" sub="Products, prices, stock control" active={section === 'CATALOG'} onPress={() => setSection('CATALOG')} />
          <AdminMenu emoji="🛡️" title="Admins & Access" sub="HQ users and protected access" active={section === 'ADMINS'} onPress={() => setSection('ADMINS')} />
        </View>

        {loading ? <LoadingCard /> : renderSection()}
      </ScrollView>

      <ReplyModal target={replyTarget} text={replyText} setText={setReplyText} loading={sendingReply} onClose={() => setReplyTarget(null)} onSubmit={submitReply} />
    </SafeAreaView>
  );

  function renderSection() {
    if (section === 'OVERVIEW') return <OverviewSection todayOrders={todayOrders} openMessages={openMessages} setSection={setSection} />;
    if (section === 'ORDERS') return <OrdersSection orders={todayOrders} />;
    if (section === 'MESSAGES') return <MessagesSection messages={messages} onReply={openReply} onProgress={markInProgress} onRefresh={loadData} />;
    if (section === 'REPS') return <RepsSection reps={reps} />;
    if (section === 'CATALOG') return <CatalogSection catalog={catalog} productName={productName} setProductName={setProductName} productCategory={productCategory} setProductCategory={setProductCategory} productPrice={productPrice} setProductPrice={setProductPrice} productStock={productStock} setProductStock={setProductStock} editingProduct={editingProduct} onSave={saveProduct} onCancel={resetProductForm} onEdit={editProduct} />;
    return <AdminsSection />;
  }
}

function Metric({ emoji, label, value, color }) {
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${color}22` }]}><Text>{emoji}</Text></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function AdminMenu({ emoji, title, sub, count, active, onPress }) {
  return <TouchableOpacity style={[styles.menuItem, active && styles.menuItemActive]} onPress={onPress}><View style={styles.menuIcon}><Text>{emoji}</Text></View><View style={{ flex: 1 }}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSub}>{sub}</Text></View>{typeof count === 'number' && count > 0 ? <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View> : null}<Ionicons name="chevron-forward" size={18} color="#94A3B8" /></TouchableOpacity>;
}

function LoadingCard() {
  return <View style={styles.emptyCard}><ActivityIndicator color="#2563EB" /><Text style={styles.emptySub}>Loading admin data...</Text></View>;
}

function OverviewSection({ todayOrders, openMessages, setSection }) {
  return <View><Text style={styles.sectionTitle}>Quick Admin Actions</Text><View style={styles.panel}><TouchableOpacity style={styles.overviewAction} onPress={() => setSection('MESSAGES')}><Text style={styles.overviewActionText}>💬 Open Messages & Requests ({openMessages.length})</Text></TouchableOpacity><TouchableOpacity style={styles.overviewAction} onPress={() => setSection('ORDERS')}><Text style={styles.overviewActionText}>📦 Review Today Orders ({todayOrders.length})</Text></TouchableOpacity><TouchableOpacity style={styles.overviewAction} onPress={() => setSection('CATALOG')}><Text style={styles.overviewActionText}>🏬 Manage Catalog & Stock</Text></TouchableOpacity></View><Text style={styles.sectionTitle}>Latest Messages</Text><MessagesSection messages={openMessages.slice(0, 2)} compact /></View>;
}

function OrdersSection({ orders }) {
  return <View><Text style={styles.sectionTitle}>Today’s Orders</Text>{orders.length === 0 ? <Empty emoji="📦" title="No Orders Today" sub="Orders submitted/synced today will appear here." /> : orders.map(order => <View key={order.id} style={styles.orderCard}><View style={styles.cardTop}><Text style={styles.cardTitle}>#{order.id}</Text><Text style={styles.statusPill}>{order.status}</Text></View><Text style={styles.mainLine}>{order.store}</Text><Text style={styles.subLine}>👤 {order.rep} • 🕒 {order.createdAtLabel}</Text><View style={styles.amountRow}><Text style={styles.amount}>{order.amount}</Text><Text style={styles.subLine}>{order.itemsCount}</Text></View><Text style={styles.gps}>📍 {order.gps}</Text></View>)}</View>;
}

function MessagesSection({ messages, onReply, onProgress, compact }) {
  return <View>{!compact && <Text style={styles.sectionTitle}>Messages & Requests</Text>}{messages.length === 0 ? <Empty emoji="💬" title="No Messages" sub="Rep custom messages and restock requests will show here." /> : messages.map(message => <View key={message.id} style={[styles.messageCard, { borderLeftColor: message.priority === 'Critical' ? '#EF4444' : message.priority === 'Urgent' ? '#F59E0B' : '#2563EB' }]}><View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={1}>{message.title}</Text><Text style={styles.priorityPill}>{message.priority || 'Normal'}</Text></View><Text style={styles.subLine}>👤 {message.rep_name || 'Field Officer'} • {message.rep_id || 'UNKNOWN'} • {message.type || 'message'}</Text><Text style={styles.messageBody}>{message.body}</Text><Text style={styles.subLine}>Status: {message.status || 'Open'} • {message.created_at ? new Date(message.created_at).toLocaleString() : 'Now'}</Text>{!compact && <View style={styles.actionRow}><TouchableOpacity style={styles.replyBtn} onPress={() => onReply(message)}><Text style={styles.replyText}>Reply</Text></TouchableOpacity><TouchableOpacity style={styles.progressBtn} onPress={() => onProgress(message)}><Text style={styles.progressText}>Mark In Progress</Text></TouchableOpacity></View>}</View>)}</View>;
}

function RepsSection({ reps }) {
  return <View><Text style={styles.sectionTitle}>Reps Radar</Text><View style={styles.mapBox}><GoogleWebMap center={OrderStore.repLocation} markers={reps.slice(0, 20).map(rep => ({ id: rep.id || rep.email, coordinate: rep.coordinate || OrderStore.repLocation, title: rep.name || rep.email || 'Rep', color: '#2563EB' }))} height={240} zoom={12} label="FS Hub Reps" /></View>{reps.map(rep => <View key={String(rep.id || rep.email || Math.random())} style={styles.repCard}><Text style={styles.mainLine}>{String(rep.name || rep.full_name || rep.email || 'Unnamed Rep')}</Text><Text style={styles.subLine}>{String(rep.id || 'NO-ID')} • {String(rep.zone || rep.territory || 'Unassigned')}</Text></View>)}</View>;
}

function CatalogSection({ catalog, productName, setProductName, productCategory, setProductCategory, productPrice, setProductPrice, productStock, setProductStock, editingProduct, onSave, onCancel, onEdit }) {
  return <View><Text style={styles.sectionTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</Text><View style={styles.panel}><Text style={styles.inputLabel}>Product Name</Text><TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="Product name" /><Text style={styles.inputLabel}>Category</Text><TextInput style={styles.input} value={productCategory} onChangeText={setProductCategory} placeholder="Category" /><View style={styles.twoCols}><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Price</Text><TextInput style={styles.input} value={productPrice} onChangeText={setProductPrice} keyboardType="numeric" /></View><View style={{ flex: 1 }}><Text style={styles.inputLabel}>Stock</Text><TextInput style={styles.input} value={productStock} onChangeText={setProductStock} keyboardType="numeric" /></View></View><TouchableOpacity style={styles.saveBtn} onPress={onSave}><Text style={styles.saveText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text></TouchableOpacity>{editingProduct && <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}><Text style={styles.cancelText}>Cancel Edit</Text></TouchableOpacity>}</View><Text style={styles.sectionTitle}>Catalog Items ({catalog.length})</Text>{catalog.map(item => <View key={item.id} style={styles.productCard}><Text style={styles.mainLine}>{item.name}</Text><Text style={styles.subLine}>{item.category} • #{item.barcode}</Text><View style={styles.amountRow}><Text style={styles.amount}>₦{toNumber(item.price).toLocaleString()}</Text><Text style={styles.subLine}>{item.stock} units</Text></View><TouchableOpacity style={styles.replyBtn} onPress={() => onEdit(item)}><Text style={styles.replyText}>Edit Product</Text></TouchableOpacity></View>)}</View>;
}

function AdminsSection() {
  return <View><Text style={styles.sectionTitle}>Admins & Access</Text><View style={styles.panel}><Text style={styles.mainLine}>{primaryAdmin.name}</Text><Text style={styles.subLine}>{primaryAdmin.email}</Text><Text style={styles.statusPill}>{primaryAdmin.role}</Text><Text style={styles.note}>Primary admin is protected and cannot be removed or downgraded.</Text></View></View>;
}

function Empty({ emoji, title, sub }) {
  return <View style={styles.emptyCard}><Text style={{ fontSize: 38 }}>{emoji}</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptySub}>{sub}</Text></View>;
}

function ReplyModal({ target, text, setText, loading, onClose, onSubmit }) {
  return <Modal visible={Boolean(target)} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.replySheet}><View style={styles.sheetHandle} /><View style={styles.sheetHead}><Text style={styles.sheetTitle}>Reply to {target?.rep_id || 'Rep'}</Text><TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity></View><Text style={styles.inputLabel}>Message</Text><TextInput style={[styles.input, styles.replyInput]} multiline textAlignVertical="top" value={text} onChangeText={setText} placeholder="Type reply..." /><TouchableOpacity style={[styles.saveBtn, loading && { backgroundColor: '#94A3B8' }]} onPress={onSubmit} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Send Reply to Exact Rep</Text>}</TouchableOpacity></View></View></Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  centerText: { marginTop: 10, color: '#334155', fontWeight: '800' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 235 },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  topBtn: { backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  topBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: '900' },
  iconBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)', alignItems: 'center', justifyContent: 'center' },
  adminPill: { color: '#FDE68A', backgroundColor: 'rgba(245,158,11,0.16)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.32)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metric: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 20, padding: 14, shadowColor: '#2563EB', shadowOpacity: 0.08, shadowRadius: 16, elevation: 2 },
  metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  metricValue: { color: '#0F172A', fontSize: 22, fontWeight: '900' },
  metricLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  sectionTitle: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 14, marginBottom: 9, marginLeft: 4 },
  menuCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, overflow: 'hidden', marginBottom: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemActive: { backgroundColor: '#EFF6FF' },
  menuIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  menuTitle: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  menuSub: { color: '#64748B', fontSize: 11, lineHeight: 15, marginTop: 2 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 999, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  panel: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, padding: 14, marginBottom: 14 },
  overviewAction: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 13, marginBottom: 8 },
  overviewActionText: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  orderCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderLeftColor: '#F59E0B', borderRadius: 16, padding: 15, marginBottom: 12 },
  messageCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 5, borderRadius: 16, padding: 15, marginBottom: 12 },
  productCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 15, marginBottom: 12 },
  repCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 15, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  cardTitle: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '900' },
  mainLine: { color: '#0F172A', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  subLine: { color: '#64748B', fontSize: 11, lineHeight: 16, marginBottom: 3 },
  messageBody: { color: '#334155', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  statusPill: { color: '#D97706', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '900', overflow: 'hidden' },
  priorityPill: { color: '#92400E', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '900', overflow: 'hidden' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  amount: { color: '#059669', fontSize: 16, fontWeight: '900' },
  gps: { color: '#2563EB', fontSize: 11, fontWeight: '700', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  replyBtn: { flex: 1, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  replyText: { color: '#2563EB', fontSize: 11, fontWeight: '900' },
  progressBtn: { flex: 1, borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFFBEB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  progressText: { color: '#D97706', fontSize: 11, fontWeight: '900' },
  mapBox: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 12 },
  inputLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginBottom: 5, marginTop: 8 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0F172A', fontSize: 13 },
  twoCols: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  cancelBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  note: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 10 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  replySheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '78%' },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  replyInput: { minHeight: 140, textAlignVertical: 'top' },
});
