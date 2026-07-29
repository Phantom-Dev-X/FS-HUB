import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmartFooter from './SmartFooter';
import { OrderStore } from './_OrderStore';
import { DatabaseEngine } from './_DatabaseEngine';
import { EmailService } from './_EmailService';
import { CacheEngine } from './_CacheEngine';
import RemoteImage from '../components/RemoteImage';
import { useTheme } from '../context/ThemeContext';

const PREF_KEY = '@fshub_profile_preferences';

const DEFAULT_PREFS = {
  compactCards: false,
  autoOpenNavigation: false,
  autoMarkVisited: true,
  autoSendReceipt: true,
  sendRepCopy: false,
  receiptFormat: 'Detailed',
};

const cleanName = (name) => String(name || 'Field Officer').replace(' (Field Officer)', '');

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const [agent, setAgent] = useState(OrderStore.currentAgent);
  const [avatarUri, setAvatarUri] = useState(OrderStore.currentAgent?.avatar || null);
  const [modal, setModal] = useState(null);
  const [stats, setStats] = useState({ clients: null, orders: null, offline: null });
  const [syncing, setSyncing] = useState(false);
  const [failedEmails, setFailedEmails] = useState([]);
  const [retryingEmailId, setRetryingEmailId] = useState(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [adminMsgTitle, setAdminMsgTitle] = useState('');
  const [adminMsgBody, setAdminMsgBody] = useState('');
  const [adminMsgPriority, setAdminMsgPriority] = useState('Normal');
  const [sendingAdminMsg, setSendingAdminMsg] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const loadProfileData = useCallback(async () => {
    const session = await DatabaseEngine.getSession();
    const current = session || OrderStore.currentAgent;
    if (current) {
      const mapped = {
        name: cleanName(current.name || current.fullName),
        id: current.id || 'REP-GUEST',
        role: current.accountType === 'admin' ? 'Headquarters Admin' : (current.role || 'Field Officer'),
        territory: current.zone || current.territory || 'Ikeja Commercial Zone',
        email: current.email || '',
        initials: current.initials || cleanName(current.name || current.fullName).substring(0, 2).toUpperCase() || 'FO',
        avatar: current.avatar || null,
      };
      setAgent(mapped);
      setAvatarUri(mapped.avatar);
    }

    const repId = current?.id || OrderStore.currentAgent?.id;
    const cacheScope = repId || current?.email || 'guest';
    const cachedStats = await CacheEngine.get('profile_stats', cacheScope, null);
    if (cachedStats) setStats(cachedStats);

    const [clients, orders, offline, emails, prefRaw] = await Promise.all([
      repId && repId !== 'REP-GUEST' ? DatabaseEngine.getClientsByRep(repId) : Promise.resolve([]),
      repId && repId !== 'REP-GUEST' ? DatabaseEngine.getOrdersByRep(repId) : Promise.resolve([]),
      DatabaseEngine.getOfflineOrders(),
      EmailService.getFailedEmails(),
      AsyncStorage.getItem(PREF_KEY),
    ]);

    const freshStats = { clients: clients.length || 0, orders: orders.length || 0, offline: offline.length || 0 };
    setStats(freshStats);
    await CacheEngine.set('profile_stats', cacheScope, freshStats);
    setFailedEmails(emails);
    if (prefRaw) {
      try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(prefRaw) }); } catch {}
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfileData(); }, [loadProfileData]));

  useEffect(() => {
    AsyncStorage.setItem(PREF_KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs]);

  const updatePref = (key, value) => setPrefs(prev => ({ ...prev, [key]: value }));

  const handleLogout = () => {
    Alert.alert('🔒 Log Out', 'End your officer session? Offline orders remain saved until synced.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          const { SupabaseAuth } = await import('./_SupabaseAuth');
          await SupabaseAuth.signOut();
          await DatabaseEngine.clearSession();
          router.replace('/');
        }
      },
    ]);
  };

  const pickAvatar = async (mode) => {
    try {
      let result;
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') return Alert.alert('Camera Permission', 'Allow camera to take profile photo.');
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') return Alert.alert('Gallery Permission', 'Allow gallery to choose profile photo.');
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
      }
      if (!result.canceled && result.assets?.[0]?.uri) {
        const localUri = result.assets[0].uri;
        setAvatarUri(localUri);
        OrderStore.currentAgent.avatar = localUri;
        setModal(null);

        const repId = agent?.id || OrderStore.currentAgent?.id;
        if (repId && repId !== 'REP-GUEST') {
          const upload = await DatabaseEngine.uploadImage(localUri, `avatars/${repId}/profile.jpg`);
          if (upload.success) {
            await DatabaseEngine.updateRepAvatar(repId, upload.path);
            OrderStore.currentAgent.avatar = upload.path;
            const session = await DatabaseEngine.getSession();
            if (session) await DatabaseEngine.saveSession({ ...session, avatar: upload.path });
            Alert.alert('Photo Synced ✅', 'Profile photo saved locally and synced to Supabase.');
          } else {
            Alert.alert('Photo Saved Locally', `Photo updated on this phone, but cloud sync failed: ${upload.error}`);
          }
        } else {
          Alert.alert('Photo Updated', 'Profile photo updated on this device.');
        }
      }
    } catch (e) {
      Alert.alert('Photo Error', e.message);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    const res = await DatabaseEngine.syncToCloudBackend();
    setSyncing(false);
    await loadProfileData();
    Alert.alert(res.success ? 'Sync Complete' : 'Sync Issue', res.message || res.error || 'Sync finished.');
  };

  const retryEmail = async (id) => {
    setRetryingEmailId(id);
    const result = await EmailService.retryFailedEmail(id);
    setRetryingEmailId(null);
    const emails = await EmailService.getFailedEmails();
    setFailedEmails(emails);
    Alert.alert(result.success ? 'Email Sent' : 'Retry Failed', result.message || 'Done');
  };

  const sendCustomAdminMessage = async () => {
    if (!adminMsgTitle.trim() || !adminMsgBody.trim()) {
      Alert.alert('Missing Message', 'Enter a title and message for admin.');
      return;
    }
    setSendingAdminMsg(true);
    const res = await DatabaseEngine.saveAdminMessage({
      repId: agent?.id,
      repName: agent?.name,
      type: 'rep_custom_message',
      title: adminMsgTitle.trim(),
      body: adminMsgBody.trim(),
      priority: adminMsgPriority,
      payload: { source: 'profile_message_admin' }
    });
    setSendingAdminMsg(false);
    if (res.success) {
      setAdminMsgTitle('');
      setAdminMsgBody('');
      setAdminMsgPriority('Normal');
      setModal(null);
      Alert.alert(res.cloud ? 'Message Sent ✅' : 'Message Saved ✅', res.cloud ? 'Admin will see your message.' : 'Message saved locally. It will need cloud sync/table setup later.');
    } else {
      Alert.alert('Message Failed', res.error || 'Could not send message.');
    }
  };

  const checkForAppUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMessage('Checking for updates...');
    setUpdateAvailable(false);
    try {
      if (!Updates.isEnabled) {
        setUpdateMessage('Updates are not enabled in this build. Install the latest APK build first.');
        Alert.alert('Updates Not Enabled', 'This build cannot use OTA updates. Install the latest APK build first.');
        return;
      }
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        setUpdateAvailable(true);
        setUpdateMessage('Update found. Tap Install Update Now to apply it.');
      } else {
        setUpdateMessage('You are already on the latest available update.');
        Alert.alert('No Update Found', 'This app is already on the latest update for this runtime/channel.');
      }
    } catch (e) {
      setUpdateMessage(e.message || 'Could not check for update.');
      Alert.alert('Update Check Failed', e.message || 'Could not check for update.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const installAppUpdate = async () => {
    setInstallingUpdate(true);
    setUpdateMessage('Downloading update...');
    try {
      await Updates.fetchUpdateAsync();
      setUpdateMessage('Update downloaded. Restarting app...');
      await Updates.reloadAsync();
    } catch (e) {
      setUpdateMessage(e.message || 'Could not install update.');
      Alert.alert('Update Install Failed', e.message || 'Could not install update.');
    } finally {
      setInstallingUpdate(false);
    }
  };

  const renderAvatar = () => {
    return (
      <RemoteImage path={avatarUri} style={styles.avatarImage}>
        <View style={styles.avatarCircle}><Text style={styles.avatarText}>{agent?.initials || 'FO'}</Text></View>
      </RemoteImage>
    );
  };

  const closeModal = () => setModal(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.topIcon}><Ionicons name="chevron-back" size={18} color="#FFF" /></TouchableOpacity>
          <Text style={styles.topPill}>FIELD OFFICER PROFILE</Text>
          <TouchableOpacity onPress={() => setModal('appearance')} style={styles.topIcon}><Ionicons name="settings-outline" size={18} color="#FFF" /></TouchableOpacity>
        </View>
        <View style={styles.identityRow}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => setModal('photo')}>
            {renderAvatar()}
            <View style={styles.cameraBadge}><Ionicons name="camera" size={14} color="#FFF" /></View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName} numberOfLines={1}>{agent?.name || 'Field Officer'}</Text>
            <Text style={styles.agentRole} numberOfLines={1}>{agent?.role || 'Field Officer'} • {agent?.territory || 'Ikeja'}</Text>
            <View style={styles.badgeRow}><Text style={styles.heroBadge}>🟢 Online</Text><Text style={styles.heroBadge}>{agent?.id || 'REP-GUEST'}</Text></View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Stat num={stats.clients} label="Clients" />
          <Stat num={stats.orders} label="Orders" />
          <Stat num={stats.offline} label="Pending" />
        </View>

        <Text style={styles.sectionTitle}>Verified Officer Card</Text>
        <View style={styles.idCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.idLabel}>REP ID</Text><Text style={styles.idValue}>{agent?.id || 'REP-GUEST'}</Text>
            <Text style={styles.idLabel}>EMAIL</Text><Text style={styles.idValue}>{agent?.email || 'Not set'}</Text>
            <Text style={styles.idLabel}>TERRITORY</Text><Text style={styles.idValue}>{agent?.territory || 'Unassigned'}</Text>
          </View>
          <View style={styles.qrMock}><Text style={styles.qrText}>FS</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="camera-outline" title="Change Photo" onPress={() => setModal('photo')} />
          <QuickAction icon="map-outline" title="My Territory" onPress={() => router.push('/territories')} />
          <QuickAction icon="shield-checkmark-outline" title="Security" onPress={() => setModal('security')} />
          <QuickAction icon="chatbubble-ellipses-outline" title="Message Admin" onPress={() => setModal('messageAdmin')} />
          <QuickAction icon="cloud-upload-outline" title="Sync Status" onPress={() => setModal('sync')} />
        </View>

        <Text style={styles.sectionTitle}>Account & Preferences</Text>
        <View style={styles.listCard}>
          <ListItem icon="moon-outline" title="Appearance" sub="Light / dark theme, compact cards" onPress={() => setModal('appearance')} />
          <ListItem icon="navigate-outline" title="Route Preferences" sub="Navigation app and visit automation" onPress={() => setModal('route')} />
          <ListItem icon="receipt-outline" title="Receipts & Email" sub="Failed email list and receipt behavior" onPress={() => setModal('receipts')} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out of Device</Text>
        </TouchableOpacity>
      </ScrollView>

      <SmartFooter />
      <ProfileModal visible={Boolean(modal)} title={getModalTitle(modal)} onClose={closeModal}>
        {modal === 'photo' && <PhotoSheet onCamera={() => pickAvatar('camera')} onGallery={() => pickAvatar('gallery')} onRemove={() => { setAvatarUri(null); OrderStore.currentAgent.avatar = null; closeModal(); }} />}
        {modal === 'security' && <SecuritySheet agent={agent} onLogout={handleLogout} />}
        {modal === 'messageAdmin' && <MessageAdminSheet title={adminMsgTitle} setTitle={setAdminMsgTitle} body={adminMsgBody} setBody={setAdminMsgBody} priority={adminMsgPriority} setPriority={setAdminMsgPriority} sending={sendingAdminMsg} onSubmit={sendCustomAdminMessage} />}
        {modal === 'sync' && <SyncSheet stats={stats} syncing={syncing} onSync={handleSyncNow} checkingUpdate={checkingUpdate} updateAvailable={updateAvailable} installingUpdate={installingUpdate} updateMessage={updateMessage} onCheckUpdate={checkForAppUpdate} onInstallUpdate={installAppUpdate} />}
        {modal === 'appearance' && <AppearanceSheet isDark={isDark} toggleTheme={toggleTheme} prefs={prefs} updatePref={updatePref} />}
        {modal === 'route' && <RoutePrefsSheet prefs={prefs} updatePref={updatePref} />}
        {modal === 'receipts' && <ReceiptsSheet prefs={prefs} updatePref={updatePref} failedEmails={failedEmails} retryingEmailId={retryingEmailId} onRetry={retryEmail} />}
      </ProfileModal>
    </SafeAreaView>
  );
}

