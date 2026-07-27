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
      title: String(marker.title || marker.name || `Marker ${index + 1}`),
      description: String(marker.description || marker.address || ''),
      color: marker.color || '#EF4444',
    };
  })
  .filter(Boolean);

export default function GoogleWebMap({
  center = FALLBACK_CENTER,
  markers = [],
  height = 220,
  zoom = 14,
  label = 'FS Hub Field Position',
  draggablePicker = false,
  onLocationSelected,
}) {
  const [hasError, setHasError] = useState(false);
  const safeCenter = normalizeCoordinate(center) || FALLBACK_CENTER;
  const safeMarkers = useMemo(() => normalizeMarkers(markers), [markers]);

  const html = useMemo(() => {
    const markerJson = JSON.stringify(safeMarkers).replace(/</g, '\\u003c');
    const escapedLabel = String(label).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`/g, '');

    // CARTO Voyager tiles are fast, polished, no-card/no-Google-Cloud, and support real Leaflet pins.
    // This is intentionally a WebView map, not native react-native-maps, to avoid Android API key crashes.
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height:100%; width:100%; margin:0; padding:0; background:#EFF6FF; }
    .leaflet-popup-content { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size:12px; line-height:16px; }
    .pin { width:20px; height:20px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:2px solid white; box-shadow:0 2px 7px rgba(0,0,0,.35); }
    .pin-inner { width:6px; height:6px; background:white; border-radius:50%; margin:5px; }
    .pin-wrap { transform: rotate(45deg); }
    .picker-help { position:absolute; left:10px; right:10px; bottom:10px; z-index:999; background:rgba(15,23,42,.88); color:white; border-radius:12px; padding:9px 11px; font-family:Arial; font-size:12px; text-align:center; }
  </style>
</head>
<body>
  <div id="map"></div>
  ${draggablePicker ? '<div class="picker-help">Tap the map or drag the blue pin to select exact store location</div>' : ''}
  <script>
    const center = [${safeCenter.latitude}, ${safeCenter.longitude}];
    const markers = ${markerJson};
    const draggablePicker = ${draggablePicker ? 'true' : 'false'};
    const map = L.map('map', { zoomControl:true, attributionControl:true }).setView(center, ${Number(zoom) || 14});

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    function icon(color) {
      return L.divIcon({
        className: '',
        html: '<div class="pin-wrap"><div class="pin" style="background:' + color + '"><div class="pin-inner"></div></div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 26],
        popupAnchor: [0, -24]
      });
    }

    const allPoints = [];
    function addMarker(lat, lon, title, desc, color, draggable) {
      const point = [lat, lon];
      allPoints.push(point);
      const marker = L.marker(point, { icon: icon(color), draggable: !!draggable }).addTo(map);
      marker.bindPopup('<b>' + title + '</b>' + (desc ? '<br/>' + desc : ''));
      return marker;
    }

    let picker = addMarker(center[0], center[1], '${escapedLabel}', draggablePicker ? 'Drag or tap map to select' : 'Map center', '#2563EB', draggablePicker);

    function sendLocation(latlng) {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'location', latitude: latlng.lat, longitude: latlng.lng }));
    }

    if (draggablePicker) {
      picker.on('dragend', function(e) { sendLocation(e.target.getLatLng()); });
      map.on('click', function(e) { picker.setLatLng(e.latlng); sendLocation(e.latlng); });
    }

    markers.forEach(function(m) {
      addMarker(m.latitude, m.longitude, m.title, m.description, m.color || '#EF4444', false);
    });

    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding:[28, 28], maxZoom:15 });
    }
  </script>
</body>
</html>`;
  }, [safeCenter.latitude, safeCenter.longitude, safeMarkers, zoom, label, draggablePicker]);

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
        <Text style={styles.fallbackText}>Check internet connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://cdn.jsdelivr.net/' }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'location' && onLocationSelected) {
              onLocationSelected({ latitude: Number(data.latitude), longitude: Number(data.longitude), accuracy: null });
            }
          } catch {}
        }}
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
