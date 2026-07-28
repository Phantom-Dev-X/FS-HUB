import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Alert, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

const isPasswordRecoveryUrl = (url) => {
  if (!url) return false;
  return (
    url.includes('type=recovery') ||
    url.includes('reset-password') ||
    (url.includes('access_token=') && url.includes('refresh_token='))
  );
};

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.log('[RootErrorBoundary]', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#DC2626', marginBottom: 10 }}>FS Hub startup error</Text>
            <Text style={{ color: '#334155', textAlign: 'center', lineHeight: 20 }}>
              {this.state.error?.message || 'Unknown startup error'}
            </Text>
            <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 14, fontSize: 12 }}>
              Send this message to support so we can patch it with OTA or a new build.
            </Text>
          </View>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

function AppStack() {
  useEffect(() => {
    // OTA update checker. Expo does not show update popups by default — this does.
    // Note: the update that introduces this checker must first be installed/applied;
    // after that, future updates can show this prompt.
    let active = true;
    const checkForOtaUpdate = async () => {
      try {
        if (__DEV__ || !Updates.isEnabled) return;
        const update = await Updates.checkForUpdateAsync();
        if (!active || !update.isAvailable) return;

        Alert.alert(
          'FS Hub Update Available',
          'A new FS Hub update is ready. Download and restart now?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (e) {
                  Alert.alert('Update Failed', e.message || 'Could not apply update. Please retry later.');
                }
              }
            }
          ]
        );
      } catch (e) {
        console.log('[FS-HUB] OTA check skipped:', e.message);
      }
    };

    setTimeout(checkForOtaUpdate, 2500);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const routeDeepLink = (url) => {
      if (!url) return;
      if (isPasswordRecoveryUrl(url)) {
        // Delay lets Expo Router finish mounting before we navigate.
        setTimeout(() => {
          router.replace({ pathname: '/reset-password', params: { link: encodeURIComponent(url) } });
        }, 150);
      }
    };

    Linking.getInitialURL().then(routeDeepLink).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => routeDeepLink(url));

    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    // Initialize database and load reps/clients into memory for instant access.
    // All failures are caught so a network/Supabase issue can never close the APK at startup.
    (async () => {
      try {
        await DatabaseEngine.initDatabase();
        const [reps, clients, catalog] = await Promise.all([
          DatabaseEngine.getAllReps(),
          DatabaseEngine.getAllClients(),
          DatabaseEngine.getCatalog(),
        ]);

        OrderStore.activeReps = reps || [];
        OrderStore.clients = clients || [];
        OrderStore.catalog = catalog || [];

        const session = await DatabaseEngine.getSession();
        if (session) {
          OrderStore.setCurrentAgent(session);
        }

        console.log(`[FS-HUB] DB Initialized: ${OrderStore.activeReps.length} reps, ${OrderStore.clients.length} clients, ${OrderStore.catalog.length} products`);
      } catch (e) {
        console.log('[FS-HUB] Startup init skipped:', e.message);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="checkin" />
          <Stack.Screen name="add-client" />
          <Stack.Screen name="visit" />
          <Stack.Screen name="product-detail" />
          <Stack.Screen name="checkout-summary" />
          <Stack.Screen name="territories" />
          <Stack.Screen name="route" />
          <Stack.Screen name="route-select" />
          <Stack.Screen name="route-active" />
          <Stack.Screen name="inventory" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="forgot" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="sync" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="view-receipt" />
          <Stack.Screen name="notifications" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <AppStack />
    </RootErrorBoundary>
  );
}
