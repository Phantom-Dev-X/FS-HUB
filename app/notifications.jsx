import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SmartFooter from './SmartFooter';
import { DatabaseEngine } from './_DatabaseEngine';
import { CacheEngine } from './_CacheEngine';
import { OrderStore } from './_OrderStore';

const parsePayload = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try { return JSON.parse(payload); } catch { return {}; }
};

const threadIdOfMessage = (msg) => String(msg.related_id || msg.relatedId || msg.id);
const threadIdOfReply = (reply) => String(reply.related_id || reply.relatedId || reply.id);

export default function NotificationsScreen() {
  const [replies, setReplies] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repId, setRepId] = useState('');
  const [repName, setRepName] = useState('Field Officer');
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const session = await DatabaseEngine.getSession();
    const id = session?.id || OrderStore.currentAgent?.id;
    setRepId(id || '');
    setRepName(session?.name || OrderStore.currentAgent?.name || 'Field Officer');
    if (!id || id === 'REP-GUEST') {
      setReplies([]);
      setSentMessages([]);
      setLoading(false);
      return;
    }

    const cached = await CacheEngine.get('notifications_inbox', id, null);
    if (cached) {
      setReplies(Array.isArray(cached.replies) ? cached.replies : []);
      setSentMessages(Array.isArray(cached.sentMessages) ? cached.sentMessages : []);
      setLoading(false);
    }

    const [repReplies, repMessages] = await Promise.all([
      DatabaseEngine.getRepNotifications(id),
      DatabaseEngine.getAdminMessagesByRep(id),
    ]);

    const fresh = {
      replies: Array.isArray(repReplies) ? repReplies : [],
      sentMessages: Array.isArray(repMessages) ? repMessages : []
    };
    setReplies(fresh.replies);
    setSentMessages(fresh.sentMessages);
    await CacheEngine.set('notifications_inbox', id, fresh);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  const threads = useMemo(() => {
    const map = new Map();

    sentMessages.forEach(msg => {
      const threadId = threadIdOfMessage(msg);
      const current = map.get(threadId) || { threadId, sent: [], replies: [] };
      current.sent.push(msg);
      current.original = current.original || sentMessages.find(m => String(m.id) === threadId) || msg;
      map.set(threadId, current);
    });

    replies.forEach(reply => {
      const threadId = threadIdOfReply(reply);
      const current = map.get(threadId) || { threadId, sent: [], replies: [] };
      current.replies.push(reply);
      map.set(threadId, current);
    });

    return Array.from(map.values()).map(thread => {
      const events = [
        ...thread.sent.map(item => ({ ...item, kind: 'sent', time: item.created_at })),
        ...thread.replies.map(item => ({ ...item, kind: 'reply', time: item.created_at })),
      ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
      const latest = events[events.length - 1] || thread.original;
      const unread = thread.replies.some(reply => !reply.read);
      return { ...thread, events, latest, unread, title: thread.original?.title || latest?.title || 'Message Thread' };
    }).sort((a, b) => new Date(b.latest?.time || b.latest?.created_at || 0) - new Date(a.latest?.time || a.latest?.created_at || 0));
  }, [sentMessages, replies]);

  const unreadCount = threads.filter(thread => thread.unread).length;

  const openThread = async (thread) => {
    const unreadReplies = thread.replies.filter(reply => !reply.read);
    if (unreadReplies.length) {
      await Promise.all(unreadReplies.map(reply => DatabaseEngine.markRepNotificationRead(reply.id)));
      setReplies(prev => prev.map(reply => thread.threadId === threadIdOfReply(reply) ? { ...reply, read: true } : reply));
    }
    setSelectedThread(thread);
    setReplyBody('');
  };

  const sendReplyToAdmin = async () => {
    if (!selectedThread || !replyBody.trim()) return;
    setSendingReply(true);
    const original = selectedThread.original || selectedThread.sent[0] || {};
    const res = await DatabaseEngine.saveAdminMessage({
      repId,
      repName,
      type: 'rep_followup',
      title: `Re: ${original.title || selectedThread.title}`,
      body: replyBody.trim(),
      priority: original.priority || 'Normal',
      relatedId: selectedThread.threadId,
      payload: { source: 'rep_notification_thread_reply' }
    });
    setSendingReply(false);
    if (!res.success) return Alert.alert('Reply Failed', res.error || 'Could not send reply.');
    setReplyBody('');
    await loadNotifications();
    // reopen same thread with fresh messages
    setTimeout(() => {
      setSelectedThread(prev => prev ? { ...prev, sent: [...prev.sent, res.message], events: [...prev.events, { ...res.message, kind: 'sent', time: res.message.created_at }] } : prev);
    }, 50);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#DBEAFE', '#EFF6FF', '#FFFFFF']} style={styles.topGradient} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtn}>
            <Ionicons name="home-outline" size={16} color="#2563EB" />
            <Text style={styles.backText}> Home</Text>
          </TouchableOpacity>
          <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount} New</Text></View>
        </View>

        <Text style={styles.title}>🔔 Notifications</Text>
        <Text style={styles.sub}>One conversation per admin message/request, like an inbox thread.</Text>

        {loading ? (
          <View style={styles.emptyBox}><ActivityIndicator color="#2563EB" /><Text style={styles.emptySub}>Loading notifications...</Text></View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>🔕</Text>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptySub}>Your admin messages, restock requests, and replies will appear here.</Text>
          </View>
        ) : threads.map(thread => (
          <TouchableOpacity key={thread.threadId} style={[styles.card, thread.unread && styles.unreadCard]} onPress={() => openThread(thread)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>{thread.title}</Text>
              {thread.unread ? <View style={styles.dot} /> : <Text style={styles.kindPill}>{thread.events.length} msgs</Text>}
            </View>
            <Text style={styles.cardBody} numberOfLines={2}>{thread.latest?.body || 'No message body'}</Text>
            <Text style={styles.cardMeta}>{thread.latest?.kind === 'reply' ? 'Admin replied' : 'You sent'} • {thread.latest?.time ? new Date(thread.latest.time).toLocaleString() : 'Now'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <SmartFooter />

      <Modal visible={Boolean(selectedThread)} transparent animationType="slide" onRequestClose={() => setSelectedThread(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle} numberOfLines={1}>{selectedThread?.title || 'Message Thread'}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedThread(null)}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {selectedThread?.events.map((event, index) => {
                const payload = parsePayload(event.payload);
                return (
                  <View key={`${event.kind}-${event.id || index}`} style={event.kind === 'sent' ? styles.bubbleSent : styles.bubbleReply}>
                    <Text style={styles.threadLabel}>{event.kind === 'sent' ? 'You' : 'Admin'}</Text>
                    {event.kind === 'reply' && payload.quotedMessageText ? (
                      <View style={styles.quoteBox}>
                        <Text style={styles.quoteLabel}>Replying to</Text>
                        <Text style={styles.quoteText} numberOfLines={2}>{payload.quotedMessageText}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.threadBody}>{event.body}</Text>
                    <Text style={styles.threadMeta}>{event.time ? new Date(event.time).toLocaleString() : ''}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <TextInput
              style={styles.replyInput}
              value={replyBody}
              onChangeText={setReplyBody}
              placeholder="Reply to admin..."
              multiline
              textAlignVertical="top"
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sendBtn} onPress={sendReplyToAdmin} disabled={sendingReply || !replyBody.trim()}>
                {sendingReply ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>Send Reply</Text>}
              </TouchableOpacity>
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
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '86%' },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { flex: 1, color: '#0F172A', fontSize: 18, fontWeight: '900', marginRight: 10 },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  bubbleSent: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 16, padding: 12, marginBottom: 10 },
  bubbleReply: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, padding: 12, marginBottom: 10 },
  threadLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginBottom: 4 },
  quoteBox: { borderLeftWidth: 3, borderLeftColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)', borderRadius: 8, padding: 8, marginBottom: 7 },
  quoteLabel: { color: '#64748B', fontSize: 9, fontWeight: '900' },
  quoteText: { color: '#0F172A', fontSize: 11, fontWeight: '800', marginTop: 2 },
  threadBody: { color: '#334155', fontSize: 12, lineHeight: 18 },
  threadMeta: { color: '#64748B', fontSize: 9, marginTop: 6 },
  replyInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, minHeight: 70, marginTop: 8 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  sendBtn: { flex: 1, backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sendText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  deleteBtn: { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteText: { color: '#DC2626', fontWeight: '900', fontSize: 12 },
});