const getModalTitle = (modal) => ({
  photo: 'Change Profile Photo',
  security: 'Security & Login',
  messageAdmin: 'Message Admin',
  sync: 'Sync Status',
  appearance: 'Appearance',
  route: 'Route Preferences',
  receipts: 'Receipts & Email',
})[modal] || '';

function Stat({ num, label }) {
  return <View style={styles.statBox}><Text style={styles.statNum}>{num ?? '—'}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function QuickAction({ icon, title, onPress }) {
  return <TouchableOpacity style={styles.quickAction} onPress={onPress}><View style={styles.quickIcon}><Ionicons name={icon} size={18} color="#2563EB" /></View><Text style={styles.quickText}>{title}</Text></TouchableOpacity>;
}

function ListItem({ icon, title, sub, onPress }) {
  return <TouchableOpacity style={styles.listItem} onPress={onPress}><View style={styles.listIcon}><Ionicons name={icon} size={18} color="#2563EB" /></View><View style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSub}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#94A3B8" /></TouchableOpacity>;
}

function ProfileModal({ visible, title, onClose, children }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{title}</Text><TouchableOpacity style={styles.closeBtn} onPress={onClose}><Ionicons name="close" size={18} color="#64748B" /></TouchableOpacity></View>{children}</View></View></Modal>;
}

