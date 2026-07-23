import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { OrderStore } from './_OrderStore'; // Or './OrderStore'

// =========================================================================
// SCREEN 2 OF 3: PRODUCT DETAIL & ADD TO CART (`app/product-detail.jsx`)
// Look: Shows exact hero product photo, specs, warehouse stock, `+ / -` quantity adjuster,
// and "➕ ADD TO SHOPRITE CART (₦240,000)" button that updates OrderStore and returns!
// =========================================================================
export default function ProductDetailScreen() {
  const [isDark, setIsDark] = useState(true);
  const { id } = useLocalSearchParams(); // Reads ?id=PRD-101 from router!

  // Find the exact product from our warehouse catalog (fallback to PRD-101 if directly testing)
  const product = OrderStore.catalog.find(p => p.id === id) || OrderStore.catalog[0];
  const client = OrderStore.currentClient;

  // Check if item is already inside cart to start with its current quantity
  const existingCartItem = OrderStore.cart.find(c => c.id === product.id);
  const [qty, setQty] = useState(existingCartItem ? existingCartItem.qty : 1);
  const [notes, setNotes] = useState('');

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
  };

  const handleAddToCart = () => {
    OrderStore.addToCart(product.id, qty);
    Alert.alert(
      '🛒 Added to Store Cart ✓',
      `${qty} units of ${product.name} (₦${(qty * product.price).toLocaleString()}) added to ${client.name}'s order!`,
      [{ text: 'Continue Ordering', onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button & Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Store Catalog</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.mainText }]} numberOfLines={1}>
            📦 PRODUCT DETAIL
          </Text>
        </View>

        {/* Look right here: HERO PRODUCT PHOTO BOX */}
        <View style={[styles.heroBox, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>IN STOCK: {product.stock} UNITS 🟢</Text>
          </View>
          <Text style={{ fontSize: 64, marginVertical: 10 }}>⚡</Text>
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
              <Text style={[styles.gridVal, { color: colors.green }]}>₦{product.price.toLocaleString()}</Text>
            </View>

            <View style={[styles.gridBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.gridLabel, { color: colors.subText }]}>AVAILABLE STOCK</Text>
              <Text style={[styles.gridVal, { color: colors.cyan }]}>{product.stock} Units</Text>
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

              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(qty + 1)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subtotalBoxRight}>
              <Text style={[styles.subtotalLabel, { color: colors.subText }]}>ITEM SUBTOTAL:</Text>
              <Text style={[styles.subtotalValue, { color: colors.green }]}>
                ₦{(qty * product.price).toLocaleString()}
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
        <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
          <Text style={styles.addBtnText}>
            ➕ ADD {qty} {qty === 1 ? 'UNIT' : 'UNITS'} TO CART (₦{(qty * product.price).toLocaleString()}) ✓
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
