import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';
import AdminFooter from './AdminFooter';
import RemoteImage from '../components/RemoteImage';

const toNumber = value => Number(String(value || '0').replace(/[^0-9]/g, '')) || 0;

export default function AdminCatalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('⚡ Solar & Power');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('50');
  const [photoUri, setPhotoUri] = useState(null);
  const [photoPath, setPhotoPath] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await DatabaseEngine.getCatalog();
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditing(null);
    setName('');
    setCategory('⚡ Solar & Power');
    setPrice('');
    setStock('50');
    setPhotoUri(null);
    setPhotoPath(null);
  };

  const chooseProductPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Gallery Permission', 'Allow gallery access to choose product photo.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  const takeProductPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Camera Permission', 'Allow camera access to take product photo.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim() || !price.trim()) return Alert.alert('Missing details', 'Name and price are required.');
    setSaving(true);

    const productId = editing?.id || `PRD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    let finalPhotoPath = photoPath;

    if (photoUri && !String(photoUri).startsWith('http') && !String(photoUri).includes('catalog/')) {
      const uploaded = await DatabaseEngine.uploadImage(photoUri, `catalog/${productId}/product.jpg`);
      if (!uploaded.success) {
        setSaving(false);
        return Alert.alert('Photo Upload Failed', uploaded.error || 'Could not upload product photo.');
      }
      finalPhotoPath = uploaded.path;
    }

    const payload = {
      name: name.trim(),
      category,
      price: toNumber(price),
      stock: toNumber(stock),
      image_path: finalPhotoPath,
      product_photo_path: finalPhotoPath,
    };

    const res = editing
      ? await DatabaseEngine.updateCatalogProduct(editing.id, payload)
      : await DatabaseEngine.addNewProductToCatalog({
        ...payload,
        id: productId,
        barcode: `84019${Math.floor(100000 + Math.random() * 900000)}`,
        status: payload.stock === 0 ? 'Out of Stock 🔴' : payload.stock < 10 ? 'Low Stock ⚠️' : 'In Stock 🟢'
      });

    setSaving(false);
    if (!res.success) return Alert.alert('Catalog Error', res.error || 'Could not save product.');
    OrderStore.catalog = await DatabaseEngine.getCatalog();
    reset();
    load();
    Alert.alert('Saved', 'Catalog updated successfully.');
  };

  const edit = item => {
    setEditing(item);
    setName(item.name || '');
    setCategory(item.category || '⚡ Solar & Power');
    setPrice(String(item.price || 0));
    setStock(String(item.stock || 0));
    setPhotoPath(item.image_path || item.product_photo_path || null);
    setPhotoUri(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>🏬 Catalog & Stock</Text><Text style={styles.sub}>Create products, upload photos, edit prices, and manage stock.</Text></View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editing ? 'Edit Product' : 'Add New Product'}</Text>
          <View style={styles.photoBox}>
            <RemoteImage path={photoUri || photoPath} style={styles.photoPreview}><Ionicons name="image-outline" size={34} color="#2563EB" /></RemoteImage>
            <View style={{ flex: 1 }}>
              <Text style={styles.photoTitle}>Product Photo</Text>
              <Text style={styles.photoSub}>Shows in Inventory Specs and Product Detail.</Text>
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoBtn} onPress={takeProductPhoto}><Text style={styles.photoBtnText}>Camera</Text></TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={chooseProductPhoto}><Text style={styles.photoBtnText}>Gallery</Text></TouchableOpacity>
              </View>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="Product name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
          <View style={styles.row}><TextInput style={[styles.input, { flex: 1 }]} placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} /><TextInput style={[styles.input, { flex: 1 }]} placeholder="Stock" keyboardType="numeric" value={stock} onChangeText={setStock} /></View>
          <TouchableOpacity style={[styles.saveBtn, saving && { backgroundColor: '#94A3B8' }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editing ? 'Update Product' : 'Add Product'}</Text>}</TouchableOpacity>
          {editing && <TouchableOpacity style={styles.cancelBtn} onPress={reset}><Text style={styles.cancelText}>Cancel Edit</Text></TouchableOpacity>}
        </View>
        {loading ? <ActivityIndicator color="#2563EB" /> : items.map(item => <View key={item.id} style={styles.card}><View style={styles.cardRow}><RemoteImage path={item.image_path || item.product_photo_path} style={styles.cardImage}><Ionicons name="cube-outline" size={24} color="#2563EB" /></RemoteImage><View style={{ flex: 1 }}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.category} • #{item.barcode}</Text></View></View><View style={styles.amountRow}><Text style={styles.price}>₦{Number(item.price || 0).toLocaleString()}</Text><Text style={styles.stock}>{item.stock} units</Text></View><TouchableOpacity style={styles.editBtn} onPress={() => edit(item)}><Text style={styles.editText}>Edit Product</Text></TouchableOpacity></View>)}
      </ScrollView>
      <AdminFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#EFF6FF' },
  title: { fontSize: 24, fontWeight: '900', color: '#1E3A8A' },
  sub: { color: '#64748B', fontSize: 12, marginTop: 4 },
  scroll: { padding: 16, paddingBottom: 95 },
  form: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 20, padding: 15, marginBottom: 14 },
  formTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  photoBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 12, marginBottom: 12 },
  photoPreview: { width: 92, height: 92, borderRadius: 16 },
  photoTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  photoSub: { color: '#64748B', fontSize: 11, lineHeight: 15, marginTop: 3 },
  photoActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photoBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  photoBtnText: { color: '#2563EB', fontSize: 11, fontWeight: '900' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 9 },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#2563EB', borderRadius: 14, padding: 14, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '900' },
  cancelBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#DC2626', fontWeight: '900' },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 15, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardImage: { width: 58, height: 58, borderRadius: 14 },
  name: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  meta: { fontSize: 11, color: '#64748B', marginTop: 4 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  price: { color: '#059669', fontSize: 16, fontWeight: '900' },
  stock: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  editBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
  editText: { color: '#2563EB', fontWeight: '900' }
});
