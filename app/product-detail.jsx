import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore'; // Or './OrderStore'
import RemoteImage from '../components/RemoteImage';

// =========================================================================
// SCREEN 2 OF 3: PRODUCT DETAIL & ADD TO CART (`app/product-detail.jsx`)
// Look: Shows exact hero product photo, specs, warehouse stock, `+ / -` quantity adjuster,
// and "➕ ADD TO SHOPRITE CART (₦240,000)" button that updates OrderStore and returns!
// =========================================================================
export default function ProductDetailScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { id } = useLocalSearchParams(); // Reads ?id=PRD-101 from router!

  // Find the exact product from our warehouse catalog (fallback to first item if directly testing)
  const product = OrderStore.catalog.find(p => p.id === id) || OrderStore.catalog[0] || null;
  const client = OrderStore.currentClient;

  // Check if item is already inside cart to start with its current quantity
  const existingCartItem = product ? OrderStore.cart.find(c => c.id === product.id) : null;
  const [qty, setQty] = useState(existingCartItem ? existingCartItem.qty : 1);
  const [notes, setNotes] = useState('');
  const productPrice = Number(product?.price ?? product?.unit_price ?? 0);
  const productStock = Number(product?.stock ?? product?.warehouse_stock ?? 0);

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
  };

  if (!client || !product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.guardBox}>
          <Text style={styles.guardEmoji}>{!client ? '🏬' : '📦'}</Text>
          <Text style={[styles.guardTitle, { color: colors.mainText }]}>{!client ? 'No client selected' : 'Product not available'}</Text>
          <Text style={[styles.guardText, { color: colors.subText }]}>
            {!client
              ? 'Please check in with a client before adding products to an order.'
              : 'The catalog is empty or this product could not be found. Ask admin to add stock products.'}
          </Text>
          <TouchableOpacity style={styles.guardBtn} onPress={() => router.replace(!client ? '/checkin' : '/visit')}>
            <Text style={styles.guardBtnText}>{!client ? 'Go to Check-In' : 'Back to Catalog'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.guardBtn, { backgroundColor: '#64748B', marginTop: 10 }]} onPress={() => router.replace('/home')}>
            <Text style={styles.guardBtnText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleAddToCart = () => {
    if (productStock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently unavailable and cannot be added to cart.');
      return;
    }
    if (qty > productStock) {
      Alert.alert('Stock Limit', `Only ${productStock} unit(s) are available.`);
      setQty(productStock);
      return;
    }
    OrderStore.addToCart(product.id, qty);
    Alert.alert(
      '🛒 Added to Store Cart ✓',
      `${qty} units of ${product.name} (₦${(qty * productPrice).toLocaleString()}) added to ${client.name}'s order!`,
      [{ text: 'Continue Ordering', onPress: () => router.replace('/visit') }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button & Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/visit')} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Store Catalog</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.mainText }]} numberOfLines={1}>
            📦 PRODUCT DETAIL
          </Text>
        </View>

        {/* Look right here: HERO PRODUCT PHOTO BOX */}
        <View style={[styles.heroBox, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>IN STOCK: {productStock} UNITS 🟢</Text>
          </View>
          <RemoteImage path={product.image_path || product.product_photo_path} style={styles.heroProductImage}>
            <Text style={{ fontSize: 64 }}>⚡</Text>
          </RemoteImage>
          <Text style={[styles.heroProdName, { color: colors.mainText }]} numberOfLines={1}>{product.name}</Text>
          <Text style={[styles.heroBarcode, { color: colors.cyan }]}>Barcode #{product.barcode} • Ikeja Warehouse Depot</Text>
        </View>

        {/* Product Specs & Description Card */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.detailTitle, { color: colors.mainText }]}>{product.name}</Text>
          <Text style={[styles.detailCat, { color: colors.subText }]}>Category: {product.category}</Text>
          <Text style={[styles.detailDesc, { color: colors.subText }]}>{product.description}</Text>

          {/* Price & Stock Grid */}
          <View style={[styles.gridRow, { borderTopColor: colors.border }]}>
            <View style={[styles.gridBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.gridLabel, { color: colors.subText }]}>UNIT PRICE</Text>
              <Text style={[styles.gridVal, { color: colors.green }]}>₦{productPrice.toLocaleString()}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.gridLabel, { color: colors.subText }]}>AVAILABLE STOCK</Text>
              <Text style={[styles.gridVal, { color: colors.cyan }]}>{productStock} Units</Text>
            </View>
          </View>
        </View>

        {/* Look right here: QUANTITY ADJUSTER & SUBTOTAL CARD */}
        <View style={[styles.qtyCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <Text style={[styles.qtyHeader, { color: colors.cyan }]}>
            SELECT QUANTITY FOR {client.name.toUpperCase()}:
          </Text>

          <View style={styles.qtyControlRow}>
            <View style={[styles.qtyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => qty > 1 && setQty(qty - 1)}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>

              <Text style={[styles.qtyNum, { color: colors.mainText }]}>{qty}</Text>

              <TouchableOpacity style={[styles.qtyBtn, qty >= productStock && { backgroundColor: '#94A3B8' }]} onPress={() => qty < productStock && setQty(qty + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subtotalBoxRight}>
              <Text style={[styles.subtotalLabel, { color: colors.subText }]}>ITEM SUBTOTAL:</Text>
              <Text style={[styles.subtotalValue, { color: colors.green }]}>
                ₦{(qty * productPrice).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Optional Item Notes */}
        <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.cyan }]}>📝 SPECIAL ITEM INSTRUCTIONS (OPTIONAL)</Text>
          <TextInput 
            style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
            placeholder="e.g. Include mounting brackets and extra DC cables..."
            placeholderTextColor="#64748B"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

      </ScrollView>

      {/* Look right right here: FIXED BOTTOM ADD TO CART BUTTON! */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.cyan }]}>
        <TouchableOpacity style={[styles.addBtn, productStock <= 0 && { backgroundColor: '#94A3B8' }]} onPress={handleAddToCart}>
          <Text style={styles.addBtnText}>
            ➕ ADD {qty} {qty === 1 ? 'UNIT' : 'UNITS'} TO CART (₦{(qty * productPrice).toLocaleString()}) ✓
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  guardBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  guardEmoji: { fontSize: 48, marginBottom: 12 },
  guardTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  guardText: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  guardBtn: { backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, minWidth: 180, alignItems: 'center' },
  guardBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  backText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  heroBox: {
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  heroTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  heroProductImage: {
    width: '100%',
    height: 220,
    borderRadius: 22,
    marginVertical: 10,
  },
  heroProdName: {
    fontSize: 16,
    fontWeight: '900',
  },
  heroBarcode: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 3,
  },
  detailCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  detailCat: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  gridBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  gridVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  qtyCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 3,
  },
  qtyHeader: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
  },
  qtyControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  qtyBtn: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  qtyNum: {
    fontSize: 18,
    fontWeight: '900',
    minWidth: 36,
    textAlign: 'center',
  },
  subtotalBoxRight: {
    alignItems: 'flex-end',
  },
  subtotalLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtotalValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  notesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    elevation: 10,
  },
  addBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
