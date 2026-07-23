import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import SmartFooter from './SmartFooter';

export default function HistoryScreen() {
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Time');

  const colors = {
    background: isDark ? '#0F172A' : '#F4F6F9',
    card:       isDark ? '#1E293B' : '#FFFFFF',
    border:     isDark ? '#334155' : '#CBD5E1',
    mainText:   isDark ? '#FFFFFF' : '#0F172A',
    subText:    isDark ? '#94A3B8' : '#64748B',
    cyan:       isDark ? '#38BDF8' : '#0284C7',
    green:      isDark ? '#10B981' : '#059669',
    amber:      isDark ? '#F59E0B' : '#D97706',
    purple:     isDark ? '#A855F7' : '#9333EA',
  };

  const filters = ['All Time', 'Today', 'This Week', 'This Month'];

  // All historical logs of past client check-ins and orders!
  const [historyLogs, setHistoryLogs] = useState([
    {
      id: 'LOG-501',
      clientName: 'Shoprite Superstore - Ikeja',
      type: 'Check-In & Order Logged',
      date: 'Today at 10:45 AM',
      filterTag: 'Today',
      amount: '₦120,000 (Solar Inverter Box)',
      gpsPrecision: 'Lat: 6.6018° N | Lon: 3.3515° E (±3m)',
      statusColor: '#10B981',
      receiptNo: 'REC-2049-881',
    },
    {
      id: 'LOG-502',
      clientName: 'Mama Tobi Wholesale Store',
      type: 'Check-In & Order Logged',
      date: 'Yesterday at 01:15 PM',
      filterTag: 'This Week',
      amount: '₦130,000 (WiFi Routers)',
      gpsPrecision: 'Lat: 6.6200° N | Lon: 3.3300° E (±4m)',
      statusColor: '#38BDF8',
      receiptNo: 'REC-2049-880',
    },
    {
      id: 'LOG-503',
      clientName: 'Chinedu Electronics Store',
      type: 'Visit Only (No Order)',
      date: '3 days ago at 04:20 PM',
      filterTag: 'This Week',
      amount: '₦0.00 (Store Stocked - Check-In Only)',
      gpsPrecision: 'Lat: 6.6050° N | Lon: 3.3580° E (±2m)',
      statusColor: '#F59E0B',
      receiptNo: 'VISIT-LOG-109',
    },
    {
      id: 'LOG-504',
      clientName: 'Alhaja Kudirat Beverages',
      type: 'Check-In & Order Logged',
      date: '12 days ago at 11:30 AM',
      filterTag: 'This Month',
      amount: '₦40,000 (Display Shelf Unit)',
      gpsPrecision: 'Lat: 6.5850° N | Lon: 3.3500° E (±3m)',
      statusColor: '#64748B',
      receiptNo: 'REC-2049-875',
    },
  ]);

  const filteredLogs = historyLogs.filter(log => {
    const matchesSearch = log.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || log.receiptNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'All Time' || log.filterTag === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleViewReceipt = (log) => {
    Alert.alert(
      `📄 Historical Log: #${log.receiptNo}`,
      `Client: ${log.clientName}\nType: ${log.type}\nTimestamp: ${log.date}\nAmount: ${log.amount}\nGeotag Verification: ${log.gpsPrecision}`
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Top Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.mainTitle, { color: colors.cyan }]} numberOfLines={1} adjustsFontSizeToFit={true}>
            📜 FIELD HISTORIES & ARCHIVE
          </Text>

          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subText, { color: colors.subText }]}>
          Audit past geotagged check-ins, completed store visits, and order receipts across your assigned territory.
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={[styles.searchInput, { color: colors.mainText }]}
            placeholder="Search past client name or #receipt no..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Date Filter Pills */}
        <View style={styles.filterPillRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {filters.map((fil, idx) => {
              const active = selectedFilter === fil;
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.filPill, { backgroundColor: active ? '#007AFF' : colors.card, borderColor: active ? colors.cyan : colors.border }]}
                  onPress={() => setSelectedFilter(fil)}
                >
                  <Text style={[styles.filPillText, { color: active ? '#FFFFFF' : colors.subText }, active && { fontWeight: '900' }]}>
                    {fil}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Historical Logs List */}
        <View style={styles.listContainer}>
          {filteredLogs.map((log) => (
            <View key={log.id} style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: log.statusColor }]}>
              
              <View style={styles.cardTopRow}>
                <Text style={[styles.clientName, { color: colors.mainText }]} numberOfLines={1}>{log.clientName}</Text>
                <View style={[styles.typeBadge, { borderColor: log.statusColor }]}>
                  <Text style={[styles.typeBadgeText, { color: log.statusColor }]}>{log.filterTag}</Text>
                </View>
              </View>

              <Text style={[styles.dateText, { color: colors.cyan }]}>
                🕒 {log.date} • #{log.receiptNo}
              </Text>

              <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.amountLabel, { color: colors.subText }]}>TRANSACTION SUMMARY</Text>
                  <Text style={[styles.amountValue, { color: log.statusColor }]} numberOfLines={1}>
                    {log.amount}
                  </Text>
                </View>
              </View>

              <Text style={[styles.gpsText, { color: colors.subText }]} numberOfLines={1}>
                📍 Geotag: {log.gpsPrecision}
              </Text>

              {/* Action Button: View Full Audit Log / Receipt */}
              <TouchableOpacity 
                style={[styles.receiptBtn, { borderColor: colors.border }]}
                onPress={() => handleViewReceipt(log)}
              >
                <Text style={[styles.receiptBtnText, { color: colors.cyan }]}>
                  📄 View Geotagged Receipt & Audit Log ➔
                </Text>
              </TouchableOpacity>

            </View>
          ))}
        </View>

      </ScrollView>

      {/* FIXED SMART FOOTER */}
      <SmartFooter isDark={isDark} colors={{ card: colors.card, border: colors.border, cyan: colors.cyan, subText: colors.subText }} />
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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  themeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  subText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
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
  filterPillRow: {
    marginBottom: 16,
  },
  filPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    marginBottom: 10,
  },
  logCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderLeftWidth: 6,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  amountRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  gpsText: {
    fontSize: 11,
    marginBottom: 12,
  },
  receiptBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  receiptBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
