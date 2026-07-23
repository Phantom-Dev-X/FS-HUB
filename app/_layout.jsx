import { Stack } from 'expo-router';
import { ThemeProvider } from '../context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// This layout wraps all pages with global theme sync
// So when user toggles dark/white in profile/settings, all pages update instantly
// No need for individual ☀️/🌙 icons on each page header anymore
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false, // we use custom headers, hide default
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
