import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmartFooter from './SmartFooter';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

const HIDDEN_KEY = '@fshub_hidden_notification_threads';

const getMessageId = (item) => String(item.id || item.related_id || item.relatedId || Math.random());

export default function NotificationsScreen() {
  const [replies, setReplies] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const session = await DatabaseEngine.getSession();
    const id = session?.id || OrderStore.currentAgent?.id;
    setRepId(id || '');
    if (!id || id === 'REP-GUEST') {
      setReplies([]);
      setSentMessages([]);
      setLoading(false);
      return;
    }

    const [repReplies, repMessages, hiddenRaw] = await Promise.all([
      DatabaseEngine.getRepNotifications(id),
      DatabaseEngine.getAdminMessagesByRep(id),
      AsyncStorage.getItem(HIDDEN_KEY),
    ]);

    let hidden = [];
    try { hidden = hiddenRaw ? JSON.parse(hiddenRaw) : []; } catch {}
    setHiddenIds(Array.isArray(hidden) ? hidden : []);
    setReplies(Array.isArray(repReplies) ? repReplies : []);
    setSentMessages(Array.isArray(repMessages) ? repMessages : []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const inboxItems = useMemo(() => {
    const sent = sentMessages.map(msg => ({
      ...msg,
      __kind: 'sent',
      __threadId: getMessageId(msg),
      __title: msg.title,
      __body: msg.body,
      __time: msg.created_at,
      __unread: false,
    }));
    const received = replies.map(reply => ({
      ...reply,
      __kind: 'reply',
      __threadId: String(reply.related_id || reply.relatedId || reply.id),
      __title: reply.title,
      __body: reply.body,
      __time: reply.created_at,
      __unread: !reply.read,
    }));

    return [...sent, ...received]
      .filter(item => !hiddenIds.includes(`${item.__kind}:${item.id}`) && !hiddenIds.includes(`thread:${item.__threadId}`))
      .sort((a, b) => new Date(b.__time || 0) - new Date(a.__time || 0));
  }, [sentMessages, replies, hiddenIds]);

  const unreadCount = replies.filter(n => !n.read && !hiddenIds.includes(`reply:${n.id}`)).length;

  const openThread = async (item) => {
    if (item.__kind === 'reply' && !item.read) {
      await DatabaseEngine.markRepNotificationRead(item.id);
      setReplies(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }
    setSelectedThread(item);
  };

  const hideItem = async (item) => {
    const key = `${item.__kind}:${item.id}`;
    const next = [...new Set([...hiddenIds, key])];
    setHiddenIds(next);
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    setSelectedThread(null);
  };

  const hideThread = async (threadId) => {
    const next = [...new Set([...hiddenIds, `thread:${threadId}`])];
    setHiddenIds(next);
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    setSelectedThread(null);
  };

  const selectedOriginal = selectedThread ? sentMessages.find(msg => String(msg.id) === String(selectedThread.__threadId)) : null;
  const selectedReplies = selectedThread ? replies.filter(reply => String(reply.related_id || reply.relatedId || reply.id) === String(selectedThread.__threadId)) : [];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
          <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount} Unread</Text></View>
        </View>

        <Text style={styles.title}>🔔 Notifications</Text>
        <Text style={styles.sub}>Your messages to admin and replies from HQ for {repId || 'your account'}.</Text>

        {loading ? (
          <View style={styles.emptyBox}><ActivityIndicator color="#2563EB" /><Text style={styles.emptySub}>Loading notifications...</Text></View>
        ) : inboxItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>🔕</Text>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptySub}>Your admin messages, restock requests, and replies will appear here like an inbox.</Text>
          </View>
        ) : inboxItems.map(item => (
          <TouchableOpacity key={`${item.__kind}-${item.id}`} style={[styles.card, item.__unread && styles.unreadCard]} onPress={() => openThread(item)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.__title}</Text>
              {item.__unread ? <View style={styles.dot} /> : <Text style={styles.kindPill}>{item.__kind === 'sent' ? 'Sent' : 'Reply'}</Text>}
            </View>
            <Text style={styles.cardBody} numberOfLines={2}>{item.__body}</Text>
            <Text style={styles.cardMeta}>{item.__kind === 'sent' ? 'Message to Admin' : 'Admin Reply'} • {item.__time ? new Date(item.__time).toLocaleString() : 'Now'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SmartFooter />

      <Modal visible={Boolean(selectedThread)} transparent animationType="slide" onRequestClose={() => setSelectedThread(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Message Thread</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedThread(null)}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {selectedOriginal ? (
                <View style={styles.threadSent}>
                  <Text style={styles.threadLabel}>You sent</Text>
                  <Text style={styles.threadTitle}>{selectedOriginal.title}</Text>
                  <Text style={styles.threadBody}>{selectedOriginal.body}</Text>
                  <Text style={styles.threadMeta}>{selectedOriginal.created_at ? new Date(selectedOriginal.created_at).toLocaleString() : ''}</Text>
                </View>
              ) : selectedThread ? (
                <View style={selectedThread.__kind === 'sent' ? styles.threadSent : styles.threadReply}>
                  <Text style={styles.threadLabel}>{selectedThread.__kind === 'sent' ? 'You sent' : 'Admin replied'}</Text>
                  <Text style={styles.threadTitle}>{selectedThread.__title}</Text>
                  <Text style={styles.threadBody}>{selectedThread.__body}</Text>
                </View>
              ) : null}

              {selectedReplies.map(reply => (
                <View key={reply.id} style={styles.threadReply}>
                  <Text style={styles.threadLabel}>Admin replied</Text>
                  <Text style={styles.threadTitle}>{reply.title}</Text>
                  <Text style={styles.threadBody}>{reply.body}</Text>
                  <Text style={styles.threadMeta}>{reply.created_at ? new Date(reply.created_at).toLocaleString() : ''}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => selectedThread && hideItem(selectedThread)}><Text style={styles.deleteText}>Delete This</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => selectedThread && hideThread(selectedThread.__threadId)}><Text style={styles.deleteText}>Delete Thread</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  scroll: { padding: 16, paddingTop: 14, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  backText: { color: '#2563EB', fontSize: 12, fontWeight: '900', marginLeft: 4 },
  badge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: '#2563EB', fontSize: 10, fontWeight: '900' },
  title: { fontSize: 23, fontWeight: '900', color: '#1E3A8A' },
  sub: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#CBD5E1' },
  unreadCard: { borderLeftColor: '#2563EB', backgroundColor: '#F8FBFF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '900' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  kindPill: { color: '#2563EB', backgroundColor: '#EFF6FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  cardBody: { color: '#334155', fontSize: 12, lineHeight: 18, marginTop: 7 },
  cardMeta: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 10 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 26, borderWidth: 1, borderColor: '#DBEAFE', alignItems: 'center', marginTop: 12 },
  emptyTitle: { color: '#1E3A8A', fontSize: 16, fontWeight: '900', marginTop: 8 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '82%' },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  threadSent: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 16, padding: 14, marginBottom: 10 },
  threadReply: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, padding: 14, marginBottom: 10 },
  threadLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  threadTitle: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  threadBody: { color: '#334155', fontSize: 12, lineHeight: 18, marginTop: 6 },
  threadMeta: { color: '#64748B', fontSize: 10, marginTop: 8 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: '#DC2626', fontWeight: '900', fontSize: 12 },
});
