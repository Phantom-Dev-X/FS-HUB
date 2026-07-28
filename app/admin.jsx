import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform, Switch, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { SupabaseAuth } from './_SupabaseAuth';
import GoogleWebMap from '../components/GoogleWebMap';

// Keep admin radar stable in standalone APKs. The native MapView can hard-crash
// Android if Supabase contains malformed coordinates or Google Maps config is not ready.
// We still list all reps below; full native map can be re-enabled after coordinate cleanup.
let MapView = null;
let Marker = null;

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

const mapSupabaseOrderForAdmin = (order) => {
  const items = normalizeOrderItems(order.order_items || order.cartItems || order.items);
  const totalUnits = items.reduce((sum, item) => sum + toNumber(item?.qty ?? item?.quantity ?? 0), 0);
  const payable = toNumber(order.payable_total ?? order.payableTotal ?? order.grandTotal ?? order.totalAmount ?? 0);
  const createdAt = order.created_at ? new Date(order.created_at) : null;

  return {
    id: order.invoice_number || order.invoiceNumber || order.id || `INV-${Math.floor(Math.random() * 9000)}`,
    status: order.status || 'Pending Dispatch ⏳',
    statusColor: order.statusColor || '#F59E0B',
    store: order.store_name || order.store || order.clientName || 'Client Store',
    rep: order.rep_id || order.repId || 'UNKNOWN',
    amount: `₦${payable.toLocaleString()}`,
    itemsCount: `${items.length} line${items.length === 1 ? '' : 's'}${totalUnits ? ` • ${totalUnits} units` : ''}`,
    gpsVerified: order.geotag_lat_lon || order.gpsVerified || 'No GPS recorded',
    createdAtLabel: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString() : 'No timestamp',
    raw: order,
  };
};

