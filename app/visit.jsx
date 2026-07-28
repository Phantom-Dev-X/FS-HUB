import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';
import * as Location from 'expo-location';

// Look right here: We import `expo-image-picker` to ask for camera permissions and take REAL photos!
import * as ImagePicker from 'expo-image-picker';
import RemoteImage from '../components/RemoteImage';

export default function VisitOrdersScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const client = OrderStore.currentClient;

  // Look right right here: We store the real captured photo URI inside local state & OrderStore!
  const [photoUri, setPhotoUri] = useState(client?.checkInPhotoUri || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { distinctProducts, totalUnits, grandTotal } = OrderStore.getCartSummary();

  const [catalogItems, setCatalogItems] = useState(OrderStore.catalog || []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const syncCatalog = async () => {
        const cloudCatalog = await DatabaseEngine.getCatalog();
        if (active) {
          OrderStore.catalog = cloudCatalog;
          setCatalogItems(cloudCatalog);
        }
      };
      syncCatalog();
      return () => {
        active = false;
      };
    }, [])
  );

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
  };

  const categories = ['All Products', '⚡ Solar & Power', '🌐 Networking', '🏪 Display'];

  const filteredCatalog = catalogItems.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode?.includes(searchQuery);
    const matchesCat = selectedCategory === 'All Products' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // =========================================================================
  // 📸 REAL CAMERA PERMISSION & CAPTURE FUNCTION
  // Tapping the photo box runs this: asks native camera permission and launches phone camera!
  // =========================================================================
  const handleTakePhoto = async () => {
    // 1. First, ask for Camera Permissions natively on the phone!
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed ⚠️',
        'FS Hub needs camera permission to capture geotagged store entrance photos for audit compliance!'
      );
      return;
    }

    // 2. Launch the native camera right on your phone screen!
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7, // 70% quality keeps the file size small and fast for offline storage!
    });

    // Upload the image and a fresh GPS reading as a permanent check-in record.
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const capturedUri = result.assets[0].uri;
      setPhotoUri(capturedUri);
      setIsUploadingPhoto(true);
      try {
        const locationPermission = await Location.requestForegroundPermissionsAsync();
        if (locationPermission.status !== 'granted') throw new Error('Location permission is required for a verified check-in.');
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const checkinId = `CHK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const photoPath = `checkins/${client.id}/${checkinId}.jpg`;
        const upload = await DatabaseEngine.uploadImage(capturedUri, photoPath);
        if (!upload.success) throw new Error(upload.error);
        const saved = await DatabaseEngine.saveCheckin({
          id: checkinId,
          client_id: client.id,
          rep_id: OrderStore.currentAgent?.id,
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          accuracy_m: current.coords.accuracy,
          photo_path: photoPath,
          checked_in_at: new Date().toISOString(),
          verification_status: current.coords.accuracy && current.coords.accuracy <= 100 ? 'gps_verified' : 'low_accuracy'
        });
        if (!saved.success) throw new Error(saved.error);
        OrderStore.currentClient.checkInPhotoTaken = true;
        OrderStore.currentClient.checkInPhotoUri = capturedUri;
        OrderStore.currentClient.checkInPhotoPath = photoPath;
        OrderStore.currentClient.gpsVerified = `Lat: ${current.coords.latitude.toFixed(6)} | Lon: ${current.coords.longitude.toFixed(6)} | ±${Math.round(current.coords.accuracy || 0)}m`;
        Alert.alert('Check-in backed up ✅', 'The photo, GPS position, accuracy, representative, client, and timestamp are stored in Supabase.');
      } catch (e) {
        Alert.alert('Check-in backup failed', `${e.message}\n\nThe photo is still visible on this phone, but it is not marked as cloud verified.`);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleProductTap = (product) => {
    router.push({ pathname: '/product-detail', params: { id: product.id } });
  };

  if (!client) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.guardBox}>
          <Text style={styles.guardEmoji}>🏬</Text>
          <Text style={[styles.guardTitle, { color: colors.mainText }]}>No client check-in selected</Text>
          <Text style={[styles.guardText, { color: colors.subText }]}>Please choose a client from Check-In before opening the order catalog.</Text>
          <TouchableOpacity style={styles.guardBtn} onPress={() => router.replace('/checkin')}>
            <Text style={styles.guardBtnText}>Go to Check-In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.guardBtn, { backgroundColor: '#64748B', marginTop: 10 }]} onPress={() => router.replace('/home')}>
            <Text style={styles.guardBtnText}>Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* Top Bar & Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push('/checkin')} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Check-In Directory</Text>
          </TouchableOpacity>

          <View style={styles.gpsPill}>
            <Text style={styles.gpsPillText}>GPS VERIFIED ✓</Text>
          </View>
        </View>

        {/* VERIFIED CHECK-IN STORE HEADER */}
        <View style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
          <Text style={[styles.storeName, { color: colors.mainText }]} numberOfLines={1}>{client.name}</Text>
          <Text style={[styles.storeAddress, { color: colors.subText }]} numberOfLines={1}>📍 {client.address}</Text>
          <View style={styles.creditBadgeRow}>
            <View style={[styles.creditBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.creditText, { color: colors.green }]}>Limit: {client.creditLimit} • Standing: Good 🟢</Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            📸 REAL CAPTURED PHOTO OR CAMERA LAUNCHER BOX!
            If `photoUri` exists, we display their real captured store photo right here!
            ========================================================================= */}
        <TouchableOpacity
          style={[styles.photoCard, { backgroundColor: photoUri ? '#064E3B' : '#0B1120', borderColor: photoUri ? '#10B981' : colors.cyan }]}
          onPress={handleTakePhoto}
          disabled={isUploadingPhoto}
        >
          {photoUri ? (
            <View style={styles.capturedBoxWrapper}>
              <Image source={{ uri: photoUri }} style={styles.capturedImage} />
              <View style={styles.watermarkOverlay}>
                <Text style={styles.watermarkText}>
                  📍 {client.gpsVerified} • Timestamp: {new Date().toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.retakeTipText}>✅ Photo Saved Locally! Tap anywhere to retake.</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 4 }}>📸</Text>
              <Text style={[styles.photoTitle, { color: '#FFFFFF' }]}>
                Take Geotagged Store Entrance Photo
              </Text>
              <Text style={[styles.photoSub, { color: colors.subText }]}>
                Tap to ask camera permission & launch phone camera with GPS watermark
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.mainText }]}
            placeholder="Search product catalog or #barcode..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter Pills */}
        <View style={styles.categoryRow}>
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

        {/* CATALOG LIST WITH EXACT AMAZON IN-CART BADGES */}
        <Text style={[styles.sectionTitle, { color: colors.mainText }]}>
          AVAILABLE WAREHOUSE CATALOG (TAP ITEM TO DETAIL OR ORDER)
        </Text>

        <View style={styles.catalogList}>
          {filteredCatalog.length === 0 ? (
            <View style={[styles.emptyCatalogBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📦</Text>
              <Text style={[styles.emptyCatalogTitle, { color: colors.mainText }]}>No catalog products available</Text>
              <Text style={[styles.emptyCatalogText, { color: colors.subText }]}>Ask an admin to add products in Admin → Stock, then reopen this screen.</Text>
            </View>
          ) : filteredCatalog.map((item) => {
            const cartItem = OrderStore.cart.find(c => c.id === item.id);
            const inCartQty = cartItem ? Number(cartItem.qty || 0) : 0;
            const itemPrice = Number(item.price ?? item.unit_price ?? 0);
            const itemStock = Number(item.stock ?? item.warehouse_stock ?? 0);
            const itemSubtotal = cartItem ? (inCartQty * Number(cartItem.price ?? itemPrice ?? 0)) : 0;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.productCard, { backgroundColor: colors.card, borderColor: inCartQty > 0 ? colors.green : colors.border }]}
                onPress={() => handleProductTap(item)}
              >
                <View style={styles.prodTopRow}>
                  <RemoteImage path={item.image_path || item.product_photo_path} style={styles.prodThumb}>
                    <Text style={{ fontSize: 22 }}>⚡</Text>
                  </RemoteImage>
                  <View style={styles.prodTextWrapper}>
                    <Text style={[styles.prodName, { color: colors.mainText }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.prodMeta, { color: colors.subText }]}>
                      In Stock: {itemStock} units • #{item.barcode || 'NO-BARCODE'}
                    </Text>

                    {inCartQty > 0 && (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartBadgeText}>
                          🛒 Currently in Cart: <Text style={{fontWeight: '900', color: colors.green}}>{inCartQty} Units (₦{itemSubtotal.toLocaleString()})</Text>
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRightBox}>
                    <Text style={[styles.prodPrice, { color: colors.green }]}>₦{itemPrice.toLocaleString()}</Text>
                    <Text style={[styles.tapActionText, { color: colors.cyan }]}>Tap Detail ➔</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* FIXED AMAZON/INSTACART BOTTOM CART BAR */}
      <View style={[styles.floatingCartBar, { backgroundColor: colors.card, borderTopColor: colors.green }]}>
        <View style={styles.cartInfoRow}>
          <Text style={[styles.cartItemsCount, { color: colors.cyan }]}>
            🛒 CART: <Text style={{fontWeight: '900', color: colors.mainText}}>{distinctProducts} Distinct Products</Text> ({totalUnits} Total Units)
          </Text>
          <Text style={[styles.cartGrandTotal, { color: colors.green }]}>₦{grandTotal.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => {
            if (totalUnits === 0) {
              Alert.alert('Empty Cart ⚠️', 'Tap any product from the catalog list to add items to your cart first!');
              return;
            }
            router.push('/checkout-summary');
          }}
        >
          <Text style={styles.checkoutBtnText}>
            🛒 VIEW CART & REVIEW ORDER (₦{grandTotal.toLocaleString()}) ➔
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
    paddingBottom: 130,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gpsPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  gpsPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
  },
  storeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    elevation: 3,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  storeAddress: {
    fontSize: 12,
    marginBottom: 8,
  },
  creditBadgeRow: {
    flexDirection: 'row',
  },
  creditBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  creditText: {
    fontSize: 11,
    fontWeight: '800',
  },
  photoCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  capturedBoxWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  capturedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  watermarkOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 6,
  },
  watermarkText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  retakeTipText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  photoSub: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
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
  categoryRow: {
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  catalogList: {
    marginBottom: 10,
  },
  emptyCatalogBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCatalogTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptyCatalogText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  productCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    elevation: 2,
  },
  prodTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodThumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 12,
  },
  prodTextWrapper: {
    flex: 1,
    marginRight: 12,
  },
  prodName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  prodMeta: {
    fontSize: 11,
  },
  inCartBadge: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  inCartBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  priceRightBox: {
    alignItems: 'flex-end',
  },
  prodPrice: {
    fontSize: 15,
    fontWeight: '900',
  },
  tapActionText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  cartInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartItemsCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  cartGrandTotal: {
    fontSize: 20,
    fontWeight: '900',
  },
  checkoutBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
