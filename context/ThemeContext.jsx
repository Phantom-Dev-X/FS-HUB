import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme storage key
const THEME_KEY = '@fshub_theme_isDark';

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  setIsDark: () => {},
  colors: {},
});

// Centralized color definitions - same everywhere, synced via context
export const getColors = (isDark) => ({
  background: isDark ? '#0F172A' : '#F8FAFC', // dark blue vs light clean white
  card:       isDark ? '#1E293B' : '#FFFFFF',
  border:     isDark ? '#334155' : '#E2E8F0',
  mainText:   isDark ? '#FFFFFF' : '#0F172A',
  subText:    isDark ? '#94A3B8' : '#64748B',
  heading:    isDark ? '#E2E8F0' : '#334155',
  cyan:       isDark ? '#38BDF8' : '#2563EB',
  green:      isDark ? '#10B981' : '#059669',
  amber:      isDark ? '#F59E0B' : '#D97706',
  purple:     isDark ? '#A855F7' : '#9333EA',
  red:        '#EF4444',
  primary:    isDark ? '#38BDF8' : '#2563EB',
  blue:       '#2563EB',
  lightBlueBg: isDark ? '#1E293B' : '#EFF6FF',
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false); // default WHITE premium elegant as user requested

  // Load saved theme on app start
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved !== null) {
          setIsDark(JSON.parse(saved));
        }
      } catch (e) {
        console.log('Theme load error', e);
      }
    })();
  }, []);

  // Save theme whenever it changes
  const toggleTheme = async () => {
    try {
      const newVal = !isDark;
      setIsDark(newVal);
      await AsyncStorage.setItem(THEME_KEY, JSON.stringify(newVal));
    } catch (e) {
      setIsDark(!isDark);
    }
  };

  const colors = getColors(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setIsDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
