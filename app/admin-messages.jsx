import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import AdminFooter from './AdminFooter';

const threadIdOfMessage = (msg) => String(msg.related_id || msg.relatedId || msg.id);
const threadIdOfReply = (reply) => String(reply.related_id || reply.relatedId || reply.id);

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [adminReplies, setAdminReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, replies] = await Promise.all([
      DatabaseEngine.getAdminMessages(),
      DatabaseEngine.getAllRepNotifications(),
    ]);
    setMessages((data || []).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    setAdminReplies(replies || []);
    setLoading(false);
    await DatabaseEngine.markAllAdminMessagesRead();
  };

  useEffect(() => { load(); }, []);

  const threads = useMemo(() => {
    const map = new Map();

    messages.forEach(msg => {
      const threadId = threadIdOfMessage(msg);
      const current = map.get(threadId) || { threadId, repMessages: [], adminReplies: [] };
      current.repMessages.push(msg);
      current.original = current.original || messages.find(m => String(m.id) === threadId) || msg;
      map.set(threadId, current);
    });

    adminReplies.forEach(reply => {
      const threadId = threadIdOfReply(reply);
      const current = map.get(threadId) || { threadId, repMessages: [], adminReplies: [] };
      current.adminReplies.push(reply);
      map.set(threadId, current);
    });

    return Array.from(map.values()).map(thread => {
      const events = [
        ...thread.repMessages.map(item => ({ ...item, kind: 'rep', time: item.created_at })),
        ...thread.adminReplies.map(item => ({ ...item, kind: 'admin', time: item.created_at })),
      ].sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
      const latest = events[events.length - 1] || thread.original;
      const unread = thread.repMessages.some(msg => !msg.admin_read);
      return {
        ...thread,
        events,
        latest,
        unread,
        title: thread.original?.title || latest?.title || 'Message Thread',
        repId: thread.original?.rep_id || latest?.rep_id || latest?.repId || 'UNKNOWN',
        repName: thread.original?.rep_name || 'Field Officer',
        priority: thread.original?.priority || 'Normal',
        status: thread.original?.status || 'Open',
      };
    }).sort((a, b) => new Date(b.latest?.time || b.latest?.created_at || 0) - new Date(a.latest?.time || a.latest?.created_at || 0));
  }, [messages, adminReplies]);

  const notifyRep = async ({ thread, title, body, status }) => {
    const repId = thread.repId;
    if (!repId || repId === 'UNKNOWN') return Alert.alert('Missing Rep ID', 'Cannot send a direct reply without rep_id.');
    const sent = await DatabaseEngine.saveRepNotification({ repId, title, body, type: 'admin_reply', relatedId: thread.threadId });
    if (!sent.success) return Alert.alert('Reply Failed', sent.error || 'Run SQL repair for notifications table.');
    if (status) await DatabaseEngine.updateAdminMessageStatus(thread.threadId, status);
    await load();
    return true;
  };

  const markProgress = async (thread) => {
    const originalType = thread.original?.type;
    const body = `HQ has received your ${originalType === 'restock_request' ? 'restock request' : 'message'} and marked it as In Progress. We will update you soon.`;
    const ok = await notifyRep({ thread, title: `In Progress: ${thread.title}`, body, status: 'In Progress' });
    if (ok) Alert.alert('Marked In Progress', `Default reply sent to ${thread.repId}.`);
  };

  const openThread = async (thread) => {
    const unread = thread.repMessages.filter(msg => !msg.admin_read);
    if (unread.length) {
      await Promise.all(unread.map(msg => DatabaseEngine.markAdminMessageRead(msg.id)));
      setMessages(prev => prev.map(msg => thread.threadId === threadIdOfMessage(msg) ? { ...msg, admin_read: true } : msg));
    }
    setSelectedThread(thread);
    setReplyText(`Hello ${thread.repName || thread.repId || 'Officer'},\n\n`);
  };

  const sendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    const ok = await notifyRep({ thread: selectedThread, title: `Reply: ${selectedThread.title}`, body: replyText.trim(), status: 'Replied' });
    setSending(false);
    if (ok) {
      setReplyText('');
      const refreshed = await DatabaseEngine.getAllRepNotifications();
      setAdminReplies(refreshed || []);
      setSelectedThread(prev => prev ? {
        ...prev,
        adminReplies: [...prev.adminReplies, { id: `local-${Date.now()}`, related_id: prev.threadId, title: `Reply: ${prev.title}`, body: replyText.trim(), created_at: new Date().toISOString(), kind: 'admin' }],
        events: [...prev.events, { id: `local-${Date.now()}`, kind: 'admin', body: replyText.trim(), time: new Date().toISOString() }]
      } : prev);
      Alert.alert('Reply Sent', `Reply sent to ${selectedThread.repId}.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/admin')} style={styles.backBtn}><Ionicons name="arrow-back" size={16} color="#2563EB"/><Text style={styles.backText}> Admin</Text></TouchableOpacity>
        <Text style={styles.title}>💬 Messages & Requests</Text>
        <Text style={styles.sub}>One conversation per rep request/message.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <Loading/> : threads.length === 0 ? <Empty/> : threads.map(thread => (
          <TouchableOpacity key={thread.threadId} style={[styles.card, thread.unread && styles.unread, { borderLeftColor: thread.priority === 'Critical' ? '#EF4444' : thread.priority === 'Urgent' ? '#F59E0B' : '#2563EB' }]} onPress={() => openThread(thread)}>
            <View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={1}>{thread.title}</Text><Text style={styles.priority}>{thread.priority}</Text></View>
            <Text style={styles.meta}>👤 {thread.repName} • {thread.repId} • {thread.events.length} msg(s)</Text>
            <Text style={styles.body} numberOfLines={2}>{thread.latest?.body}</Text>
            <Text style={styles.meta}>Status: {thread.status} • {thread.latest?.time ? new Date(thread.latest.time).toLocaleString() : 'Now'}</Text>
            {thread.unread && <View style={styles.newBadge}><Text style={styles.newBadgeText}>New rep message</Text></View>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={Boolean(selectedThread)} transparent animationType="slide" onRequestClose={() => setSelectedThread(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.handle}/>
            <View style={styles.sheetHead}><Text style={styles.sheetTitle} numberOfLines={1}>{selectedThread?.title || 'Thread'}</Text><TouchableOpacity onPress={() => setSelectedThread(null)} style={styles.close}><Ionicons name="close" size={18} color="#64748B"/></TouchableOpacity></View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {selectedThread?.events.map((event, index) => (
                <View key={`${event.kind}-${event.id || index}`} style={event.kind === 'admin' ? styles.adminBubble : styles.repBubble}>
                  <Text style={styles.bubbleLabel}>{event.kind === 'admin' ? 'Admin' : selectedThread.repName}</Text>
                  <Text style={styles.bubbleBody}>{event.body}</Text>
                  <Text style={styles.bubbleMeta}>{event.time ? new Date(event.time).toLocaleString() : ''}</Text>
                </View>
              ))}
            </ScrollView>
            <TextInput style={styles.input} multiline textAlignVertical="top" value={replyText} onChangeText={setReplyText} placeholder="Type admin reply..."/>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.replyBtn} onPress={sendReply} disabled={sending || !replyText.trim()}>{sending ? <ActivityIndicator color="#FFF"/> : <Text style={styles.replyText}>Send Reply</Text>}</TouchableOpacity>
              <TouchableOpacity style={styles.progressBtn} onPress={() => selectedThread && markProgress(selectedThread)}><Text style={styles.progressText}>Mark In Progress</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AdminFooter/>
    </SafeAreaView>
  );
}

function Loading(){return <View style={styles.empty}><ActivityIndicator color="#2563EB"/><Text style={styles.emptySub}>Loading messages...</Text></View>}
function Empty(){return <View style={styles.empty}><Text style={{fontSize:40}}>💬</Text><Text style={styles.emptyTitle}>No Messages</Text><Text style={styles.emptySub}>Rep custom messages and restock requests will show here.</Text></View>}

const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,paddingBottom:8,backgroundColor:'#EFF6FF'},backBtn:{flexDirection:'row',alignSelf:'flex-start',backgroundColor:'#FFF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,paddingHorizontal:12,paddingVertical:8,alignItems:'center',marginBottom:12},backText:{color:'#2563EB',fontSize:12,fontWeight:'900'},title:{color:'#1E3A8A',fontSize:24,fontWeight:'900'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderRadius:16,padding:15,marginBottom:12},unread:{backgroundColor:'#F8FBFF'},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10},cardTitle:{flex:1,color:'#0F172A',fontSize:14,fontWeight:'900'},priority:{color:'#92400E',backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FDE68A',borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:10,fontWeight:'900',overflow:'hidden'},meta:{color:'#64748B',fontSize:11,lineHeight:16,marginTop:6},body:{color:'#334155',fontSize:12,lineHeight:18,marginTop:8},newBadge:{alignSelf:'flex-start',backgroundColor:'#FEE2E2',borderRadius:999,paddingHorizontal:9,paddingVertical:4,marginTop:10},newBadgeText:{color:'#DC2626',fontSize:10,fontWeight:'900'},empty:{backgroundColor:'#FFF',borderRadius:20,padding:26,borderWidth:1,borderColor:'#DBEAFE',alignItems:'center'},emptyTitle:{color:'#1E3A8A',fontSize:16,fontWeight:'900',marginTop:8},emptySub:{color:'#64748B',textAlign:'center',fontSize:12,marginTop:6},modalOverlay:{flex:1,backgroundColor:'rgba(15,23,42,.45)',justifyContent:'flex-end'},sheet:{backgroundColor:'#FFF',borderTopLeftRadius:28,borderTopRightRadius:28,padding:18,maxHeight:'86%'},handle:{width:44,height:5,borderRadius:999,backgroundColor:'#CBD5E1',alignSelf:'center',marginBottom:14},sheetHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},sheetTitle:{flex:1,color:'#0F172A',fontSize:18,fontWeight:'900',marginRight:10},close:{width:34,height:34,borderRadius:12,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},repBubble:{alignSelf:'flex-start',maxWidth:'88%',backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:16,padding:12,marginBottom:10},adminBubble:{alignSelf:'flex-end',maxWidth:'88%',backgroundColor:'#ECFDF5',borderWidth:1,borderColor:'#BBF7D0',borderRadius:16,padding:12,marginBottom:10},bubbleLabel:{color:'#64748B',fontSize:10,fontWeight:'900',marginBottom:4},bubbleBody:{color:'#334155',fontSize:12,lineHeight:18},bubbleMeta:{color:'#64748B',fontSize:9,marginTop:6},input:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',borderRadius:12,padding:12,minHeight:84,textAlignVertical:'top'},actions:{flexDirection:'row',gap:8,marginTop:12},replyBtn:{flex:1,backgroundColor:'#2563EB',borderRadius:12,paddingVertical:12,alignItems:'center'},replyText:{color:'#FFF',fontSize:12,fontWeight:'900'},progressBtn:{flex:1,backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A',borderRadius:12,paddingVertical:12,alignItems:'center'},progressText:{color:'#D97706',fontSize:12,fontWeight:'900'}});