function Option({ icon, title, sub, onPress, danger, loading }) {
  return <TouchableOpacity style={[styles.option, danger && styles.optionDanger]} onPress={onPress} disabled={loading}><View style={[styles.optionIcon, danger && styles.optionDangerIcon]}>{loading ? <ActivityIndicator color="#2563EB" /> : <Ionicons name={icon} size={18} color={danger ? '#DC2626' : '#2563EB'} />}</View><View style={{ flex: 1 }}><Text style={[styles.optionTitle, danger && { color: '#DC2626' }]}>{title}</Text>{sub ? <Text style={styles.optionSub}>{sub}</Text> : null}</View></TouchableOpacity>;
}

function PhotoSheet({ onCamera, onGallery, onRemove }) {
  return <><Option icon="camera-outline" title="Take New Photo" sub="Open camera and save face photo" onPress={onCamera} /><Option icon="images-outline" title="Choose From Gallery" sub="Pick an existing professional photo" onPress={onGallery} /><Option icon="trash-outline" title="Remove Current Photo" sub="Return to initials avatar" danger onPress={onRemove} /></>;
}

function SecuritySheet({ agent, onLogout }) {
  return <><InfoRow title="Email" sub={agent?.email || 'Not set'} /><InfoRow title="Rep ID" sub={agent?.id || 'REP-GUEST'} /><Option icon="key-outline" title="Reset Password" sub="Open password reset email/OTP flow" onPress={() => router.push('/forgot')} /><Option icon="log-out-outline" title="Sign Out" sub="Clear this device session" danger onPress={onLogout} /></>;
}

