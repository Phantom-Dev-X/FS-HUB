import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const FALLBACK_CENTER = { latitude: 6.6018, longitude: 3.3515 };

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeCoordinate = (coordinate) => {
  if (!coordinate) return null;
  const latitude = toNumber(coordinate.latitude ?? coordinate.lat);
  const longitude = toNumber(coordinate.longitude ?? coordinate.lng ?? coordinate.lon);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const normalizeMarkers = (markers = []) => markers
  .map((marker, index) => {
    const coordinate = normalizeCoordinate(marker.coordinate || marker);
    if (!coordinate) return null;
    return {
      id: String(marker.id || index),
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      title: String(marker.title || marker.name || `Stop ${index + 1}`),
    };
  })
  .filter(Boolean);

const pointToPath = (point) => encodeURIComponent(`${point.latitude},${point.longitude}`);

export default function GoogleWebMap({ center = FALLBACK_CENTER, markers = [], height = 220, zoom = 14, label = 'FS Hub Field Position' }) {
  const [hasError, setHasError] = useState(false);
  const safeCenter = normalizeCoordinate(center) || FALLBACK_CENTER;
  const safeMarkers = useMemo(() => normalizeMarkers(markers), [markers]);

  const html = useMemo(() => {
    const q = encodeURIComponent(`${safeCenter.latitude},${safeCenter.longitude} (${label})`);
    let mapUrl = `https://maps.google.com/maps?q=${q}&ll=${encodeURIComponent(String(safeCenter.latitude))},${encodeURIComponent(String(safeCenter.longitude))}&z=${Number(zoom) || 14}&output=embed`;

    // No-key Google iframe cannot do true custom JS markers. This workaround
    // uses Google Maps Directions URL when multiple coordinates are available;
    // Google then renders the stops/pins itself. It is limited, but gives visible pins without Google Cloud billing.
    const points = [safeCenter, ...safeMarkers].slice(0, 10);
    if (points.length >= 2) {
      const path = points.map(pointToPath).join('/');
      mapUrl = `https://www.google.com/maps/dir/${path}/?hl=en&z=${Number(zoom) || 13}&output=embed`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin:0; padding:0; height:100%; width:100%; overflow:hidden; background:#EFF6FF; }
    iframe { border:0; height:100%; width:100%; display:block; }
  </style>
</head>
<body>
  <iframe
    title="FS Hub Google Map"
    src="${mapUrl}"
    allowfullscreen
    loading="eager"
    referrerpolicy="no-referrer-when-downgrade">
  </iframe>
</body>
</html>`;
  }, [safeCenter.latitude, safeCenter.longitude, safeMarkers, zoom, label]);

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
        source={{ html, baseUrl: 'https://www.google.com/' }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
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
