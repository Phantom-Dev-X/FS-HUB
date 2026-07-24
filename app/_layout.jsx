import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { DatabaseEngine } from './_DatabaseEngine';
import { OrderStore } from './_OrderStore';

export default function RootLayout() {
  useEffect(() => {
    // Initialize database and load reps/clients into memory for instant access
    (async () => {
      await DatabaseEngine.initDatabase();
      const reps = await DatabaseEngine.getAllReps();
      const clients = await DatabaseEngine.getAllClients();
      const catalog = await DatabaseEngine.getCatalog();
      
      // Populate OrderStore memory from local DB
      OrderStore.activeReps = reps;
      OrderStore.clients = clients;
      OrderStore.catalog = catalog;

      // Try to restore session
      const session = await DatabaseEngine.getSession();
      if (session) {
        OrderStore.setCurrentAgent(session);
      }

      console.log(`[FS-HUB] DB Initialized: ${reps.length} reps, ${clients.length} clients, ${catalog.length} products`);
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
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
