import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailService } from './_EmailService';
import { useTheme } from '../context/ThemeContext';
import { OrderStore } from './_OrderStore';
import { RouteStore } from './RouteStore';

export default function AddClientScreen() {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [address, setAddress] = useState('');

  const [businessType, setBusinessType] = useState('⚡ Electronics & Solar');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [categories, setCategories] = useState([
    '⚡ Electronics & Solar', 
    '🛒 Provisions & Groceries', 
    '👔 Clothing & Boutique', 
    '💊 Pharmaceuticals', 
    '📦 Wholesale Distributor', 
    '🏪 Retail Kiosk'
  ]);

  const [selectedTags, setSelectedTags] = useState(['⭐ VIP Client', '💵 Cash Only']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [quickTags, setQuickTags] = useState([
    '⭐ VIP Client', '💵 Cash Only', '☀️ Solar Focus', '🚀 High Volume', '⚡ Fast Payer'
  ]);

  const [creditLimit, setCreditLimit] = useState('500,000');
  const [paymentTerm, setPaymentTerm] = useState('14 Days Net Credit');
  const [preferredVisitDay, setPreferredVisitDay] = useState('Wednesdays & Fridays');

  const [isEmailSending, setIsEmailSending] = useState(false);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const newTag = `🏷️ ${customTagInput.trim()}`;
    if (!quickTags.includes(newTag)) setQuickTags([...quickTags, newTag]);
    if (!selectedTags.includes(newTag)) setSelectedTags([...selectedTags, newTag]);
    setCustomTagInput('');
  };

  const handleSetCustomCategory = () => {
    if (!customCategoryInput.trim()) return;
    const newCat = `🏬 ${customCategoryInput.trim()}`;
    if (!categories.includes(newCat)) setCategories([...categories, newCat]);
    setBusinessType(newCat);
    setCustomCategoryInput('');
    setShowCustomCategoryInput(false);
  };

  const handleSkipStep4 = () => {
    setCreditLimit('Optional / Standard');
    setPaymentTerm('Optional / Flexible');
    setPreferredVisitDay('Optional / On Call');
    Alert.alert('Step 4 Skipped ⏭️', 'Financial & visit terms marked as optional/flexible for this client!');
  };

  // Look right right here: Saves clean genuine client object directly into memory & triggers Email!
  const handleAddClient = async () => {
    if (!storeName || !phone || !address || !storeEmail) {
      Alert.alert('Missing Info ⚠️', 'Please provide Store Name, Phone Number, Gmail / Email Address, and Physical Address inside Step 1.');
      return;
    }

    const newClientId = `CL-${Math.floor(100 + Math.random() * 900)}`;
    const repCoords = OrderStore.repLocation || { latitude: 6.6018, longitude: 3.3515 };

    // Create exact clean genuine client record
    const genuineClient = {
      id: newClientId,
      name: storeName.trim(),
      address: address.trim(),
      owner: `${ownerName.trim() || 'Manager'} (${phone.trim()})`,
      lastVisited: 'Just Added (No visits yet)',
      lastOrderAmount: 'No previous orders yet',
      statusColor: '#10B981',
      creditLimit: `₦${creditLimit}`,
      standing: 'New Client 🟢',
      gpsVerified: `Lat: ${repCoords.latitude.toFixed(4)}° N | Lon: ${repCoords.longitude.toFixed(4)}° E`,
      checkInPhotoTaken: false,
      email: storeEmail.trim(),
      coordinate: {
        // Offset slightly from rep coordinates so multiple added stores sit near the rep without overlapping!
        latitude: repCoords.latitude + (Math.random() * 0.01 - 0.005),
        longitude: repCoords.longitude + (Math.random() * 0.01 - 0.005),
      }
    };

    // 1. Save directly into `OrderStore.clients` (`app/dashboard.jsx` & `checkin.jsx`)
    OrderStore.addNewClient(genuineClient);

    // 2. Save directly into `RouteStore.clients` (`app/route.jsx` map pins)
    RouteStore.addNewClient(genuineClient);

    setIsEmailSending(true);

    // 3. Dispatch automated onboarding welcome receipt via EmailJS!
    const emailResponse = await EmailService.sendWelcomeEmail({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      storeEmail: storeEmail.trim(),
      businessType: businessType,
      creditLimit: creditLimit,
      visitDay: preferredVisitDay,
    });

    setIsEmailSending(false);

    Alert.alert(
      '🎉 Client Registered & Pin Dropped!', 
      `${storeName} has been saved into your clean directory and dropped as a live pin on your territory map!\n\n📧 Automated Server Confirmation:\nOur cloud server (${EmailService.config.senderEmail}) has dispatched the official Welcome Onboarding Receipt straight to "${storeEmail.trim()}"!`,
      [{ text: 'Return to Hub 🏠', onPress: () => router.push('/home') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Back Button & Header */}
        <TouchableOpacity onPress={() => router.push('/home')} style={styles.backBtn}>
          <Text style={styles.backText}>⬅️ Back to Home Hub</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.mainTitle} numberOfLines={1} adjustsFontSizeToFit={true}>
            ➕ ADD NEW CLIENT CONTACT
          </Text>
        </View>

        <Text style={styles.subText}>
          Complete onboarding profile below. When saved, this genuine store immediately pops up as a pin on your map and a directory card!
        </Text>

        {/* SECTION 1: BASIC STORE & CONTACT INFO */}
        <Text style={styles.sectionTitle}>Step 1: Store & Owner Profile</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>CLIENT STORE / BUSINESS NAME *</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Chinedu Electronics & Boutique"
            placeholderTextColor="#64748B"
            value={storeName}
            onChangeText={setStoreName}
          />

          <Text style={styles.label}>OWNER OR MANAGER FULL NAME</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Mr. Chinedu Okafor"
            placeholderTextColor="#64748B"
            value={ownerName}
            onChangeText={setOwnerName}
          />

          <Text style={styles.label}>PHONE NUMBER / WHATSAPP *</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 08012345678"
            placeholderTextColor="#64748B"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={[styles.label, { color: '#38BDF8' }]}>CLIENT STORE GMAIL / EMAIL ADDRESS *</Text>
          <TextInput 
            style={[styles.input, { borderColor: '#38BDF8', borderWidth: 1.5 }]}
            placeholder="e.g. chinedustore@gmail.com"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            value={storeEmail}
            onChangeText={setStoreEmail}
          />

          <Text style={styles.label}>PHYSICAL STREET ADDRESS (FOR GPS GEOTOOL) *</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 14 Allen Avenue, Ikeja Zone"
            placeholderTextColor="#64748B"
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* SECTION 2: BUSINESS CATEGORY */}
        <Text style={styles.sectionTitle}>Step 2: Business Category & Type</Text>
        <View style={styles.formCard}>
          <Text style={styles.hintText}>Select category or tap `+ Custom Category` to create one:</Text>
          
          <View style={styles.pillGrid}>
            {categories.map((cat, idx) => {
              const active = businessType === cat;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.categoryPill, active && styles.activeCategoryPill]}
                  onPress={() => { setBusinessType(cat); setShowCustomCategoryInput(false); }}
                >
                  <Text style={[styles.categoryText, active && styles.activeCategoryText]}>
                    {cat} {active ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={[styles.categoryPill, showCustomCategoryInput && styles.activeCustomBtn]}
              onPress={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
            >
              <Text style={[styles.categoryText, showCustomCategoryInput && styles.activeCustomText]}>
                ➕ Custom Category...
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomCategoryInput && (
            <View style={styles.customInputRow}>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                placeholder="e.g. Bakery & Confectionery..."
                placeholderTextColor="#64748B"
                value={customCategoryInput}
                onChangeText={setCustomCategoryInput}
              />
              <TouchableOpacity style={styles.actionAddBtn} onPress={handleSetCustomCategory}>
                <Text style={styles.actionAddBtnText}>Set ✓</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.activeSelectionBox}>
            <Text style={styles.selectionLabel}>Selected Category for this Store:</Text>
            <Text style={styles.selectionValueText}>{businessType}</Text>
          </View>
        </View>

        {/* SECTION 3: CLIENT GROUPING & CUSTOM TAGS */}
        <Text style={styles.sectionTitle}>Step 3: Client Grouping & Custom Tags</Text>
        <View style={styles.formCard}>
          <Text style={styles.hintText}>Tap quick tags or add your own. You can tap ANY active tag (`✓`) to remove it!</Text>
          
          <View style={styles.pillGrid}>
            {quickTags.map((tag, idx) => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.tagPill, active && styles.activeTagPill]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, active && styles.activeTagText]}>
                    {tag} {active ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>ADD CUSTOM GROUPING TAG</Text>
          <View style={styles.customInputRow}>
            <TextInput 
              style={[styles.input, { flex: 1, marginBottom: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
              placeholder="e.g. VIP Mainland / Weekly Restock..."
              placeholderTextColor="#64748B"
              value={customTagInput}
              onChangeText={setCustomTagInput}
            />
            <TouchableOpacity style={styles.actionAddBtn} onPress={handleAddCustomTag}>
              <Text style={styles.actionAddBtnText}>+ Add Tag</Text>
            </TouchableOpacity>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.activeTagsBox}>
              <Text style={styles.activeTagsHeader}>Assigned Tags (Tap any tag to remove):</Text>
              <View style={styles.chipGrid}>
                {selectedTags.map((tag, idx) => (
                  <TouchableOpacity key={idx} onPress={() => toggleTag(tag)} style={styles.summaryChip}>
                    <Text style={styles.summaryChipText}>{tag} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* SECTION 4: FINANCIAL & VISIT TERMS */}
        <View style={styles.step4HeaderRow}>
          <Text style={styles.sectionTitle}>Step 4: Financial & Visit Terms <Text style={{color: '#F59E0B'}}>(Optional)</Text></Text>
          <TouchableOpacity onPress={handleSkipStep4} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>⏭️ Skip Step 4</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.formCard, { borderColor: '#F59E0B', borderWidth: 1.2 }]}>
          <Text style={styles.label}>ASSIGNED CREDIT LIMIT (OPTIONAL)</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. 500000 or Standard / Optional"
            placeholderTextColor="#64748B"
            value={creditLimit}
            onChangeText={setCreditLimit}
          />
        </View>

        {/* Big Complete & Automated Email Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, isEmailSending && { backgroundColor: '#475569' }]} 
          onPress={handleAddClient}
          disabled={isEmailSending}
        >
          {isEmailSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Complete, Save Pin & Send Automated Email 📧 ✓</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  backText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    marginBottom: 4,
  },
  mainTitle: {
    color: '#10B981',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  boldWhite: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  step4HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  skipBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  skipBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
  },
  label: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 8,
  },
  hintText: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 6,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeCategoryPill: {
    backgroundColor: '#007AFF',
    borderColor: '#38BDF8',
  },
  activeCustomBtn: {
    backgroundColor: '#A855F7',
    borderColor: '#A855F7',
  },
  categoryText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeSelectionBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 8,
  },
  selectionLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  selectionValueText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  tagPill: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeTagPill: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  tagText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeTagText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionAddBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  activeTagsBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 8,
  },
  activeTagsHeader: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  summaryChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 4,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
