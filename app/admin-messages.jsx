import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { DatabaseEngine } from './_DatabaseEngine';
import AdminFooter from './AdminFooter';

const parsePayload = (payload) => {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try { return JSON.parse(payload); } catch { return {}; }
};

const getCategory = (msg) => {
  const type = String(msg.type || '').toLowerCase();
  const text = `${msg.title || ''} ${msg.body || ''}`.toLowerCase();
  if (type.includes('restock') || text.includes('restock') || text.includes('stock')) return 'restock';
  if (type.includes('complaint') || type.includes('support') || text.includes('complaint') || text.includes('issue') || text.includes('problem') || text.includes('customer')) return 'support';
  return 'custom';
};

const categoryMeta = {
  restock: { title: 'Restock Requests', emoji: '📦', color: '#F59E0B' },
  support: { title: 'Complaints & Support', emoji: '🛟', color: '#EF4444' },
  custom: { title: 'Custom Messages', emoji: '💬', color: '#2563EB' },
};

const eventTime = (event) => event.time || event.created_at || '';

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [adminReplies, setAdminReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRep, setSelectedRep] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [data, replies] = await Promise.all([
      DatabaseEngine.getAdminMessages(),
      DatabaseEngine.getAllRepNotifications(),
    ]);
    setMessages(data || []);
    setAdminReplies(replies || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const repGroups = useMemo(() => {
    const map = new Map();
    messages.forEach(msg => {
      const repId = msg.rep_id || msg.repId || 'UNKNOWN';
      const current = map.get(repId) || { repId, repName: msg.rep_name || 'Field Officer', messages: [] };
      current.messages.push(msg);
      current.repName = current.repName || msg.rep_name || 'Field Officer';
      map.set(repId, current);
    });
    return Array.from(map.values()).map(group => {
      const unread = group.messages.filter(msg => !msg.admin_read).length;
      const latest = [...group.messages].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
      const counts = { restock: 0, support: 0, custom: 0 };
      group.messages.forEach(msg => counts[getCategory(msg)]++);
      return { ...group, unread, latest, counts };
    }).sort((a,b)=>new Date(b.latest?.created_at||0)-new Date(a.latest?.created_at||0));
  }, [messages]);

  const selectedRepGroup = selectedRep ? repGroups.find(group => group.repId === selectedRep.repId) : null;
  const categoryMessages = useMemo(() => {
    if (!selectedRepGroup || !selectedCategory) return [];
    return selectedRepGroup.messages.filter(msg => getCategory(msg) === selectedCategory);
  }, [selectedRepGroup, selectedCategory]);

  const conversationEvents = useMemo(() => {
    const ids = new Set(categoryMessages.map(msg => String(msg.id)));
    const repEvents = categoryMessages.map(msg => ({ ...msg, kind: 'rep', time: msg.created_at, category: getCategory(msg) }));
    const adminEvents = adminReplies
      .filter(reply => ids.has(String(reply.related_id || reply.relatedId)))
      .map(reply => ({ ...reply, kind: 'admin', time: reply.created_at, payload: parsePayload(reply.payload) }));
    return [...repEvents, ...adminEvents].sort((a,b)=>new Date(eventTime(a)||0)-new Date(eventTime(b)||0));
  }, [categoryMessages, adminReplies]);

  const openRep = (group) => {
    setSelectedRep(group);
    setSelectedCategory(null);
    setQuotedMessage(null);
  };

  const openCategory = async (category) => {
    setSelectedCategory(category);
    setQuotedMessage(null);
    const unread = (selectedRepGroup?.messages || []).filter(msg => getCategory(msg) === category && !msg.admin_read);
    if (unread.length) {
      await Promise.all(unread.map(msg => DatabaseEngine.markAdminMessageRead(msg.id)));
      setMessages(prev => prev.map(msg => unread.some(u => u.id === msg.id) ? { ...msg, admin_read: true } : msg));
    }
  };

  const notifyRep = async ({ title, body, status }) => {
    const target = quotedMessage || [...categoryMessages].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
    if (!selectedRep || !target) return Alert.alert('Select Message', 'Tap the exact rep message you want to reply to.');
    setSending(true);
    const sent = await DatabaseEngine.saveRepNotification({
      repId: selectedRep.repId,
      title,
      body,
      type: 'admin_reply',
      relatedId: target.id,
      payload: {
        category: selectedCategory,
        quotedMessageId: target.id,
        quotedMessageTitle: target.title,
        quotedMessageText: target.body,
        quotedMessageType: target.type,
      }
    });
    if (sent.success && status) await DatabaseEngine.updateAdminMessageStatus(target.id, status);
    setSending(false);
    if (!sent.success) return Alert.alert('Reply Failed', sent.error || 'Could not send reply.');
    setReplyText('');
    setQuotedMessage(null);
    const freshReplies = await DatabaseEngine.getAllRepNotifications();
    setAdminReplies(freshReplies || []);
    Alert.alert('Reply Sent', `Reply sent to ${selectedRep.repId}.`);
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    await notifyRep({ title: `Reply: ${quotedMessage?.title || categoryMeta[selectedCategory]?.title || 'Message'}`, body: replyText.trim(), status: 'Replied' });
  };

  const markProgress = async () => {
    const target = quotedMessage || [...categoryMessages].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0];
    if (!target) return;
    const body = `HQ has received your ${target.type === 'restock_request' ? 'restock request' : 'message'} and marked it as In Progress. We will update you soon.`;
    await notifyRep({ title: `In Progress: ${target.title}`, body, status: 'In Progress' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => selectedCategory ? setSelectedCategory(null) : selectedRep ? setSelectedRep(null) : router.replace('/admin')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={16} color="#2563EB"/><Text style={styles.backText}> {selectedCategory ? 'Categories' : selectedRep ? 'Reps' : 'Admin'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💬 Messages & Requests</Text>
        <Text style={styles.sub}>{selectedCategory ? categoryMeta[selectedCategory].title : selectedRep ? `${selectedRep.repName} • ${selectedRep.repId}` : 'One inbox card per rep.'}</Text>
      </View>

      {!selectedRep && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? <Loading/> : repGroups.length === 0 ? <Empty/> : repGroups.map(group => (
            <TouchableOpacity key={group.repId} style={[styles.card, group.unread > 0 && styles.unread]} onPress={() => openRep(group)}>
              <View style={styles.cardTop}><Text style={styles.cardTitle}>{group.repName}</Text>{group.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{group.unread}</Text></View>}</View>
              <Text style={styles.meta}>{group.repId} • {group.messages.length} total message(s)</Text>
              <Text style={styles.body} numberOfLines={2}>{group.latest?.body}</Text>
              <View style={styles.chips}><Chip label={`Restock ${group.counts.restock}`} /><Chip label={`Support ${group.counts.support}`} /><Chip label={`Custom ${group.counts.custom}`} /></View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectedRep && !selectedCategory && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {['restock','support','custom'].map(category => {
            const meta = categoryMeta[category];
            const msgs = selectedRepGroup?.messages.filter(msg => getCategory(msg) === category) || [];
            const unread = msgs.filter(msg => !msg.admin_read).length;
            if (msgs.length === 0) return null;
            return <TouchableOpacity key={category} style={[styles.categoryCard, { borderLeftColor: meta.color }]} onPress={() => openCategory(category)}><View style={styles.cardTop}><Text style={styles.cardTitle}>{meta.emoji} {meta.title}</Text>{unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}</View><Text style={styles.meta}>{msgs.length} message(s) from {selectedRep.repId}</Text><Text style={styles.body} numberOfLines={2}>{msgs[msgs.length - 1]?.body}</Text></TouchableOpacity>
          })}
        </ScrollView>
      )}

      <Modal visible={Boolean(selectedRep && selectedCategory)} animationType="slide" onRequestClose={() => setSelectedCategory(null)}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.threadHeader}><TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backBtn}><Ionicons name="arrow-back" size={16} color="#2563EB"/><Text style={styles.backText}> Back</Text></TouchableOpacity><Text style={styles.threadTitle}>{categoryMeta[selectedCategory]?.title}</Text><Text style={styles.threadSub}>{selectedRep?.repName} • {selectedRep?.repId}</Text></View>
          <ScrollView contentContainerStyle={styles.threadScroll}>
            {conversationEvents.map((event, index) => {
              const payload = parsePayload(event.payload);
              const isAdmin = event.kind === 'admin';
              return <TouchableOpacity key={`${event.kind}-${event.id || index}`} disabled={isAdmin} onPress={() => setQuotedMessage(event)} style={isAdmin ? styles.adminBubble : [styles.repBubble, quotedMessage?.id === event.id && styles.quotedBubble]}>
                <Text style={styles.bubbleLabel}>{isAdmin ? 'Admin' : selectedRep?.repName}</Text>
                {isAdmin && payload.quotedMessageText ? <View style={styles.quoteBox}><Text style={styles.quoteLabel}>Replying to</Text><Text style={styles.quoteText} numberOfLines={2}>{payload.quotedMessageText}</Text></View> : null}
                <Text style={styles.bubbleBody}>{event.body}</Text><Text style={styles.bubbleMeta}>{eventTime(event) ? new Date(eventTime(event)).toLocaleString() : ''}</Text>
              </TouchableOpacity>
            })}
          </ScrollView>
          <View style={styles.composer}>{quotedMessage && <View style={styles.selectedQuote}><Text style={styles.quoteLabel}>Replying to: {quotedMessage.title}</Text><Text style={styles.quoteText} numberOfLines={2}>{quotedMessage.body}</Text><TouchableOpacity onPress={() => setQuotedMessage(null)}><Text style={styles.clearQuote}>Clear</Text></TouchableOpacity></View>}<TextInput style={styles.input} value={replyText} onChangeText={setReplyText} multiline placeholder="Type admin reply..." textAlignVertical="top"/><View style={styles.actions}><TouchableOpacity style={styles.replyBtn} onPress={sendReply} disabled={sending || !replyText.trim()}>{sending ? <ActivityIndicator color="#FFF"/> : <Text style={styles.replyText}>Send Reply</Text>}</TouchableOpacity><TouchableOpacity style={styles.progressBtn} onPress={markProgress}><Text style={styles.progressText}>Mark In Progress</Text></TouchableOpacity></View></View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <AdminFooter/>
    </SafeAreaView>
  );
}

function Loading(){return <View style={styles.empty}><ActivityIndicator color="#2563EB"/><Text style={styles.emptySub}>Loading messages...</Text></View>}
function Empty(){return <View style={styles.empty}><Text style={{fontSize:40}}>💬</Text><Text style={styles.emptyTitle}>No Messages</Text><Text style={styles.emptySub}>Rep custom messages and restock requests will show here.</Text></View>}
function Chip({label}){return <View style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,paddingBottom:8,backgroundColor:'#EFF6FF'},backBtn:{flexDirection:'row',alignSelf:'flex-start',backgroundColor:'#FFF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:12,paddingHorizontal:12,paddingVertical:8,alignItems:'center',marginBottom:12},backText:{color:'#2563EB',fontSize:12,fontWeight:'900'},title:{color:'#1E3A8A',fontSize:24,fontWeight:'900'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderLeftColor:'#2563EB',borderRadius:16,padding:15,marginBottom:12},unread:{backgroundColor:'#F8FBFF'},categoryCard:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderLeftWidth:5,borderRadius:16,padding:15,marginBottom:12},cardTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},cardTitle:{flex:1,color:'#0F172A',fontSize:14,fontWeight:'900'},badge:{minWidth:22,height:22,borderRadius:11,backgroundColor:'#EF4444',alignItems:'center',justifyContent:'center',paddingHorizontal:6},badgeText:{color:'#FFF',fontSize:10,fontWeight:'900'},meta:{color:'#64748B',fontSize:11,lineHeight:16,marginTop:6},body:{color:'#334155',fontSize:12,lineHeight:18,marginTop:8},chips:{flexDirection:'row',gap:6,marginTop:10},chip:{backgroundColor:'#EFF6FF',borderRadius:999,paddingHorizontal:8,paddingVertical:4},chipText:{color:'#2563EB',fontSize:10,fontWeight:'900'},empty:{backgroundColor:'#FFF',borderRadius:20,padding:26,borderWidth:1,borderColor:'#DBEAFE',alignItems:'center'},emptyTitle:{color:'#1E3A8A',fontSize:16,fontWeight:'900',marginTop:8},emptySub:{color:'#64748B',textAlign:'center',fontSize:12,marginTop:6},threadHeader:{paddingHorizontal:16,paddingTop:10,paddingBottom:16,backgroundColor:'#EFF6FF'},threadTitle:{color:'#1E3A8A',fontSize:22,fontWeight:'900'},threadSub:{color:'#64748B',fontSize:12,marginTop:4},threadScroll:{padding:14,paddingBottom:180},repBubble:{alignSelf:'flex-start',maxWidth:'90%',backgroundColor:'#EFF6FF',borderWidth:1,borderColor:'#BFDBFE',borderRadius:16,padding:12,marginBottom:10},adminBubble:{alignSelf:'flex-end',maxWidth:'90%',backgroundColor:'#ECFDF5',borderWidth:1,borderColor:'#BBF7D0',borderRadius:16,padding:12,marginBottom:10},quotedBubble:{borderColor:'#2563EB',borderWidth:2},bubbleLabel:{color:'#64748B',fontSize:10,fontWeight:'900',marginBottom:4},bubbleBody:{color:'#334155',fontSize:12,lineHeight:18},bubbleMeta:{color:'#64748B',fontSize:9,marginTop:6},quoteBox:{borderLeftWidth:3,borderLeftColor:'#2563EB',backgroundColor:'rgba(37,99,235,.08)',borderRadius:8,padding:8,marginBottom:7},quoteLabel:{color:'#64748B',fontSize:9,fontWeight:'900'},quoteText:{color:'#0F172A',fontSize:11,fontWeight:'800',marginTop:2},composer:{position:'absolute',left:0,right:0,bottom:0,backgroundColor:'#FFF',borderTopWidth:1,borderTopColor:'#E2E8F0',padding:12},selectedQuote:{backgroundColor:'#EFF6FF',borderRadius:12,padding:9,marginBottom:8},clearQuote:{color:'#EF4444',fontSize:10,fontWeight:'900',marginTop:4},input:{backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E2E8F0',borderRadius:12,padding:10,minHeight:60,textAlignVertical:'top',color:'#0F172A'},actions:{flexDirection:'row',gap:8,marginTop:8},replyBtn:{flex:1,backgroundColor:'#2563EB',borderRadius:12,paddingVertical:12,alignItems:'center'},replyText:{color:'#FFF',fontSize:12,fontWeight:'900'},progressBtn:{flex:1,backgroundColor:'#FFFBEB',borderWidth:1,borderColor:'#FDE68A',borderRadius:12,paddingVertical:12,alignItems:'center'},progressText:{color:'#D97706',fontSize:12,fontWeight:'900'}});