function MessageAdminSheet({ title, setTitle, body, setBody, priority, setPriority, sending, onSubmit }) {
  return <><Text style={styles.modalInputLabel}>MESSAGE TITLE</Text><TextInput style={styles.modalTextInput} value={title} onChangeText={setTitle} placeholder="e.g. Client issue, stock problem, route request" /><Text style={styles.modalInputLabel}>PRIORITY</Text><View style={styles.priorityRow}>{['Normal', 'Urgent', 'Critical'].map(level => <TouchableOpacity key={level} style={[styles.priorityPill, priority === level && styles.priorityActive]} onPress={() => setPriority(level)}><Text style={[styles.priorityText, priority === level && { color: '#FFF' }]}>{level}</Text></TouchableOpacity>)}</View><Text style={styles.modalInputLabel}>MESSAGE</Text><TextInput style={[styles.modalTextInput, styles.messageBox]} value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Type the exact message you want admin/HQ to see..." /><Option icon="send-outline" title="Send Message to Admin" sub="Saves to Supabase admin messages when table is available" loading={sending} onPress={onSubmit} /></>;
}

function SyncSheet({ stats, syncing, onSync, checkingUpdate, updateAvailable, installingUpdate, updateMessage, onCheckUpdate, onInstallUpdate }) {
  return <><View style={styles.syncGrid}><View style={styles.syncBox}><Text style={styles.syncNum}>{stats.offline}</Text><Text style={styles.syncLabel}>offline pending</Text></View><View style={styles.syncBox}><Text style={styles.syncNum}>{stats.offline === 0 ? '100%' : 'Check'}</Text><Text style={styles.syncLabel}>cloud health</Text></View></View><Option icon="sync-outline" title="Sync Orders Now" sub="Upload pending orders to Supabase" loading={syncing} onPress={onSync} /><Option icon="list-outline" title="View Offline Queue" sub="Open detailed sync screen" onPress={() => router.push('/sync')} /><View style={styles.updatePanel}><Text style={styles.updateTitle}>App Updates</Text><Text style={styles.updateSub}>{updateMessage || 'Manually check for OTA updates if you tapped Later before.'}</Text><Option icon="cloud-download-outline" title="Check for Updates" sub="Look for a new FS Hub update on the production channel" loading={checkingUpdate} onPress={onCheckUpdate} />{updateAvailable ? <Option icon="rocket-outline" title="Install Update Now" sub="Download update and restart the app immediately" loading={installingUpdate} onPress={onInstallUpdate} /> : null}</View></>;
}

