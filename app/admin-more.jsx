import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AdminFooter from './AdminFooter';

const pages=[['📍','Reps Radar','Track registered officers','/admin-reps'],['🏬','Catalog & Stock','Products, prices, inventory','/admin-catalog'],['🛡️','Admins & Access','HQ roles and access','/admin-access'],['🏢','Overview','Back to command center','/admin']];
export default function AdminMore(){return <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.title}>☰ More Admin Tools</Text><Text style={styles.sub}>Open additional management sections.</Text></View><ScrollView contentContainerStyle={styles.scroll}>{pages.map(([emoji,title,sub,path])=><TouchableOpacity key={path} style={styles.card} onPress={()=>router.push(path)}><Text style={styles.emoji}>{emoji}</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardSub}>{sub}</Text></View><Ionicons name="chevron-forward" size={18} color="#94A3B8"/></TouchableOpacity>)}</ScrollView><AdminFooter/></SafeAreaView>}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#F8FAFC'},header:{padding:16,backgroundColor:'#EFF6FF'},title:{fontSize:24,fontWeight:'900',color:'#1E3A8A'},sub:{color:'#64748B',fontSize:12,marginTop:4},scroll:{padding:16,paddingBottom:95},card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#E2E8F0',borderRadius:18,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12},emoji:{fontSize:26},cardTitle:{color:'#0F172A',fontSize:15,fontWeight:'900'},cardSub:{color:'#64748B',fontSize:12,marginTop:2}})
