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
      title: String(marker.title || marker.name || 'Marker'),
      description: String(marker.description || marker.address || ''),
      color: marker.color || '#EF4444',
    };
  })
  .filter(Boolean);

export default function OSMMap({ center = FALLBACK_CENTER, markers = [], height = 180, zoom = 13 }) {
  const [hasError, setHasError] = useState(false);

  const safeCenter = normalizeCoordinate(center) || FALLBACK_CENTER;
  const safeMarkers = useMemo(() => normalizeMarkers(markers), [markers]);

  const html = useMemo(() => {
    const markerJson = JSON.stringify(safeMarkers).replace(/</g, '\\u003c');
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQbO8NC9LLnXYp6czkqnFhIdD3jQGCs=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #EFF6FF; }
    .leaflet-popup-content { font-family: Arial, sans-serif; font-size: 12px; }
    .pin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 5px rgba(0,0,0,.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const center = [${safeCenter.latitude}, ${safeCenter.longitude}];
    const markers = ${markerJson};
    const map = L.map('map', { zoomControl: true, attributionControl: true }).setView(center, ${Number(zoom) || 13});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const allPoints = [];
    function addMarker(marker, isYou) {
      const point = [marker.latitude, marker.longitude];
      allPoints.push(point);
      const icon = L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + (marker.color || (isYou ? '#2563EB' : '#EF4444')) + '"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      L.marker(point, { icon })
        .addTo(map)
        .bindPopup('<b>' + marker.title + '</b><br/>' + (marker.description || ''));
    }

    addMarker({ latitude: center[0], longitude: center[1], title: 'Your Position', description: 'Current field radar center', color: '#2563EB' }, true);
    markers.forEach(marker => addMarker(marker, false));

    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [24, 24], maxZoom: 15 });
    }
  </script>
</body>
</html>`;
  }, [safeCenter.latitude, safeCenter.longitude, safeMarkers, zoom]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Map preview is available in the mobile app.</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Map could not load</Text>
        <Text style={styles.fallbackText}>Check internet connection. GPS still works.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
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
