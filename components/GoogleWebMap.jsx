import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const FALLBACK_CENTER = { latitude: 6.6018, longitude: 3.3515 };

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCoordinate = (coordinate) => {
  if (!coordinate) return FALLBACK_CENTER;
  const latitude = toNumber(coordinate.latitude ?? coordinate.lat);
  const longitude = toNumber(coordinate.longitude ?? coordinate.lng ?? coordinate.lon);
  if (latitude === null || longitude === null) return FALLBACK_CENTER;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return FALLBACK_CENTER;
  return { latitude, longitude };
};

export default function GoogleWebMap({ center = FALLBACK_CENTER, height = 220, zoom = 14, label = 'FS Hub Field Position' }) {
  const [hasError, setHasError] = useState(false);
  const safeCenter = normalizeCoordinate(center);

  const mapUrl = useMemo(() => {
    const lat = encodeURIComponent(String(safeCenter.latitude));
    const lon = encodeURIComponent(String(safeCenter.longitude));
    const q = encodeURIComponent(`${safeCenter.latitude},${safeCenter.longitude} (${label})`);
    return `https://www.google.com/maps?q=${q}&ll=${lat},${lon}&z=${Number(zoom) || 14}&output=embed`;
  }, [safeCenter.latitude, safeCenter.longitude, zoom, label]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Google map preview is available in the mobile app.</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Google map could not load</Text>
        <Text style={styles.fallbackText}>Check internet connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ uri: mapUrl }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#EFF6FF',
  },
  fallback: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  fallbackTitle: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
