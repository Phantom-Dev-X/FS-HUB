import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';

// Look right right here: We import our automated background email service!
import { EmailService } from './_EmailService';

export default function CheckoutSummaryScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [cartItems, setCartItems] = useState(OrderStore.cart);
  
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentCycle, setPaymentCycle] = useState('14 Days Net Credit');
  const [deliveryUrgency, setDeliveryUrgency] = useState('Standard 24-48 Hours');
  const [appliedPromo, setAppliedPromo] = useState('5% Bulk Trade Discount');

  // Loading state while sending automated server email
  const [isEmailSending, setIsEmailSending] = useState(false);

  const client = OrderStore.currentClient;
  const paymentOptions = ['Cash on Delivery', '7 Days Net Credit', '14 Days Net Credit', 'Bank POS Transfer'];
  const urgencyOptions = ['Standard 24-48 Hours', '🚨 Urgent Same-Day Dispatch', 'Next Weekly Route Delivery'];
  const promoOptions = ['No Promotion / Standard', '5% Bulk Trade Discount', '🎁 Free Marketing Display Stand Promo'];

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
    red:        '#EF4444',
  };

  const handleQtyChange = (id, delta) => {
    const item = cartItems.find(c => c.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    OrderStore.addToCart(id, newQty);
    setCartItems([...OrderStore.cart]);
  };

  const handleRemoveItem = (id, name) => {
    Alert.alert('Remove Item', `Delete "${name}" from ${client.name}'s order cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: () => {
          OrderStore.removeFromCart(id);
          setCartItems([...OrderStore.cart]);
        }
      }
    ]);
  };

  const { totalUnits, grandTotal } = OrderStore.getCartSummary();

  let discountAmount = 0;
  if (appliedPromo === '5% Bulk Trade Discount' && grandTotal > 0) {
    discountAmount = Math.round(grandTotal * 0.05);
  }
  const finalPayableTotal = Math.max(0, grandTotal - discountAmount);
  const invoiceNumber = `INV-884-${Math.floor(100 + Math.random() * 900)}`;

  // =========================================================================
  // 📧 AUTOMATED BACKGROUND ORDER RECEIPT SENDER
  // Immediately calls background cloud API to email receipt directly to store!
  // =========================================================================
  const handleFinalSubmit = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is Empty ⚠️', 'Your cart has no items! Please add items from the catalog first.');
      return;
    }

    setIsEmailSending(true);

    // Persist the order before attempting non-essential email delivery. It is
    // queued locally and the Sync screen uploads it to Supabase without risking
    // data loss when the phone has poor connectivity.
    const savedOrder = await DatabaseEngine.saveOfflineOrder({
      invoiceNumber,
      store: client.name,
      clientName: client.name,
      repId: OrderStore.currentAgent?.id,
      payableTotal: finalPayableTotal,
      grandTotal,
      cartItems,
      gpsVerified: client.gpsVerified || client.gps_coordinates || '',
      paymentCycle,
      deliveryUrgency,
      orderNotes
    });

    if (!savedOrder.success) {
      setIsEmailSending(false);
      Alert.alert('Order Save Failed', savedOrder.error || 'The order could not be saved. Please try again.');
      return;
    }

    const clientEmail = client.email || client.registered_email || '';

    // Call our automated background server email service!
    const emailResponse = await EmailService.sendOrderReceiptEmail({
      clientName: client.name,
      clientEmail: clientEmail,
      invoiceNumber: invoiceNumber,
      cartItems: cartItems,
      grandTotal: grandTotal,
      discountAmount: discountAmount,
      payableTotal: finalPayableTotal,
      paymentCycle: paymentCycle,
      deliveryUrgency: deliveryUrgency,
    });

    setIsEmailSending(false);

    const emailWasSent = Boolean(emailResponse?.success);
    Alert.alert(
      emailWasSent
        ? `🎉 ORDER SAVED & EMAIL SENT (#${invoiceNumber})!`
        : `✅ ORDER SAVED (#${invoiceNumber})`,
      `Store: ${client.name}\nPayable Total: ₦${finalPayableTotal.toLocaleString()} (${totalUnits} Units)\n\n${emailWasSent
        ? `📧 Receipt sent to "${clientEmail}".`
        : `The order is safely queued for Supabase sync. Email was not sent${emailResponse?.message ? `: ${emailResponse.message}` : '.'}`}`, 
      [
        {
          text: 'Return to Hub 🏠',
          style: 'default',
          onPress: () => {
            OrderStore.cart = [];
            router.push('/home');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button & Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.push('/visit')} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backText, { color: colors.cyan }]}>⬅️ Back to Catalog</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.mainText }]} numberOfLines={1}>
            🛒 CLIENT ORDER SUMMARY
          </Text>
        </View>

        {/* Verified Store Header Card */}
        <View style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
          <View style={styles.storeTitleRow}>
            <Text style={[styles.storeName, { color: colors.mainText }]} numberOfLines={1}>{client.name}</Text>
            <View style={styles.invBadge}>
              <Text style={styles.invBadgeText}>#{invoiceNumber}</Text>
            </View>
          </View>

          <Text style={[styles.storeSub, { color: colors.subText }]} numberOfLines={1}>📍 {client.address}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.photoBadge, { backgroundColor: '#064E3B', borderColor: colors.green }]}>
              <Text style={styles.photoBadgeText}>
                {client.checkInPhotoTaken ? '📸 Geotag Photo & Coordinates Attached ✓' : '📍 GPS Geotag Attached to Order ✓'}
              </Text>
            </View>
          </View>
        </View>

        {/* Look right here: LINE-BY-LINE CART CHECKLIST */}
        <Text style={[styles.sectionTitle, { color: colors.mainText }]}>
          LINE-BY-LINE CART CHECKLIST ({totalUnits} TOTAL UNITS)
        </Text>

        {cartItems.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🛒</Text>
            <Text style={[styles.emptyTitle, { color: colors.mainText }]}>Store Cart is Empty</Text>
            <Text style={[styles.emptySub, { color: colors.subText }]}>Tap `Back to Catalog` above to pick products for {client.name}.</Text>
          </View>
        ) : (
          cartItems.map((item) => (
            <View key={item.id} style={[styles.cartItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              
              <View style={styles.itemTopRow}>
                <View style={styles.itemTextWrapper}>
                  <Text style={[styles.itemName, { color: colors.mainText }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.itemMeta, { color: colors.subText }]}>
                    ₦{item.price.toLocaleString()} / unit • #{item.barcode}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => handleRemoveItem(item.id, item.name)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>🗑️ Remove</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.itemBottomRow, { borderTopColor: colors.border }]}>
                <View style={[styles.qtyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQtyChange(item.id, -1)}>
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.qtyNum, { color: colors.mainText }]}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQtyChange(item.id, 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.itemTotalText, { color: colors.green }]}>
                  ₦{(item.qty * item.price).toLocaleString()}
                </Text>
              </View>

            </View>
          ))
        )}

        {/* TRADE PROMOTION SELECTOR */}
        <Text style={[styles.sectionTitle, { color: colors.mainText, marginTop: 6 }]}>
          🎁 TRADE PROMOTIONS & BULK DISCOUNTS
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.amber, borderWidth: 1.5 }]}>
          <Text style={[styles.promoHint, { color: colors.subText }]}>Select eligible SFA trade promotion to apply to this invoice:</Text>
          <View style={styles.pillGrid}>
            {promoOptions.map((promo, idx) => {
              const active = appliedPromo === promo;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.payPill, { backgroundColor: active ? '#F59E0B' : colors.background, borderColor: active ? '#F59E0B' : colors.border }]}
                  onPress={() => setAppliedPromo(promo)}
                >
                  <Text style={[styles.payPillText, { color: active ? '#FFFFFF' : colors.subText }, active && { fontWeight: '900' }]}>
                    {promo} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* REQUESTED DELIVERY URGENCY */}
        <Text style={[styles.sectionTitle, { color: colors.mainText }]}>
          🚚 REQUESTED DELIVERY DISPATCH URGENCY
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.pillGrid}>
            {urgencyOptions.map((urg, idx) => {
              const active = deliveryUrgency === urg;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.payPill, { backgroundColor: active ? '#007AFF' : colors.background, borderColor: active ? '#007AFF' : colors.border }]}
                  onPress={() => setDeliveryUrgency(urg)}
                >
                  <Text style={[styles.payPillText, { color: active ? '#FFFFFF' : colors.subText }, active && { fontWeight: '900' }]}>
                    {urg} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PAYMENT CYCLE SELECTOR FOR THIS ORDER */}
        <Text style={[styles.sectionTitle, { color: colors.mainText }]}>
          💳 ASSIGNED PAYMENT TERM FOR THIS ORDER
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.pillGrid}>
            {paymentOptions.map((opt, idx) => {
              const active = paymentCycle === opt;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.payPill, { backgroundColor: active ? '#10B981' : colors.background, borderColor: active ? '#10B981' : colors.border }]}
                  onPress={() => setPaymentCycle(opt)}
                >
                  <Text style={[styles.payPillText, { color: active ? '#FFFFFF' : colors.subText }, active && { fontWeight: '900' }]}>
                    {opt} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Special Delivery Notes */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.notesHeader, { color: colors.cyan }]}>📝 SPECIAL DELIVERY NOTES / COMMENTS</Text>
          <TextInput 
            style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.mainText }]}
            placeholder="e.g. Deliver before Friday noon, customer requested extra display stand..."
            placeholderTextColor="#64748B"
            value={orderNotes}
            onChangeText={setOrderNotes}
          />
        </View>

      </ScrollView>

      {/* Look right right here: FIXED BOTTOM SUBMIT & DISCOUNT BREAKDOWN BAR */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.green }]}>
        <View style={styles.summaryBreakdownRow}>
          <View>
            <Text style={[styles.breakdownText, { color: colors.subText }]}>Subtotal: ₦{grandTotal.toLocaleString()}</Text>
            {discountAmount > 0 && (
              <Text style={[styles.breakdownText, { color: '#F59E0B', fontWeight: 'bold' }]}>
                Trade Promo: -₦{discountAmount.toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.grandRightBox}>
            <Text style={[styles.grandLabel, { color: colors.cyan }]}>FINAL PAYABLE ({totalUnits} UNITS):</Text>
            <Text style={[styles.grandAmount, { color: colors.green }]}>₦{finalPayableTotal.toLocaleString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, (cartItems.length === 0 || isEmailSending) && { backgroundColor: '#475569' }]}
          onPress={handleFinalSubmit}
          disabled={isEmailSending}
        >
          {isEmailSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              ⚡ SUBMIT & SEND AUTOMATED SERVER EMAIL (₦{finalPayableTotal.toLocaleString()}) ✓
            </Text>
          )}
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
    paddingBottom: 150,
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
  storeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    elevation: 3,
  },
  storeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '900',
    flexShrink: 1,
  },
  invBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  invBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '900',
  },
  storeSub: {
    fontSize: 12,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  photoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoBadgeText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyBox: {
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 18,
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
  cartItemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    elevation: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemTextWrapper: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: 11,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
  },
  qtyBtn: {
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyNum: {
    fontSize: 15,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'center',
  },
  itemTotalText: {
    fontSize: 17,
    fontWeight: '900',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  promoHint: {
    fontSize: 11,
    marginBottom: 10,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  payPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  payPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesHeader: {
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
    paddingTop: 12,
    paddingBottom: 22,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  summaryBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownText: {
    fontSize: 11,
  },
  grandRightBox: {
    alignItems: 'flex-end',
  },
  grandLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  grandAmount: {
    fontSize: 20,
    fontWeight: '900',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
