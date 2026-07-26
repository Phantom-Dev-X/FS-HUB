import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { isPasswordRecoveryUrl } from '../_SupabaseAuth';

export default function AuthCallbackScreen() {
  useEffect(() => {
    (async () => {
      const url = await Linking.getInitialURL();
      if (url && isPasswordRecoveryUrl(url)) {
        router.replace({ pathname: '/reset-password', params: { link: encodeURIComponent(url) } });
        return;
      }
      router.replace('/');
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.box}>
        <ActivityIndicator color="#2563EB" />
        <Text style={styles.text}>Completing secure auth callback...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { marginTop: 12, color: '#334155', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
