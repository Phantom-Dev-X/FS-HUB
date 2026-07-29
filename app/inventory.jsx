// FS HUB INVENTORY - ZERO FAKE, WHITE PREMIUM ELEGANT, FIXED TEXT ERROR
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { useTheme } from '../context/ThemeContext';
import { DatabaseEngine } from './_DatabaseEngine';
import { CacheEngine } from './_CacheEngine';
import { OrderStore } from './_OrderStore';
import * as ImagePicker from 'expo-image-picker';
import RemoteImage from '../components/RemoteImage';

export default function InventoryScreen() {
  const { colors } = useTheme(); // Global white elegant theme sync
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [products, setProducts] = useState([]);
  const [specProduct, setSpecProduct] = useState(null);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('20');
  const [restockUrgency, setRestockUrgency] = useState('Normal');
  const [restockNote, setRestockNote] = useState('');
  const [isSendingRestock, setIsSendingRestock] = useState(false);

  const categories = ['All Products', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Load real catalog from DB every time screen becomes focused
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetchCatalog = async () => {
        const cachedCatalog = await CacheEngine.get('catalog', 'global', null);
        if (active && cachedCatalog) {
          OrderStore.catalog = cachedCatalog;
          setProducts(cachedCatalog);
        }

        const cloudCatalog = await DatabaseEngine.getCatalog();
        if (active) {
          OrderStore.catalog = cloudCatalog;
          setProducts(cloudCatalog);
          await CacheEngine.set('catalog', 'global', cloudCatalog);
        }
      };
      fetchCatalog();
      return () => {
        active = false;
      };
    }, [])
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery);
    const matchesCat = selectedCategory === 'All Products' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleRequestRestock = (product) => {
    setRestockProduct(product);
    setRestockQty(String(Math.max(20, Number(product?.stock || 0) < 10 ? 50 : 20)));
    setRestockUrgency(Number(product?.stock || 0) <= 5 ? 'Urgent' : 'Normal');
    setRestockNote('');
  };

  const handleViewSpecs = (product) => {
    setSpecProduct(product);
  };

  const submitRestockRequest = async () => {
    if (!restockProduct) return;
    const qty = Number(String(restockQty).replace(/[^0-9]/g, '')) || 0;
    if (qty <= 0) {
      Alert.alert('Invalid Quantity', 'Enter the quantity you want warehouse/admin to restock.');
      return;
    }
    setIsSendingRestock(true);
    const rep = OrderStore.currentAgent || {};
    const res = await DatabaseEngine.saveAdminMessage({
      repId: rep.id,
      repName: rep.name,
      type: 'restock_request',
      title: `Restock Request: ${restockProduct.name}`,
      body: `Please restock ${restockProduct.name}. Requested quantity: ${qty}. Urgency: ${restockUrgency}.${restockNote ? ` Note: ${restockNote}` : ''}`,
      priority: restockUrgency,
      relatedId: restockProduct.id,
      payload: {
        productId: restockProduct.id,
        productName: restockProduct.name,
        barcode: restockProduct.barcode,
        currentStock: restockProduct.stock,
        requestedQty: qty,
        urgency: restockUrgency,
        note: restockNote,
      }
    });
    setIsSendingRestock(false);
    setRestockProduct(null);
    Alert.alert(res.cloud ? 'Request Sent ✅' : 'Saved Locally ✅', res.cloud ? 'Admin/warehouse request has been sent.' : 'Request saved on this device and can be synced when admin message table is ready.');
  };

  const handleClearDummyStocks = async () => {
    Alert.alert('Clear Inventory?', 'This will delete ALL catalog items (including dummy). You can re-add real products via Admin portal.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All 🗑️', style: 'destructive', onPress: async () => {
        await DatabaseEngine.addNewProductToCatalog && await (await import('@react-native-async-storage/async-storage')).default.setItem('@fshub_table_catalog', JSON.stringify([]));
        OrderStore.catalog = [];
        setProducts([]);
        Alert.alert('Cleared ✓', 'Inventory is now 0 - clean production mode.');
      }}
    ]);
  };

  // NEW: Take photo of stock (for inventory verification)
  const takeStockPhoto = async (product) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera permission needed', 'Allow camera access to take stock photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      Alert.alert('Stock Photo Captured ✓', `Photo saved for "${product.name}". (In real app this would be uploaded to Supabase storage)`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitle}>📦 Inventory</Text>
            <Text style={styles.sub}>{products.length} products available in the field catalog</Text>
          </View>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={18} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
        </View>

        {/* Stats - white premium cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="cube-outline" size={20} color="#2563EB" />
            <Text style={styles.statNum}>{products.length} Products</Text>
            <Text style={styles.statLabel}>Field Catalog</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <Text style={styles.statNum}>{products.filter(p => p.stock < 10).length} Low</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
        </View>

        {/* Search - white elegant */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput style={styles.searchInput} placeholder="Search product or barcode..." placeholderTextColor="#94A3B8" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={styles.pillRow}>
          {categories.map((cat, idx) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity key={idx} style={[styles.catPill, active && styles.catPillActive]} onPress={() => setSelectedCategory(cat)}>
                <Text style={[styles.catPillText, active && { color: '#FFFFFF' }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Empty state - premium */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <LinearGradient colors={['#EFF6FF', '#FFFFFF']} style={styles.emptyGradient}>
              <Text style={{ fontSize: 40 }}>📦</Text>
              <Text style={styles.emptyTitle}>No Products Yet</Text>
              <Text style={styles.emptySub}>No products are currently available. Please contact your administrator or warehouse manager.</Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredProducts.map((item) => (
              <View key={item.id} style={styles.productCard}>
                <View style={styles.cardTop}>
                  <RemoteImage path={item.image_path || item.product_photo_path} style={styles.productThumb}>
                    <Ionicons name="cube-outline" size={20} color="#2563EB" />
                  </RemoteImage>
                  <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.statusBadge, { borderColor: item.stock === 0 ? '#EF4444' : item.stock < 10 ? '#F59E0B' : '#10B981' }]}>
                    <Text style={[styles.statusText, { color: item.stock === 0 ? '#EF4444' : item.stock < 10 ? '#F59E0B' : '#10B981' }]}>{item.stock === 0 ? 'Out of Stock' : item.stock < 10 ? 'Low Stock' : 'In Stock'}</Text>
                  </View>
                </View>
                <Text style={styles.barcode}>#{item.barcode} • {item.category}</Text>
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>PRICE</Text>
                    <Text style={styles.priceValue}>₦{item.price?.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.priceLabel}>STOCK</Text>
                    <Text style={[styles.stockValue, { color: item.stock === 0 ? '#EF4444' : '#2563EB' }]}>{item.stock} Units</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewSpecs(item)}>
                    <Ionicons name="document-text-outline" size={14} color="#2563EB" />
                    <Text style={styles.actionBtnText}> Specs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.restockBtn]} onPress={() => handleRequestRestock(item)}>
                    <Ionicons name="arrow-up-circle-outline" size={14} color="#FFFFFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFF' }]}> Restock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      <ProductSpecsModal product={specProduct} onClose={() => setSpecProduct(null)} />
      <RestockRequestModal
        product={restockProduct}
        qty={restockQty}
        setQty={setRestockQty}
        urgency={restockUrgency}
        setUrgency={setRestockUrgency}
        note={restockNote}
        setNote={setRestockNote}
        loading={isSendingRestock}
        onSubmit={submitRestockRequest}
        onClose={() => setRestockProduct(null)}
      />

      <SmartFooter />
    </SafeAreaView>
  );
}