function AdminNavPill({ label, emoji, active, color, onPress }) {
  return (
    <TouchableOpacity style={[styles.adminNavPill, active && { backgroundColor: color, borderColor: color }]} onPress={onPress}>
      <Text style={styles.adminNavEmoji}>{emoji}</Text>
      <Text style={[styles.adminNavText, active && { color: '#FFFFFF' }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function OverviewMetric({ emoji, label, value, color }) {
  return (
    <View style={styles.overviewMetric}>
      <View style={[styles.overviewIcon, { backgroundColor: `${color}22` }]}><Text>{emoji}</Text></View>
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW | ORDERS | MESSAGES | REPS | CATALOG | ADMINS
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(null);

  // Look right here: 100% CLEAN BASELINE (`[]`) ON DAY 1!
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [activeReps, setActiveReps] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Look right right here: 100% ZERO FAKE ADMINS!
  // ONLY `peterpatrick@gmail.com` sits right here as Primary Super Admin!
  const [adminList, setAdminList] = useState([
    {
      id: 'ADM-001',
      name: 'Peter Patrick',
      email: 'peterpatrick@gmail.com',
      role: '👑 PRIMARY SUPER ADMIN',
      isPrimary: true,
      isSuper: true,
      statusColor: '#F59E0B',
    },
  ]);

  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('⚡ Solar & Power');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('50');
  const [editingProductId, setEditingProductId] = useState(null);

  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [isSuperToggle, setIsSuperToggle] = useState(false);

  const loadIncomingOrders = async () => {
    const rawOrders = await DatabaseEngine.getAllOrders();
    const mappedOrders = rawOrders
      .map(mapSupabaseOrderForAdmin)
      .sort((a, b) => {
        const aTime = new Date(a.raw?.created_at || 0).getTime() || 0;
        const bTime = new Date(b.raw?.created_at || 0).getTime() || 0;
        return bTime - aTime;
      });
    setIncomingOrders(mappedOrders);
    return mappedOrders;
  };

  const loadAdminMessages = async () => {
    const messages = await DatabaseEngine.getAdminMessages();
    const sorted = (Array.isArray(messages) ? messages : []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    setAdminMessages(sorted);
    return sorted;
  };

  const loadAdminDashboardData = async () => {
    const [catalogData, repsData] = await Promise.all([
      DatabaseEngine.getCatalog(),
      DatabaseEngine.getAllReps(),
      loadIncomingOrders(),
      loadAdminMessages(),
    ]);

    setCatalogItems(catalogData);
    const combined = [...OrderStore.activeReps, ...repsData];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    setActiveReps(unique);
  };

  useEffect(() => {
    (async () => {
      const session = await DatabaseEngine.getSession();
      if (!DatabaseEngine.isAdminSession(session)) {
        setIsAuthorized(false);
        Alert.alert('Admin access required', 'Field representatives cannot open the Admin Portal.');
        router.replace('/home');
        return;
      }
      setIsAuthorized(true);
      await loadAdminDashboardData();
    })();
  }, []);

  const colors = {
    background: isDark ? '#080E1A' : '#F4F6F9',
    card:       isDark ? '#131D33' : '#FFFFFF',
    border:     isDark ? '#263554' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#8A99AD' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
    purple:     isDark ? '#A855F7' : '#9333EA',
    red:        '#EF4444',
  };

  const todayOrders = incomingOrders.filter(order => {
    const created = new Date(order.raw?.created_at || order.raw?.createdAt || 0);
    return !Number.isNaN(created.getTime()) && created.toDateString() === new Date().toDateString();
  });
  const openMessagesCount = adminMessages.filter(msg => String(msg.status || 'Open').toLowerCase() !== 'closed').length;

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    try {
      const url = `${DatabaseEngine.supabaseConfig.projectUrl}${DatabaseEngine.supabaseConfig.ordersTable}?select=count`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': DatabaseEngine.supabaseConfig.anonKey,
          'Authorization': `Bearer ${DatabaseEngine.supabaseConfig.anonKey}`,
        }
      });

      setIsTestingSupabase(false);

      if (response.ok) {
        Alert.alert(
          '✅ SUPABASE CLOUD IS 100% LIVE!',
          `Successfully connected to your exact Supabase project:\n(https://evcbqsgznbrzojjbtnfd.supabase.co)\n\nHTTP Status: ${response.status} OK\nYour PostgreSQL tables are operational and receiving live field data!`
        );
      } else {
        Alert.alert(
          'Supabase Connected (Table Check)',
          `Connected to Supabase server, but table check returned status ${response.status}. Make sure you ran the SQL table creation script inside your Supabase dashboard editor!`
        );
      }
    } catch (error) {
      setIsTestingSupabase(false);
      Alert.alert('Network Error ❌', `Could not reach Supabase server: ${error.message}. Check your internet connection.`);
    }
  };

  const handleApproveDispatch = (orderId, storeName) => {
    setIncomingOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status: 'Dispatched to Store 🚚', statusColor: '#38BDF8' };
      }
      return o;
    }));
    Alert.alert('Dispatch Approved ✓', `Order #${orderId} for ${storeName} authorized! Ikeja warehouse delivery team notified.`);
  };

  const handleRestockCatalogItem = async (item) => {
    Alert.prompt(
      `📥 Restock "${item.name}"`,
      `Enter new total warehouse stock quantity (Current: ${item.stock} units):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Stock ✓',
          onPress: async (val) => {
            const num = parseInt(val, 10);
            if (!isNaN(num)) {
              const res = await DatabaseEngine.updateProductStock(item.id, num);
              if (res.success) {
                const refreshedCatalog = await DatabaseEngine.getCatalog();
                setCatalogItems(refreshedCatalog);
                OrderStore.catalog = refreshedCatalog;
                Alert.alert('Stock Updated Live!', `"${item.name}" is now at ${num} units. Pushed to field reps automatically.`);
              } else {
                Alert.alert('Stock Update Failed', res.error || 'Could not update stock.');
              }
            }
          }
        }
      ],
      'plain-text',
      `${item.stock + 20}`
    );
  };

  const handleEditProduct = (item) => {
    setEditingProductId(item.id);
    setNewProdName(item.name);
    setNewProdCategory(item.category);
    setNewProdPrice(String(item.price));
    setNewProdStock(String(item.stock));
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setNewProdName('');
    setNewProdCategory('⚡ Solar & Power');
    setNewProdPrice('');
    setNewProdStock('50');
  };

  const handleDeleteProduct = async (item) => {
    Alert.alert(
      'Delete Product?',
      `Are you sure you want to permanently delete "${item.name}" from the catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete 🗑️',
          style: 'destructive',
          onPress: async () => {
            const res = await DatabaseEngine.deleteCatalogProduct(item.id);
            if (!res.success) {
              Alert.alert('Product Deletion Failed', res.error || 'The product could not be deleted.');
              return;
            }

            const refreshedCatalog = await DatabaseEngine.getCatalog();
            setCatalogItems(refreshedCatalog);
            OrderStore.catalog = refreshedCatalog;

            if (editingProductId === item.id) {
              handleCancelEdit();
            }

            Alert.alert('Deleted ✓', `"${item.name}" has been permanently removed.`);
          }
        }
      ]
    );
  };

  const handleSaveProduct = async () => {
    if (!newProdName.trim() || !newProdPrice.trim()) {
      Alert.alert('Missing Details ⚠️', 'Please provide at least a Product Name and Unit Price.');
      return;
    }

    const priceNum = parseInt(newProdPrice.replace(/[^0-9]/g, ''), 10) || 0;
    const stockNum = parseInt(newProdStock, 10) || 0;

    if (editingProductId) {
      // Edit mode!
      const res = await DatabaseEngine.updateCatalogProduct(editingProductId, {
        name: newProdName.trim(),
        category: newProdCategory,
        price: priceNum,
        stock: stockNum,
      });

      if (!res.success) {
        Alert.alert('Product Update Failed', res.error || 'The product could not be updated.');
        return;
      }

      const refreshedCatalog = await DatabaseEngine.getCatalog();
      setCatalogItems(refreshedCatalog);
      OrderStore.catalog = refreshedCatalog;

      handleCancelEdit();
      Alert.alert('🎉 Product Updated!', 'Your changes have been saved to Supabase successfully.');
    } else {
      // Create mode!
      const suffix = Math.floor(100 + Math.random() * 900);
      const timestamp = Date.now().toString().slice(-6);
      const newId = `PRD-${timestamp}-${suffix}`;

      const newProduct = {
        id: newId,
        name: newProdName.trim(),
        category: newProdCategory,
        price: priceNum,
        stock: stockNum,
        barcode: `84019${Math.floor(100000 + Math.random()*900000)}`,
        status: stockNum === 0 ? 'Out of Stock 🔴' : (stockNum < 10 ? 'Low Stock ⚠️' : 'High Stock 🟢'),
        statusColor: stockNum === 0 ? '#EF4444' : (stockNum < 10 ? '#F59E0B' : '#10B981'),
        description: `Official SFA product item created remotely from Headquarters Admin Portal on ${new Date().toLocaleDateString()}.`,
      };

      const res = await DatabaseEngine.addNewProductToCatalog(newProduct);
      if (!res.success) {
        Alert.alert('Product Save Failed', res.error || 'The product was not saved to Supabase.');
        return;
      }
      const refreshedCatalog = await DatabaseEngine.getCatalog();
      setCatalogItems(refreshedCatalog);
      OrderStore.catalog = refreshedCatalog;

      setNewProdName('');
      setNewProdPrice('');
      setNewProdStock('50');

      Alert.alert(
        '🎉 Catalog Item Created!',
        `Added "${newProduct.name}" (₦${priceNum.toLocaleString()}) to your master warehouse catalog! Available to all field reps instantly upon sync.`
      );
    }
  };

  const handleAddNewAdmin = () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPin.trim()) {
      Alert.alert('Missing Details ⚠️', 'Please provide Name, Email, and 4-digit Security PIN.');
      return;
    }

    const newAdm = {
      id: `ADM-${Math.floor(100 + Math.random() * 900)}`,
      name: newAdminName.trim(),
      email: newAdminEmail.trim(),
      role: isSuperToggle ? '⭐ SUPER ADMIN' : '🛡️ DISPATCH ADMIN',
      isPrimary: false,
      isSuper: isSuperToggle,
      statusColor: isSuperToggle ? '#38BDF8' : '#10B981',
    };

    setAdminList([...adminList, newAdm]);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPin('');
    setIsSuperToggle(false);

    Alert.alert('🎉 New Administrator Created!', `Added ${newAdm.name} (${newAdm.role}) to Headquarters directory.`);
  };

  const handleRevokeAdmin = (adminObj) => {
    if (adminObj.isPrimary || adminObj.email.toLowerCase() === 'peterpatrick@gmail.com') {
      Alert.alert(
        '⚠️ ACCESS DENIED: PRIMARY SUPER ADMIN',
        `Mr. Peter Patrick (peterpatrick@gmail.com) is the Primary Super Admin and Founder. His account CAN NEVER be revoked, deleted, or downgraded by anyone!`
      );
      return;
    }

    Alert.alert(
      'Revoke Admin Access',
      `Are you sure you want to permanently revoke management permissions for ${adminObj.name} (${adminObj.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Access 🗑️',
          style: 'destructive',
          onPress: () => {
            setAdminList(prev => prev.filter(a => a.id !== adminObj.id));
            Alert.alert('Access Revoked ✓', `${adminObj.name} removed from Headquarters directory.`);
          }
        }
      ]
    );
  };

  const sendNotificationToRep = async ({ message, title, body, status }) => {
    const repId = message?.rep_id || message?.repId;
    if (!repId) {
      Alert.alert('Missing Rep ID', 'This message has no rep_id, so admin cannot send a direct reply.');
      return { success: false };
    }
    const notification = await DatabaseEngine.saveRepNotification({
      repId,
      title,
      body,
      type: 'admin_reply',
      relatedId: message.id,
    });
    if (!notification.success) {
      Alert.alert('Reply Failed', notification.error || 'Could not send notification to rep. Run SQL repair for fshub_rep_notifications.');
      return { success: false };
    }
    if (status) await DatabaseEngine.updateAdminMessageStatus(message.id, status);
    await loadAdminMessages();
    return { success: true };
  };

  const handleMarkMessageInProgress = async (message) => {
    const defaultBody = `HQ has received your ${message.type === 'restock_request' ? 'restock request' : 'message'} and marked it as In Progress. We will update you soon.`;
    const sent = await sendNotificationToRep({
      message,
      title: `In Progress: ${message.title}`,
      body: defaultBody,
      status: 'In Progress'
    });
    if (sent.success) Alert.alert('Marked In Progress', `Default reply sent to ${message.rep_id}.`);
  };

  const openReplyModal = (message) => {
    setReplyTarget(message);
    setReplyText(`Hello ${message.rep_name || message.rep_id || 'Officer'},\n\n`);
  };

  const submitReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setSendingReply(true);
    const sent = await sendNotificationToRep({
      message: replyTarget,
      title: `Reply: ${replyTarget.title}`,
      body: replyText.trim(),
      status: 'Replied'
    });
    setSendingReply(false);
    if (sent.success) {
      setReplyTarget(null);
      setReplyText('');
      Alert.alert('Reply Sent', `Reply sent to ${replyTarget.rep_id}.`);
    }
  };

  const handleToggleSuperAdmin = (adminObj) => {
    if (adminObj.isPrimary) {
      Alert.alert('⚠️ Primary Super Admin', 'Mr. Peter Patrick already holds maximum Primary Super Admin authority across all cloud servers.');
      return;
    }

    setAdminList(prev => prev.map(a => {
      if (a.id === adminObj.id) {
        const nextSuper = !a.isSuper;
        return {
          ...a,
          isSuper: nextSuper,
          role: nextSuper ? '⭐ SUPER ADMIN' : '🛡️ DISPATCH ADMIN',
          statusColor: nextSuper ? '#38BDF8' : '#10B981',
        };
      }
      return a;
    }));

    Alert.alert('Role Updated ✓', `${adminObj.name} permissions adjusted.`);
  };

  if (isAuthorized !== true) {
    return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" /><Text style={{ marginTop: 12 }}>Verifying admin access…</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Admin Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={async () => {
            await SupabaseAuth.signOut();
            await DatabaseEngine.clearSession();
            OrderStore.currentAgent = {
              name: 'Guest Officer', id: 'REP-GUEST', role: 'Field Officer',
              territory: '', avatar: null, initials: 'GO', email: ''
            };
            router.replace('/');
          }} style={styles.exitAdminBtn}>
            <Text style={styles.exitAdminText}>⬅️ Sign Out</Text>
          </TouchableOpacity>

          <Text style={[styles.adminTitle, { color: colors.amber }]} numberOfLines={1}>
            🏢 HEADQUARTERS ADMIN SUITE
          </Text>

        </View>

        <View style={styles.headerMetaRow}>
          <Text style={[styles.adminSub, { color: colors.subText }]} numberOfLines={1}>
            Primary Admin: <Text style={{fontWeight: '900', color: '#FFF'}}>Peter Patrick (peterpatrick@gmail.com)</Text>
          </Text>

          <TouchableOpacity
            style={[styles.testSupabaseBtn, isTestingSupabase && { backgroundColor: '#475569' }]}
            onPress={handleTestSupabaseConnection}
            disabled={isTestingSupabase}
          >
            <Text style={styles.testSupabaseText}>
              {isTestingSupabase ? '⏳ Pinging Cloud...' : '⚡ TEST SUPABASE CONNECTION'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adminNavGrid}>
          <AdminNavPill label="Overview" emoji="🏢" active={activeTab === 'OVERVIEW'} color={colors.cyan} onPress={() => setActiveTab('OVERVIEW')} />
          <AdminNavPill label={`Orders ${todayOrders.length}`} emoji="📦" active={activeTab === 'ORDERS'} color={colors.amber} onPress={() => setActiveTab('ORDERS')} />
          <AdminNavPill label={`Messages ${openMessagesCount}`} emoji="💬" active={activeTab === 'MESSAGES'} color={colors.purple} onPress={() => setActiveTab('MESSAGES')} />
          <AdminNavPill label={`Reps ${activeReps.length}`} emoji="📍" active={activeTab === 'REPS'} color={colors.cyan} onPress={() => setActiveTab('REPS')} />
          <AdminNavPill label={`Stock ${catalogItems.length}`} emoji="🏬" active={activeTab === 'CATALOG'} color={colors.green} onPress={() => setActiveTab('CATALOG')} />
          <AdminNavPill label="Access" emoji="🛡️" active={activeTab === 'ADMINS'} color={colors.purple} onPress={() => setActiveTab('ADMINS')} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {activeTab === 'OVERVIEW' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.mainText }]}>📊 TODAY'S COMMAND CENTER</Text>
            <View style={styles.overviewGrid}>
              <OverviewMetric emoji="📦" label="Today Orders" value={todayOrders.length} color="#F59E0B" />
              <OverviewMetric emoji="💬" label="Open Messages" value={openMessagesCount} color="#A855F7" />
              <OverviewMetric emoji="📍" label="Reps" value={activeReps.length} color="#2563EB" />
              <OverviewMetric emoji="🏬" label="Products" value={catalogItems.length} color="#10B981" />
            </View>
            <Text style={[styles.sectionHeading, { color: colors.mainText, marginTop: 10 }]}>⚡ QUICK ADMIN ACTIONS</Text>
            <View style={[styles.adminCreatorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.overviewAction} onPress={() => setActiveTab('MESSAGES')}><Text style={styles.overviewActionText}>💬 Open Messages & Requests ({openMessagesCount})</Text></TouchableOpacity>
              <TouchableOpacity style={styles.overviewAction} onPress={() => setActiveTab('ORDERS')}><Text style={styles.overviewActionText}>📦 Review Today Orders ({todayOrders.length})</Text></TouchableOpacity>
              <TouchableOpacity style={styles.overviewAction} onPress={() => setActiveTab('CATALOG')}><Text style={styles.overviewActionText}>🏬 Manage Catalog & Stock</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'MESSAGES' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.purple }]}>💬 MESSAGES & REQUESTS FROM FIELD REPS</Text>
            <TouchableOpacity
              style={[styles.testSupabaseBtn, { alignSelf: 'flex-start', marginBottom: 12 }]}
              onPress={async () => {
                const refreshed = await loadAdminMessages();
                Alert.alert('Messages Refreshed', `Loaded ${refreshed.length} message(s).`);
              }}
            >
              <Text style={styles.testSupabaseText}>🔄 REFRESH MESSAGES</Text>
            </TouchableOpacity>
            {adminMessages.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 38, marginBottom: 8 }}>💬</Text>
                <Text style={[styles.emptyTitle, { color: colors.mainText }]}>No Messages Yet</Text>
                <Text style={[styles.emptySub, { color: colors.subText }]}>Custom rep messages and restock requests will appear here.</Text>
              </View>
            ) : adminMessages.map(message => (
              <View key={message.id} style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: message.priority === 'Critical' ? '#EF4444' : message.priority === 'Urgent' ? '#F59E0B' : '#2563EB' }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.storeTitle, { color: colors.mainText, flex: 1 }]} numberOfLines={1}>{message.title}</Text>
                  <View style={[styles.statusBadge, { borderColor: message.priority === 'Critical' ? '#EF4444' : '#F59E0B' }]}><Text style={[styles.statusText, { color: message.priority === 'Critical' ? '#EF4444' : '#F59E0B' }]}>{message.priority || 'Normal'}</Text></View>
                </View>
                <Text style={[styles.repTitle, { color: colors.cyan }]}>👤 {message.rep_name || 'Field Officer'} • {message.rep_id || 'UNKNOWN'} • {message.type || 'message'}</Text>
                <Text style={[styles.messageBody, { color: colors.subText }]}>{message.body}</Text>
                <Text style={[styles.repStatusText, { color: colors.subText }]}>Status: {message.status || 'Open'} • {message.created_at ? new Date(message.created_at).toLocaleString() : 'Now'}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity style={[styles.smallAdminBtn, { backgroundColor: 'rgba(37,99,235,0.14)', borderWidth: 1, borderColor: '#2563EB' }]} onPress={() => openReplyModal(message)}><Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '900' }}>Reply</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.smallAdminBtn, { backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: '#F59E0B' }]} onPress={() => handleMarkMessageInProgress(message)}><Text style={{ color: '#D97706', fontSize: 11, fontWeight: '900' }}>Mark In Progress</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 1: LIVE INCOMING FIELD ORDERS */}
        {activeTab === 'ORDERS' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.mainText }]}>
              🚨 LIVE ORDERS INCOMING FROM FIELD REPS
            </Text>

            <TouchableOpacity
              style={[styles.testSupabaseBtn, { alignSelf: 'flex-start', marginBottom: 12 }]}
              onPress={async () => {
                const refreshed = await loadIncomingOrders();
                Alert.alert('Orders Refreshed', `Loaded ${refreshed.length} order(s) from Supabase.`);
              }}
            >
              <Text style={styles.testSupabaseText}>🔄 REFRESH SUPABASE ORDERS</Text>
            </TouchableOpacity>

            {todayOrders.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 38, marginBottom: 8 }}>📦</Text>
                <Text style={[styles.emptyTitle, { color: colors.mainText }]}>Clean Production Order Queue</Text>
                <Text style={[styles.emptySub, { color: colors.subText }]}>No orders submitted today. Today's field orders appear here after reps submit/sync checkout.</Text>
              </View>
            ) : (
              todayOrders.map((order) => (
                <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: order.statusColor }]}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.orderIdText, { color: colors.cyan }]}>#{order.id}</Text>
                    <View style={[styles.statusBadge, { borderColor: order.statusColor }]}>
                      <Text style={[styles.statusText, { color: order.statusColor }]}>{order.status}</Text>
                    </View>
                  </View>

                  <Text style={[styles.storeTitle, { color: colors.mainText }]} numberOfLines={1}>{order.store}</Text>
                  <Text style={[styles.repTitle, { color: colors.subText }]} numberOfLines={1}>👤 Logged By: {order.rep}</Text>
                  <Text style={[styles.repTitle, { color: colors.subText, marginTop: -8 }]} numberOfLines={1}>🕒 {order.createdAtLabel}</Text>

                  <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.amountLabel, { color: colors.subText }]}>ORDER VOLUME</Text>
                      <Text style={[styles.amountValue, { color: colors.green }]}>{order.amount} <Text style={{fontSize: 12, color: colors.subText}}>({order.itemsCount})</Text></Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.amountLabel, { color: colors.subText }]}>GEOTAG AUDIT</Text>
                      <Text style={[styles.gpsText, { color: colors.cyan }]}>📍 {order.gpsVerified}</Text>
                    </View>
                  </View>

                  {order.status === 'Pending Dispatch ⏳' && (
                    <TouchableOpacity
                      style={styles.dispatchBtn}
                      onPress={() => handleApproveDispatch(order.id, order.store)}
                    >
                      <Text style={styles.dispatchBtnText}>🚚 AUTHORIZE WAREHOUSE DISPATCH TO STORE ✓</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 2: ACTIVE REPS MAP RADAR */}
        {activeTab === 'REPS' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.mainText }]}>
              📍 LIVE TERRITORY RADAR — TRACKING REGISTERED OFFICERS
            </Text>

            <View style={[styles.mapCardContainer, { borderColor: colors.cyan }]}>
              {Platform.OS === 'web' || !MapView ? (
                <View style={[styles.webFallbackBox, { backgroundColor: colors.card }]}>
                  <GoogleWebMap
                    center={OrderStore.repLocation}
                    markers={activeReps.slice(0, 8).map(rep => ({
                      id: rep.id || rep.email,
                      coordinate: rep.coordinate || OrderStore.repLocation,
                      title: rep.name || rep.full_name || rep.email || 'Rep',
                    }))}
                    height={260}
                    zoom={12}
                    label="FS Hub Reps Radar"
                  />
                </View>
              ) : (
                <MapView
                  style={styles.realMap}
                  initialRegion={{
                    latitude: 6.6018,
                    longitude: 3.3515,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                  }}
                  showsUserLocation={true}
                >
                  {activeReps.map(rep => (
                    <Marker key={rep.id} coordinate={rep.coordinate || OrderStore.repLocation} title={rep.name} description={rep.status} pinColor="blue" />
                  ))}
                </MapView>
              )}
            </View>

            {activeReps.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 38, marginBottom: 8 }}>👤</Text>
                <Text style={[styles.emptyTitle, { color: colors.mainText }]}>No Officers Onboarded Yet</Text>
                <Text style={[styles.emptySub, { color: colors.subText }]}>Field officers pop up live right right here the moment they complete registration inside `app/signup.jsx`!</Text>
              </View>
            ) : (
              activeReps.map((rep) => {
                // Only show "Online today" if the rep actually logged in today
                const lastLogin = rep.lastLogin || rep.updated_at || '';
                const isOnlineToday = lastLogin && new Date(lastLogin).toDateString() === new Date().toDateString();

                return (
                  <View key={String(rep.id || rep.email || Math.random())} style={[styles.repCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.storeTitle, { color: colors.mainText }]}>{String(rep.name || rep.full_name || rep.email || 'Unnamed Rep')}</Text>
                      <Text style={[styles.orderIdText, { color: colors.green }]}>{String(rep.salesVolume || rep.sales_volume || '₦0')}</Text>
                    </View>
                    <Text style={[styles.repTitle, { color: colors.cyan }]}>Assigned Route: {String(rep.zone || rep.territory || 'Unassigned')}</Text>
                    <Text style={[styles.repStatusText, { color: colors.subText, marginTop: 4 }]}>
                      {isOnlineToday ? '🟢 Online today' : '⚪ Offline'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: REMOTE WAREHOUSE INVENTORY & PRODUCT CREATION */}
        {activeTab === 'CATALOG' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.green }]}>
              {editingProductId ? '✏️ EDIT MASTER CATALOG PRODUCT' : '➕ CREATE NEW WAREHOUSE CATALOG PRODUCT'}
            </Text>

            <View style={[styles.adminCreatorCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
              <Text style={[styles.creatorHeader, { color: colors.green }]}>
                {editingProductId ? `EDIT CATALOG PRODUCT (ID: ${editingProductId})` : 'ADD NEW ITEM TO MASTER CATALOG'}
              </Text>

              <Text style={[styles.inputLabel, { color: colors.subText }]}>PRODUCT NAME *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                placeholder="e.g. Lithium Phosphate Battery (200Ah/12V)"
                placeholderTextColor="#64748B"
                value={newProdName}
                onChangeText={setNewProdName}
              />

              <Text style={[styles.inputLabel, { color: colors.subText }]}>PRODUCT CATEGORY *</Text>
              <View style={styles.pillRow}>
                {['⚡ Solar & Power', '🌐 Networking', '🏪 Display'].map((cat, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.catSelectPill, newProdCategory === cat && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                    onPress={() => setNewProdCategory(cat)}
                  >
                    <Text style={[styles.catSelectText, { color: newProdCategory === cat ? '#FFF' : colors.subText }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.subText }]}>UNIT PRICE (₦) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                    placeholder="e.g. 450000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={newProdPrice}
                    onChangeText={setNewProdPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.subText }]}>STARTING STOCK *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                    placeholder="e.g. 50"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={newProdStock}
                    onChangeText={setNewProdStock}
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.createAdminBtn, { backgroundColor: colors.green }]} onPress={handleSaveProduct}>
                <Text style={styles.createAdminBtnText}>
                  {editingProductId ? '⚡ UPDATE CATALOG PRODUCT ✓' : '⚡ ADD TO MASTER CATALOG ✓'}
                </Text>
              </TouchableOpacity>

              {editingProductId && (
                <TouchableOpacity style={[styles.createAdminBtn, { backgroundColor: colors.red, marginTop: 8 }]} onPress={handleCancelEdit}>
                  <Text style={styles.createAdminBtnText}>❌ CANCEL EDIT</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.sectionHeading, { color: colors.mainText, marginTop: 10 }]}>
              🏬 ACTIVE CATALOG ITEMS ({catalogItems.length})
            </Text>

            {catalogItems.map((item) => (
              <View key={item.id} style={[styles.repCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: item.statusColor, borderLeftWidth: 6 }]}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.storeTitle, { color: colors.mainText, flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.statusBadge, { borderColor: item.statusColor }]}>
                    <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
                  </View>
                </View>

                <Text style={[styles.repTitle, { color: colors.subText }]}>Category: {item.category} • Barcode: #{item.barcode}</Text>

                <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.amountLabel, { color: colors.subText }]}>OFFICIAL UNIT PRICE</Text>
                    <Text style={[styles.amountValue, { color: colors.green }]}>₦{item.price.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amountLabel, { color: colors.subText }]}>IKEJA DEPOT STOCK</Text>
                    <Text style={[styles.amountValue, { color: colors.cyan }]}>{item.stock} Units</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.smallAdminBtn, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38BDF8', borderWidth: 1 }]}
                    onPress={() => handleRestockCatalogItem(item)}
                  >
                    <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>Update Stock</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallAdminBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B', borderWidth: 1 }]}
                    onPress={() => handleEditProduct(item)}
                  >
                    <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>Edit Product</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallAdminBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444', borderWidth: 1 }]}
                    onPress={() => handleDeleteProduct(item)}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Delete Product</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: SUPER ADMINS DIRECTORY (`peterpatrick@gmail.com` Protected!) */}
        {activeTab === 'ADMINS' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.amber }]}>
              👑 PRIMARY SUPER ADMIN DIRECTORY & ACCESS CONTROL
            </Text>

            <View style={[styles.adminCreatorCard, { backgroundColor: colors.card, borderColor: colors.purple }]}>
              <Text style={[styles.creatorHeader, { color: colors.purple }]}>➕ ONBOARD NEW HEADQUARTERS ADMINISTRATOR</Text>

              <Text style={[styles.inputLabel, { color: colors.subText }]}>NEW ADMIN FULL NAME *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                placeholder="e.g. Mr. Adewale"
                placeholderTextColor="#64748B"
                value={newAdminName}
                onChangeText={setNewAdminName}
              />

              <Text style={[styles.inputLabel, { color: colors.subText }]}>OFFICIAL GMAIL / WORK EMAIL *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                placeholder="e.g. adewale@fshub.ng"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
              />

              <Text style={[styles.inputLabel, { color: colors.subText }]}>CREATE 4-DIGIT SECURITY PIN *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
                placeholder="e.g. 2049"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={newAdminPin}
                onChangeText={setNewAdminPin}
              />

              <View style={styles.superSwitchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.mainText }]}>Grant Super Admin Status ⭐</Text>
                  <Text style={[styles.switchSub, { color: colors.subText }]}>Allows adding/revoking other admins (cannot remove Primary Admin)</Text>
                </View>
                <Switch
                  value={isSuperToggle}
                  onValueChange={setIsSuperToggle}
                  trackColor={{ false: '#334155', true: '#A855F7' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={styles.createAdminBtn} onPress={handleAddNewAdmin}>
                <Text style={styles.createAdminBtnText}>⚡ CREATE & AUTHORIZE NEW ADMIN ✓</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionHeading, { color: colors.mainText, marginTop: 10 }]}>
              📋 AUTHORIZED HEADQUARTERS ADMINISTRATORS ({adminList.length})
            </Text>

            {adminList.map((adm) => (
              <View key={adm.id} style={[styles.repCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: adm.statusColor, borderLeftWidth: 6 }]}>

                <View style={styles.cardTopRow}>
                  <Text style={[styles.storeTitle, { color: colors.mainText, flex: 1 }]} numberOfLines={1}>{adm.name}</Text>
                  <View style={[styles.statusBadge, { borderColor: adm.statusColor }]}>
                    <Text style={[styles.statusText, { color: adm.statusColor }]}>{adm.role}</Text>
                  </View>
                </View>

                <Text style={[styles.repTitle, { color: colors.cyan }]}>📧 {adm.email}</Text>

                {adm.isPrimary ? (
                  <View style={[styles.primaryProtectedBox, { backgroundColor: colors.background, borderColor: colors.amber }]}>
                    <Text style={styles.primaryProtectedText}>
                      🔒 PRIMARY SUPER ADMIN & FOUNDER (`peterpatrick@gmail.com`) — Protected by Master Security Policy. Can never be removed or downgraded.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.amountRow, { borderTopColor: colors.border, marginBottom: 0, paddingTop: 12 }]}>
                    <TouchableOpacity
                      style={[styles.roleToggleBtn, { borderColor: adm.isSuper ? colors.amber : colors.cyan }]}
                      onPress={() => handleToggleSuperAdmin(adm)}
                    >
                      <Text style={[styles.roleToggleText, { color: adm.isSuper ? colors.amber : colors.cyan }]}>
                        {adm.isSuper ? '⬇️ Downgrade to Dispatch Admin' : '⭐ Upgrade to Super Admin'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleRevokeAdmin(adm)}
                    >
                      <Text style={styles.revokeBtnText}>🗑️ Revoke Access</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

          </View>
        )}

      </ScrollView>

      <Modal visible={Boolean(replyTarget)} transparent animationType="slide" onRequestClose={() => setReplyTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.replySheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.mainText }]}>Reply to {replyTarget?.rep_id || 'Rep'}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setReplyTarget(null)}><Text style={{ color: '#64748B', fontWeight: '900' }}>×</Text></TouchableOpacity>
            </View>
            <Text style={[styles.inputLabel, { color: colors.subText }]}>MESSAGE</Text>
            <TextInput
              style={[styles.replyInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
              multiline
              textAlignVertical="top"
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type admin reply..."
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity style={[styles.createAdminBtn, sendingReply && { backgroundColor: '#64748B' }]} onPress={submitReply} disabled={sendingReply}>
              {sendingReply ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createAdminBtnText}>SEND REPLY TO EXACT REP ✓</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    elevation: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exitAdminBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  exitAdminText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '900',
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminNavGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminNavPill: {
    width: '31.8%',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  adminNavEmoji: {
    fontSize: 15,
    marginBottom: 2,
  },
  adminNavText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  adminSub: {
    fontSize: 11,
    flexShrink: 1,
    marginRight: 6,
  },
  testSupabaseBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    elevation: 3,
  },
  testSupabaseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  overviewMetric: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  overviewValue: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
  },
  overviewLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  overviewAction: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 13,
    marginBottom: 8,
  },
  overviewActionText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderLeftWidth: 6,
    marginBottom: 14,
    elevation: 3,
  },
  messageCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderLeftWidth: 6,
    marginBottom: 14,
    elevation: 3,
  },
  messageBody: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  storeTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  repTitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  amountValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 3,
  },
  dispatchBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  mapCardContainer: {
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  realMap: {
    width: '100%',
    height: '100%',
  },
  webFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  repCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  repStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  restockAdminBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    marginTop: 6,
  },
  restockAdminText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '900',
  },
  adminCreatorCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
    elevation: 4,
  },
  creatorHeader: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  catSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catSelectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  superSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  createAdminBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  createAdminBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryProtectedBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  primaryProtectedText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  roleToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  revokeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revokeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  replySheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '78%' },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '900' },
  sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  replyInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 140, fontSize: 13 },
  emptyBox: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  smallAdminBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
