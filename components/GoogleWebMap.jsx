import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

const FALLBACK_CENTER = { latitude: 6.6018, longitude: 3.3515 };

try {
  // MapLibre does not require an access token for open styles.
  MapLibreGL.setAccessToken(null);
} catch {}

const MAP_STYLES = {
  here: {
    label: 'HERE',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  maptiler: {
    label: 'MapTiler',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
  sdk: {
    label: 'SDK',
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
};

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

const toMapLibreCoordinate = (coordinate) => [coordinate.longitude, coordinate.latitude];

const readMapPressCoordinate = (event) => {
  const coords = event?.geometry?.coordinates || event?.features?.[0]?.geometry?.coordinates || event?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const longitude = toNumber(coords[0]);
  const latitude = toNumber(coords[1]);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude, accuracy: null };
};

export default function GoogleWebMap({
  center = FALLBACK_CENTER,
  markers = [],
  height = 220,
  zoom = 14,
  label = 'FS Hub Field Position',
  draggablePicker = false,
  onLocationSelected,
}) {
  const [styleKey, setStyleKey] = useState('here');
  const [pickerCoordinate, setPickerCoordinate] = useState(normalizeCoordinate(center) || FALLBACK_CENTER);
  const safeCenter = normalizeCoordinate(center) || FALLBACK_CENTER;
  const safeMarkers = useMemo(() => normalizeMarkers(markers), [markers]);
  const mapStyleURL = MAP_STYLES[styleKey]?.url || MAP_STYLES.here.url;

  const selectedCoordinate = draggablePicker ? pickerCoordinate : safeCenter;

  const handleSelectCoordinate = (coordinate) => {
    if (!coordinate) return;
    setPickerCoordinate(coordinate);
    if (onLocationSelected) onLocationSelected(coordinate);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackTitle}>Native map preview is available in the mobile app.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { height }]}>
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={mapStyleURL}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onPress={(event) => {
          if (!draggablePicker) return;
          handleSelectCoordinate(readMapPressCoordinate(event));
        }}
      >
        <MapLibreGL.Camera
          centerCoordinate={toMapLibreCoordinate(selectedCoordinate)}
          zoomLevel={Number(zoom) || 14}
          animationMode="flyTo"
          animationDuration={450}
        />

        {safeMarkers.map(marker => (
          <MapLibreGL.PointAnnotation
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            title={marker.title}
          >
            <View style={[styles.pin, { backgroundColor: marker.color }]}>
              <View style={styles.pinDot} />
            </View>
            <MapLibreGL.Callout title={marker.description ? `${marker.title}\n${marker.description}` : marker.title} />
          </MapLibreGL.PointAnnotation>
        ))}

        <MapLibreGL.PointAnnotation
          id="fshub-center-pin"
          coordinate={toMapLibreCoordinate(selectedCoordinate)}
          title={label}
          draggable={Boolean(draggablePicker)}
          onDragEnd={(event) => handleSelectCoordinate(readMapPressCoordinate(event))}
        >
          <View style={[styles.pin, { backgroundColor: '#2563EB' }]}>
            <View style={styles.pinDot} />
          </View>
          <MapLibreGL.Callout title={draggablePicker ? 'Drag or tap map to select this location' : label} />
        </MapLibreGL.PointAnnotation>
      </MapLibreGL.MapView>

      <View style={styles.styleSwitcher} pointerEvents="box-none">
        {Object.entries(MAP_STYLES).map(([key, style]) => (
          <TouchableOpacity
            key={key}
            style={[styles.styleBtn, styleKey === key && styles.styleBtnActive]}
            onPress={() => setStyleKey(key)}
          >
            <Text style={[styles.styleBtnText, styleKey === key && styles.styleBtnTextActive]}>{style.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {draggablePicker && (
        <View style={styles.helpBox} pointerEvents="none">
          <Text style={styles.helpText}>Tap map or drag blue pin to select exact store location</Text>
        </View>
      )}
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
  map: {
    flex: 1,
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
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  styleSwitcher: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  styleBtn: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
  },
  styleBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  styleBtnText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '900',
  },
  styleBtnTextActive: {
    color: '#FFFFFF',
  },
  helpBox: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  helpText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