function ProductSpecsModal({ product, onClose }) {
  if (!product) return null;
  const price = Number(product.price || product.unit_price || 0);
  const stock = Number(product.stock || product.warehouse_stock || 0);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Product Specifications</Text>
            <TouchableOpacity style={styles.sheetClose} onPress={onClose}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity>
          </View>
          <View style={styles.specHero}>
            <RemoteImage path={product.image_path || product.product_photo_path} style={styles.specImage}>
              <Ionicons name="cube-outline" size={36} color="#2563EB" />
            </RemoteImage>
            <Text style={styles.specName}>{product.name}</Text>
            <Text style={styles.specCategory}>{product.category || 'Uncategorized'}</Text>
          </View>
          <View style={styles.specGrid}>
            <SpecBox label="Price" value={`₦${price.toLocaleString()}`} color="#059669" />
            <SpecBox label="Stock" value={`${stock} units`} color={stock < 10 ? '#D97706' : '#2563EB'} />
            <SpecBox label="Barcode" value={`#${product.barcode || 'N/A'}`} color="#0F172A" />
            <SpecBox label="Status" value={stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock'} color={stock === 0 ? '#DC2626' : stock < 10 ? '#D97706' : '#059669'} />
          </View>
          <TouchableOpacity style={styles.primarySheetBtn} onPress={onClose}><Text style={styles.primarySheetBtnText}>Done</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SpecBox({ label, value, color }) {
  return <View style={styles.specBox}><Text style={styles.specLabel}>{label}</Text><Text style={[styles.specValue, { color }]} numberOfLines={2}>{value}</Text></View>;
}

function RestockRequestModal({ product, qty, setQty, urgency, setUrgency, note, setNote, loading, onSubmit, onClose }) {
  if (!product) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Restock Request</Text>
            <TouchableOpacity style={styles.sheetClose} onPress={onClose}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity>
          </View>
          <Text style={styles.restockProduct}>{product.name}</Text>
          <Text style={styles.restockSub}>Current stock: {product.stock} units • #{product.barcode || 'N/A'}</Text>
          <Text style={styles.inputLabel}>REQUESTED QUANTITY</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={qty} onChangeText={setQty} placeholder="e.g. 50" />
          <Text style={styles.inputLabel}>URGENCY</Text>
          <View style={styles.urgencyRow}>
            {['Normal', 'Urgent', 'Critical'].map(level => (
              <TouchableOpacity key={level} style={[styles.urgencyPill, urgency === level && styles.urgencyActive]} onPress={() => setUrgency(level)}>
                <Text style={[styles.urgencyText, urgency === level && { color: '#FFF' }]}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.inputLabel}>NOTE TO ADMIN / WAREHOUSE</Text>
          <TextInput style={[styles.modalInput, { minHeight: 78, textAlignVertical: 'top' }]} multiline value={note} onChangeText={setNote} placeholder="e.g. Customer demand is high this week..." />
          <TouchableOpacity style={[styles.primarySheetBtn, loading && { backgroundColor: '#94A3B8' }]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primarySheetBtnText}>Send Request to Admin</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mainTitle: { fontSize: 22, fontWeight: '900', color: '#1E3A8A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, color: '#0F172A', fontSize: 13 },
  pillRow: { marginBottom: 14 },
  catPill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  catPillActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  catPillText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  clearBtn: { flexDirection: 'row', alignSelf: 'flex-end', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  clearText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  emptyBox: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#DBEAFE', marginTop: 10 },
  emptyGradient: { padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E3A8A', marginTop: 10 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  emptyActionBtn: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 14 },
  emptyActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  list: { gap: 12 },
  productCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productThumb: { width: 42, height: 42, borderRadius: 12, marginRight: 10 },
  productName: { fontSize: 14, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '800' },
  barcode: { fontSize: 11, color: '#64748B', marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginBottom: 12 },
  priceLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
  priceValue: { fontSize: 16, fontWeight: '900', color: '#059669', marginTop: 2 },
  stockValue: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  restockBtn: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '82%' },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  sheetClose: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  specHero: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 18, padding: 0, borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 12, overflow: 'hidden' },
  specImage: { width: '100%', height: 220, marginBottom: 10 },
  specName: { color: '#0F172A', fontSize: 17, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  specCategory: { color: '#64748B', fontSize: 12, fontWeight: '700', marginTop: 3 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  specBox: { width: '48%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12 },
  specLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginBottom: 5 },
  specValue: { fontSize: 13, fontWeight: '900' },
  primarySheetBtn: { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  primarySheetBtnText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  restockProduct: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  restockSub: { color: '#64748B', fontSize: 12, marginTop: 3, marginBottom: 12 },
  inputLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 10, marginBottom: 6 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0F172A', fontSize: 13 },
  urgencyRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  urgencyPill: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  urgencyActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  urgencyText: { color: '#64748B', fontSize: 12, fontWeight: '900' },
});
