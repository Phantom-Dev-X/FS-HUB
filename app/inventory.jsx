import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';

export default function InventoryScreen() {
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
    purple:     isDark ? '#A855F7' : '#9333EA',
    red:        '#EF4444',
  };

  const categories = ['All Products', '⚡ Solar & Power', '🌐 Networking', '🏪 Display & Retail'];

  // All active SFA Catalog Products with Current Prices and Available Units!
  const [products, setProducts] = useState([
    {
      id: 'PRD-101',
      name: 'FS Solar Home Inverter Box (200W)',
      category: '⚡ Solar & Power',
      price: 120000,
      stock: 42,
      barcode: '840192837102',
      status: 'High Stock',
      statusColor: '#10B981',
    },
    {
      id: 'PRD-102',
      name: 'Commercial Solar Panel (450W Mono)',
      category: '⚡ Solar & Power',
      price: 85000,
      stock: 18,
      barcode: '840192837103',
      status: 'Normal Stock',
      statusColor: '#10B981',
    },
    {
      id: 'PRD-103',
      name: 'Smart WiFi Router Pack (5 Units)',
      category: '🌐 Networking',
      price: 130000,
      stock: 4,
      barcode: '840192837104',
      status: 'Low Stock ⚠️',
      statusColor: '#F59E0B',
    },
    {
      id: 'PRD-104',
      name: '4G LTE Pocket Mobile Hotspot',
      category: '🌐 Networking',
      price: 25000,
      stock: 31,
      barcode: '840192837105',
      status: 'Normal Stock',
      statusColor: '#10B981',
    },
    {
      id: 'PRD-105',
      name: 'Commercial Display Shelf Unit (Deluxe)',
      category: '🏪 Display & Retail',
      price: 40000,
      stock: 0,
      barcode: '840192837106',
      status: 'Out of Stock 🔴',
      statusColor: '#EF4444',
    },
    {
      id: 'PRD-106',
      name: 'Lithium Phosphate Battery Pack (200Ah/12V)',
      category: '⚡ Solar & Power',
      price: 450000,
      stock: 6,
      barcode: '840192837107',
      status: 'Low Stock ⚠️',
      statusColor: '#F59E0B',
    },
  ]);

  // Filter products by search text and selected category pill
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCat = selectedCategory === 'All Products' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleRequestRestock = (productName) => {
    Alert.alert(
      '📥 Restock Request Sent ✓',
      `Headquarters warehouse dispatcher (Ikeja Depot) has been notified to allocate more units of "${productName}" to your field route!`
    );
  };

  const handleViewSpecs = (product) => {
    Alert.alert(
      `📋 ${product.name}`,
      `Barcode: #${product.barcode}\nCategory: ${product.category}\nCurrent Price: ₦${product.price.toLocaleString()}\nAvailable Stock: ${product.stock} units right now inside warehouse.`
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Top Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.mainTitle, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit={true}>
            📦 INVENTORY & CATALOG
          </Text>

          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          View real-time prices, warehouse availability, and low stock alerts across your SFA product catalog.
        </Text>

        {/* Look right here: SUMMARY INVENTORY STATS CARDS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.cyan }]} numberOfLines={1}>6 Products</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Total Catalog</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.amber }]} numberOfLines={1}>2 Warnings</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Low Stock Alerts</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={[styles.searchInput, { color: colors.mainText }]}
            placeholder="Search product name or #barcode..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter Pills */}
        <View style={styles.categoryPillRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories.map((cat, idx) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.catPill, { backgroundColor: active ? '#007AFF' : colors.card, borderColor: active ? colors.cyan : colors.border }]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catPillText, { color: active ? '#FFFFFF' : colors.subText }, active && { fontWeight: '900' }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List of Catalog Products */}
        <View style={styles.listContainer}>
          {filteredProducts.map((item) => (
            <View key={item.id} style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: item.statusColor }]}>
              
              <View style={styles.cardTopRow}>
                <Text style={[styles.productName, { color: colors.mainText }]} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.statusBadge, { borderColor: item.statusColor }]}>
                  <Text style={[styles.statusBadgeText, { color: item.statusColor }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={[styles.barcodeText, { color: colors.subText }]}>
                Category: {item.category} • #Barcode: {item.barcode}
              </Text>

              {/* Price & Stock Display Row */}
              <View style={[styles.priceStockRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[styles.priceLabel, { color: colors.subText }]}>CURRENT PRICE</Text>
                  <Text style={[styles.priceValue, { color: colors.green }]}>
                    ₦{item.price.toLocaleString()} <Text style={{fontSize: 11, color: colors.subText}}>/ unit</Text>
                  </Text>
                </View>

                <View style={styles.stockBoxRight}>
                  <Text style={[styles.stockLabel, { color: colors.subText }]}>AVAILABLE UNITS</Text>
                  <Text style={[styles.stockValue, { color: item.stock === 0 ? colors.red : (item.stock < 10 ? colors.amber : colors.cyan) }]}>
                    {item.stock} Units
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Specs & Restock Request */}
              <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  onPress={() => handleViewSpecs(item)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.cyan }]}>📋 View Specs</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.restockBtn, item.stock === 0 ? { backgroundColor: '#EF4444' } : { backgroundColor: '#0F172A', borderColor: '#334155', borderWidth: 1 }]}
                  onPress={() => handleRequestRestock(item.name)}
                >
                  <Text style={[styles.restockBtnText, { color: item.stock === 0 ? '#FFFFFF' : '#F59E0B' }]}>
                    {item.stock === 0 ? '🚨 Urgent Restock Req.' : '📥 Request Restock'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}
        </View>

      </ScrollView>

      {/* FIXED SMART FOOTER */}
      <SmartFooter isDark={isDark} colors={{ card: colors.card, border: colors.border, cyan: colors.cyan, subText: colors.subText }} />
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  subText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    width: '48.5%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 13,
  },
  categoryPillRow: {
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    marginBottom: 10,
  },
  productCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderLeftWidth: 6,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  barcodeText: {
    fontSize: 11,
    marginBottom: 12,
  },
  priceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  stockBoxRight: {
    alignItems: 'flex-end',
  },
  stockLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  restockBtn: {
    flex: 1.2,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  restockBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
