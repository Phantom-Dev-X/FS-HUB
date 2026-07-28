import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import AdminFooter from './AdminFooter';

const threadIdOf = (msg) => String(msg.related_id || msg.relatedId || msg.id);

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await DatabaseEngine.getAdminMessages();
    setMessages((data || []).sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    setLoading(false);
    await DatabaseEngine.markAllAdminMessagesRead();
  };
  useEffect(() => { load(); }, []);

  const threads = useMemo(() => {
    const map = new Map();
    messages.forEach(msg => {
      const threadId = threadIdOf(msg);
      const current = map.get(threadId) || { threadId, messages: [] };
      current.messages.push(msg);
      current.original = current.original || messages.find(m => String(m.id) === threadId) || msg;
      map.set(threadId, current);
    });
    return Array.from(map.values()).map(thread => {
      const sorted = thread.messages.sort((a,b) => new Date(a.created_at||0)-new Date(b.created_at||0));
      const latest = sorted[sorted.length-1] || thread.original;
      const unread = sorted.some(m => !m.admin_read);
      return { ...thread, messages: sorted, latest, unread, title: thread.original?.title || latest?.title || 'Message Thread' };
    }).sort((a,b)=>new Date(b.latest?.created_at||0)-new Date(a.latest?.created_at||0));
  }, [messages]);

  const notifyRep = async ({ thread, title, body, status }) => {
    const original = thread.original || thread.latest;
    const repId = original.rep_id || original.repId;
    if (!repId) return Alert.alert('Missing Rep ID', 'Cannot send a direct reply without rep_id.');
    const sent = await DatabaseEngine.saveRepNotification({ repId, title, body, type: 'admin_reply', relatedId: thread.threadId });
    if (!sent.success) return Alert.alert('Reply Failed', sent.error || 'Run SQL repair for notifications table.');
    if (status) await DatabaseEngine.updateAdminMessageStatus(thread.threadId, status);
    await load();
    return true;
  };

  const markProgress = async (thread) => {
    const original = thread.original || thread.latest;
    const body = `HQ has received your ${original.type === 'restock_request' ? 'restock request' : 'message'} and marked it as In Progress. We will update you soon.`;
    const ok = await notifyRep({ thread, title: `In Progress: ${thread.title}`, body, status: 'In Progress' });
    if (ok) Alert.alert('Marked In Progress', `Default reply sent to ${original.rep_id}.`);
  };

  const openReply = (thread) => { setReplyTarget(thread); setReplyText(`Hello ${thread.original?.rep_name || thread.original?.rep_id || 'Officer'},\n\n`); };
  const sendReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setSending(true);
    const ok = await notifyRep({ thread: replyTarget, title: `Reply: ${replyTarget.title}`, body: replyText.trim(), status: 'Replied' });
    setSending(false);
    if (ok) { setReplyTarget(null); setReplyText(''); Alert.alert('Reply Sent', `Reply sent to ${replyTarget.original?.rep_id}.`); }
  };

  const deleteThread = async (thread) => {
    Alert.alert('Delete Thread?', 'This deletes the full conversation from the database for rep and admin.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Thread', style: 'destructive', onPress: async () => { const res = await DatabaseEngine.deleteMessageThread(thread.threadId); if (!res.success) return Alert.alert('Delete Failed', res.error || 'Could not delete thread.'); await load(); } }
    ]);
  };

  return <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={() => router.replace('/admin')} style={styles.backBtn}><Ionicons name="arrow-back" size={16} color="#2563EB"/><Text style={styles.backText}> Admin</Text></TouchableOpacity><Text style={styles.title}>💬 Messages & Requests</Text><Text style={styles.sub}>One conversation per rep request/message.</Text></View><ScrollView contentContainerStyle={styles.scroll}>{loading ? <Loading/> : threads.length === 0 ? <Empty/> : threads.map(thread => <View key={thread.threadId} style={[styles.card, thread.unread && styles.unread, { borderLeftColor: thread.original?.priority === 'Critical' ? '#EF4444' : thread.original?.priority === 'Urgent' ? '#F59E0B' : '#2563EB' }]}><View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={1}>{thread.title}</Text><Text style={styles.priority}>{thread.original?.priority || 'Normal'}</Text></View><Text style={styles.meta}>👤 {thread.original?.rep_name || 'Field Officer'} • {thread.original?.rep_id || 'UNKNOWN'} • {thread.messages.length} msg(s)</Text><Text style={styles.body}>{thread.latest?.body}</Text><Text style={styles.meta}>Status: {thread.original?.status || 'Open'} • {thread.latest?.created_at ? new Date(thread.latest.created_at).toLocaleString() : 'Now'}</Text><View style={styles.actions}><TouchableOpacity style={styles.replyBtn} onPress={() => openReply(thread)}><Text style={styles.replyText}>Reply</Text></TouchableOpacity><TouchableOpacity style={styles.progressBtn} onPress={() => markProgress(thread)}><Text style={styles.progressText}>Mark In Progress</Text></TouchableOpacity><TouchableOpacity style={styles.deleteBtn} onPress={() => deleteThread(thread)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity></View></View>)}</ScrollView><ReplyModal target={replyTarget} text={replyText} setText={setReplyText} loading={sending} onClose={() => setReplyTarget(null)} onSubmit={sendReply}/><AdminFooter/></SafeAreaView>;
}
function Loading(){return <View style={styles.empty}><ActivityIndicator color="#2563EB"/><Text style={styles.emptySub}>Loading messages...</Text></View>}
function Empty(){return <View style={styles.empty}><Text style={{fontSize:40}}>💬</Text><Text style={styles.emptyTitle}>No Messages</Text><Text style={styles.emptySub}>Rep custom messages and restock requests will show here.</Text></View>}
function ReplyModal({target,text,setText,loading,onClose,onSubmit}){return <Modal visible={Boolean(target)} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.sheet}><View style={styles.handle}/><View style={styles.sheetHead}><Text style={styles.sheetTitle}>Reply to {target?.original?.rep_id || 'Rep'}</Text><TouchableOpacity onPress={onClose} style={styles.close}><Ionicons name="close" size={18} color="#64748B"/></TouchableOpacity></View><Text style={styles.inputLabel}>MESSAGE</Text><TextInput style={styles.input} multiline textAlignVertical="top" value={text} onChangeText={setText} placeholder="Type admin reply..."/><TouchableOpacity style={[styles.sendBtn,loading&&{backgroundColor:'#94A3B8'}]} onPress={onSubmit} disabled={loading}>{loading?<ActivityIndicator color="#FFF"/>:<Text style={styles.sendText}>SEND REPLY TO EXACT REP</Text>}</TouchableOpacity></View></View></Modal>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,paddingBottom:8,backgroundColor:'#EFF6FF'},backBtn:{flexDirection:'row',alignSelf:'flex-start',backgroundColor:'#FFF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,paddingHorizontal:12,paddingVertical:8,alignItems:'center',marginBottom:12},backText:{color:'#2563EB',fontSize:12,fontWeight:'900'},title:{color:'#1E3A8A',fontSize:24,fontWeight:'900'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderRadius:16,padding:15,marginBottom:12},unread:{backgroundColor:'#F8FBFF'},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10},cardTitle:{flex:1,color:'#0F172A',fontSize:14,fontWeight:'900'},priority:{color:'#92400E',backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#FDE68A',borderRadius:999,paddingHorizontal:8,paddingVertical:4,fontSize:10,fontWeight:'900',overflow:'hidden'},meta:{color:'#64748B',fontSize:11,lineHeight:16,marginTop:6},body:{color:'#334155',fontSize:12,lineHeight:18,marginTop:8},actions:{flexDirection:'row',gap:8,marginTop:12},replyBtn:{flex:1,backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:10,paddingVertical:10,alignItems:'center'},replyText:{color:'#2563EB',fontSize:11,fontWeight:'900'},progressBtn:{flex:1,backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A',borderRadius:10,paddingVertical:10,alignItems:'center'},progressText:{color:'#D97706',fontSize:11,fontWeight:'900'},deleteBtn:{flex:0.8,backgroundColor:'#FEF2F2',borderWidth:1,borderColor:'#FECACA',borderRadius:10,paddingVertical:10,alignItems:'center'},deleteText:{color:'#DC2626',fontSize:11,fontWeight:'900'},empty:{backgroundColor:'#FFF',borderRadius:20,padding:26,borderWidth:1,borderColor:'#DBEAFE',alignItems:'center'},emptyTitle:{color:'#1E3A8A',fontSize:16,fontWeight:'900',marginTop:8},emptySub:{color:'#64748B',textAlign:'center',fontSize:12,marginTop:6},modalOverlay:{flex:1,backgroundColor:'rgba(15,23,42,.45)',justifyContent:'flex-end'},sheet:{backgroundColor:'#FFF',borderTopLeftRadius:28,borderTopRightRadius:28,padding:18},handle:{width:44,height:5,borderRadius:999,backgroundColor:'#CBD5E1',alignSelf:'center',marginBottom:14},sheetHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},sheetTitle:{color:'#0F172A',fontSize:18,fontWeight:'900'},close:{width:34,height:34,borderRadius:12,backgroundColor:'#F1F5F9',alignItems:'center',justifyContent:'center'},inputLabel:{color:'#64748B',fontSize:10,fontWeight:'900',marginBottom:6},input:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',borderRadius:12,padding:12,minHeight:140,textAlignVertical:'top'},sendBtn:{backgroundColor:'#2563EB',borderRadius:14,paddingVertical:14,alignItems:'center',marginTop:12},sendText:{color:'#FFF',fontSize:12,fontWeight:'900'}});