function AppearanceSheet({ isDark, toggleTheme, prefs, updatePref }) {
  return <><ToggleRow title="Dark Mode" sub="Switch white/dark app theme" value={isDark} onValueChange={toggleTheme} /><ToggleRow title="Compact Cards" sub="Show denser cards where supported" value={prefs.compactCards} onValueChange={(v) => updatePref('compactCards', v)} /></>;
}

function RoutePrefsSheet({ prefs, updatePref }) {
  return <><InfoRow title="Default Navigation App" sub="Google Maps for voice directions" /><ToggleRow title="Auto-open Navigation" sub="Launch Google Maps after route starts" value={prefs.autoOpenNavigation} onValueChange={(v) => updatePref('autoOpenNavigation', v)} /><ToggleRow title="Auto-mark Visited" sub="Mark a stop visited after verified check-in" value={prefs.autoMarkVisited} onValueChange={(v) => updatePref('autoMarkVisited', v)} /></>;
}

function ReceiptsSheet({ prefs, updatePref, failedEmails, retryingEmailId, onRetry }) {
  return <><ToggleRow title="Auto-send Client Receipt" sub="Email receipt after order submit" value={prefs.autoSendReceipt} onValueChange={(v) => updatePref('autoSendReceipt', v)} /><ToggleRow title="Send Copy to Rep" sub="CC logged-in rep email later" value={prefs.sendRepCopy} onValueChange={(v) => updatePref('sendRepCopy', v)} /><InfoRow title="Receipt Format" sub={prefs.receiptFormat} /><Text style={styles.failedTitle}>Failed Emails ({failedEmails.length})</Text>{failedEmails.length === 0 ? <Text style={styles.emptyFailed}>No failed emails right now.</Text> : failedEmails.map(email => <View key={email.id} style={styles.failedEmailCard}><Text style={styles.failedSubject} numberOfLines={1}>{email.subject}</Text><Text style={styles.failedMeta} numberOfLines={1}>To: {email.toEmail}</Text><Text style={styles.failedMeta} numberOfLines={2}>Error: {email.lastError}</Text><TouchableOpacity style={styles.retryBtn} onPress={() => onRetry(email.id)} disabled={retryingEmailId === email.id}>{retryingEmailId === email.id ? <ActivityIndicator color="#FFF" /> : <Text style={styles.retryText}>Retry this email</Text>}</TouchableOpacity></View>)}</>;
}

function InfoRow({ title, sub }) {
  return <View style={styles.infoRow}><View><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoSub}>{sub}</Text></View></View>;
}

function ToggleRow({ title, sub, value, onValueChange }) {
  return <View style={styles.toggleRow}><View style={{ flex: 1, marginRight: 12 }}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoSub}>{sub}</Text></View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#CBD5E1', true: '#2563EB' }} thumbColor="#FFFFFF" /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  hero: { height: 246, backgroundColor: '#2563EB', paddingHorizontal: 18, paddingTop: 44, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  topIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  topPill: { color: '#FFF', fontSize: 11, fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatarCircle: { width: 86, height: 86, borderRadius: 28, backgroundColor: '#1E3A8A', borderWidth: 4, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 86, height: 86, borderRadius: 28, borderWidth: 4, borderColor: 'rgba(255,255,255,0.75)' },
  avatarText: { color: '#FFF', fontSize: 30, fontWeight: '900' },
  cameraBadge: { position: 'absolute', right: -5, bottom: -5, width: 32, height: 32, borderRadius: 12, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  agentName: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  agentRole: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  heroBadge: { color: '#FFF', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  scroll: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 95, marginTop: -34 },
  statsCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 24, padding: 16, flexDirection: 'row', gap: 10, shadowColor: '#2563EB', shadowOpacity: 0.1, shadowRadius: 20, elevation: 4 },
  statBox: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 12, alignItems: 'center' },
  statNum: { color: '#0F172A', fontSize: 17, fontWeight: '900' },
  statLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', marginTop: 3, textTransform: 'uppercase' },
  sectionTitle: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 16, marginBottom: 9, marginLeft: 4 },
  idCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 16, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  idLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '900', marginBottom: 3 },
  idValue: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 10 },
  qrMock: { width: 74, height: 74, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  qrText: { color: '#1E3A8A', fontWeight: '900', fontSize: 18 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  quickText: { color: '#0F172A', fontSize: 12, fontWeight: '900', flex: 1 },
  listCard: { backgroundColor: '#FFF', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  listTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  listSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 18, padding: 15, marginTop: 14 },
  logoutText: { color: '#DC2626', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '78%', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  closeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, marginBottom: 10, backgroundColor: '#FFF' },
  optionDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  optionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  optionDangerIcon: { backgroundColor: '#FEE2E2' },
  optionTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  optionSub: { color: '#64748B', fontSize: 11, marginTop: 2, lineHeight: 15 },
  infoRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900' },
  infoSub: { color: '#64748B', fontSize: 11, marginTop: 3, lineHeight: 15 },
  syncGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  syncBox: { flex: 1, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 18, padding: 14 },
  syncNum: { color: '#1E3A8A', fontSize: 24, fontWeight: '900' },
  syncLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 2 },
  modalInputLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 10, marginBottom: 6 },
  modalTextInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: '#0F172A', fontSize: 13 },
  messageBox: { minHeight: 110 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  priorityPill: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  priorityActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  priorityText: { color: '#64748B', fontSize: 12, fontWeight: '900' },
  updatePanel: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 16, padding: 12, marginTop: 12 },
  updateTitle: { color: '#1E3A8A', fontSize: 13, fontWeight: '900', marginBottom: 4 },
  updateSub: { color: '#64748B', fontSize: 11, lineHeight: 16, marginBottom: 10 },
  failedTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  emptyFailed: { color: '#64748B', fontSize: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, textAlign: 'center' },
  failedEmailCard: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 12, marginBottom: 10 },
  failedSubject: { color: '#0F172A', fontSize: 12, fontWeight: '900' },
  failedMeta: { color: '#7F1D1D', fontSize: 10, marginTop: 3 },
  retryBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  retryText: { color: '#FFF', fontWeight: '900', fontSize: 12 },
});
